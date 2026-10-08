import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ToastStack, ConfirmDialog } from '../../components/Feedback';
import { useToasts } from '../../components/useToasts';
import { ColHead } from '../Growth/ColHead';
import { Field, SuggestInput, Modal } from './components/FormBits';
import SchemeForm from './SchemeForm';
import SegmentManager from './SegmentManager';
import { TYPE_LABELS, STATUS_TONE, displayStatus, fmtDate, formatMoney, rewardCell, ruleCell, segmentName } from './lib/bonusUtils';
import '../Growth/referral.css';
import './bonus.css';

const FIELD_LABELS = {
    created: 'Created', name: 'Name', description: 'Internal note', bonus_type: 'Type', currency: 'Currency', commission_type: 'Reward method',
    credit_amount: 'Credit amount', commission_percentage: 'Percentage', max_award: 'Maximum bonus', is_tiered: 'Tiered', tiers: 'Tiers',
    min_transaction_threshold: 'Minimum amount', min_transactions: 'Number of transactions', time_period_days: 'Time period (days)',
    eligibility_rules: 'Eligibility', start_date: 'Start date', end_date: 'End date', status: 'Status',
};

const BonusSchemeManager = () => {
    const { toasts, push, dismiss } = useToasts();
    const [tab, setTab] = useState('SCHEMES');
    const [schemes, setSchemes] = useState([]);
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [confirm, setConfirm] = useState(null); // { kind: 'archive' | 'status', scheme }
    const [history, setHistory] = useState(null); // { scheme, rows }
    const [filters, setFilters] = useState({ q: '', type: 'ALL', status: 'ALL', from: '', to: '' });

    const loadSchemes = useCallback(async () => {
        try {
            const res = await fetch('/api/bonus-schemes');
            const data = await res.json();
            setSchemes(data.data || []);
        } catch { push('Bonus schemes could not be loaded.', 'error'); }
        setLoading(false);
    }, [push]);
    const loadSegments = useCallback(async () => {
        try {
            const res = await fetch('/api/user-segments');
            setSegments((await res.json()).data || []);
        } catch { /* the form still offers the built-in audiences */ }
    }, []);
    useEffect(() => {
        let alive = true;
        fetch('/api/bonus-schemes').then((r) => r.json())
            .then((d) => { if (alive) { setSchemes(d.data || []); setLoading(false); } })
            .catch(() => { if (alive) { push('Bonus schemes could not be loaded.', 'error'); setLoading(false); } });
        fetch('/api/user-segments').then((r) => r.json()).then((d) => { if (alive) setSegments(d.data || []); }).catch(() => {});
        return () => { alive = false; };
    }, [push]);

    const visible = useMemo(() => schemes.filter((s) => {
        const shown = displayStatus(s);
        if (filters.q && !s.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
        if (filters.type !== 'ALL' && s.bonus_type !== filters.type) return false;
        if (filters.status === 'ALL' ? shown === 'Archived' : shown !== filters.status) return false;
        if (filters.from && s.start_date < filters.from) return false;
        if (filters.to && s.end_date > filters.to) return false;
        return true;
    }), [schemes, filters]);

    const setStatus = async (scheme, status) => {
        const res = await fetch(`/api/bonus-schemes/${scheme.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { push(data.message || data.error || 'The status could not be changed.', 'error'); return; }
        push(status === 'ACTIVE' ? `'${scheme.name}' activated.` : `'${scheme.name}' deactivated.`);
        loadSchemes();
    };

    const archive = async (scheme) => {
        const res = await fetch(`/api/bonus-schemes/${scheme.id}`, { method: 'DELETE' });
        if (!res.ok) { push('The scheme could not be archived.', 'error'); return; }
        push('Scheme archived.');
        if (editing && editing.id === scheme.id) setEditing(null);
        loadSchemes();
    };

    const openHistory = async (scheme) => {
        setHistory({ scheme, rows: null });
        const res = await fetch(`/api/bonus-schemes/${scheme.id}/audit`);
        const data = await res.json().catch(() => ({}));
        setHistory({ scheme, rows: data.data || [] });
    };

    const fmtAudit = (v) => {
        if (v === null || v === undefined || v === '') return '—';
        if (String(v).startsWith('{') || String(v).startsWith('[')) {
            try { return JSON.stringify(JSON.parse(v)); } catch { return v; }
        }
        return v;
    };

    const filtersActive = filters.q || filters.type !== 'ALL' || filters.status !== 'ALL' || filters.from || filters.to;

    return (
        <div className="rf-page" style={{ padding: 32 }}>
            <ToastStack toasts={toasts} onDismiss={dismiss} />
            <h2 className="rf-title" style={{ fontSize: '1.75rem', fontWeight: 600, margin: '0 0 8px' }}>Bonus Scheme Manager</h2>
            <p className="rf-subtitle">Set up the bonus offers customers earn credit from: loyalty, large transfers and paid money requests.</p>

            <div className="bn-tabs" role="tablist">
                <button type="button" role="tab" className="bn-tab" aria-selected={tab === 'SCHEMES'} onClick={() => setTab('SCHEMES')}>Bonus Schemes</button>
                <button type="button" role="tab" className="bn-tab" aria-selected={tab === 'SEGMENTS'} onClick={() => setTab('SEGMENTS')}>User Segments</button>
            </div>

            {tab === 'SEGMENTS' ? <SegmentManager toast={push} onChanged={loadSegments} /> : (
                <>
                    <SchemeForm
                        editing={editing} segments={segments} existingNames={schemes.filter((s) => s.status !== 'ARCHIVED').map((s) => s.name)}
                        toast={push} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); loadSchemes(); }}
                    />

                    <div className="rf-card">
                        <div className="rf-card-head"><div><h3>Existing Bonus Schemes</h3><p>{visible.length} of {schemes.filter((s) => s.status !== 'ARCHIVED').length} schemes{filters.status === 'Archived' ? ' (archived)' : ''}</p></div></div>
                        <div className="rf-filters">
                            <Field id="bf-q" label="Search">
                                <SuggestInput id="bf-q" value={filters.q} onChange={(q) => setFilters({ ...filters, q })} options={[...new Set(schemes.map((s) => s.name))]} placeholder="Search by Scheme Name..." />
                            </Field>
                            <Field id="bf-type" label="Type">
                                <select id="bf-type" className="rf-select" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                                    <option value="ALL">All Types</option>
                                    <option value="LOYALTY_CREDIT">Loyalty</option>
                                    <option value="TRANSACTION_THRESHOLD_CREDIT">Threshold</option>
                                    <option value="REQUEST_MONEY">Request Money</option>
                                </select>
                            </Field>
                            <Field id="bf-status" label="Status">
                                <select id="bf-status" className="rf-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                                    <option value="ALL">All Status</option>
                                    {['Active', 'Scheduled', 'Inactive', 'Ended', 'Archived'].map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>
                            <Field id="bf-from" label="Starts from"><input id="bf-from" type="date" className="rf-input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></Field>
                            <Field id="bf-to" label="Ends by"><input id="bf-to" type="date" className="rf-input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></Field>
                            {filtersActive && <button type="button" className="rf-link" style={{ marginBottom: 10 }} onClick={() => setFilters({ q: '', type: 'ALL', status: 'ALL', from: '', to: '' })}>Clear</button>}
                        </div>
                        <div className="rf-table-wrap">
                            <table className="rf-table rf-compact">
                                <thead>
                                    <tr>
                                        <th><ColHead label="Scheme" tip="The scheme's name and the currency it pays in." /></th>
                                        <th><ColHead label="Type" tip="What earns the bonus: loyalty, one large transfer, or a paid money request." /></th>
                                        <th><ColHead label="Reward" tip="The bonus paid: a fixed amount, a percentage (with any maximum), or tiers by amount." /></th>
                                        <th><ColHead label="Minimum / Rule" tip="The minimum amount, or for loyalty the number of transfers needed in the period." /></th>
                                        <th><ColHead label="Validity" tip="When the scheme runs, how long each bonus lasts, and whether it can be earned more than once." /></th>
                                        <th><ColHead label="Who" tip="Which customers can earn it." /></th>
                                        <th className="rf-num"><ColHead label="Awards" tip="How many bonuses this scheme has paid, and the total per currency." /></th>
                                        <th><ColHead label="Status" tip="Active, Scheduled (not started), Inactive (paused), Ended or Archived." /></th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? <tr><td colSpan={9} className="rf-empty">Loading…</td></tr>
                                        : !visible.length ? <tr><td colSpan={9} className="rf-empty">No bonus schemes found matching filters.</td></tr>
                                            : visible.map((s) => {
                                                const shown = displayStatus(s);
                                                const legacy = s.bonus_type === 'REFERRAL_CREDIT';
                                                const rules = s.eligibility_rules || {};
                                                return (
                                                    <tr key={s.id} data-testid={`scheme-row-${s.id}`}>
                                                        <td>
                                                            <span className="bn-name">{s.name} <span className="rf-chip">{s.currency}</span></span>
                                                            <span style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                                {s.is_tiered && <span className="bn-tag bn-tag-tier">Tiered ({(s.tiers || []).length})</span>}
                                                                {legacy && <span className="bn-tag bn-tag-legacy">Legacy – managed in Referral Settings</span>}
                                                            </span>
                                                            {s.description && <span className="rf-sub">{s.description}</span>}
                                                        </td>
                                                        <td>{TYPE_LABELS[s.bonus_type] || s.bonus_type}</td>
                                                        <td><span className="bn-reward">{rewardCell(s)}</span></td>
                                                        <td>{legacy ? '—' : ruleCell(s)}</td>
                                                        <td>
                                                            <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(s.start_date)} – {fmtDate(s.end_date)}</span>
                                                            <span className="rf-sub">valid {rules.validityDays || 90}d · {rules.oneTimeOnly === false ? 'repeat' : 'once'}</span>
                                                        </td>
                                                        <td>{s.bonus_type === 'LOYALTY_CREDIT' ? 'Existing customers' : segmentName((rules.segments || [])[0], segments)}</td>
                                                        <td className="rf-num">
                                                            <span className="rf-strong">{s.awards_count || 0}</span>
                                                            {Object.entries(s.issued_by_currency || {}).map(([c, v]) => <span key={c} className="rf-sub">{formatMoney(v, c)}</span>)}
                                                        </td>
                                                        <td><span className={`rf-pill rf-pill-${STATUS_TONE[shown] || 'grey'}`}>{shown}</span></td>
                                                        <td>
                                                            {legacy ? <span className="rf-muted" style={{ fontSize: '0.75rem' }}>Read-only</span> : (
                                                                <div className="bn-actions">
                                                                    {s.status !== 'ARCHIVED' && <button type="button" className="rf-btn-sm" onClick={() => setEditing(s)}>Edit</button>}
                                                                    {s.status === 'ACTIVE' && <button type="button" className="rf-btn-sm" onClick={() => setConfirm({ kind: 'status', scheme: s, status: 'INACTIVE' })}>Deactivate</button>}
                                                                    {['INACTIVE', 'EXPIRED'].includes(s.status) && <button type="button" className="rf-btn-sm" onClick={() => setStatus(s, 'ACTIVE')}>Activate</button>}
                                                                    {s.status !== 'ARCHIVED' && <button type="button" className="rf-btn-sm rf-warn" onClick={() => setConfirm({ kind: 'archive', scheme: s })}>Archive</button>}
                                                                    <button type="button" className="rf-btn-sm" onClick={() => openHistory(s)}>History</button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <ConfirmDialog
                open={!!confirm}
                tone={confirm && confirm.kind === 'archive' ? 'danger' : 'primary'}
                title={confirm ? (confirm.kind === 'archive' ? `Archive '${confirm.scheme.name}'?` : `Deactivate '${confirm.scheme.name}'?`) : ''}
                message={confirm && confirm.kind === 'archive'
                    ? 'It will stop paying new bonuses. Bonuses already paid are not affected.'
                    : 'Customers stop earning it until you activate it again. Bonuses already paid are not affected.'}
                confirmLabel={confirm && confirm.kind === 'archive' ? 'Archive' : 'Deactivate'}
                onCancel={() => setConfirm(null)}
                onConfirm={() => { const c = confirm; setConfirm(null); if (c.kind === 'archive') archive(c.scheme); else setStatus(c.scheme, c.status); }}
            />

            <Modal open={!!history} wide title={history ? `History – ${history.scheme.name}` : ''} subtitle="Every change to this scheme, newest first." onClose={() => setHistory(null)}
                footer={<button type="button" className="btn-secondary" onClick={() => setHistory(null)}>Close</button>}>
                {history && !history.rows ? <p>Loading…</p> : history && !history.rows.length ? <p className="rf-muted">No changes recorded yet. Changes made before this page existed are not listed.</p> : history && (
                    <table className="bn-history">
                        <thead><tr><th>When</th><th>Field</th><th>From</th><th>To</th><th>By</th></tr></thead>
                        <tbody>
                            {history.rows.map((r) => (
                                <tr key={r.id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                                    <td>{FIELD_LABELS[r.field] || r.field}</td>
                                    <td>{fmtAudit(r.old_value)}</td>
                                    <td>{fmtAudit(r.new_value)}</td>
                                    <td>{r.admin_name || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Modal>
        </div>
    );
};

export default BonusSchemeManager;
