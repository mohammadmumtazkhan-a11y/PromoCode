import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { corridorLabel } from '../Growth/referralUtils';
import { ColHead } from '../Growth/ColHead';
import { ToastStack } from '../../components/Feedback';
import { useToasts } from '../../components/useToasts';
import { Field, Modal, CurrencyPicker } from './components/FormBits';
import { validateAdjustment } from './lib/schemeValidation';
import { formatMoney, fmtDate, SOURCE_LABELS, SOURCE_TONE } from './lib/bonusUtils';
import '../Growth/referral.css';
import './bonus.css';

const COLUMNS = [
    { key: 'date', label: 'Date', tip: 'When this ledger entry was recorded (UK date and time).' },
    { key: 'customer', label: 'Customer', tip: 'The customer whose bonus wallet this entry belongs to, with their customer ID underneath.' },
    { key: 'type', label: 'Type', tip: 'Earned (credit added), Applied (spent on a transfer), Expired (unused credit lapsed), Voided (removed), Clawback (spent bonus owed back) or Clawback repaid.' },
    { key: 'source', label: 'Source', tip: 'How the credit was earned: Referrals, Bonus offers or From Rhemito (goodwill and corrections). Spending and expiry rows show the source of the credit they came from.' },
    { key: 'scheme', label: 'Scheme', tip: 'The bonus scheme, referral rule or promo code behind this entry. For referral rules the corridor (send → receive currency) is shown underneath.' },
    { key: 'ref', label: 'Reference / Reason', tip: 'Why the entry exists: the reason code, the Referrer or Referee role, the referral ID, and the transfer it relates to.' },
    { key: 'notes', label: 'Notes', tip: 'Free-text explanation recorded with the entry. Click a row to open the full details and audit history.' },
    { key: 'amount', label: 'Amount', right: true, tip: 'Change to the bonus balance in the entry’s own currency. Green (+) adds credit; red (−) takes it away.' },
    { key: 'expires', label: 'Expires', tip: 'Last day the earned credit can be spent (UK time). Empty for entries that are not new credit.' },
    { key: 'status', label: 'Credit status', tip: 'For earned credit: Unused, Partly used, Used, Expired or Reversed.' },
];
const RUNNING = { key: 'running', label: 'Running balance', right: true, tip: 'The customer’s bonus balance in this currency after this entry. Shown when a single customer is selected in the Customer ID filter.' };
const TYPE_LABEL = { EARNED: 'Earned', APPLIED: 'Applied', EXPIRED: 'Expired', VOIDED: 'Voided', CLAWBACK: 'Clawback', CLAWBACK_SETTLED: 'Clawback repaid' };
const CREDIT_STATUS = { UNUSED: ['Unused', 'green'], PARTLY_USED: ['Partly used', 'blue'], USED: ['Used', 'grey'], EXPIRED: ['Expired', 'amber'], REVERSED: ['Reversed', 'red'] };
const DETAIL = { REFERRER: 'Referrer', REFEREE: 'Referee', LOYALTY_CREDIT: 'Loyalty', TRANSACTION_THRESHOLD_CREDIT: 'Large transfer', REQUEST_MONEY: 'Request money', GOODWILL: 'Goodwill', LOYALTY: 'Loyalty', CORRECTION: 'Correction', MANUAL_ADJUSTMENT: 'Manual adjustment', REFERRAL_CREDIT: 'Legacy referral' };

const FILTER_TIPS = {
    start: 'Only show entries recorded on or after this date.',
    end: 'Only show entries recorded on or before this date.',
    type: 'Show only one kind of entry.',
    source: 'Show only credit earned one way: Referrals, Bonus offers or From Rhemito. Promo code rows are hidden while a source is chosen.',
    scheme: 'Show entries for one bonus scheme, referral rule (with its corridor) or promo code.',
    customer: 'Show one customer’s entries, their balance by source and running balance. Enter the customer ID, for example user_101.',
    cost: 'Total value of all entries in the table below, counting credits and debits as positive, per currency. It measures the bonus activity, not the money owed.',
    outstanding: 'Bonus customers can still spend today, per currency, split by how it was earned.',
    debt: 'Bonus already spent from credit that was later reversed, to be repaid from the customer’s next bonus.',
};

const EMPTY_ADJ = { type: 'EARNED', user_id: '', currency: 'GBP', amount: '', reason_code: 'GOODWILL', validity_days: '90', scheme_id: '', notes: '' };

const UserCreditLedger = () => {
    const [searchParams] = useSearchParams();
    const { toasts, push, dismiss } = useToasts();
    const [data, setData] = useState({ cost_by_currency: {}, history: [], outstanding_by_currency: {}, debt_by_currency: {} });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [bonusSchemes, setBonusSchemes] = useState([]);
    const [referralRules, setReferralRules] = useState([]);
    const [promoOptions, setPromoOptions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [bonusBlock, setBonusBlock] = useState(null);
    const [filters, setFilters] = useState({
        startDate: '', endDate: '', eventType: '', creditSource: searchParams.get('creditSource') || '',
        schemeId: searchParams.get('schemeId') || '', customerId: searchParams.get('customerId') || '', referralId: searchParams.get('referralId') || '',
    });
    const [customerInput, setCustomerInput] = useState(searchParams.get('customerId') || '');
    const [adjOpen, setAdjOpen] = useState(false);
    const [adj, setAdj] = useState(EMPTY_ADJ);
    const [adjErrors, setAdjErrors] = useState({});
    const [adjAvailable, setAdjAvailable] = useState(null);
    const [adjSaving, setAdjSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/bonus-schemes').then((r) => r.json()).catch(() => ({})),
            fetch('/api/promocodes').then((r) => r.json()).catch(() => ({})),
            fetch('/api/referral-rules?include_archived=1').then((r) => r.json()).catch(() => ({})),
        ]).then(([schemeData, promoData, ruleData]) => {
            setBonusSchemes((schemeData.data || []).filter((s) => s.bonus_type !== 'REFERRAL_CREDIT'));
            setPromoOptions((promoData.data || []).map((p) => ({ id: p.id, name: `Promo: ${p.code}` })));
            setReferralRules(ruleData.data || []);
        });
    }, []);

    useEffect(() => {
        setBonusBlock(null);
        if (!filters.customerId) return;
        fetch(`/api/bonus-blocks/${encodeURIComponent(filters.customerId)}`).then((r) => r.json()).then((d) => setBonusBlock(d.block || null)).catch(() => {});
    }, [filters.customerId]);

    const query = useCallback(() => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        const s = params.toString();
        return s ? `?${s}` : '';
    }, [filters]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/credits/all${query()}`);
            if (!res.ok) throw new Error('load');
            setData(await res.json());
            setLoadError(false);
        } catch { setLoadError(true); }
        setLoading(false);
    }, [query]);
    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (customerInput.trim() !== filters.customerId) setFilters((f) => ({ ...f, customerId: customerInput.trim() }));
        }, 400);
        return () => clearTimeout(t);
    }, [customerInput, filters.customerId]);

    // Available balance for the adjustment's customer and currency
    useEffect(() => {
        if (!adjOpen || !adj.user_id.trim()) { setAdjAvailable(null); return undefined; }
        const t = setTimeout(() => {
            fetch(`/api/wallet/${encodeURIComponent(adj.user_id.trim())}?currency=${adj.currency}`).then((r) => r.json())
                .then((w) => setAdjAvailable(((w.balances || [])[0] || { available: 0 }).available))
                .catch(() => setAdjAvailable(null));
        }, 300);
        return () => clearTimeout(t);
    }, [adjOpen, adj.user_id, adj.currency]);

    const range = (days) => {
        const end = new Date(); const start = new Date();
        start.setDate(start.getDate() - days);
        setFilters({ ...filters, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
    };

    const openAdjust = () => {
        setAdj({ ...EMPTY_ADJ, user_id: filters.customerId || '' });
        setAdjErrors({});
        setAdjOpen(true);
    };

    const submitAdjust = async () => {
        const errs = validateAdjustment(adj, adjAvailable);
        if (errs.amount && adj.type === 'VOIDED' && adjAvailable !== null && Number(adj.amount) > adjAvailable) errs.amount = `You can remove at most ${formatMoney(adjAvailable, adj.currency)}.`;
        setAdjErrors(errs);
        if (Object.keys(errs).length) { push('Please correct the highlighted fields.', 'error'); return; }
        setAdjSaving(true);
        try {
            const res = await fetch('/api/credits/manual', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: adj.user_id.trim(), type: adj.type, amount: Number(adj.amount), currency: adj.currency, reason_code: adj.reason_code,
                    notes: adj.notes.trim(), scheme_id: adj.scheme_id || null, validity_days: adj.type === 'EARNED' ? Number(adj.validity_days) : undefined,
                    idempotency_key: `${adj.user_id.trim()}-${Date.now()}`,
                }),
            });
            const out = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (out.fields) setAdjErrors(out.fields);
                push(out.error || out.message || 'The adjustment could not be applied.', 'error');
                return;
            }
            push(out.message || 'Adjustment applied.');
            setAdjOpen(false);
            load();
        } catch { push('The server could not be reached. Please try again.', 'error'); }
        finally { setAdjSaving(false); }
    };

    const one = filters.customerId;
    const columns = [...COLUMNS, ...(one ? [RUNNING] : [])];
    const history = data.history || [];
    const customerBalances = (data.customer && data.customer.balances) || [];
    const outstanding = data.outstanding_by_currency || {};
    const debt = data.debt_by_currency || {};

    return (
        <div className="rf-page" style={{ padding: 32 }}>
            <ToastStack toasts={toasts} onDismiss={dismiss} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 600, margin: '0 0 8px' }}>User Credit Ledger</h2>
                    <p className="rf-subtitle">One bonus balance per customer and currency — every credit shows how it was earned.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <a className="btn-secondary" style={{ textDecoration: 'none' }} href={`/api/credits/all.csv${query()}`} download="bonus-ledger.csv">Export CSV</a>
                    <button type="button" className="btn-primary" onClick={openAdjust}>Manual adjustment</button>
                </div>
            </div>

            {bonusBlock && (
                <div role="alert" className="bn-banner" style={{ margin: '0 0 16px' }}>
                    <strong>Bonus blocked for {bonusBlock.customer_id}.</strong> {bonusBlock.reason}{' '}
                    <Link to="/growth/bonus-blocks" style={{ color: '#991b1b', fontWeight: 600 }}>Review and approve</Link>
                </div>
            )}

            <div className="rf-kpis">
                <div className="rf-kpi">
                    <div className="rf-kpi-label"><ColHead label="Cost incurred" tip={FILTER_TIPS.cost} /></div>
                    {Object.keys(data.cost_by_currency || {}).length === 0 ? <div className="rf-kpi-value">0.00</div>
                        : Object.entries(data.cost_by_currency).map(([c, v]) => <div key={c} className="rf-kpi-value" style={{ fontSize: '1.25rem' }} data-testid={`cost-${c}`}>{c} {Number(v).toFixed(2)}</div>)}
                    <div className="rf-kpi-sub">Totals are shown per currency and never added together.</div>
                </div>
                <div className="rf-kpi" data-testid="kpi-outstanding">
                    <div className="rf-kpi-label"><ColHead label="Outstanding bonus" tip={FILTER_TIPS.outstanding} /></div>
                    {!Object.keys(outstanding).length ? <div className="rf-kpi-value">0.00</div> : Object.entries(outstanding).map(([c, o]) => (
                        <div key={c}>
                            <div className="rf-kpi-value" style={{ fontSize: '1.25rem' }}>{formatMoney(o.total, c)}</div>
                            <div className="rf-kpi-sub">{Object.entries(o.by_source || {}).map(([s, v]) => `${SOURCE_LABELS[s] || s} ${formatMoney(v, c)}`).join(' · ')}</div>
                        </div>
                    ))}
                </div>
                <div className="rf-kpi" data-testid="kpi-debt">
                    <div className="rf-kpi-label"><ColHead label="Outstanding clawback debt" tip={FILTER_TIPS.debt} /></div>
                    {!Object.keys(debt).length ? <div className="rf-kpi-value">0.00</div> : Object.entries(debt).map(([c, v]) => <div key={c} className="rf-kpi-value" style={{ fontSize: '1.25rem' }}>{formatMoney(v, c)}</div>)}
                </div>
            </div>

            <div className="rf-card">
                <div className="rf-card-head">
                    <div><h3>Ledger History ({history.length} entries)</h3><p>Click a row for its details and audit history.</p></div>
                    <div className="rf-quick">
                        <button type="button" className="rf-btn-sm" onClick={() => range(7)}>Last 7 Days</button>
                        <button type="button" className="rf-btn-sm" onClick={() => range(30)}>Last 30 Days</button>
                        <button type="button" className="rf-btn-sm" onClick={() => { setCustomerInput(''); setFilters({ startDate: '', endDate: '', eventType: '', creditSource: '', schemeId: '', customerId: '', referralId: '' }); }}>Clear</button>
                    </div>
                </div>
                <div className="rf-filters">
                    <Field id="lf-start" label={<ColHead label="Start Date" tip={FILTER_TIPS.start} />}>
                        <input id="lf-start" type="date" className="rf-input" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
                    </Field>
                    <Field id="lf-end" label={<ColHead label="End Date" tip={FILTER_TIPS.end} />}>
                        <input id="lf-end" type="date" className="rf-input" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
                    </Field>
                    <Field id="lf-type" label={<ColHead label="Event Type" tip={FILTER_TIPS.type} />}>
                        <select id="lf-type" className="rf-select" value={filters.eventType} onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}>
                            <option value="">All Types</option>
                            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </Field>
                    <Field id="lf-source" label={<ColHead label="Source" tip={FILTER_TIPS.source} />}>
                        <select id="lf-source" className="rf-select" value={filters.creditSource} onChange={(e) => setFilters({ ...filters, creditSource: e.target.value })}>
                            <option value="">All</option>
                            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </Field>
                    <Field id="lf-scheme" label={<ColHead label="Bonus Scheme" tip={FILTER_TIPS.scheme} />}>
                        <select id="lf-scheme" className="rf-select" value={filters.schemeId} onChange={(e) => setFilters({ ...filters, schemeId: e.target.value })}>
                            <option value="">All Schemes</option>
                            <optgroup label="Bonus schemes">{bonusSchemes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                            {referralRules.length > 0 && <optgroup label="Referral rules">{referralRules.map((r) => <option key={`rr_${r.id}`} value={`rr_${r.id}`}>{r.name} ({corridorLabel(r.base_currency, r.receive_currency)}){r.status === 'ARCHIVED' ? ' – archived' : ''}</option>)}</optgroup>}
                            {promoOptions.length > 0 && <optgroup label="Promo codes">{promoOptions.map((p) => <option key={`promo_${p.id}`} value={p.id}>{p.name}</option>)}</optgroup>}
                        </select>
                    </Field>
                    <Field id="ledger-customer" label={<ColHead label="Customer ID" tip={FILTER_TIPS.customer} />}>
                        <input id="ledger-customer" type="text" className="rf-input" placeholder="e.g. user_101" maxLength={64} value={customerInput} onChange={(e) => setCustomerInput(e.target.value)} />
                    </Field>
                </div>

                {one && customerBalances.length > 0 && (
                    <div className="bn-strip" data-testid="balance-by-source">
                        {customerBalances.map((b) => (
                            <React.Fragment key={b.currency}>
                                {(b.by_source || []).map((g) => (
                                    <div className="bn-strip-item" key={`${b.currency}-${g.credit_source}`}>
                                        <h4><span>{g.label} · {b.currency}</span><span className={`rf-pill rf-pill-${SOURCE_TONE[g.credit_source] || 'grey'}`}>{formatMoney(g.available, b.currency)}</span></h4>
                                        <dl>
                                            <dt>Earned</dt><dd>{formatMoney(g.earned, b.currency)}</dd>
                                            <dt>Used</dt><dd>{formatMoney(g.used, b.currency)}</dd>
                                            <dt>Expired</dt><dd>{formatMoney(g.expired, b.currency)}</dd>
                                            <dt>Removed</dt><dd>{formatMoney(g.removed, b.currency)}</dd>
                                        </dl>
                                    </div>
                                ))}
                                <div className="bn-strip-item">
                                    <h4><span>Total · {b.currency}</span><span className="rf-pill rf-pill-green">{formatMoney(b.available, b.currency)}</span></h4>
                                    <dl><dt>Earned</dt><dd>{formatMoney(b.earned, b.currency)}</dd><dt>Used</dt><dd>{formatMoney(b.used, b.currency)}</dd><dt>Expired / removed</dt><dd>{formatMoney(b.expired, b.currency)}</dd>{b.outstanding_debt > 0 && <><dt>Clawback debt</dt><dd>{formatMoney(b.outstanding_debt, b.currency)}</dd></>}</dl>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                <div className="rf-table-wrap">
                    <table className="rf-table rf-compact data-table">
                        <thead>
                            <tr>{columns.map((c) => <th key={c.key} style={{ ...(c.right ? { textAlign: 'right' } : {}), ...(c.key === 'status' || c.key === 'running' ? { whiteSpace: 'normal' } : {}) }}><ColHead label={c.label} tip={c.tip} /></th>)}</tr>
                        </thead>
                        <tbody>
                            {loading && !history.length ? <tr><td colSpan={columns.length} className="rf-empty">Loading…</td></tr>
                                : loadError ? <tr><td colSpan={columns.length} className="rf-empty">The ledger could not be loaded. <button type="button" className="rf-link" onClick={load}>Try again</button></td></tr>
                                    : !history.length ? <tr><td colSpan={columns.length} className="rf-empty">No history found for these filters</td></tr>
                                        : history.map((e) => {
                                            const st = e.credit_status && CREDIT_STATUS[e.credit_status];
                                            return (
                                                <tr key={`${e.source_type}-${e.id}`} className="bn-clickable" onClick={() => setSelected(e)} title="Click to view details">
                                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.created_at)}<span className="rf-sub">{String(e.created_at || '').slice(11, 16)}</span></td>
                                                    <td><span className="rf-strong">{e.customer_name || 'Unknown customer'}</span><span className="rf-sub">ID: {e.user_id || '—'}</span></td>
                                                    <td><span className={`rf-pill rf-pill-${e.amount >= 0 ? 'green' : 'red'}`}>{TYPE_LABEL[e.type] || e.type}</span></td>
                                                    <td>{e.credit_source ? <span className="bn-source"><span className={`rf-pill rf-pill-${SOURCE_TONE[e.credit_source] || 'grey'}`}>{SOURCE_LABELS[e.credit_source]}</span>{e.credit_source_detail && <span className="rf-sub">{DETAIL[e.credit_source_detail] || e.credit_source_detail}</span>}</span> : e.source_type === 'PROMO' ? <span className="rf-chip" style={{ whiteSpace: 'nowrap' }}>Promo code</span> : <span className="rf-muted">—</span>}</td>
                                                    <td>{e.scheme_name || '—'}{e.rule_send_currency && <span className="rf-sub">{corridorLabel(e.rule_send_currency, e.rule_receive_currency)}</span>}</td>
                                                    <td>
                                                        {e.reason_code && <span className="rf-chip">{e.reason_code}</span>}
                                                        {e.referral_role && <span className={`rf-pill rf-pill-${e.referral_role === 'Referrer' ? 'blue' : 'green'}`} style={{ marginLeft: 6 }}>{e.referral_role}</span>}
                                                        <span className="rf-sub" style={{ marginTop: 4, wordBreak: 'break-all' }}>{e.reference_id || '—'}</span>
                                                        {e.referral_id && <span className="rf-sub">Referral {e.referral_id}</span>}
                                                    </td>
                                                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline', color: '#6b7280' }}>{e.notes || '—'}</td>
                                                    <td className="rf-num" style={{ fontWeight: 600, color: e.amount >= 0 ? '#16a34a' : '#ef4444' }}>{e.currency || 'GBP'} {e.amount >= 0 ? '+' : ''}{Number(e.amount).toFixed(2)}</td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{e.type === 'EARNED' && e.expires_at ? fmtDate(e.expires_at) : '—'}</td>
                                                    <td>{st ? <span className={`rf-pill rf-pill-${st[1]}`}>{st[0]}</span> : <span className="rf-muted">—</span>}</td>
                                                    {one && <td className="rf-num">{e.running_balance === undefined ? '—' : formatMoney(e.running_balance, e.currency || 'GBP')}</td>}
                                                </tr>
                                            );
                                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Credit Adjustment (BS-70 – BS-73) */}
            <Modal open={adjOpen} wide title="Manual Credit Adjustment" subtitle="Grant goodwill credit or remove credit from a customer's bonus balance." onClose={() => setAdjOpen(false)}
                footer={<><button type="button" className="btn-secondary" onClick={() => setAdjOpen(false)}>Cancel</button><button type="button" className="btn-primary" disabled={adjSaving} onClick={submitAdjust}>{adjSaving ? 'Applying...' : adj.type === 'EARNED' ? 'Grant credit' : 'Remove credit'}</button></>}>
                <div className="rf-grid rf-grid-2">
                    <Field id="adj-type" label="Type" required>
                        <select id="adj-type" className="rf-select" value={adj.type} onChange={(e) => setAdj({ ...adj, type: e.target.value })}>
                            <option value="EARNED">Grant credit</option>
                            <option value="VOIDED">Remove credit</option>
                        </select>
                    </Field>
                    <Field id="adj-user" label="Customer ID" required error={adjErrors.user_id}>
                        <input id="adj-user" className={`rf-input${adjErrors.user_id ? ' rf-invalid' : ''}`} value={adj.user_id} placeholder="e.g. user_101" onChange={(e) => setAdj({ ...adj, user_id: e.target.value })} />
                    </Field>
                </div>
                <div className="rf-grid rf-grid-2">
                    <Field id="adj-currency" label="Currency" required>
                        <CurrencyPicker id="adj-currency" value={adj.currency} onChange={(currency) => setAdj({ ...adj, currency })} />
                    </Field>
                    <Field id="adj-amount" label="Amount" required error={adjErrors.amount} hint={adj.type === 'VOIDED' ? 'Enter the amount to remove as a positive number.' : undefined}>
                        <input id="adj-amount" type="number" min="0" step="0.01" className={`rf-input${adjErrors.amount ? ' rf-invalid' : ''}`} value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
                    </Field>
                </div>
                {adj.user_id.trim() && adjAvailable !== null && (
                    <div className="bn-avail" data-testid="adj-available">Available to spend now: <b>{formatMoney(adjAvailable, adj.currency)}</b></div>
                )}
                <div className="rf-grid rf-grid-2">
                    <Field id="adj-reason" label="Reason code" required>
                        <select id="adj-reason" className="rf-select" value={adj.reason_code} onChange={(e) => setAdj({ ...adj, reason_code: e.target.value })}>
                            <option value="GOODWILL">Goodwill</option>
                            <option value="LOYALTY">Loyalty</option>
                            <option value="CORRECTION">Correction</option>
                            <option value="MANUAL_ADJUSTMENT">Manual adjustment</option>
                        </select>
                    </Field>
                    {adj.type === 'EARNED' ? (
                        <Field id="adj-validity" label="Bonus valid for (days)" required error={adjErrors.validity_days}>
                            <input id="adj-validity" type="number" min="1" max="730" className={`rf-input${adjErrors.validity_days ? ' rf-invalid' : ''}`} value={adj.validity_days} onChange={(e) => setAdj({ ...adj, validity_days: e.target.value })} />
                        </Field>
                    ) : <div />}
                </div>
                <div className="rf-grid">
                    <Field id="adj-scheme" label="Link to scheme (optional)">
                        <select id="adj-scheme" className="rf-select" value={adj.scheme_id} onChange={(e) => setAdj({ ...adj, scheme_id: e.target.value })}>
                            <option value="">None</option>
                            {bonusSchemes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </Field>
                    <Field id="adj-notes" label="Notes" required error={adjErrors.notes} hint='10–500 characters, e.g. "Ticket #1234 – compensation for a delayed payout".'>
                        <textarea id="adj-notes" rows={3} maxLength={500} className={`rf-input${adjErrors.notes ? ' rf-invalid' : ''}`} value={adj.notes} onChange={(e) => setAdj({ ...adj, notes: e.target.value })} />
                    </Field>
                </div>
            </Modal>

            {/* Entry details and audit history */}
            <Modal open={!!selected} wide title="Transaction Details" subtitle={selected ? `ID: ${selected.id}` : ''} onClose={() => setSelected(null)} closeLabel="Dismiss"
                footer={<button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Close</button>}>
                {selected && (
                    <>
                        <dl className="bn-kv">
                            <dt>Balance change</dt><dd style={{ fontWeight: 700, color: selected.amount >= 0 ? '#16a34a' : '#ef4444' }}>{selected.currency || 'GBP'} {selected.amount >= 0 ? '+' : ''}{Number(selected.amount).toFixed(2)}</dd>
                            <dt>Customer</dt><dd>{selected.customer_name || '—'} ({selected.user_id})</dd>
                            <dt>Type</dt><dd>{TYPE_LABEL[selected.type] || selected.type}</dd>
                            <dt>Source</dt><dd>{selected.credit_source_label || (selected.source_type === 'PROMO' ? 'Promo code' : '—')}</dd>
                            <dt>Reason / Scheme</dt><dd>{selected.reason_code ? `[${selected.reason_code}] ` : ''}{selected.scheme_name || ''}</dd>
                            {selected.rule_send_currency && <><dt>Corridor</dt><dd>{corridorLabel(selected.rule_send_currency, selected.rule_receive_currency)}</dd></>}
                            {selected.referral_id && <><dt>Referral</dt><dd>{selected.referral_role ? `${selected.referral_role} · ` : ''}{selected.referral_id}</dd></>}
                            {selected.transfer_id && <><dt>Transfer</dt><dd>{selected.transfer_id}</dd></>}
                            {selected.credit_status && <><dt>Credit status</dt><dd>{(CREDIT_STATUS[selected.credit_status] || [selected.credit_status])[0]}{selected.remaining !== undefined ? ` · ${formatMoney(selected.remaining, selected.currency)} left` : ''}</dd></>}
                        </dl>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px' }}><span>📜</span> Audit History</h4>
                        <table className="bn-history">
                            <thead><tr><th>When</th><th>What</th><th>By</th><th>Notes</th></tr></thead>
                            <tbody>
                                <tr><td>{fmtDate(selected.created_at)}</td><td>Bonus {TYPE_LABEL[selected.type] || selected.type}</td><td>{selected.admin_user || 'System'}</td><td>{selected.notes || '—'}</td></tr>
                                {selected.type === 'EARNED' && selected.expires_at && <tr><td>{fmtDate(selected.expires_at)}</td><td>Expires</td><td>System</td><td>Unused credit expires at the end of this day (UK time)</td></tr>}
                            </tbody>
                        </table>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default UserCreditLedger;
