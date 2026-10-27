import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CURRENCIES, corridorLabel, formatMoney, formatUkDate, downloadUrl } from './referralUtils';
import StatusPill from './StatusPill';
import ColHead from './ColHead';
import { ToastStack, ConfirmDialog } from '../../components/Feedback';
import { useToasts } from '../../components/useToasts';
import { adminHeaders, getAdminToken, setAdminToken } from '../../lib/adminAuth';
import './referral.css';

const STATUSES = ['REGISTERED', 'PENDING', 'REWARDED', 'EXPIRED', 'NOT_ELIGIBLE', 'REVERSED'];
const PAGE_SIZE = 25;
const COLUMNS = [
    { label: 'Referral ID', tip: 'Unique number of this referral, with the referral code the new customer joined with underneath.' },
    { label: 'Referrer', tip: 'The existing customer who shared their link or code. Their reward is paid once their friend qualifies.' },
    { label: 'Referee', tip: 'The new customer who joined using the referrer\u2019s link or code. Their welcome bonus is paid when they qualify.' },
    { label: 'Rule', tip: 'The referral rule this referral falls under, with its corridor (send \u2192 receive currency) underneath. If a customer joins before choosing a destination, the rule is set at their first transfer.' },
    { label: 'Registered', tip: 'The date the referee created their account through the referral link or code.' },
    { label: 'Deadlines', tip: 'Last day to qualify. Referrer = end of the Qualification Window; Referee = end of the Bonus Validity period, counted from the registration date. Only one date is shown when both are the same.' },
    { label: 'Qualifying transfer', tip: 'The first transfer by the referee that met the rule\u2019s conditions (corridor and minimum amount), with its amount underneath. Blank until the referee qualifies.' },
    { label: 'Status', tip: 'Where the referral stands: Registered (joined, no transfer yet), Pending (transfer in progress), Rewarded (bonus paid), Expired (deadline passed), Not eligible (failed a condition) or Reversed (bonus taken back).' },
    { label: 'Referrer bonus', num: true, tip: 'Bonus credited to the referrer. Shows \u201cdue\u201d in grey when it will be paid once the referral qualifies. Click an amount to see it in the Credit Ledger.' },
    { label: 'Referee bonus', num: true, tip: 'Welcome bonus credited to the referee. Shows \u201cdue\u201d in grey when it will be paid once they qualify. Click an amount to see it in the Credit Ledger.' },
    { label: 'Rewarded', tip: 'The date the bonus was paid out. Blank if no bonus has been paid yet.' },
    { label: 'Action', tip: 'Actions you can take on this referral. \u201cApprove reward\u201d appears on Not eligible referrals so an admin can pay the bonus anyway, with a recorded reason.' },
];

const KPI_TIPS = {
    total: 'Number of referrals that match the filters below: every customer who registered through a referral link or code.',
    pending: 'Referrals still waiting for the referee to qualify: Registered (no transfer yet) or Pending (transfer in progress).',
    rewarded: 'Referrals where the bonus has been paid.',
    conversion: 'Share of referrals that were rewarded: Rewarded \u00f7 Total referrals.',
    bonus: 'Total bonus credited to referrers and referees for these referrals, shown per currency.',
};

const FILTER_TIPS = {
    search: 'Find a referral by customer name, customer ID, email address or referral code.',
    status: 'Show only referrals with this status. \u201cRegistered or Pending\u201d and \u201cExpired / Not eligible / Reversed\u201d appear when you arrive from the Performance page.',
    currency: 'The currency the referee sends from, for example GBP.',
    receive: 'The currency the money is received in, for example NGN. Together with Send currency this selects a corridor.',
    rule: 'Show only referrals that fall under this referral rule.',
    from: 'Only include referrals registered on or after this date.',
    to: 'Only include referrals registered on or before this date.',
};
const fullName = (f, l) => `${f || ''} ${l || ''}`.trim() || 'Unknown customer';

const CHANNEL_BADGES = {
    WEB: { label: 'Web', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    ANDROID: { label: 'Android App', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    IOS: { label: 'iOS App', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
};

const METHOD_LABELS = {
    DIRECT_LINK: 'Direct referral link',
    PLAY_INSTALL_REFERRER: 'Google Play Install Referrer',
    IOS_PRE_REGISTER: 'iOS Register Before Download',
    IOS_MANUAL_CODE: 'iOS App Manual Code',
    MANUAL_CODE: 'Manual Referral Code',
    UNIVERSAL_LINK: 'App / Universal Link',
};

const CLICK_STATUS_BADGES = {
    CLICKED: { label: 'Link Clicked', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' },
    STORE_REDIRECT: { label: 'Store Redirected', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    RESOLVED: { label: 'App First-Launch Resolved', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
    LINKED: { label: 'Registered & Attributed', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
    EXPIRED: { label: 'Expired', bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
};

// US-1.6: every referral with its Referrer, Referee, status, channel attribution and reward
const ReferralTracking = () => {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState(params.get('view') === 'clicks' ? 'clicks' : 'referrals');
    const [rules, setRules] = useState([]);
    const [result, setResult] = useState({ data: [], total: 0, summary: null });
    const [clicksResult, setClicksResult] = useState({ data: [], total: 0, summary: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState(params.get('q') || '');
    const [approve, setApprove] = useState(null);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState('');
    const [token, setToken] = useState(getAdminToken());
    const [tokenError, setTokenError] = useState('');
    const { toasts, push, dismiss } = useToasts();

    const filters = Object.fromEntries(['status', 'status_group', 'channel', 'currency', 'receive_currency', 'rule_id', 'from', 'to', 'q', 'page'].map((k) => [k, params.get(k) || '']));
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
            const [refRes, clkRes] = await Promise.all([
                fetch(`/api/referral/tracking?${qs.toString()}`),
                fetch(`/api/referral/clicks?${qs.toString()}`),
            ]);
            if (!refRes.ok) throw new Error();
            setResult(await refRes.json());
            if (clkRes.ok) setClicksResult(await clkRes.json());
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
        setAdminToken(token);
        try {
            const res = await fetch(`/api/referral/referrals/${approve.id}/approve`, {
                method: 'POST', headers: adminHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ reason: text }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401 || res.status === 403) {
                if (res.status === 401) setAdminToken('');
                setTokenError(data.message || 'Only a Growth Manager can approve rewards.');
                return;
            }
            if (!res.ok) throw new Error(data.message);
            push(`Reward approved for referral ${approve.id}.`);
            setApprove(null);
            load();
        } catch (e) {
            push(e.message || "We couldn't approve this reward. Please try again.", 'error');
        }
    };

    const s = result.summary;
    const cs = clicksResult.summary;
    const pages = Math.max(1, Math.ceil(((viewMode === 'clicks' ? clicksResult.total : result.total) || 0) / PAGE_SIZE));
    const hasFilters = ['status', 'status_group', 'channel', 'currency', 'receive_currency', 'rule_id', 'from', 'to', 'q'].some((k) => filters[k]);

    return (
        <div className="rf-page">
            <ToastStack toasts={toasts} onDismiss={dismiss} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                <div>
                    <h2 className="rf-title">Referral Tracking &amp; Attribution</h2>
                    <p className="rf-subtitle">Every customer who joined through a referral link or code across Web, Android (Google Play Install Referrer), and iOS (App Store).</p>
                </div>
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0' }} role="tablist" aria-label="Tracking view mode">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={viewMode === 'referrals'}
                        onClick={() => setViewMode('referrals')}
                        style={{
                            padding: '7px 14px', borderRadius: 7, border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            background: viewMode === 'referrals' ? '#ffffff' : 'transparent',
                            color: viewMode === 'referrals' ? '#0f172a' : '#64748b',
                            boxShadow: viewMode === 'referrals' ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                        }}
                    >
                        Registered Referrals ({result.total || 0})
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={viewMode === 'clicks'}
                        onClick={() => setViewMode('clicks')}
                        style={{
                            padding: '7px 14px', borderRadius: 7, border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            background: viewMode === 'clicks' ? '#ffffff' : 'transparent',
                            color: viewMode === 'clicks' ? '#0f172a' : '#64748b',
                            boxShadow: viewMode === 'clicks' ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                        }}
                    >
                        Link Clicks &amp; App Installs ({clicksResult.total || 0})
                    </button>
                </div>
            </div>

            <div className="rf-kpis">
                <div className="rf-kpi"><div className="rf-kpi-label"><ColHead label="Total referrals" tip={KPI_TIPS.total} /></div><div className="rf-kpi-value">{s ? s.total : '—'}</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label"><ColHead label="Pending" tip={KPI_TIPS.pending} /></div><div className="rf-kpi-value">{s ? s.pending : '—'}</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label"><ColHead label="Rewarded" tip={KPI_TIPS.rewarded} /></div><div className="rf-kpi-value">{s ? s.rewarded : '—'}</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label"><ColHead label="Conversion rate" tip={KPI_TIPS.conversion} /></div><div className="rf-kpi-value">{s && s.conversion_rate !== null ? `${s.conversion_rate.toFixed(1)}%` : '—'}</div><div className="rf-kpi-sub">Rewarded ÷ Registered</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label"><ColHead label="Total bonus issued" tip={KPI_TIPS.bonus} /></div>
                    <div className="rf-kpi-value" style={{ fontSize: '1.15rem' }}>
                        {s && Object.keys(s.bonus_issued).length ? Object.entries(s.bonus_issued).map(([c, v]) => <div key={c}>{formatMoney(v, c)}</div>) : '—'}
                    </div>
                </div>
                {cs && (
                    <div className="rf-kpi">
                        <div className="rf-kpi-label"><ColHead label="Click → App / Web Traceability" tip="Tracked referral link clicks across Web, Android Google Play Store, and Apple App Store." /></div>
                        <div className="rf-kpi-value" style={{ fontSize: '1.05rem' }}>{cs.total_clicks} clicks</div>
                        <div className="rf-kpi-sub">Android: {cs.android_clicks} · iOS: {cs.ios_clicks} · Linked: {cs.linked_registrations}</div>
                    </div>
                )}
            </div>

            <div className="rf-card">
                <div className="rf-filters">
                    <div className="rf-field" style={{ flex: 2 }}><label htmlFor="rt-q"><ColHead label="Search" tip={FILTER_TIPS.search} /></label>
                        <input id="rt-q" className="rf-input" placeholder="Name, customer ID, email, referral code or tracking ID (REF...)" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <div className="rf-field"><label htmlFor="rt-status"><ColHead label="Status" tip={FILTER_TIPS.status} /></label>
                        <select id="rt-status" className="rf-select" value={filters.status || (filters.status_group ? `group:${filters.status_group}` : '')}
                            onChange={(e) => (e.target.value.startsWith('group:') ? setFilter('status_group', e.target.value.slice(6)) : setFilter('status', e.target.value))}>
                            <option value="">All statuses</option>
                            {filters.status_group && <option value={`group:${filters.status_group}`}>{filters.status_group === 'pending' ? 'Registered or Pending' : 'Expired / Not eligible / Reversed'}</option>}
                            {STATUSES.map((st) => <option key={st} value={st}>{st.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}</option>)}
                        </select></div>
                    <div className="rf-field"><label htmlFor="rt-channel"><ColHead label="Channel" tip="Filter referrals by the platform channel where the referee registered (Web, Android App, or iOS App)." /></label>
                        <select id="rt-channel" className="rf-select" value={filters.channel} onChange={(e) => setFilter('channel', e.target.value)}>
                            <option value="">All channels</option>
                            <option value="WEB">Web</option>
                            <option value="ANDROID">Android App</option>
                            <option value="IOS">iOS App</option>
                        </select></div>
                    <div className="rf-field"><label htmlFor="rt-currency"><ColHead label="Send currency" tip={FILTER_TIPS.currency} /></label>
                        <select id="rt-currency" className="rf-select" value={filters.currency} onChange={(e) => setFilter('currency', e.target.value)}>
                            <option value="">All currencies</option>
                            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                        </select></div>
                    <div className="rf-field"><label htmlFor="rt-receive-currency"><ColHead label="Receive currency" tip={FILTER_TIPS.receive} /></label>
                        <select id="rt-receive-currency" className="rf-select" value={filters.receive_currency} onChange={(e) => setFilter('receive_currency', e.target.value)}>
                            <option value="">All currencies</option>
                            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                        </select></div>
                    <div className="rf-field"><label htmlFor="rt-rule"><ColHead label="Rule" tip={FILTER_TIPS.rule} /></label>
                        <select id="rt-rule" className="rf-select" value={filters.rule_id} onChange={(e) => setFilter('rule_id', e.target.value)}>
                            <option value="">All rules</option>
                            {rules.map((r) => <option key={r.id} value={r.id}>{r.name} ({corridorLabel(r.base_currency, r.receive_currency)}){r.status === 'ARCHIVED' ? ' (archived)' : ''}</option>)}
                        </select></div>
                    <div className="rf-field"><label htmlFor="rt-from"><ColHead label="Registered from" tip={FILTER_TIPS.from} /></label>
                        <input id="rt-from" type="date" className="rf-input" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} /></div>
                    <div className="rf-field"><label htmlFor="rt-to"><ColHead label="Registered to" tip={FILTER_TIPS.to} /></label>
                        <input id="rt-to" type="date" className="rf-input" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} /></div>
                    <div className="rf-quick">
                        {hasFilters && <button type="button" className="btn-secondary" onClick={() => { setSearch(''); setParams(new URLSearchParams()); }}>Clear</button>}
                        <button type="button" className="btn-secondary" onClick={() => downloadUrl(`/api/referral/tracking.csv?${params.toString()}`)}>Export CSV</button>
                    </div>
                </div>

                {viewMode === 'referrals' ? (
                    <div className="rf-table-wrap">
                        <table className="rf-table">
                            <thead>
                                <tr>
                                    {COLUMNS.map((c) => (
                                        <th key={c.label} className={c.num ? 'rf-num' : undefined}><ColHead label={c.label} tip={c.tip} /></th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="12" className="rf-empty">Loading referrals...</td></tr>
                                ) : error ? (
                                    <tr><td colSpan="12" className="rf-empty">We couldn&apos;t load referrals. <button type="button" className="rf-link" onClick={load}>Retry</button></td></tr>
                                ) : result.data.length === 0 ? (
                                    <tr><td colSpan="12" className="rf-empty">{hasFilters ? 'No referrals match your filters.' : 'No referrals yet.'}</td></tr>
                                ) : result.data.map((r) => {
                                    const chKey = String(r.registration_channel || 'WEB').toUpperCase();
                                    const chBadge = CHANNEL_BADGES[chKey] || CHANNEL_BADGES.WEB;
                                    const methodText = METHOD_LABELS[r.attribution_method] || r.attribution_method || 'Direct link';
                                    return (
                                        <tr key={r.id}>
                                            <td className="rf-strong" style={{ whiteSpace: 'nowrap' }}>
                                                {r.id}
                                                <span className="rf-sub">Code {r.code}</span>
                                                {r.tracking_id && <span className="rf-sub" style={{ fontFamily: 'monospace', color: '#0369a1' }} title="Click / Install Tracking ID">Track: {r.tracking_id}</span>}
                                            </td>
                                            <td>{fullName(r.referrer_first_name, r.referrer_last_name)}<span className="rf-sub">ID: {r.referrer_id}</span></td>
                                            <td>{fullName(r.referee_first_name, r.referee_last_name)}<span className="rf-sub">ID: {r.referee_id}</span></td>
                                            <td>{r.rule_name || <span className="rf-muted">—</span>}<span className="rf-sub">{r.rule_id ? corridorLabel(r.currency, r.receive_currency, '?') : `${r.currency || '?'} · rule set at first transfer`}</span></td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                {formatUkDate(r.registered_at)}
                                                <div style={{ marginTop: 4 }}>
                                                    <span style={{
                                                        display: 'inline-block', padding: '1px 7px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                                                        background: chBadge.bg, color: chBadge.color, border: `1px solid ${chBadge.border}`,
                                                    }} title={methodText}>
                                                        {chBadge.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                {r.referrer_deadline && r.qualification_deadline && r.referrer_deadline.slice(0, 10) !== r.qualification_deadline.slice(0, 10) ? (
                                                    <>
                                                        <div className="rf-bonus"><span>Referrer</span><b className="rf-dl">{formatUkDate(r.referrer_deadline)}</b></div>
                                                        <div className="rf-bonus"><span>Referee</span><b className="rf-dl">{formatUkDate(r.qualification_deadline)}</b></div>
                                                    </>
                                                ) : formatUkDate(r.qualification_deadline || r.referrer_deadline)}
                                            </td>
                                            <td>{r.qualifying_transfer_id || <span className="rf-muted">—</span>}{r.qualifying_amount ? <span className="rf-sub">{formatMoney(r.qualifying_amount, r.currency)}</span> : null}</td>
                                            <td>
                                                <StatusPill status={r.status} title={r.status_reason} />
                                                {r.status_reason && <span className="rf-sub" style={{ maxWidth: 200 }}>{r.status_reason}</span>}
                                            </td>
                                            <td className="rf-num">
                                                {r.referrer_credited > 0
                                                    ? <button type="button" className="rf-link" onClick={() => navigate(`/growth/credit-ledger?customerId=${encodeURIComponent(r.referrer_id)}&creditSource=REFERRAL&referralId=${r.id}`)}>{formatMoney(r.referrer_credited, r.currency)}</button>
                                                    : <span className="rf-muted">{r.reward_type === 'REFEREE' || !r.rule_id ? '—' : formatMoney(r.referrer_reward, r.currency) + ' due'}</span>}
                                            </td>
                                            <td className="rf-num">
                                                {r.referee_credited > 0
                                                    ? <button type="button" className="rf-link" onClick={() => navigate(`/growth/credit-ledger?customerId=${encodeURIComponent(r.referee_id)}&creditSource=REFERRAL&referralId=${r.id}`)}>{formatMoney(r.referee_credited, r.currency)}</button>
                                                    : <span className="rf-muted">{r.reward_type === 'REFERRER' || !r.rule_id ? '—' : formatMoney(r.referee_reward, r.currency) + ' due'}</span>}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatUkDate(r.rewarded_at)}</td>
                                            <td>{r.status === 'NOT_ELIGIBLE' && <button type="button" className="rf-btn-sm" onClick={() => { setApprove(r); setReason(''); setReasonError(''); }}>Approve reward</button>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rf-table-wrap">
                        <table className="rf-table" data-testid="clicks-traceability-table">
                            <thead>
                                <tr>
                                    <th><ColHead label="Tracking ID" tip="Unique unpredictable tracking identifier generated when the referral link was opened." /></th>
                                    <th><ColHead label="Referral Code & Referrer" tip="The referral code clicked and the existing customer who owns it." /></th>
                                    <th><ColHead label="Device & OS" tip="Detected device category (mobile / tablet / desktop) and operating system (Android / iOS / Desktop)." /></th>
                                    <th><ColHead label="Store / Handoff Target" tip="Where the visitor chose to continue: Google Play Store (with Play Install Referrer), Apple App Store, or Web." /></th>
                                    <th><ColHead label="Attribution Status" tip="Lifecycle of the click: Link Clicked → Store Redirected → App First-Launch Resolved → Registered & Attributed." /></th>
                                    <th><ColHead label="Linked Referral & Referee" tip="Once the referee completes registration, this links the click directly to their Referral ID and customer account." /></th>
                                    <th><ColHead label="Clicked At" tip="Timestamp when the referral link was accessed." /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="rf-empty">Loading click traceability records...</td></tr>
                                ) : clicksResult.data.length === 0 ? (
                                    <tr><td colSpan="7" className="rf-empty">No referral link clicks recorded yet.</td></tr>
                                ) : clicksResult.data.map((c) => {
                                    const stKey = String(c.attribution_status || 'CLICKED').toUpperCase();
                                    const stBadge = CLICK_STATUS_BADGES[stKey] || CLICK_STATUS_BADGES.CLICKED;
                                    return (
                                        <tr key={c.id}>
                                            <td className="rf-strong" style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                                {c.tracking_id || `VISIT-${c.id}`}
                                            </td>
                                            <td>
                                                <strong>{c.code}</strong>
                                                <span className="rf-sub">{fullName(c.referrer_first_name, c.referrer_last_name)} ({c.referrer_id})</span>
                                            </td>
                                            <td>
                                                <strong>{c.operating_system || 'Unknown OS'}</strong>
                                                <span className="rf-sub">{c.device_type || 'desktop'} · {c.source_channel || 'LINK'}</span>
                                            </td>
                                            <td>
                                                {c.store_target === 'GOOGLE_PLAY' ? (
                                                    <span style={{ color: '#047857', fontWeight: 600 }}>Google Play Store (com.funtechcom.rhemito)</span>
                                                ) : c.store_target === 'APPLE_APP_STORE' ? (
                                                    <span style={{ color: '#6d28d9', fontWeight: 600 }}>Apple App Store (id1494717263)</span>
                                                ) : c.store_target === 'WEB' ? (
                                                    <span style={{ color: '#1d4ed8', fontWeight: 600 }}>Web Registration</span>
                                                ) : (
                                                    <span className="rf-muted">Landing Page Viewed</span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 600,
                                                    background: stBadge.bg, color: stBadge.color, border: `1px solid ${stBadge.border}`,
                                                }}>
                                                    {stBadge.label}
                                                </span>
                                                {c.resolved_at && <span className="rf-sub">Resolved: {formatUkDate(c.resolved_at)}</span>}
                                            </td>
                                            <td>
                                                {c.linked_referral_id ? (
                                                    <>
                                                        <strong>{c.linked_referral_id}</strong>
                                                        <span className="rf-sub">{fullName(c.referee_first_name, c.referee_last_name)} ({c.linked_referee_id})</span>
                                                    </>
                                                ) : (
                                                    <span className="rf-muted">Awaiting registration</span>
                                                )}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatUkDate(c.created_at)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {(viewMode === 'clicks' ? clicksResult.total : result.total) > PAGE_SIZE && (
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
                <div className="rf-field" style={{ marginBottom: 12 }}>
                    <label htmlFor="rt-token">Access token</label>
                    <input id="rt-token" type="password" autoComplete="off" className={`rf-input${tokenError ? ' rf-invalid' : ''}`} value={token}
                        onChange={(e) => { setToken(e.target.value); setTokenError(''); }} placeholder="Your Growth Manager access token" />
                    {tokenError ? <div className="rf-error">{tokenError}</div> : <div className="rf-hint">Approvals are limited to the Growth Manager role. Your name is recorded from this token.</div>}
                </div>
            </ConfirmDialog>
        </div>
    );
};

export default ReferralTracking;
