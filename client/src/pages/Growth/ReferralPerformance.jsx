import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { corridorLabel, formatMoney, ukTodayIso, daysAgoIso, downloadUrl } from './referralUtils';
import StatusPill from './StatusPill';
import ColHead from './ColHead';
import './referral.css';

// Figma SVG assets
import iconCalendar from '../../assets/figma-referrals/calendar.svg';
import iconExport from '../../assets/figma-referrals/export.svg';
import iconClose from '../../assets/figma-referrals/close.svg';

const QUICK = [
    { id: 'all', label: 'All', range: () => ({ from: '', to: '' }) },
    { id: 'today', label: 'Today', range: () => ({ from: ukTodayIso(), to: ukTodayIso() }) },
    { id: '7d', label: 'Past 7 days', range: () => ({ from: daysAgoIso(6), to: ukTodayIso() }) },
    { id: '30d', label: 'Past 30 days', range: () => ({ from: daysAgoIso(29), to: ukTodayIso() }) },
];

const TIPS = {
    rule: 'The referral rule name, with its corridor (send → receive currency) underneath. Click the name to view financial details and top referrers.',
    status: 'Current state of the rule: Active, Inactive, Scheduled, Ended or Archived.',
    visits: 'How many times customers opened a referral link under this rule. Click the number to inspect click-to-app/web traceability.',
    registrations: 'New customers who created an account using a referral link or code under this rule. Click the number to view them in Referral Tracking.',
    pending: 'Referrals where the new customer has registered (or started a transfer) and is still within the qualification window.',
    rewarded: 'Referrals where the new customer completed a qualifying transfer and the bonus was credited.',
    eligible: 'Referrals that were not eligible, expired, or reversed.',
    conversion: 'Share of registered referrals that became Rewarded: Rewarded ÷ Registrations.',
    issued: 'Total bonus credited to referrers and referees under this rule.',
    used: 'Part of the issued bonus that customers have already spent on transfers.',
    unused: 'Issued bonus still sitting in customer wallets and not yet expired.',
    expired: 'Issued bonus that passed its validity date without being spent.',
    volume: 'Total send amount of the qualifying first transfers made by referred customers.',
};

const ReferralPerformance = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isRewardsHub = location.pathname.startsWith('/configuration/rewards');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [quick, setQuick] = useState('all');
    const [showCustomDates, setShowCustomDates] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [data, setData] = useState({ data: [], totals: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [panelRule, setPanelRule] = useState(null);
    const [top, setTop] = useState({ loading: false, rows: [] });

    const invalidRange = from && to && from > to;

    const load = useCallback(async () => {
        if (invalidRange) return;
        setLoading(true); setError(false);
        try {
            const qs = new URLSearchParams();
            if (from) qs.set('from', from);
            if (to) qs.set('to', to);
            if (showArchived) qs.set('include_archived', '1');
            const res = await fetch(`/api/referral/performance?${qs.toString()}`);
            if (!res.ok) throw new Error();
            setData(await res.json());
        } catch { setError(true); } finally { setLoading(false); }
    }, [from, to, showArchived, invalidRange]);

    useEffect(() => { load(); }, [load]);

    const applyQuick = (q) => {
        const r = q.range();
        setFrom(r.from);
        setTo(r.to);
        setQuick(q.id);
        setShowCustomDates(false);
    };

    const toggleCustom = () => {
        setQuick('custom');
        setShowCustomDates((v) => !v);
    };

    const openTop = async (rule) => {
        setPanelRule(rule);
        setTop({ loading: true, rows: [] });
        try {
            const qs = new URLSearchParams();
            if (from) qs.set('from', from);
            if (to) qs.set('to', to);
            const res = await fetch(`/api/referral/performance/${rule.rule_id}/top-referrers?${qs.toString()}`);
            const body = await res.json();
            setTop({ loading: false, rows: body.data || [] });
        } catch { setTop({ loading: false, rows: [] }); }
    };

    const openTracking = (ruleId, extra = {}) => {
        const qs = new URLSearchParams({ rule_id: String(ruleId), ...extra });
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        if (isRewardsHub) {
            qs.set('tab', 'tracking');
            navigate(`/configuration/rewards?${qs.toString()}`);
        } else {
            navigate(`/growth/referral-tracking?${qs.toString()}`);
        }
    };

    const openClickTraceability = () => {
        const qs = new URLSearchParams({ view: 'clicks' });
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        if (isRewardsHub) {
            qs.set('tab', 'tracking');
            navigate(`/configuration/rewards?${qs.toString()}`);
        } else {
            navigate(`/growth/referral-tracking?${qs.toString()}`);
        }
    };

    const exportCsv = () => {
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        if (showArchived) qs.set('include_archived', '1');
        downloadUrl(`/api/referral/performance.csv?${qs.toString()}`);
    };

    const t = data.totals;

    return (
        <div className="rf-page">
            <h2 className="rf-title">Referral performance</h2>
            <p className="rf-subtitle">See registrations from referral links, rewards and bonus usage for each referral rule.</p>

            {/* 4 Figma KPI Cards (`5579:13367`) */}
            <div className="rf-kpis">
                <div className="rf-kpi">
                    <div className="rf-kpi-label"><ColHead label="Link visits" tip={TIPS.visits} showIcon /></div>
                    <div className="rf-kpi-value">{t ? t.link_visits : '—'}</div>
                </div>
                <div className="rf-kpi">
                    <div className="rf-kpi-label"><ColHead label="Registrations" tip={TIPS.registrations} showIcon /></div>
                    <div className="rf-kpi-value">{t ? t.registrations : '—'}</div>
                </div>
                <div className="rf-kpi">
                    <div className="rf-kpi-label"><ColHead label="Pending" tip={TIPS.pending} showIcon /></div>
                    <div className="rf-kpi-value">{t ? t.pending : '—'}</div>
                </div>
                <div className="rf-kpi">
                    <div className="rf-kpi-label"><ColHead label="Rewarded" tip={TIPS.rewarded} showIcon /></div>
                    <div className="rf-kpi-value">{t ? t.rewarded : '—'}</div>
                </div>
            </div>

            {/* Performance Rules Section */}
            <div className="rf-card">
                <div className="rf-card-head" style={{ paddingTop: 0 }}>
                    <div>
                        <h3>Performance rules</h3>
                        <p>See registrations from referral links, rewards and bonus usage for each referral rule.</p>
                    </div>
                </div>

                {/* Figma Filter Chips + Right Controls */}
                <div className="rf-perf-toolbar">
                    <div className="rf-chip-group">
                        {QUICK.map((q) => (
                            <button
                                key={q.id}
                                type="button"
                                className={`rf-filter-chip ${quick === q.id ? 'active' : ''}`}
                                onClick={() => applyQuick(q)}
                            >
                                <span>{q.label}</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            className={`rf-filter-chip ${quick === 'custom' ? 'active' : ''}`}
                            onClick={toggleCustom}
                        >
                            <img src={iconCalendar} alt="" aria-hidden="true" />
                            <span>Custom</span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <label className="rf-switch-row">
                            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                            <span>Show archived</span>
                        </label>
                        <button
                            type="button"
                            className="rf-figma-btn-secondary"
                            onClick={exportCsv}
                            disabled={invalidRange}
                        >
                            <img src={iconExport} alt="" style={{ width: 24, height: 24 }} aria-hidden="true" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Inline Custom Date Inputs when Custom is toggled or dates are active */}
                {(showCustomDates || quick === 'custom' || from || to) && (
                    <div className="rf-filters" style={{ marginBottom: 16 }}>
                        <div className="rf-field">
                            <label htmlFor="rp-from">From</label>
                            <input
                                id="rp-from"
                                type="date"
                                className="rf-input"
                                value={from}
                                onChange={(e) => { setFrom(e.target.value); setQuick('custom'); }}
                            />
                        </div>
                        <div className="rf-field">
                            <label htmlFor="rp-to">To</label>
                            <input
                                id="rp-to"
                                type="date"
                                className={`rf-input${invalidRange ? ' rf-invalid' : ''}`}
                                value={to}
                                onChange={(e) => { setTo(e.target.value); setQuick('custom'); }}
                            />
                            {invalidRange && <div className="rf-error">End date must be on or after the start date.</div>}
                        </div>
                        {(from || to) && (
                            <button
                                type="button"
                                className="rf-btn-sm"
                                onClick={() => applyQuick(QUICK[0])}
                            >
                                Clear dates
                            </button>
                        )}
                    </div>
                )}

                {/* 7-Column Figma Table (`5579:13367`) */}
                <div className="rf-table-wrap">
                    <table className="rf-table">
                        <thead>
                            <tr>
                                <th><ColHead label="Rule" tip={TIPS.rule} /></th>
                                <th><ColHead label="Link visits" tip={TIPS.visits} /></th>
                                <th><ColHead label="Registrations" tip={TIPS.registrations} /></th>
                                <th><ColHead label="Pending" tip={TIPS.pending} /></th>
                                <th><ColHead label="Rewarded" tip={TIPS.rewarded} /></th>
                                <th><ColHead label="Status" tip={TIPS.status} /></th>
                                <th><ColHead label="Conversion" tip={TIPS.conversion} /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="rf-empty">Loading performance...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="7" className="rf-empty">We couldn&apos;t load performance figures. <button type="button" className="rf-link" onClick={load}>Retry</button></td></tr>
                            ) : data.data.length === 0 ? (
                                <tr><td colSpan="7" className="rf-empty">No referral rules found.</td></tr>
                            ) : data.data.map((r) => {
                                const c = r.base_currency;
                                return (
                                    <tr key={r.rule_id}>
                                        <td>
                                            <button type="button" className="rf-link" onClick={() => openTop(r)}>{r.name}</button>
                                            <span className="rf-sub">{c} to {r.receive_currency || 'All'}</span>
                                        </td>
                                        <td className="rf-num">
                                            {r.link_visits > 0
                                                ? <button type="button" className="rf-link" title="Inspect click-to-app/web traceability" onClick={openClickTraceability}>{r.link_visits}</button>
                                                : 0}
                                        </td>
                                        <td className="rf-num">
                                            {r.registrations > 0 ? <button type="button" className="rf-link" onClick={() => openTracking(r.rule_id)}>{r.registrations}</button> : 0}
                                        </td>
                                        <td className="rf-num">
                                            {r.pending > 0 ? <button type="button" className="rf-link" onClick={() => openTracking(r.rule_id, { status_group: 'pending' })}>{r.pending}</button> : 0}
                                        </td>
                                        <td className="rf-num">
                                            {r.rewarded > 0 ? <button type="button" className="rf-link" onClick={() => openTracking(r.rule_id, { status: 'REWARDED' })}>{r.rewarded}</button> : 0}
                                            {r.not_eligible > 0 && (
                                                <span className="rf-sub">
                                                    <button type="button" className="rf-link" style={{ fontSize: '10px' }} onClick={() => openTracking(r.rule_id, { status_group: 'not_eligible' })}>
                                                        {r.not_eligible} not eligible
                                                    </button>
                                                </span>
                                            )}
                                        </td>
                                        <td><StatusPill status={r.status} /></td>
                                        <td className="rf-num">{r.conversion_rate !== null ? `${r.conversion_rate.toFixed(1)}%` : '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Performance Rule Details Modal (Figma `5579:15897`) */}
            {panelRule && (
                <div className="rf-figma-modal-backdrop" onClick={() => setPanelRule(null)} data-testid="performance-rule-modal">
                    <div
                        className="rf-figma-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="rf-perf-modal-title"
                    >
                        <div className="rf-figma-modal-head">
                            <div>
                                <h3 id="rf-perf-modal-title">{panelRule.name}</h3>
                                <p>Performance rule details ({corridorLabel(panelRule.base_currency, panelRule.receive_currency)})</p>
                            </div>
                            <button
                                type="button"
                                className="rf-figma-modal-close"
                                aria-label="Close"
                                onClick={() => setPanelRule(null)}
                            >
                                <img src={iconClose} alt="Close" />
                            </button>
                        </div>

                        {/* 6 KPI Cards in Modal */}
                        <div className="rf-kpis" style={{ marginBottom: 0 }}>
                            <div className="rf-kpi" style={{ minWidth: 105, flex: '1 1 105px' }}>
                                <div className="rf-kpi-label"><ColHead label="Link visits" tip={TIPS.visits} showIcon /></div>
                                <div className="rf-kpi-value">{panelRule.link_visits ?? 0}</div>
                            </div>
                            <div className="rf-kpi" style={{ minWidth: 105, flex: '1 1 105px' }}>
                                <div className="rf-kpi-label"><ColHead label="Registrations" tip={TIPS.registrations} showIcon /></div>
                                <div className="rf-kpi-value">{panelRule.registrations ?? 0}</div>
                            </div>
                            <div className="rf-kpi" style={{ minWidth: 105, flex: '1 1 105px' }}>
                                <div className="rf-kpi-label"><ColHead label="Pending" tip={TIPS.pending} showIcon /></div>
                                <div className="rf-kpi-value">{panelRule.pending ?? 0}</div>
                            </div>
                            <div className="rf-kpi" style={{ minWidth: 105, flex: '1 1 105px' }}>
                                <div className="rf-kpi-label"><ColHead label="Rewarded" tip={TIPS.rewarded} showIcon /></div>
                                <div className="rf-kpi-value">{panelRule.rewarded ?? 0}</div>
                            </div>
                            <div className="rf-kpi" style={{ minWidth: 105, flex: '1 1 105px' }}>
                                <div className="rf-kpi-label"><ColHead label="Eligible" tip={TIPS.eligible} showIcon /></div>
                                <div className="rf-kpi-value">{panelRule.not_eligible ?? 0}</div>
                            </div>
                            <div className="rf-kpi" style={{ minWidth: 105, flex: '1 1 105px' }}>
                                <div className="rf-kpi-label"><ColHead label="Conversion" tip={TIPS.conversion} showIcon /></div>
                                <div className="rf-kpi-value">{panelRule.conversion_rate !== null ? `${panelRule.conversion_rate.toFixed(1)}%` : '—'}</div>
                            </div>
                        </div>

                        {/* Financial Details Card */}
                        <div className="rf-fin-details-box">
                            <div className="rf-fin-details-title">Financial details</div>
                            <div className="rf-fin-details-row">
                                <span>Bonus issued:</span>
                                <span>{formatMoney(panelRule.bonus_issued, panelRule.base_currency)}</span>
                            </div>
                            <div className="rf-fin-details-row">
                                <span>Bonus used:</span>
                                <span>{formatMoney(panelRule.bonus_used, panelRule.base_currency)}</span>
                            </div>
                            <div className="rf-fin-details-row">
                                <span>Bonus unused:</span>
                                <span>{formatMoney(panelRule.bonus_unused, panelRule.base_currency)}</span>
                            </div>
                            <div className="rf-fin-details-row">
                                <span>Bonus expired:</span>
                                <span>{formatMoney(panelRule.bonus_expired, panelRule.base_currency)}</span>
                            </div>
                            <div className="rf-fin-details-row">
                                <span>Referred volume:</span>
                                <span>{formatMoney(panelRule.referred_volume, panelRule.base_currency)}</span>
                            </div>
                        </div>

                        {/* Top Referrers Section */}
                        <div>
                            <h4 style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 24, lineHeight: '36px', fontWeight: 700, color: '#323130', margin: '0 0 12px' }}>
                                Top referrers
                            </h4>
                            {top.loading ? (
                                <div className="rf-empty">Loading top referrers...</div>
                            ) : top.rows.length === 0 ? (
                                <div className="rf-empty">No referrers for this rule in the selected period.</div>
                            ) : (
                                <div className="rf-table-wrap">
                                    <table className="rf-table">
                                        <thead>
                                            <tr>
                                                <th>Customer</th>
                                                <th>Registrations</th>
                                                <th>Rewarded</th>
                                                <th>Bonus earned</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {top.rows.map((u) => (
                                                <tr key={u.referrer_id}>
                                                    <td>
                                                        <div className="rf-strong">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.referrer_id}</div>
                                                        <span className="rf-sub">ID: {u.referrer_id}</span>
                                                    </td>
                                                    <td className="rf-num">{u.registrations}</td>
                                                    <td className="rf-num">{u.rewarded}</td>
                                                    <td className="rf-num">{formatMoney(u.bonus_earned, panelRule.base_currency)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReferralPerformance;
