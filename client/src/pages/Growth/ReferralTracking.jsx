import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CURRENCIES, corridorLabel, formatMoney, formatUkDate, downloadUrl } from './referralUtils';
import StatusPill from './StatusPill';
import { ToastStack, ConfirmDialog } from '../../components/Feedback';
import { useToasts } from '../../components/useToasts';
import './referral.css';

const STATUSES = ['REGISTERED', 'PENDING', 'REWARDED', 'EXPIRED', 'NOT_ELIGIBLE', 'REVERSED'];
const PAGE_SIZE = 25;
const fullName = (f, l) => `${f || ''} ${l || ''}`.trim() || 'Unknown customer';

// US-1.6: every referral with its Referrer, Referee, status and reward
const ReferralTracking = () => {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const [rules, setRules] = useState([]);
    const [result, setResult] = useState({ data: [], total: 0, summary: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState(params.get('q') || '');
    const [approve, setApprove] = useState(null);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState('');
    const { toasts, push, dismiss } = useToasts();

    const filters = Object.fromEntries(['status', 'status_group', 'currency', 'receive_currency', 'rule_id', 'from', 'to', 'q', 'page'].map((k) => [k, params.get(k) || '']));
    const page = Number(filters.page || 1);

    const setFilter = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        if (key === 'status') next.delete('status_group');
        if (key !== 'page') next.delete('page');
        setParams(next);
    };

    useEffect(() => {
        fetch('/api/referral-rules?include_archived=1').then((r) => r.json()).then((d) => setRules(d.data || [])).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        setLoading(true); setError(false);
        try {
            const qs = new URLSearchParams(params);
            qs.set('page_size', String(PAGE_SIZE));
            const res = await fetch(`/api/referral/tracking?${qs.toString()}`);
            if (!res.ok) throw new Error();
            setResult(await res.json());
        } catch { setError(true); } finally { setLoading(false); }
    }, [params]);

    useEffect(() => { load(); }, [load]);

    // Debounced search box
    useEffect(() => {
        const t = setTimeout(() => { if ((params.get('q') || '') !== search.trim()) setFilter('q', search.trim()); }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const submitApproval = async () => {
        const text = reason.trim();
        if (text.length < 10 || text.length > 250) { setReasonError('Enter a reason of 10–250 characters.'); return; }
        try {
            const res = await fetch(`/api/referral/referrals/${approve.id}/approve`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: text, admin_user: 'Admin' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message);
            push(`Reward approved for referral ${approve.id}.`);
            setApprove(null);
            load();
        } catch (e) {
            push(e.message || "We couldn't approve this reward. Please try again.", 'error');
        }
    };

    const s = result.summary;
    const pages = Math.max(1, Math.ceil((result.total || 0) / PAGE_SIZE));
    const hasFilters = ['status', 'status_group', 'currency', 'receive_currency', 'rule_id', 'from', 'to', 'q'].some((k) => filters[k]);

    return (
        <div className="rf-page">
            <ToastStack toasts={toasts} onDismiss={dismiss} />
            <h2 className="rf-title">Referral Tracking</h2>
            <p className="rf-subtitle">Every customer who joined through a referral link or code, and what happened next.</p>

            <div className="rf-kpis">
                <div className="rf-kpi"><div className="rf-kpi-label">Total referrals</div><div className="rf-kpi-value">{s ? s.total : '—'}</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label">Pending</div><div className="rf-kpi-value">{s ? s.pending : '—'}</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label">Rewarded</div><div className="rf-kpi-value">{s ? s.rewarded : '—'}</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label">Conversion rate</div><div className="rf-kpi-value">{s && s.conversion_rate !== null ? `${s.conversion_rate.toFixed(1)}%` : '—'}</div><div className="rf-kpi-sub">Rewarded ÷ Registered</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label">Total bonus issued</div>
                    <div className="rf-kpi-value" style={{ fontSize: '1.15rem' }}>
                        {s && Object.keys(s.bonus_issued).length ? Object.entries(s.bonus_issued).map(([c, v]) => <div key={c}>{formatMoney(v, c)}</div>) : '—'}
                    </div>
                </div>
            </div>

            <div className="rf-card">
                <div className="rf-filters">
                    <div className="rf-field" style={{ flex: 2 }}><label htmlFor="rt-q">Search</label>
                        <input id="rt-q" className="rf-input" placeholder="Name, customer ID, email or referral code" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <div className="rf-field"><label htmlFor="rt-status">Status</label>
                        <select id="rt-status" className="rf-select" value={filters.status || (filters.status_group ? `group:${filters.status_group}` : '')}
                            onChange={(e) => (e.target.value.startsWith('group:') ? setFilter('status_group', e.target.value.slice(6)) : setFilter('status', e.target.value))}>
                            <option value="">All statuses</option>
                            {filters.status_group && <option value={`group:${filters.status_group}`}>{filters.status_group === 'pending' ? 'Registered or Pending' : 'Expired / Not eligible / Reversed'}</option>}
                            {STATUSES.map((st) => <option key={st} value={st}>{st.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}</option>)}
                        </select></div>
                    <div className="rf-field"><label htmlFor="rt-currency">Send currency</label>
                        <select id="rt-currency" className="rf-select" value={filters.currency} onChange={(e) => setFilter('currency', e.target.value)}>
                            <option value="">All currencies</option>
                            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                        </select></div>
                    <div className="rf-field"><label htmlFor="rt-receive-currency">Receive currency</label>
                        <select id="rt-receive-currency" className="rf-select" value={filters.receive_currency} onChange={(e) => setFilter('receive_currency', e.target.value)}>
                            <option value="">All currencies</option>
                            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                        </select></div>
                    <div className="rf-field"><label htmlFor="rt-rule">Rule</label>
                        <select id="rt-rule" className="rf-select" value={filters.rule_id} onChange={(e) => setFilter('rule_id', e.target.value)}>
                            <option value="">All rules</option>
                            {rules.map((r) => <option key={r.id} value={r.id}>{r.name} ({corridorLabel(r.base_currency, r.receive_currency)}){r.status === 'ARCHIVED' ? ' (archived)' : ''}</option>)}
                        </select></div>
                    <div className="rf-field"><label htmlFor="rt-from">Registered from</label>
                        <input id="rt-from" type="date" className="rf-input" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} /></div>
                    <div className="rf-field"><label htmlFor="rt-to">Registered to</label>
                        <input id="rt-to" type="date" className="rf-input" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} /></div>
                    <div className="rf-quick">
                        {hasFilters && <button type="button" className="btn-secondary" onClick={() => { setSearch(''); setParams(new URLSearchParams()); }}>Clear</button>}
                        <button type="button" className="btn-secondary" onClick={() => downloadUrl(`/api/referral/tracking.csv?${params.toString()}`)}>Export CSV</button>
                    </div>
                </div>

                <div className="rf-table-wrap">
                    <table className="rf-table">
                        <thead>
                            <tr>
                                <th>Referral ID</th><th>Referrer</th><th>Referee</th><th>Rule</th><th>Registered</th><th>Deadline</th>
                                <th>Qualifying transfer</th><th>Status</th><th className="rf-num">Referrer bonus</th><th className="rf-num">Referee bonus</th><th>Rewarded</th><th />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="12" className="rf-empty">Loading referrals...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="12" className="rf-empty">We couldn&apos;t load referrals. <button type="button" className="rf-link" onClick={load}>Retry</button></td></tr>
                            ) : result.data.length === 0 ? (
                                <tr><td colSpan="12" className="rf-empty">{hasFilters ? 'No referrals match your filters.' : 'No referrals yet.'}</td></tr>
                            ) : result.data.map((r) => (
                                <tr key={r.id}>
                                    <td className="rf-strong" style={{ whiteSpace: 'nowrap' }}>{r.id}<span className="rf-sub">Code {r.code}</span></td>
                                    <td>{fullName(r.referrer_first_name, r.referrer_last_name)}<span className="rf-sub">ID: {r.referrer_id}</span></td>
                                    <td>{fullName(r.referee_first_name, r.referee_last_name)}<span className="rf-sub">ID: {r.referee_id}</span></td>
                                    <td>{r.rule_name || <span className="rf-muted">—</span>}<span className="rf-sub">{corridorLabel(r.currency, r.receive_currency, '?')}</span></td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{formatUkDate(r.registered_at)}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{formatUkDate(r.qualification_deadline)}</td>
                                    <td>{r.qualifying_transfer_id || <span className="rf-muted">—</span>}{r.qualifying_amount ? <span className="rf-sub">{formatMoney(r.qualifying_amount, r.currency)}</span> : null}</td>
                                    <td>
                                        <StatusPill status={r.status} title={r.status_reason} />
                                        {r.status_reason && <span className="rf-sub" style={{ maxWidth: 200 }}>{r.status_reason}</span>}
                                    </td>
                                    <td className="rf-num">
                                        {r.referrer_credited > 0
                                            ? <button type="button" className="rf-link" onClick={() => navigate(`/growth/credit-ledger?customerId=${encodeURIComponent(r.referrer_id)}&schemeId=rr_${r.rule_id}`)}>{formatMoney(r.referrer_credited, r.currency)}</button>
                                            : <span className="rf-muted">{r.reward_type === 'REFEREE' || !r.rule_id ? '—' : formatMoney(r.referrer_reward, r.currency) + ' due'}</span>}
                                    </td>
                                    <td className="rf-num">
                                        {r.referee_credited > 0
                                            ? <button type="button" className="rf-link" onClick={() => navigate(`/growth/credit-ledger?customerId=${encodeURIComponent(r.referee_id)}&schemeId=rr_${r.rule_id}`)}>{formatMoney(r.referee_credited, r.currency)}</button>
                                            : <span className="rf-muted">{r.reward_type === 'REFERRER' || !r.rule_id ? '—' : formatMoney(r.referee_reward, r.currency) + ' due'}</span>}
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{formatUkDate(r.rewarded_at)}</td>
                                    <td>{r.status === 'NOT_ELIGIBLE' && <button type="button" className="rf-btn-sm" onClick={() => { setApprove(r); setReason(''); setReasonError(''); }}>Approve reward</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {result.total > PAGE_SIZE && (
                    <div className="rf-pager">
                        <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, result.total)} of {result.total}</span>
                        <div className="rf-quick">
                            <button type="button" className="rf-btn-sm" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>Previous</button>
                            <span>Page {page} of {pages}</span>
                            <button type="button" className="rf-btn-sm" disabled={page >= pages} onClick={() => setFilter('page', String(page + 1))}>Next</button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={!!approve}
                title="Approve referral reward"
                message={approve ? `This referral was marked not eligible: "${approve.status_reason || 'No reason recorded'}". Approving will credit the bonus now.` : ''}
                confirmLabel="Approve reward"
                onCancel={() => setApprove(null)}
                onConfirm={submitApproval}
            >
                <div className="rf-field" style={{ marginBottom: 12 }}>
                    <label htmlFor="rt-reason">Reason<span className="rf-req">*</span></label>
                    <textarea id="rt-reason" className={`rf-input${reasonError ? ' rf-invalid' : ''}`} rows={3} maxLength={250} value={reason}
                        onChange={(e) => { setReason(e.target.value); setReasonError(''); }} placeholder="Why should this referral be rewarded?" />
                    {reasonError ? <div className="rf-error">{reasonError}</div> : <div className="rf-hint">{reason.trim().length}/250 characters (minimum 10)</div>}
                </div>
            </ConfirmDialog>
        </div>
    );
};

export default ReferralTracking;
