import React, { useCallback, useEffect, useState } from 'react';
import { Field, CurrencyPicker } from './components/FormBits';
import { validateSegment } from './lib/schemeValidation';
import { fmtDate, formatMoney } from './lib/bonusUtils';
import { ConfirmDialog } from '../../components/Feedback';
import { ColHead } from '../Growth/ColHead';

const EMPTY = { name: '', description: '', criteria: { type: 'TRANSACTION_COUNT', min: 0, max: null, period_days: 30, currency: 'GBP', signup_start_date: '', signup_end_date: '' } };
const TYPE_LABEL = { NEW_USER: 'New User (Signup Date)', TRANSACTION_COUNT: 'Transaction Count', TRANSACTION_VOLUME: 'Transaction Volume' };

function describe(c) {
    const range = (v) => (c.type === 'TRANSACTION_VOLUME' ? formatMoney(v, c.currency) : v);
    const parts = [];
    if (c.type !== 'NEW_USER' || c.min || c.max) parts.push(`${c.type === 'TRANSACTION_VOLUME' ? 'Volume' : 'Transfers'}: ${range(c.min || 0)} – ${c.max === null || c.max === undefined || c.max === '' ? '∞' : range(c.max)}`);
    parts.push(c.period_days ? `in the last ${c.period_days} days` : 'since registration');
    if (c.signup_start_date || c.signup_end_date) parts.push(`signed up ${c.signup_start_date ? `from ${fmtDate(c.signup_start_date)}` : ''}${c.signup_end_date ? ` until ${fmtDate(c.signup_end_date)}` : ''}`);
    return parts.join(' · ');
}

const SegmentManager = ({ toast, onChanged }) => {
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [previews, setPreviews] = useState({});

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/user-segments');
            const data = await res.json();
            setSegments(data.data || []);
        } catch { toast('Segments could not be loaded.', 'error'); }
        setLoading(false);
    }, [toast]);
    useEffect(() => { load(); }, [load]);

    const c = form.criteria;
    const setC = (patch) => setForm((f) => ({ ...f, criteria: { ...f.criteria, ...patch } }));
    const reset = () => { setForm(EMPTY); setEditingId(null); setErrors({}); };
    const cls = (k, base = 'rf-input') => `${base}${errors[k] ? ' rf-invalid' : ''}`;

    const submit = async (e) => {
        e.preventDefault();
        const names = segments.filter((s) => s.id !== editingId).map((s) => s.name);
        const errs = validateSegment(form, { names });
        setErrors(errs);
        if (Object.keys(errs).length) { toast('Please correct the highlighted fields.', 'error'); return; }
        setSaving(true);
        try {
            const res = await fetch(editingId ? `/api/user-segments/${editingId}` : '/api/user-segments', {
                method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.name.trim(), description: form.description, criteria: c }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (data.fields) setErrors(data.fields);
                toast(data.error || 'The segment could not be saved.', 'error');
                return;
            }
            toast(editingId ? 'Segment updated.' : 'Segment created.');
            reset();
            await load();
            onChanged && onChanged();
        } catch { toast('The server could not be reached. Please try again.', 'error'); }
        finally { setSaving(false); }
    };

    const remove = async () => {
        const seg = toDelete;
        setToDelete(null);
        const res = await fetch(`/api/user-segments/${seg.id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { toast(data.error || 'The segment could not be deleted.', 'error'); return; }
        toast(`Segment "${seg.name}" deleted.`);
        await load();
        onChanged && onChanged();
    };

    const preview = async (seg) => {
        setPreviews((p) => ({ ...p, [seg.id]: '…' }));
        const res = await fetch(`/api/user-segments/${seg.id}/preview`);
        const data = await res.json().catch(() => ({}));
        setPreviews((p) => ({ ...p, [seg.id]: res.ok ? data.message : 'Preview unavailable' }));
    };

    return (
        <>
            <div className="rf-card rf-card-pad">
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 20px' }}>{editingId ? 'Edit Segment' : 'Manage User Segments'}</h3>
                <form onSubmit={submit} noValidate>
                    <div className="rf-grid rf-grid-2">
                        <Field id="sg-name" label="Segment Name" required error={errors.name}>
                            <input id="sg-name" className={cls('name')} placeholder="e.g. New Users" maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </Field>
                        <Field id="sg-description" label="Description">
                            <input id="sg-description" className="rf-input" placeholder="Optional description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </Field>
                    </div>
                    <div className="rf-grid rf-grid-3">
                        <Field id="sg-type" label="Criteria Type" required>
                            <select id="sg-type" className="rf-select" value={c.type} onChange={(e) => setC({ type: e.target.value })}>
                                <option value="NEW_USER">New User (Signup Date)</option>
                                <option value="TRANSACTION_COUNT">Transaction Count</option>
                                <option value="TRANSACTION_VOLUME">Transaction Volume</option>
                            </select>
                        </Field>
                        <Field id="sg-min" label={`Min ${c.type === 'TRANSACTION_VOLUME' ? 'Amount' : 'Count'}`} error={errors.min}>
                            <input id="sg-min" className={cls('min')} type="number" min="0" value={c.min ?? ''} onChange={(e) => setC({ min: e.target.value === '' ? '' : Number(e.target.value) })} />
                        </Field>
                        <Field id="sg-max" label={`Max ${c.type === 'TRANSACTION_VOLUME' ? 'Amount' : 'Count'} (empty = ∞)`} error={errors.max}>
                            <input id="sg-max" className={cls('max')} type="number" min="0" value={c.max ?? ''} onChange={(e) => setC({ max: e.target.value === '' ? null : Number(e.target.value) })} />
                        </Field>
                    </div>
                    <div className="rf-grid rf-grid-3">
                        {c.type === 'TRANSACTION_VOLUME' && (
                            <Field id="sg-currency" label="Currency">
                                <CurrencyPicker id="sg-currency" value={c.currency || 'GBP'} onChange={(currency) => setC({ currency })} />
                            </Field>
                        )}
                        <Field id="sg-period" label="Evaluation Period">
                            <select id="sg-period" className="rf-select" value={c.period_days ? 'RECENT' : 'LIFETIME'} onChange={(e) => setC({ period_days: e.target.value === 'RECENT' ? 30 : null })}>
                                <option value="LIFETIME">Since Registration (Lifetime)</option>
                                <option value="RECENT">In Past N Days</option>
                            </select>
                        </Field>
                        {c.period_days !== null && c.period_days !== undefined && (
                            <Field id="sg-days" label="Number of Days" error={errors.period_days}>
                                <input id="sg-days" className={cls('period_days')} type="number" min="1" max="3650" value={c.period_days} onChange={(e) => setC({ period_days: e.target.value === '' ? '' : Number(e.target.value) })} />
                            </Field>
                        )}
                    </div>
                    <div className="rf-section-label">User signup date (optional)</div>
                    <div className="rf-grid rf-grid-2">
                        <Field id="sg-from" label="Signed Up From" hint="Leave both empty for all customers.">
                            <input id="sg-from" className="rf-input" type="date" value={c.signup_start_date || ''} onChange={(e) => setC({ signup_start_date: e.target.value })} />
                        </Field>
                        <Field id="sg-until" label="Signed Up Until" error={errors.signup_end_date}>
                            <input id="sg-until" className={cls('signup_end_date')} type="date" value={c.signup_end_date || ''} onChange={(e) => setC({ signup_end_date: e.target.value })} />
                        </Field>
                    </div>
                    <div className="rf-actions">
                        {editingId && <button type="button" className="btn-secondary" onClick={reset}>Cancel</button>}
                        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Segment' : 'Create Segment'}</button>
                    </div>
                </form>
            </div>

            <div className="rf-card">
                <div className="rf-card-head"><div><h3>Saved segments</h3><p>Audiences you can pick under "Who can earn it" (and for promo codes).</p></div></div>
                <div className="rf-table-wrap">
                    <table className="rf-table">
                        <thead>
                            <tr>
                                <th><ColHead label="Name" tip="The segment's name and description." /></th>
                                <th><ColHead label="Criteria" tip="Who is in the segment: transfers or volume, over which period, and signup dates." /></th>
                                <th><ColHead label="Customers today" tip="How many known customers match right now. Click Preview to count." /></th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={4} className="rf-empty">Loading…</td></tr>
                                : !segments.length ? <tr><td colSpan={4} className="rf-empty">No segments yet.</td></tr>
                                    : segments.map((seg) => (
                                        <tr key={seg.id}>
                                            <td><span className="rf-strong">{seg.name}</span>{seg.description && <span className="rf-sub">{seg.description}</span>}</td>
                                            <td><span className="rf-chip">{TYPE_LABEL[seg.criteria.type] || seg.criteria.type}</span><span className="rf-sub" style={{ marginTop: 4 }}>{describe(seg.criteria)}</span></td>
                                            <td>{previews[seg.id] ? <span>{previews[seg.id]}</span> : <button type="button" className="rf-btn-sm" onClick={() => preview(seg)}>Preview</button>}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="bn-actions">
                                                    <button type="button" className="rf-btn-sm" onClick={() => { setEditingId(seg.id); setErrors({}); setForm({ name: seg.name, description: seg.description || '', criteria: { ...EMPTY.criteria, ...seg.criteria } }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                                                    <button type="button" className="rf-btn-sm rf-warn" onClick={() => setToDelete(seg)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDialog open={!!toDelete} tone="danger" title={toDelete ? `Delete '${toDelete.name}'?` : ''}
                message="Schemes that use it must be changed first. This cannot be undone." confirmLabel="Delete segment"
                onCancel={() => setToDelete(null)} onConfirm={remove} />
        </>
    );
};

export default SegmentManager;
