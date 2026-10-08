import React, { useEffect, useMemo, useState } from 'react';
import { CURRENCIES, PAYMENT_METHODS, TYPE_OPTIONS, TYPE_LABELS, previewSentence, symbolFor, toUtcIso } from './lib/promoUtils';
import { validatePromoForm, toPayload } from './lib/promoValidation';
import { formFromPromo } from './lib/promoForm';

const Field = ({ id, label, required, error, hint, children }) => (
    <div className="rf-field">
        <label htmlFor={id}>{label}{required && <span className="rf-req">*</span>}</label>
        {children}
        {error ? <div className="rf-error" id={`${id}-error`}>{error}</div> : hint ? <div className="rf-hint">{hint}</div> : null}
    </div>
);

// Create / edit a promo code (PROMO-MITO §5.2). `promo` given = edit an unused code; legacy codes open read-only.
export default function PromoCodeForm({ promo = null, existingCodes = [], segments = [], onClose, onSaved, push }) {
    const editing = !!promo;
    const legacy = !!(promo && promo.is_legacy);
    const [f, setF] = useState(() => formFromPromo(promo));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [send, setSend] = useState('GBP');
    const [recv, setRecv] = useState('NGN');
    const set = (patch) => { setF((x) => ({ ...x, ...patch })); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); };
    const others = useMemo(() => existingCodes.filter((c) => !promo || c !== promo.code), [existingCodes, promo]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const blurCheck = (key) => {
        const e = validatePromoForm(f, { isNew: !editing, existingCodes: others });
        setErrors((cur) => ({ ...cur, [key]: e[key] }));
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (legacy) return;
        const e = validatePromoForm(f, { isNew: !editing, existingCodes: others });
        setErrors(e);
        if (Object.keys(e).length) {
            push('Please correct the highlighted fields.', 'error');
            setTimeout(() => { const el = document.querySelector('.promo-form .rf-invalid'); if (el) el.focus(); }, 0);
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(editing ? `/api/promocodes/${promo.id}` : '/api/promocodes', {
                method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toPayload(f, toUtcIso)),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                const code = String(f.code).trim().toUpperCase();
                push(editing ? `Promo code ${code} updated.` : `Promo code ${code} created.`);
                onSaved();
                onClose();
                return;
            }
            if (res.status === 409 && data.code === 'IN_USE') { push(data.error, 'error'); onSaved(); onClose(); return; }
            if (data.fields) {
                const map = { ...data.fields };
                if (map.user_segment) map.customer_ids = map.user_segment;
                setErrors(map);
            }
            push(data.fields ? 'Please correct the highlighted fields.' : (data.error || "We couldn't save the promo code. Please try again."), 'error');
        } catch {
            push("We couldn't save the promo code. Please try again.", 'error');
        } finally {
            setSaving(false);
        }
    };

    const cls = (k, base = 'rf-input') => `${base}${errors[k] ? ' rf-invalid' : ''}`;
    const aria = (k) => ({ id: `pf-${k}`, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `pf-${k}-error` : undefined, onBlur: () => blurCheck(k) });
    const sym = symbolFor(f.currency);
    const ro = legacy;

    return (
        <div className="rf-dialog-backdrop" onClick={onClose}>
            <div className="rf-dialog promo-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-title" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="rf-dialog-close" aria-label="Close" onClick={onClose}>×</button>
                <h3 id="pf-title">{editing ? 'Edit Promo Code' : 'Create Promo Code'}</h3>
                {legacy && (
                    <div className="promo-banner">This is a legacy {TYPE_LABELS[promo.type].replace(' (legacy)', '')} code. It gives no fee discount. You can disable it or create a new code.</div>
                )}
                <form className="promo-form" onSubmit={submit} noValidate>
                    <fieldset disabled={ro} className="promo-fieldset">
                        <div className="rf-section-label">Code details</div>
                        <div className="rf-grid rf-grid-2">
                            <Field id="pf-code" label="Promo Code" required error={errors.code}>
                                <input {...aria('code')} className={`${cls('code')} promo-mono`} value={f.code} maxLength={20} placeholder="e.g. SAVE20"
                                    onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
                            </Field>
                            <Field id="pf-type" label="Type" required error={errors.type}>
                                <select {...aria('type')} className={cls('type', 'rf-select')} value={legacy ? promo.type : f.type} onChange={(e) => set({ type: e.target.value, value: e.target.value === 'Waiver' ? '' : f.value })}>
                                    {legacy && <option value={promo.type}>{TYPE_LABELS[promo.type]}</option>}
                                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </Field>
                        </div>
                        <Field id="pf-description" label="Internal note" error={errors.description}>
                            <input {...aria('description')} className={cls('description')} value={f.description} maxLength={200} placeholder="Optional – only admins see this"
                                onChange={(e) => set({ description: e.target.value })} />
                        </Field>
                        <div className="rf-grid rf-grid-3" style={{ marginTop: 16 }}>
                            {f.type !== 'Waiver' && (
                                <Field id="pf-value" label="Value" required error={errors.value}>
                                    <div className="rf-affix">
                                        {f.type === 'Fixed' && <span className="rf-prefix">{sym}</span>}
                                        <input {...aria('value')} className={cls('value')} inputMode="decimal" value={f.value}
                                            style={f.type === 'Percentage' ? { paddingLeft: 12, paddingRight: 32 } : undefined}
                                            onChange={(e) => set({ value: e.target.value })} />
                                        {f.type === 'Percentage' && <span className="promo-suffix">%</span>}
                                    </div>
                                </Field>
                            )}
                            <Field id="pf-currency" label="Currency" required error={errors.currency} hint="The code only works on transfers sent in this currency.">
                                <select {...aria('currency')} className={cls('currency', 'rf-select')} value={f.currency} onChange={(e) => set({ currency: e.target.value })}>
                                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} ({c.name})</option>)}
                                </select>
                            </Field>
                            {f.type === 'Percentage' && (
                                <Field id="pf-max_discount" label="Max discount (optional)" error={errors.max_discount}>
                                    <div className="rf-affix"><span className="rf-prefix">{sym}</span>
                                        <input {...aria('max_discount')} className={cls('max_discount')} inputMode="decimal" value={f.max_discount} onChange={(e) => set({ max_discount: e.target.value })} />
                                    </div>
                                </Field>
                            )}
                            <Field id="pf-min_threshold" label="Minimum send amount (optional)" error={errors.min_threshold} hint="The customer must send at least this amount.">
                                <div className="rf-affix"><span className="rf-prefix">{sym}</span>
                                    <input {...aria('min_threshold')} className={cls('min_threshold')} inputMode="decimal" value={f.min_threshold} onChange={(e) => set({ min_threshold: e.target.value })} />
                                </div>
                            </Field>
                        </div>

                        <div className="rf-section-label">Limits</div>
                        <div className="rf-grid rf-grid-3">
                            <Field id="pf-usage_limit_global" label="Total uses (optional)" error={errors.usage_limit_global}>
                                <input {...aria('usage_limit_global')} className={cls('usage_limit_global')} inputMode="numeric" placeholder="Unlimited" value={f.usage_limit_global}
                                    onChange={(e) => set({ usage_limit_global: e.target.value })} />
                            </Field>
                            <Field id="pf-budget_limit" label="Total budget (optional)" error={errors.budget_limit} hint="Stops the code when this much discount has been given.">
                                <div className="rf-affix"><span className="rf-prefix">{sym}</span>
                                    <input {...aria('budget_limit')} className={cls('budget_limit')} inputMode="decimal" placeholder="Unlimited" value={f.budget_limit} onChange={(e) => set({ budget_limit: e.target.value })} />
                                </div>
                            </Field>
                            <Field id="pf-usage_limit_per_user" label="Uses per customer" required error={errors.usage_limit_per_user}>
                                <input {...aria('usage_limit_per_user')} className={cls('usage_limit_per_user')} inputMode="numeric" disabled={f.perUserUnlimited || ro}
                                    value={f.perUserUnlimited ? '' : f.usage_limit_per_user} placeholder={f.perUserUnlimited ? 'Unlimited' : ''}
                                    onChange={(e) => set({ usage_limit_per_user: e.target.value })} />
                                <label className="rf-check promo-inline-check">
                                    <input type="checkbox" checked={f.perUserUnlimited} onChange={(e) => set({ perUserUnlimited: e.target.checked, usage_limit_per_user: f.usage_limit_per_user || '1' })} /> Unlimited
                                </label>
                            </Field>
                        </div>

                        <div className="rf-section-label">Dates</div>
                        <div className="rf-grid rf-grid-2">
                            <Field id="pf-start_date" label="Start" required error={errors.start_date}>
                                <input {...aria('start_date')} type="datetime-local" className={cls('start_date')} value={f.start_date} onChange={(e) => set({ start_date: e.target.value })} />
                            </Field>
                            <Field id="pf-end_date" label="End" required error={errors.end_date}>
                                <input {...aria('end_date')} type="datetime-local" className={cls('end_date')} value={f.end_date} onChange={(e) => set({ end_date: e.target.value })} />
                            </Field>
                        </div>

                        <div className="rf-section-label">Where it can be used</div>
                        <div className="rf-grid rf-grid-2">
                            <div className="rf-field">
                                <label className="rf-check"><input type="checkbox" checked={f.allCorridors} onChange={(e) => set({ allCorridors: e.target.checked, corridors: e.target.checked ? [] : f.corridors })} /> All corridors</label>
                                {!f.allCorridors && (
                                    <>
                                        <div className="promo-corridor-row">
                                            <select className="rf-select" aria-label="Send currency" value={send} onChange={(e) => { setSend(e.target.value); if (e.target.value === recv) setRecv(''); }}>
                                                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                                            </select>
                                            <span aria-hidden="true">→</span>
                                            <select className="rf-select" aria-label="Receive currency" value={recv} onChange={(e) => setRecv(e.target.value)}>
                                                <option value="">Choose</option>
                                                {CURRENCIES.filter((c) => c.code !== send).map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                                            </select>
                                            <button type="button" className="rf-btn-sm" disabled={!recv}
                                                onClick={() => { const pair = `${send}-${recv}`; if (!f.corridors.includes(pair)) set({ corridors: [...f.corridors, pair] }); }}>Add</button>
                                        </div>
                                        <div className="promo-chips">
                                            {f.corridors.map((c) => (
                                                <span key={c} className="rf-chip promo-chip">{c.replace('-', ' → ')}
                                                    <button type="button" aria-label={`Remove ${c}`} onClick={() => set({ corridors: f.corridors.filter((x) => x !== c) })}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                        {errors.corridors && <div className="rf-error">{errors.corridors}</div>}
                                    </>
                                )}
                            </div>
                            <div className="rf-field">
                                <label className="rf-check"><input type="checkbox" checked={f.allMethods} onChange={(e) => set({ allMethods: e.target.checked, payment_methods: e.target.checked ? [] : f.payment_methods })} /> All payment methods</label>
                                {!f.allMethods && (
                                    <div className="promo-methods">
                                        {PAYMENT_METHODS.map((m) => (
                                            <label key={m} className="rf-check">
                                                <input type="checkbox" checked={f.payment_methods.includes(m)}
                                                    onChange={(e) => set({ payment_methods: e.target.checked ? [...f.payment_methods, m] : f.payment_methods.filter((x) => x !== m) })} /> {m}
                                            </label>
                                        ))}
                                        {errors.payment_methods && <div className="rf-error">{errors.payment_methods}</div>}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rf-section-label">Who can use it</div>
                        <div className="promo-audience" role="radiogroup" aria-label="Who can use it">
                            {[
                                ['all', 'Everyone'], ['new_customers', 'New customers only', 'No completed transfers yet.'], ['existing_customers', 'Existing customers only'],
                                ['specific_customers', 'Specific customers'], ...(segments.length ? [['segment', 'Saved segment']] : []),
                                ...(f.audience === 'targeted' ? [['targeted', `One customer (${f.targeted_user_id})`]] : []),
                            ].map(([v, l, h]) => (
                                <label key={v} className="rf-check"><input type="radio" name="pf-audience" value={v} checked={f.audience === v} onChange={() => set({ audience: v })} /> {l}{h && <span className="rf-sub" style={{ display: 'inline', marginLeft: 6 }}>{h}</span>}</label>
                            ))}
                        </div>
                        {f.audience === 'specific_customers' && (
                            <Field id="pf-customer_ids" label="Customer IDs" required error={errors.customer_ids} hint="Separate with commas or new lines (up to 500).">
                                <textarea {...aria('customer_ids')} className={cls('customer_ids')} rows={3} value={f.customer_ids} onChange={(e) => set({ customer_ids: e.target.value })} />
                            </Field>
                        )}
                        {f.audience === 'segment' && (
                            <Field id="pf-segment_id" label="Segment" required error={errors.segment_id}>
                                <select {...aria('segment_id')} className={cls('segment_id', 'rf-select')} value={f.segment_id} onChange={(e) => set({ segment_id: e.target.value })}>
                                    <option value="">Choose a segment</option>
                                    {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </Field>
                        )}
                    </fieldset>

                    {!legacy && <p className="promo-preview" aria-live="polite">{previewSentence(f)}</p>}

                    <div className="rf-dialog-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>{legacy ? 'Close' : 'Cancel'}</button>
                        {!legacy && <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Promo Code'}</button>}
                    </div>
                </form>
            </div>
        </div>
    );
}
