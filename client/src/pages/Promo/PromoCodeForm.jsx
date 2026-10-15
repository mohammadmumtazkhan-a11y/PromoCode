import React, { useEffect, useMemo, useState } from 'react';
import {
    CURRENCIES, PAYMENT_METHODS, TYPE_OPTIONS, TYPE_LABELS,
    previewSentence, symbolFor, toUtcIso, formatCorridorChip,
} from './lib/promoUtils';
import { validatePromoForm, toPayload } from './lib/promoValidation';
import { formFromPromo } from './lib/promoForm';

const Field = ({ id, label, required, rightLabel, error, hint, children }) => (
    <div className="rf-field">
        <label htmlFor={id}>
            <span>{label}{required && <span className="rf-req">*</span>}</span>
            {rightLabel}
        </label>
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
    const [corridorQuery, setCorridorQuery] = useState('');
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

    const handleSendCurrencyChange = (nextSend) => {
        const reAnchored = (f.corridors || [])
            .map((c) => {
                const [, dest] = String(c).split('-');
                return dest && dest !== nextSend ? `${nextSend}-${dest}` : null;
            })
            .filter(Boolean);
        set({
            currency: nextSend,
            corridors: [...new Set(reAnchored)],
        });
    };

    const addReceiveCurrency = (recvCur) => {
        const sendCur = f.currency || 'GBP';
        if (!recvCur || sendCur === recvCur) return;
        const pair = `${sendCur}-${recvCur}`;
        if (!f.corridors.includes(pair)) {
            set({
                allCorridors: false,
                corridors: [...f.corridors, pair],
            });
        }
    };

    const removeCorridorPair = (pair) => {
        set({
            corridors: f.corridors.filter((x) => x !== pair),
        });
    };

    const availableReceiveCurrencies = useMemo(
        () => CURRENCIES.filter((c) => c.code !== f.currency),
        [f.currency]
    );

    const matchingReceiveCurrencies = useMemo(() => {
        const q = corridorQuery.trim().toLowerCase();
        if (!q) return [];
        return availableReceiveCurrencies.filter(
            (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        );
    }, [corridorQuery, availableReceiveCurrencies]);

    const handleCustomerFileUpload = (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result || '');
            const parsed = text
                .split(/[\r\n,;]+/)
                .map((s) => s.trim().replace(/^["']|["']$/g, ''))
                .filter((s) => s && !['email', 'customer_id', 'id', 'user_id'].includes(s.toLowerCase()));
            const existing = String(f.customer_ids || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
            const merged = [...new Set([...existing, ...parsed])];
            set({ customer_ids: merged.join(', ') });
        };
        reader.readAsText(file);
        ev.target.value = '';
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
    const activeCur = f.currency || 'GBP';
    const curTag = activeCur;
    const sym = symbolFor(activeCur);
    const ro = legacy;
    const customerListCount = String(f.customer_ids || '').split(/[\s,;]+/).filter(Boolean).length;

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
                        {/* SECTION 1: Code & Discount */}
                        <div className="promo-section-head">
                            <span className="rf-section-label">Code &amp; Discount</span>
                            <label className="rf-check promo-inline-check" style={{ color: '#9ca3af', cursor: 'not-allowed' }} title="Batch code generation is disabled for this release">
                                <input type="checkbox" disabled checked={false} readOnly /> Generate a batch of codes (Disabled)
                            </label>
                        </div>

                        <div className="rf-grid rf-grid-3">
                            <Field id="pf-code" label="Promo Code" required error={errors.code} hint={editing ? 'Editable until first use.' : '3–20 letters, numbers or hyphens.'}>
                                <input {...aria('code')} className={`${cls('code')} promo-mono`} value={f.code} maxLength={20} placeholder="e.g. SAVE20"
                                    onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
                            </Field>
                            <Field id="pf-type" label="Discount Type" required error={errors.type}>
                                <select {...aria('type')} className={cls('type', 'rf-select')} value={legacy ? promo.type : f.type} onChange={(e) => set({ type: e.target.value, value: e.target.value === 'Waiver' ? '' : f.value })}>
                                    {legacy && <option value={promo.type}>{TYPE_LABELS[promo.type]}</option>}
                                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </Field>
                            <Field id="pf-description" label="Internal note (optional)" error={errors.description} hint="Only visible to admins.">
                                <input {...aria('description')} className={cls('description')} value={f.description} maxLength={200} placeholder="e.g. Summer campaign"
                                    onChange={(e) => set({ description: e.target.value })} />
                            </Field>
                        </div>

                        <div className={`rf-grid ${f.type === 'Percentage' ? 'rf-grid-3' : f.type === 'Fixed' ? 'rf-grid-2' : ''}`}>
                            {f.type !== 'Waiver' && (
                                <Field id="pf-value" label={f.type === 'Percentage' ? 'Discount Value (%)' : `Discount Value (${curTag})`} required error={errors.value}>
                                    <div className="rf-affix">
                                        {f.type === 'Fixed' && sym && <span className="rf-prefix">{sym}</span>}
                                        <input {...aria('value')} className={cls('value')} inputMode="decimal" value={f.value}
                                            placeholder={f.type === 'Percentage' ? 'e.g. 20' : 'e.g. 5.00'}
                                            style={f.type === 'Percentage' ? { paddingLeft: 12, paddingRight: 32 } : !sym ? { paddingLeft: 12 } : undefined}
                                            onChange={(e) => set({ value: e.target.value })} />
                                        {f.type === 'Percentage' && <span className="promo-suffix">%</span>}
                                    </div>
                                </Field>
                            )}
                            {f.type === 'Percentage' && (
                                <Field id="pf-max_discount" label={`Max discount (${curTag}, optional)`} error={errors.max_discount} hint="Caps the maximum fee discount.">
                                    <div className="rf-affix">
                                        {sym && <span className="rf-prefix">{sym}</span>}
                                        <input {...aria('max_discount')} className={cls('max_discount')} inputMode="decimal" placeholder="No cap" value={f.max_discount}
                                            style={!sym ? { paddingLeft: 12 } : undefined}
                                            onChange={(e) => set({ max_discount: e.target.value })} />
                                    </div>
                                </Field>
                            )}
                            <Field id="pf-min_threshold" label={`Minimum send amount (${curTag}, optional)`} error={errors.min_threshold} hint="Customer must send at least this amount.">
                                <div className="rf-affix">
                                    {sym && <span className="rf-prefix">{sym}</span>}
                                    <input {...aria('min_threshold')} className={cls('min_threshold')} inputMode="decimal" placeholder="0.00 (no minimum)" value={f.min_threshold}
                                        style={!sym ? { paddingLeft: 12 } : undefined}
                                        onChange={(e) => set({ min_threshold: e.target.value })} />
                                </div>
                            </Field>
                        </div>

                        {/* SECTION 2: Where it can be used */}
                        <div className="promo-section-head">
                            <span className="rf-section-label">Where it can be used</span>
                        </div>

                        <div className="rf-grid rf-grid-2" style={{ alignItems: 'stretch' }}>
                            {/* Left Subcard: Send Currency & Receive Corridors */}
                            <div className="promo-subcard">
                                <Field id="pf-currency" label="From (Send Currency)" required error={errors.currency} hint="Sets the currency for discounts, minimum send, and budget.">
                                    <select
                                        {...aria('currency')}
                                        className={cls('currency', 'rf-select')}
                                        value={f.currency}
                                        onChange={(e) => handleSendCurrencyChange(e.target.value)}
                                    >
                                        {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol.trim()})</option>)}
                                    </select>
                                </Field>

                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                                    <label className="rf-check" style={{ marginBottom: f.allCorridors ? 0 : 8, fontWeight: 600, fontSize: '0.84rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={f.allCorridors}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                const defaultDest = f.currency === 'NGN' ? 'GBP' : 'NGN';
                                                const nextCorridors = checked ? [] : (f.corridors.length ? f.corridors : [`${f.currency}-${defaultDest}`]);
                                                set({
                                                    allCorridors: checked,
                                                    corridors: nextCorridors,
                                                });
                                            }}
                                        /> All corridors (all receive currencies from {activeCur})
                                    </label>

                                    {!f.allCorridors && (
                                        <div>
                                            <div className="promo-typeahead-wrap" style={{ position: 'relative', marginBottom: 8 }}>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                    <span className="rf-pill rf-pill-blue" style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{activeCur} →</span>
                                                    <input
                                                        type="text"
                                                        className="rf-input"
                                                        style={{ padding: '7px 10px', fontSize: '0.84rem' }}
                                                        placeholder="Search receive currency (e.g. NGN, Nigeria)..."
                                                        value={corridorQuery}
                                                        onChange={(e) => setCorridorQuery(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && matchingReceiveCurrencies.length > 0) {
                                                                e.preventDefault();
                                                                addReceiveCurrency(matchingReceiveCurrencies[0].code);
                                                                setCorridorQuery('');
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                {matchingReceiveCurrencies.length > 0 && (
                                                    <div className="promo-typeahead-menu">
                                                        {matchingReceiveCurrencies.map((c) => {
                                                            const alreadyAdded = f.corridors.includes(`${activeCur}-${c.code}`);
                                                            return (
                                                                <button
                                                                    key={c.code}
                                                                    type="button"
                                                                    className="promo-typeahead-item"
                                                                    disabled={alreadyAdded}
                                                                    onClick={() => {
                                                                        addReceiveCurrency(c.code);
                                                                        setCorridorQuery('');
                                                                    }}
                                                                >
                                                                    <strong>{activeCur} → {c.code}</strong> <span>({c.name}){alreadyAdded ? ' ✓ Added' : ''}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {availableReceiveCurrencies.map((c) => {
                                                    const pair = `${activeCur}-${c.code}`;
                                                    const active = f.corridors.includes(pair);
                                                    return (
                                                        <button
                                                            key={c.code}
                                                            type="button"
                                                            className="rf-btn-sm"
                                                            style={{
                                                                fontSize: '0.73rem',
                                                                padding: '2px 7px',
                                                                background: active ? '#eff6ff' : '#fff',
                                                                borderColor: active ? '#3b82f6' : '#cbd5e1',
                                                                color: active ? '#1d4ed8' : '#475569',
                                                                fontWeight: active ? 600 : 500,
                                                            }}
                                                            onClick={() => active ? removeCorridorPair(pair) : addReceiveCurrency(c.code)}
                                                        >
                                                            {active ? `✓ ${c.code}` : `+ ${c.code}`}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="promo-chips">
                                                {f.corridors.map((c) => (
                                                    <span key={c} className="rf-chip promo-chip">{formatCorridorChip(c)}
                                                        <button type="button" aria-label={`Remove ${c}`} onClick={() => removeCorridorPair(c)}>×</button>
                                                    </span>
                                                ))}
                                            </div>
                                            {errors.corridors && <div className="rf-error">{errors.corridors}</div>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Subcard: Transaction Flow & Payment Methods */}
                            <div className="promo-subcard">
                                <Field id="pf-applies_to_flow" label="Applies to transaction flow" hint="Send Money deducts from what sender pays; Receive Money adds bonus to receiver.">
                                    <div className="promo-flow-segmented" role="radiogroup" aria-label="Applies to transaction flow">
                                        {[
                                            ['send', 'Send Money'],
                                            ['receive', 'Receive Money'],
                                            ['both', 'Both'],
                                        ].map(([val, label]) => {
                                            const active = (f.applies_to_flow || 'send') === val;
                                            return (
                                                <label key={val} className={active ? 'active' : ''}>
                                                    <input type="radio" name="pf-applies-flow" value={val} checked={active} onChange={() => set({ applies_to_flow: val })} />
                                                    {label}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </Field>

                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                                    <label className="rf-check" style={{ marginBottom: f.allMethods ? 0 : 4, fontWeight: 600, fontSize: '0.84rem' }}>
                                        <input type="checkbox" checked={f.allMethods} onChange={(e) => set({ allMethods: e.target.checked, payment_methods: e.target.checked ? [] : f.payment_methods })} /> All payment methods
                                    </label>
                                    {!f.allMethods && (
                                        <>
                                            <div className="promo-methods">
                                                {PAYMENT_METHODS.map((m) => (
                                                    <label key={m} className="rf-check">
                                                        <input type="checkbox" checked={f.payment_methods.includes(m)}
                                                            onChange={(e) => set({ payment_methods: e.target.checked ? [...f.payment_methods, m] : f.payment_methods.filter((x) => x !== m) })} /> {m}
                                                    </label>
                                                ))}
                                            </div>
                                            {errors.payment_methods && <div className="rf-error">{errors.payment_methods}</div>}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: Limits */}
                        <div className="promo-section-head">
                            <span className="rf-section-label">Usage &amp; Budget Limits</span>
                        </div>
                        <div className="rf-grid rf-grid-3">
                            <Field id="pf-usage_limit_global" label="Total uses (optional)" error={errors.usage_limit_global} hint="Maximum redemptions across all customers.">
                                <input {...aria('usage_limit_global')} className={cls('usage_limit_global')} inputMode="numeric" placeholder="Unlimited" value={f.usage_limit_global}
                                    onChange={(e) => set({ usage_limit_global: e.target.value })} />
                            </Field>
                            <Field id="pf-budget_limit" label={`Total budget (${curTag}, optional)`} error={errors.budget_limit} hint="Stops the code when this much discount is spent.">
                                <div className="rf-affix">
                                    {sym && <span className="rf-prefix">{sym}</span>}
                                    <input {...aria('budget_limit')} className={cls('budget_limit')} inputMode="decimal" placeholder="Unlimited" value={f.budget_limit}
                                        style={!sym ? { paddingLeft: 12 } : undefined}
                                        onChange={(e) => set({ budget_limit: e.target.value })} />
                                </div>
                            </Field>
                            <Field
                                id="pf-usage_limit_per_user"
                                label="Uses per customer"
                                required
                                error={errors.usage_limit_per_user}
                                rightLabel={(
                                    <label className="rf-check promo-inline-check">
                                        <input type="checkbox" checked={f.perUserUnlimited} onChange={(e) => set({ perUserUnlimited: e.target.checked, usage_limit_per_user: f.usage_limit_per_user || '1' })} /> Unlimited
                                    </label>
                                )}
                                hint="How many times a single customer can redeem."
                            >
                                <input {...aria('usage_limit_per_user')} className={cls('usage_limit_per_user')} inputMode="numeric" disabled={f.perUserUnlimited || ro}
                                    value={f.perUserUnlimited ? '' : f.usage_limit_per_user} placeholder={f.perUserUnlimited ? 'Unlimited' : ''}
                                    onChange={(e) => set({ usage_limit_per_user: e.target.value })} />
                            </Field>
                        </div>

                        {/* SECTION 4: Dates */}
                        <div className="promo-section-head">
                            <span className="rf-section-label">Validity Period</span>
                        </div>
                        <div className="rf-grid rf-grid-2">
                            <Field id="pf-start_date" label="Start date & time" required error={errors.start_date}>
                                <input {...aria('start_date')} type="datetime-local" className={cls('start_date')} value={f.start_date} onChange={(e) => set({ start_date: e.target.value })} />
                            </Field>
                            <Field id="pf-end_date" label="End date & time" required error={errors.end_date}>
                                <input {...aria('end_date')} type="datetime-local" className={cls('end_date')} value={f.end_date} onChange={(e) => set({ end_date: e.target.value })} />
                            </Field>
                        </div>

                        {/* SECTION 5: Who can use it */}
                        <div className="promo-section-head">
                            <span className="rf-section-label">Who can use it</span>
                        </div>
                        <div className="promo-audience-grid" role="radiogroup" aria-label="Who can use it">
                            {[
                                ['all', 'Everyone', 'All registered customers'],
                                ['new_customers', 'New customers only', 'No completed transfers yet'],
                                ['existing_customers', 'Existing customers only', '1 or more completed transactions'],
                                ['specific_customers', 'Specific customers', 'Target by email, ID, or CSV upload'],
                                ...(segments.length ? [['segment', 'Saved segment', 'Pre-defined customer segment']] : []),
                                ...(f.audience === 'targeted' ? [['targeted', `One customer (${f.targeted_user_id})`, 'Single targeted customer']] : []),
                            ].map(([v, l, h]) => {
                                const active = f.audience === v;
                                return (
                                    <label key={v} className={`promo-audience-card${active ? ' active' : ''}`}>
                                        <input type="radio" name="pf-audience" value={v} checked={active} onChange={() => set({ audience: v })} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1e293b' }}>{l}</div>
                                            {h && <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>{h}</div>}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        {f.audience === 'specific_customers' && (
                            <div className="promo-specific-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                                    <label htmlFor="pf-customer_ids" style={{ fontWeight: 600, fontSize: '0.84rem', margin: 0 }}>
                                        Customer Email IDs or Customer IDs <span className="rf-req">*</span>
                                        {customerListCount > 0 && <span className="rf-pill rf-pill-blue" style={{ marginLeft: 8 }}>{customerListCount} selected</span>}
                                    </label>
                                    <label className="rf-btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                                        Upload CSV / file
                                        <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCustomerFileUpload} />
                                    </label>
                                </div>
                                <textarea
                                    {...aria('customer_ids')}
                                    className={cls('customer_ids')}
                                    rows={3}
                                    placeholder="Paste customer email addresses (e.g. alice@example.com) or customer IDs (e.g. cust_01), separated by commas or new lines..."
                                    value={f.customer_ids}
                                    onChange={(e) => set({ customer_ids: e.target.value })}
                                />
                                {errors.customer_ids ? (
                                    <div className="rf-error" id="pf-customer_ids-error">{errors.customer_ids}</div>
                                ) : (
                                    <div className="rf-hint">Copy-paste emails or customer IDs, or upload a CSV/TXT file (up to 500 customers).</div>
                                )}
                                <div className="rf-grid rf-grid-2" style={{ marginTop: 10, marginBottom: 0 }}>
                                    <Field id="pf-min_transactions" label="Min completed transactions (optional)" hint="Only qualify if customer has at least this many transfers.">
                                        <input id="pf-min_transactions" className="rf-input" inputMode="numeric" placeholder="e.g. 1" value={f.min_transactions || ''} onChange={(e) => set({ min_transactions: e.target.value })} />
                                    </Field>
                                    <Field id="pf-min_volume" label={`Min transfer volume (${curTag}, optional)`} hint="Minimum lifetime completed transfer volume.">
                                        <div className="rf-affix">
                                            {sym && <span className="rf-prefix">{sym}</span>}
                                            <input id="pf-min_volume" className="rf-input" inputMode="decimal" placeholder="e.g. 500" value={f.min_volume || ''}
                                                style={!sym ? { paddingLeft: 12 } : undefined}
                                                onChange={(e) => set({ min_volume: e.target.value })} />
                                        </div>
                                    </Field>
                                </div>
                            </div>
                        )}
                        {f.audience === 'segment' && (
                            <div style={{ marginTop: 10 }}>
                                <Field id="pf-segment_id" label="Segment" required error={errors.segment_id}>
                                    <select {...aria('segment_id')} className={cls('segment_id', 'rf-select')} value={f.segment_id} onChange={(e) => set({ segment_id: e.target.value })}>
                                        <option value="">Choose a segment</option>
                                        {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </Field>
                            </div>
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
