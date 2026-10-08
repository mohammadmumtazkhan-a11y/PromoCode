import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ToastStack, ConfirmDialog } from '../../components/Feedback';
import { useToasts } from '../../components/useToasts';
import ColHead from '../Growth/ColHead';
import PromoCodeForm from './PromoCodeForm';
import BulkCodesModal from './BulkCodesModal';
import {
    CURRENCIES, STATUS_OPTIONS, STATUS_TONE, TYPE_LABELS, formatMoney, formatShortDate, formatUkDate, valueLabel, whoLabel, downloadUrl,
} from './lib/promoUtils';
import '../Growth/referral.css';
import './promo.css';

const COLS = [
    { label: 'Code', tip: 'The text customers type, with your internal note underneath.' },
    { label: 'Discount', tip: 'How much the code takes off the fee, with its type underneath: fixed amount, percentage of the fee, or the whole fee waived.' },
    { label: 'Where & who', tip: 'Corridors and payment methods the code works for, and which customers can use it.' },
    { label: 'Cost incurred', num: true, tip: 'Discount given so far, out of the budget when one is set.' },
    { label: 'Usage', tip: 'Uses so far out of the total limit, and the limit per customer.' },
    { label: 'Period', tip: 'When the code starts and ends.' },
    { label: 'Status', tip: 'Active, Scheduled, Expired, Disabled, Fully redeemed or Budget spent.' },
    { label: 'Actions', tip: 'Usage, Edit (only before first use), History and the Disable/Enable switch.' },
];

const Pill = ({ status, title }) => <span className={`rf-pill rf-pill-${STATUS_TONE[status] || 'grey'}`} title={title}>{status}</span>;

export default function PromoCodesPage() {
    const [params, setParams] = useSearchParams();
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [summary, setSummary] = useState(null);
    const [segments, setSegments] = useState([]);
    const [form, setForm] = useState(null); // { promo } | { promo: null }
    const [bulk, setBulk] = useState(false);
    const [usage, setUsage] = useState(null); // { promo, rows, loading }
    const [history, setHistory] = useState(null); // { promo, rows }
    const [confirm, setConfirm] = useState(null);
    const { toasts, push, dismiss } = useToasts();
    const filters = { q: params.get('q') || '', status: params.get('status') || '', type: params.get('type') || '', currency: params.get('currency') || '' };
    const setFilter = (k, v) => { const next = new URLSearchParams(params); if (v) next.set(k, v); else next.delete(k); setParams(next, { replace: true }); };

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const [list, sum] = await Promise.all([fetch('/api/promocodes').then((r) => r.json()), fetch('/api/promocodes/summary').then((r) => r.json())]);
            setPromos(list.data || []);
            setSummary(sum);
        } catch {
            setLoadError(true);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        load();
        fetch('/api/promocodes/segments').then((r) => r.json()).then((d) => setSegments(d.data || [])).catch(() => {});
    }, [load]);

    const visible = useMemo(() => promos.filter((p) => (!filters.q || p.code.includes(filters.q.trim().toUpperCase()))
        && (!filters.status || p.display_status === filters.status) && (!filters.type || p.type === filters.type)
        && (!filters.currency || p.currency === filters.currency)), [promos, filters.q, filters.status, filters.type, filters.currency]);

    const setStatus = async (p, status) => {
        try {
            const res = await fetch(`/api/promocodes/${p.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
            if (!res.ok) throw new Error();
            if (status === 'Disabled') push(`${p.code} disabled.`);
            else if (p.end_date && new Date(p.end_date) < new Date()) push(`${p.code} is enabled but its end date has passed, so customers still can't use it.`, 'info');
            else push(`${p.code} enabled.`);
            load();
        } catch { push("We couldn't change the status. Please try again.", 'error'); }
    };
    const toggle = (p) => {
        if (p.status === 'Disabled') return setStatus(p, 'Active');
        setConfirm({
            title: `Disable ${p.code}?`, message: 'Customers will not be able to use this code. Transfers already paid keep their discount.',
            confirmLabel: 'Disable', tone: 'danger', onConfirm: () => { setConfirm(null); setStatus(p, 'Disabled'); },
        });
        return undefined;
    };

    const openUsage = async (p) => {
        setUsage({ promo: p, rows: [], loading: true });
        try {
            const d = await fetch(`/api/promocodes/${p.id}/redemptions`).then((r) => r.json());
            setUsage({ promo: p, rows: d.data || [], loading: false });
        } catch { setUsage({ promo: p, rows: [], loading: false, error: true }); }
    };
    const openHistory = async (p) => {
        setHistory({ promo: p, rows: null });
        try { setHistory({ promo: p, rows: (await fetch(`/api/promocodes/${p.id}/audit`).then((r) => r.json())).data || [] }); } catch { setHistory({ promo: p, rows: [], error: true }); }
    };

    const used = (p) => (p.usage_count || 0) > 0 || (p.redeemed_count || 0) > 0;
    const cost = summary && summary.cost_incurred ? Object.entries(summary.cost_incurred) : [];
    const usageTotals = usage ? usage.rows.filter((r) => r.status === 'Redeemed') : [];

    return (
        <div className="rf-page promo-page">
            <ToastStack toasts={toasts} onDismiss={dismiss} />
            <div className="promo-head">
                <div>
                    <h2 className="rf-title">Promo Codes</h2>
                    <p className="rf-subtitle">Configure and monitor your promo codes and discounts.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" className="btn-secondary" onClick={() => setBulk(true)}>Bulk create</button>
                    <button type="button" className="btn-primary" onClick={() => setForm({ promo: null })}>+ Create New</button>
                </div>
            </div>

            <div className="rf-kpis">
                <div className="rf-kpi"><div className="rf-kpi-label"><ColHead label="Active codes" tip="Codes customers can use right now." /></div><div className="rf-kpi-value">{summary ? summary.active_codes : '—'}</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label"><ColHead label="Uses (last 30 days)" tip="Transfers that used a code in the last 30 days (released uses not counted)." /></div><div className="rf-kpi-value">{summary ? summary.uses : '—'}</div></div>
                <div className="rf-kpi"><div className="rf-kpi-label"><ColHead label="Cost incurred" tip="Total discount given, one figure per currency." /></div>
                    <div className="rf-kpi-value promo-kpi-multi">{cost.length ? cost.map(([c, v]) => <div key={c}>{formatMoney(v, c)}</div>) : '—'}</div></div>
            </div>

            <div className="rf-card">
                <div className="rf-filters">
                    <div className="rf-field" style={{ flex: 2 }}><label htmlFor="pc-q">Search</label>
                        <input id="pc-q" className="rf-input" placeholder="Code" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} /></div>
                    <div className="rf-field"><label htmlFor="pc-status">Status</label>
                        <select id="pc-status" className="rf-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                            <option value="">All</option>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div className="rf-field"><label htmlFor="pc-type">Type</label>
                        <select id="pc-type" className="rf-select" value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
                            <option value="">All</option>{Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                    <div className="rf-field"><label htmlFor="pc-cur">Currency</label>
                        <select id="pc-cur" className="rf-select" value={filters.currency} onChange={(e) => setFilter('currency', e.target.value)}>
                            <option value="">All</option>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
                    <button type="button" className="rf-btn-sm" onClick={() => downloadUrl('/api/promocodes.csv')}>Export CSV</button>
                </div>
                <div className="rf-table-wrap">
                    <table className="rf-table rf-compact">
                        <thead><tr>{COLS.map((c) => <th key={c.label} className={c.num ? 'rf-num' : undefined}><ColHead label={c.label} tip={c.tip} /></th>)}</tr></thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={COLS.length} className="rf-empty">Loading promo codes...</td></tr>
                            ) : loadError ? (
                                <tr><td colSpan={COLS.length} className="rf-empty">We couldn&apos;t load promo codes. <button type="button" className="rf-link" onClick={load}>Retry</button></td></tr>
                            ) : promos.length === 0 ? (
                                <tr><td colSpan={COLS.length} className="rf-empty">No promo codes yet. Create your first code.</td></tr>
                            ) : visible.length === 0 ? (
                                <tr><td colSpan={COLS.length} className="rf-empty">No promo codes match these filters.</td></tr>
                            ) : visible.map((p) => {
                                const r = p.restrictions || {};
                                const corridors = r.corridors || [];
                                return (
                                    <tr key={p.id} data-testid={`promo-row-${p.code}`}>
                                        <td>
                                            <div className="rf-strong promo-mono">{p.code}{p.is_legacy && <span className="rf-pill rf-pill-amber promo-tag">Legacy</span>}</div>
                                            {p.description && <span className="rf-sub">{p.description}</span>}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{valueLabel(p)}<span className="rf-sub">{TYPE_LABELS[p.type] || p.type}</span></td>
                                        <td className="promo-where">
                                            {corridors.length ? (
                                                <span>{corridors.slice(0, 2).map((c) => <span key={c} className="rf-chip promo-chip-sm">{c.replace('-', ' → ')}</span>)}{corridors.length > 2 && <span className="rf-sub" style={{ display: 'inline' }}> +{corridors.length - 2}</span>}</span>
                                            ) : <span>All corridors</span>}
                                            <span className="rf-sub">{(r.payment_methods || []).length ? r.payment_methods.join(', ') : 'All payment methods'}</span>
                                            <span className="rf-sub">{whoLabel(p.user_segment, segments)}</span>
                                        </td>
                                        <td className="rf-num">{formatMoney(p.total_discount_utilized || 0, p.currency)}{p.budget_limit !== -1 && p.budget_limit != null && <span className="rf-sub"> / {formatMoney(p.budget_limit, p.currency)}</span>}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{p.usage_count}/{p.usage_limit_global === -1 ? '∞' : p.usage_limit_global}
                                            <span className="rf-sub">({p.usage_limit_per_user === -1 ? '∞' : p.usage_limit_per_user}/user)</span></td>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatShortDate(p.start_date)} – {formatShortDate(p.end_date)}</td>
                                        <td><Pill status={p.display_status} title={p.display_status === 'Expired' ? 'The end date has passed, so customers cannot use this code.' : undefined} /></td>
                                        <td>
                                            <div className="promo-actions">
                                                <button type="button" className="rf-btn-sm" onClick={() => openUsage(p)}>Usage</button>
                                                {(!used(p) || p.is_legacy) && <button type="button" className="rf-btn-sm" title={p.is_legacy ? 'View this legacy code' : 'Only codes that have not been used can be edited'} onClick={() => setForm({ promo: p })}>{p.is_legacy ? 'View' : 'Edit'}</button>}
                                                <button type="button" className="rf-btn-sm" onClick={() => openHistory(p)}>History</button>
                                                <button type="button" className={`rf-btn-sm${p.status === 'Disabled' ? '' : ' rf-warn'}`} onClick={() => toggle(p)}>{p.status === 'Disabled' ? 'Enable' : 'Disable'}</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {form && (
                <PromoCodeForm promo={form.promo} existingCodes={promos.map((p) => p.code)} segments={segments} push={push}
                    onClose={() => setForm(null)} onSaved={load} />
            )}
            {bulk && <BulkCodesModal push={push} onClose={() => setBulk(false)} onDone={load} />}

            {usage && (
                <div className="rf-dialog-backdrop" onClick={() => setUsage(null)}>
                    <div className="rf-dialog promo-dialog" role="dialog" aria-modal="true" aria-labelledby="usage-title" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="rf-dialog-close" aria-label="Close" onClick={() => setUsage(null)}>×</button>
                        <h3 id="usage-title">Where <span className="promo-mono">{usage.promo.code}</span> was used</h3>
                        {usage.loading ? <div className="rf-empty">Loading...</div> : usage.error ? <div className="rf-empty">We couldn&apos;t load the usage. Please try again.</div>
                            : usage.rows.length === 0 ? <div className="rf-empty">This code has not been used on any transfer yet.</div> : (
                                <>
                                    <div className="rf-table-wrap"><table className="rf-table rf-compact">
                                        <thead><tr><th>Transfer</th><th>Customer</th><th>Corridor</th><th>Payment method</th><th className="rf-num">Discount</th><th>Status</th><th>Date</th></tr></thead>
                                        <tbody>{usage.rows.map((r) => (
                                            <tr key={r.id}>
                                                <td className="promo-mono">{r.transaction_id}</td>
                                                <td>{r.customer_name || '—'}<span className="rf-sub">{r.user_id || ''}</span></td>
                                                <td>{r.source_currency && r.dest_currency ? `${r.source_currency} → ${r.dest_currency}` : '—'}</td>
                                                <td>{r.payment_method || '—'}</td>
                                                <td className="rf-num">{formatMoney(r.discount_amount, r.currency || usage.promo.currency)}</td>
                                                <td>{r.status === 'Released' ? 'Released (cancelled, failed or refunded)' : r.status}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{formatUkDate(r.created_at, true)}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table></div>
                                    <p className="rf-hint">Redeemed: {usageTotals.length} · Discount given: {formatMoney(usageTotals.reduce((s, r) => s + Number(r.discount_amount || 0), 0), usage.promo.currency)}</p>
                                </>
                            )}
                        <div className="rf-dialog-actions">
                            <button type="button" className="btn-secondary" onClick={() => setUsage(null)}>Close</button>
                            {usage.rows.length > 0 && <button type="button" className="btn-primary" onClick={() => downloadUrl(`/api/promocodes/${usage.promo.id}/redemptions.csv`)}>Export CSV</button>}
                        </div>
                    </div>
                </div>
            )}

            {history && (
                <div className="rf-panel-backdrop" onClick={() => setHistory(null)}>
                    <aside className="rf-panel" role="dialog" aria-modal="true" aria-labelledby="hist-title" onClick={(e) => e.stopPropagation()}>
                        <div className="rf-panel-head">
                            <h3 id="hist-title">Change history – {history.promo.code}</h3>
                            <button type="button" className="rf-dialog-close" style={{ position: 'static' }} aria-label="Close" onClick={() => setHistory(null)}>×</button>
                        </div>
                        {history.rows === null ? <div className="rf-empty">Loading...</div> : history.rows.length === 0 ? <div className="rf-empty">No changes recorded yet.</div> : (
                            <ul className="promo-history">{history.rows.map((a) => (
                                <li key={a.id}>
                                    <div className="rf-sub">{formatUkDate(a.created_at, true)} · {a.admin_name}</div>
                                    <div><b>{a.field === 'created' ? 'Created' : a.field.replace(/_/g, ' ')}</b>{a.field !== 'created' && <> : <span className="promo-old">{a.old_value ?? '—'}</span> → {a.new_value ?? '—'}</>}</div>
                                </li>
                            ))}</ul>
                        )}
                    </aside>
                </div>
            )}

            <ConfirmDialog open={!!confirm} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.confirmLabel} tone={confirm?.tone}
                onConfirm={() => confirm && confirm.onConfirm()} onCancel={() => setConfirm(null)} />
        </div>
    );
}
