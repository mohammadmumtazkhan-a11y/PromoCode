import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, daysAgoIso, ukTodayIso, downloadUrl } from './referralUtils';
import StatusPill from './StatusPill';
import './referral.css';

const RANGES = [
    { key: '7', label: 'Last 7 days', from: () => daysAgoIso(7) },
    { key: '30', label: 'Last 30 days', from: () => daysAgoIso(30) },
    { key: 'month', label: 'This month', from: () => `${ukTodayIso().slice(0, 8)}01` },
    { key: 'all', label: 'All time', from: () => '' },
];

// US-1.8: how each referral rule is performing
const ReferralPerformance = () => {
    const navigate = useNavigate();
    const [range, setRange] = useState('30');
    const [from, setFrom] = useState(daysAgoIso(30));
    const [to, setTo] = useState(ukTodayIso());
    const [showArchived, setShowArchived] = useState(false);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [top, setTop] = useState(null);

    const query = () => new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}), ...(showArchived ? { include_archived: '1' } : {}) }).toString();

    const load = useCallback(async () => {
        setLoading(true); setError(false);
        try {
            const res = await fetch(`/api/referral/performance?${query()}`);
            if (!res.ok) throw new Error();
            setRows((await res.json()).data || []);
        } catch { setError(true); } finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [from, to, showArchived]);

    useEffect(() => { load(); }, [load]);

    const pickRange = (r) => { setRange(r.key); setFrom(r.from()); setTo(r.key === 'all' ? '' : ukTodayIso()); };

    const drill = (row, params) => {
        const p = new URLSearchParams({ rule_id: String(row.rule_id), ...params, ...(from ? { from } : {}), ...(to ? { to } : {}) });
        navigate(`/growth/referral-tracking?${p.toString()}`);
    };

    const openTop = async (row) => {
        setTop({ row, data: null });
        try {
            const res = await fetch(`/api/referral/performance/${row.rule_id}/top-referrers`);
            setTop({ row, data: (await res.json()).data || [] });
        } catch { setTop({ row, data: [], error: true }); }
    };

    // Totals per currency only — never add currencies together (AC-1.8.3)
    const totals = rows.reduce((acc, r) => {
        acc.registrations += r.registrations; acc.rewarded += r.rewarded; acc.visits += r.link_visits; acc.pending += r.pending;
        return acc;
    }, { registrations: 0, rewarded: 0, visits: 0, pending: 0 });

    const Count = ({ row, value, params }) => (value > 0
        ? <button type="button" className="rf-link" onClick={() => drill(row, params)}>{value}</button>
        : <span>0</span>);

    return (
        <div className="rf-page">
            <h2 className="rf-title">Referral Performance</h2>
            <p className="rf-subtitle">See registrations from referral links, rewards and bonus usage for each referral rule.</p>

            <div className="rf-kpis">
                <div className="rf-kpi"><div className="rf-kpi-label">Link visits</div><div className="rf-kpi-value">{totals.visits}</div><div className="rf-kpi-sub">Unique visits in range</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label">Registrations</div><div className="rf-kpi-value">{totals.registrations}</div><div className="rf-kpi-sub">Joined via link or code</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label">Pending</div><div className="rf-kpi-value">{totals.pending}</div><div className="rf-kpi-sub">Waiting for a qualifying transfer</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label">Rewarded</div><div className="rf-kpi-value">{totals.rewarded}</div>
                    <div className="rf-kpi-sub">{totals.registrations ? `${(Math.round((totals.rewarded / totals.registrations) * 1000) / 10).toFixed(1)}% conversion` : 'No registrations yet'}</div></div>
            </div>

            <div className="rf-card">
                <div className="rf-card-head">
                    <div><h3>Performance by rule</h3><p>Amounts are shown in each rule&apos;s own currency.</p></div>
                    <div className="rf-quick">
                        {RANGES.map((r) => (
                            <button key={r.key} type="button" className={`rf-btn-sm${range === r.key ? ' rf-active' : ''}`} onClick={() => pickRange(r)}>{r.label}</button>
                        ))}
                    </div>
                </div>
                <div className="rf-filters">
                    <div className="rf-field"><label htmlFor="pf-from">Start date</label>
                        <input id="pf-from" type="date" className="rf-input" value={from} max={to || undefined} onChange={(e) => { setRange('custom'); setFrom(e.target.value); }} /></div>
                    <div className="rf-field"><label htmlFor="pf-to">End date</label>
                        <input id="pf-to" type="date" className="rf-input" value={to} min={from || undefined} onChange={(e) => { setRange('custom'); setTo(e.target.value); }} /></div>
                    <label className="rf-switch-row" style={{ paddingBottom: 8 }}>
                        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
                    </label>
                    <button type="button" className="btn-secondary" onClick={() => downloadUrl(`/api/referral/performance.csv?${query()}`)}>Export CSV</button>
                </div>
                <div className="rf-table-wrap">
                    <table className="rf-table">
                        <thead>
                            <tr>
                                <th>Rule</th><th>Status</th>
                                <th className="rf-num">Link visits</th><th className="rf-num">Registrations</th><th className="rf-num">Pending</th>
                                <th className="rf-num">Rewarded</th><th className="rf-num">Expired / Not eligible</th><th className="rf-num">Conversion</th>
                                <th className="rf-num">Bonus issued</th><th className="rf-num">Used</th><th className="rf-num">Unused</th><th className="rf-num">Expired</th>
                                <th className="rf-num">Referred volume</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="13" className="rf-empty">Loading performance...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="13" className="rf-empty">We couldn&apos;t load referral performance. <button type="button" className="rf-link" onClick={load}>Retry</button></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan="13" className="rf-empty">No referral rules yet. Create one in Referral Settings.</td></tr>
                            ) : rows.map((r) => (
                                <tr key={r.rule_id}>
                                    <td>
                                        <button type="button" className="rf-link" style={{ textDecoration: 'none', textAlign: 'left', whiteSpace: 'nowrap' }} onClick={() => openTop(r)} title="View top referrers">{r.name}</button>
                                        <span className="rf-sub">{r.currency}</span>
                                    </td>
                                    <td><StatusPill status={r.status} /></td>
                                    <td className="rf-num">{r.link_visits}</td>
                                    <td className="rf-num"><Count row={r} value={r.registrations} params={{}} /></td>
                                    <td className="rf-num"><Count row={r} value={r.pending} params={{ status_group: 'pending' }} /></td>
                                    <td className="rf-num"><Count row={r} value={r.rewarded} params={{ status: 'REWARDED' }} /></td>
                                    <td className="rf-num"><Count row={r} value={r.closed} params={{ status_group: 'closed' }} /></td>
                                    <td className="rf-num rf-strong">{r.conversion_rate === null ? '—' : `${r.conversion_rate.toFixed(1)}%`}</td>
                                    <td className="rf-num">{formatMoney(r.bonus_issued, r.currency)}</td>
                                    <td className="rf-num">{formatMoney(r.bonus_used, r.currency)}</td>
                                    <td className="rf-num" style={{ color: '#047857', fontWeight: 600 }}>{formatMoney(r.bonus_unused, r.currency)}</td>
                                    <td className="rf-num">{formatMoney(r.bonus_expired, r.currency)}</td>
                                    <td className="rf-num">{formatMoney(r.referred_volume, r.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {top && (
                <div className="rf-panel-backdrop" onClick={() => setTop(null)}>
                    <aside className="rf-panel" role="dialog" aria-modal="true" aria-label="Top referrers" onClick={(e) => e.stopPropagation()}>
                        <div className="rf-panel-head">
                            <div><h3>Top referrers</h3><span className="rf-sub">{top.row.name} · {top.row.currency}</span></div>
                            <button type="button" className="rf-dialog-close" style={{ position: 'static' }} aria-label="Close" onClick={() => setTop(null)}>×</button>
                        </div>
                        {!top.data ? <p className="rf-muted">Loading...</p> : top.data.length === 0 ? <p className="rf-muted">No referrals for this rule yet.</p> : (
                            <table className="rf-table">
                                <thead><tr><th>Customer</th><th className="rf-num">Registrations</th><th className="rf-num">Rewarded</th><th className="rf-num">Bonus earned</th></tr></thead>
                                <tbody>
                                    {top.data.map((t) => (
                                        <tr key={t.referrer_id}>
                                            <td><span className="rf-strong">{`${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown customer'}</span><span className="rf-sub">ID: {t.referrer_id}</span></td>
                                            <td className="rf-num">{t.registrations}</td>
                                            <td className="rf-num">{t.rewarded}</td>
                                            <td className="rf-num">{formatMoney(t.bonus_earned || 0, top.row.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
};

export default ReferralPerformance;
