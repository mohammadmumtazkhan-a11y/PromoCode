import React, { useEffect, useRef, useState } from 'react';
import { Field, Toggle, CurrencyPicker } from './components/FormBits';
import { validateScheme } from './lib/schemeValidation';
import { summaryLine } from './lib/bonusUtils';
import { EMPTY_SCHEME, formFromScheme, bodyFrom } from './lib/schemeForm';
import { ConfirmDialog } from '../../components/Feedback';

const ORDER = ['name', 'description', 'credit_amount', 'commission_percentage', 'max_award', 'tiers', 'min_transaction_threshold', 'min_transactions', 'time_period_days', 'validityDays', 'start_date', 'end_date', 'status'];

const SchemeForm = ({ editing, segments, existingNames, onSaved, onCancel, toast }) => {
    const [form, setForm] = useState(EMPTY_SCHEME);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const topRef = useRef(null);

    useEffect(() => {
        setForm(editing ? formFromScheme(editing) : EMPTY_SCHEME);
        setErrors({});
        if (editing && topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [editing]);

    const set = (patch) => setForm((f) => ({ ...f, ...patch }));
    const setRule = (patch) => setForm((f) => ({ ...f, eligibility_rules: { ...f.eligibility_rules, ...patch } }));
    const setTier = (i, patch) => setForm((f) => ({ ...f, tiers: f.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
    const err = (k) => errors[k];
    const cls = (k, base = 'rf-input') => `${base}${err(k) ? ' rf-invalid' : ''}`;
    const aria = (k) => ({ 'aria-invalid': !!err(k), 'aria-describedby': err(k) ? `bs-${k}-error` : undefined });

    const loyalty = form.bonus_type === 'LOYALTY_CREDIT';
    const pct = form.commission_type === 'PERCENTAGE';
    const names = existingNames.filter((n) => !editing || n.toLowerCase() !== String(editing.name).toLowerCase());

    const focusFirst = (errs) => {
        const first = ORDER.find((k) => errs[k]);
        const el = first && document.getElementById(`bs-${first}`);
        if (el) el.focus();
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch(editing ? `/api/bonus-schemes/${editing.id}` : '/api/bonus-schemes', {
                method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyFrom(form)),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (data.fields) {
                    const mapped = { ...data.fields };
                    setErrors(mapped);
                    focusFirst(mapped);
                    toast('Please correct the highlighted fields.', 'error');
                } else toast(data.message || data.error || 'The scheme could not be saved.', 'error');
                return;
            }
            toast(editing ? 'Bonus scheme updated.' : 'Bonus scheme created.');
            setForm(EMPTY_SCHEME);
            setErrors({});
            onSaved();
        } catch {
            toast('The server could not be reached. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        const errs = validateScheme(form, { names });
        setErrors(errs);
        if (Object.keys(errs).length) {
            focusFirst(errs);
            toast('Please correct the highlighted fields.', 'error');
            return;
        }
        // AC-5.2.3: editing a scheme that already paid bonuses
        if (editing && editing.awards_count > 0) {
            setConfirm(editing.awards_count);
            return;
        }
        save();
    };

    const segmentOptions = [{ id: 'all', name: 'All Users' }, { id: 'existing_customers', name: 'Existing customers' }, ...segments];

    return (
        <div className="rf-card rf-card-pad" ref={topRef}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 20px' }}>{editing ? `Edit Bonus Scheme – ${editing.name}` : 'Create New Scheme'}</h3>
            <form onSubmit={submit} noValidate>
                <div className="rf-grid rf-grid-21">
                    <Field id="bs-name" label="Bonus Name" required error={err('name')}>
                        <input id="bs-name" className={cls('name')} placeholder="e.g. Transaction Threshold Credit" maxLength={60} value={form.name} onChange={(e) => set({ name: e.target.value })} {...aria('name')} />
                    </Field>
                    <Field id="bs-type" label="Bonus Type" required hint="Referral rewards are managed in Growth > Referral Settings.">
                        <select id="bs-type" className="rf-select" value={form.bonus_type} onChange={(e) => set({ bonus_type: e.target.value })}>
                            <option value="LOYALTY_CREDIT">Loyalty Credit</option>
                            <option value="TRANSACTION_THRESHOLD_CREDIT">Transaction Threshold Credit</option>
                            <option value="REQUEST_MONEY">Request Money Credit</option>
                        </select>
                    </Field>
                </div>

                <div className="rf-grid">
                    <Field id="bs-description" label="Internal note" error={err('description')} hint="Only admins see this.">
                        <input id="bs-description" className={cls('description')} maxLength={200} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Optional" {...aria('description')} />
                    </Field>
                </div>

                <div className="rf-grid rf-grid-3">
                    <Field id="bs-currency" label="Currency" required hint="Only activity in this currency earns this bonus, and the bonus is paid in it.">
                        <CurrencyPicker id="bs-currency" value={form.currency} onChange={(currency) => set({ currency })} />
                    </Field>
                    <Field id="bs-method" label="Reward method" required>
                        <select id="bs-method" className="rf-select" value={form.commission_type} onChange={(e) => set({ commission_type: e.target.value })}>
                            <option value="FIXED">Fixed amount</option>
                            <option value="PERCENTAGE">Percentage of the amount</option>
                        </select>
                    </Field>
                    <Field id="bs-tiered" label="Tiered">
                        <div className="bn-inline-toggle">
                            <Toggle on={form.is_tiered} label="Different rewards for different amounts" onClick={() => set({ is_tiered: !form.is_tiered })} />
                            <span>Different rewards for different amounts</span>
                        </div>
                    </Field>
                </div>

                {form.is_tiered ? (
                    <div className="bn-tiers" aria-describedby={err('tiers') ? 'bs-tiers-error' : undefined}>
                        <div className="bn-tier-row bn-tier-head"><span /><span>Min amount</span><span>Max amount (blank on the last tier = no limit)</span><span>{pct ? 'Percentage (%)' : `Bonus (${form.currency})`}</span><span /></div>
                        {form.tiers.map((t, i) => (
                            <div className="bn-tier-row" key={i}>
                                <span className="bn-n">{i + 1}.</span>
                                <input id={i === 0 ? 'bs-tiers' : undefined} className={cls('tiers')} type="number" min="0" step="0.01" aria-label={`Tier ${i + 1} min`} value={t.min} onChange={(e) => setTier(i, { min: e.target.value })} />
                                <input className={cls('tiers')} type="number" min="0" step="0.01" aria-label={`Tier ${i + 1} max`} value={t.max} onChange={(e) => setTier(i, { max: e.target.value })} placeholder="∞" />
                                <input className={cls('tiers')} type="number" min="0" step="0.01" aria-label={`Tier ${i + 1} value`} value={t.value} onChange={(e) => setTier(i, { value: e.target.value })} />
                                <button type="button" className="bn-icon-btn" aria-label={`Remove tier ${i + 1}`} disabled={form.tiers.length === 1}
                                    onClick={() => set({ tiers: form.tiers.filter((_, j) => j !== i) })}>✕</button>
                            </div>
                        ))}
                        {err('tiers') && <div className="rf-error" id="bs-tiers-error">{err('tiers')}</div>}
                        <button type="button" className="rf-btn-sm" style={{ marginTop: 8 }}
                            onClick={() => {
                                const last = form.tiers[form.tiers.length - 1];
                                set({ tiers: [...form.tiers, { min: last && last.max !== '' ? last.max : '', max: '', value: '' }] });
                            }}>+ Add tier</button>
                    </div>
                ) : (
                    <div className="rf-grid rf-grid-3">
                        {pct ? (
                            <Field id="bs-commission_percentage" label="Percentage" required error={err('commission_percentage')}>
                                <input id="bs-commission_percentage" className={cls('commission_percentage')} type="number" step="0.01" min="0.01" max="100" placeholder="e.g. 5" value={form.commission_percentage} onChange={(e) => set({ commission_percentage: e.target.value })} {...aria('commission_percentage')} />
                            </Field>
                        ) : (
                            <Field id="bs-credit_amount" label="Credit Amount" required error={err('credit_amount')}>
                                <input id="bs-credit_amount" className={cls('credit_amount')} type="number" step="0.01" min="0.01" placeholder="e.g. 10" value={form.credit_amount} onChange={(e) => set({ credit_amount: e.target.value })} {...aria('credit_amount')} />
                            </Field>
                        )}
                    </div>
                )}

                <div className="rf-grid rf-grid-3">
                    {(pct || form.is_tiered) && (
                        <Field id="bs-max_award" label="Maximum bonus (optional)" error={err('max_award')} hint="Leave blank for no limit.">
                            <input id="bs-max_award" className={cls('max_award')} type="number" step="0.01" min="0" value={form.max_award} onChange={(e) => set({ max_award: e.target.value })} {...aria('max_award')} />
                        </Field>
                    )}
                    {form.bonus_type === 'TRANSACTION_THRESHOLD_CREDIT' && (
                        <Field id="bs-min_transaction_threshold" label="Minimum transfer amount" required error={err('min_transaction_threshold')}>
                            <input id="bs-min_transaction_threshold" className={cls('min_transaction_threshold')} type="number" step="0.01" min="0" value={form.min_transaction_threshold} onChange={(e) => set({ min_transaction_threshold: e.target.value })} {...aria('min_transaction_threshold')} />
                        </Field>
                    )}
                    {form.bonus_type === 'REQUEST_MONEY' && (
                        <Field id="bs-min_transaction_threshold" label="Minimum requested amount" required error={err('min_transaction_threshold')}>
                            <input id="bs-min_transaction_threshold" className={cls('min_transaction_threshold')} type="number" step="0.01" min="0" value={form.min_transaction_threshold} onChange={(e) => set({ min_transaction_threshold: e.target.value })} {...aria('min_transaction_threshold')} />
                        </Field>
                    )}
                    {loyalty && (
                        <>
                            <Field id="bs-min_transactions" label="Number of Transactions" required error={err('min_transactions')}>
                                <input id="bs-min_transactions" className={cls('min_transactions')} type="number" step="1" min="1" max="1000" placeholder="e.g. 3" value={form.min_transactions} onChange={(e) => set({ min_transactions: e.target.value })} {...aria('min_transactions')} />
                            </Field>
                            <Field id="bs-time_period_days" label="Time Period (Days)" required error={err('time_period_days')}>
                                <input id="bs-time_period_days" className={cls('time_period_days')} type="number" step="1" min="1" max="3650" placeholder="e.g. 30" value={form.time_period_days} onChange={(e) => set({ time_period_days: e.target.value })} {...aria('time_period_days')} />
                            </Field>
                        </>
                    )}
                </div>

                <div className="rf-grid rf-grid-2">
                    <Field id="bs-validityDays" label="Bonus valid for (days)" required error={err('validityDays')} hint="How long the customer can use the bonus after earning it.">
                        <input id="bs-validityDays" className={cls('validityDays')} type="number" step="1" min="1" max="730" value={form.eligibility_rules.validityDays} onChange={(e) => setRule({ validityDays: e.target.value })} {...aria('validityDays')} />
                    </Field>
                    <Field id="bs-once" label="Can a customer earn this more than once?" required>
                        <div className="bn-radio-row" role="radiogroup" aria-label="Can a customer earn this more than once?">
                            <label><input type="radio" name="bs-once" checked={form.eligibility_rules.oneTimeOnly !== false} onChange={() => setRule({ oneTimeOnly: true })} /> Once only</label>
                            <label><input type="radio" name="bs-once" checked={form.eligibility_rules.oneTimeOnly === false} onChange={() => setRule({ oneTimeOnly: false })} /> Every time they qualify</label>
                        </div>
                    </Field>
                </div>

                <div className="rf-grid rf-grid-3">
                    <Field id="bs-start_date" label="Start Date" required error={err('start_date')}>
                        <input id="bs-start_date" className={cls('start_date')} type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} {...aria('start_date')} />
                    </Field>
                    <Field id="bs-end_date" label="End Date" required error={err('end_date')}>
                        <input id="bs-end_date" className={cls('end_date')} type="date" value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} {...aria('end_date')} />
                    </Field>
                    <Field id="bs-status" label="Status" required error={err('status')}>
                        <select id="bs-status" className={cls('status', 'rf-select')} value={form.status} onChange={(e) => set({ status: e.target.value })}>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            {form.status === 'EXPIRED' && <option value="EXPIRED" disabled>Ended</option>}
                        </select>
                    </Field>
                </div>

                <div className="rf-grid">
                    <Field id="bs-segment" label="Who can earn it" required>
                        {loyalty && <div className="bn-note">ⓘ Loyalty Credit is only for Existing Customers</div>}
                        <select id="bs-segment" className="rf-select" disabled={loyalty}
                            value={loyalty ? 'existing_customers' : String(form.eligibility_rules.segments[0] || 'all')}
                            onChange={(e) => setRule({ segments: [e.target.value] })}>
                            {segmentOptions.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                        </select>
                    </Field>
                </div>

                <div className="bn-summary" aria-live="polite"><span aria-hidden="true">ⓘ</span><span data-testid="scheme-summary">{summaryLine({ ...form, eligibility_rules: form.eligibility_rules })}</span></div>

                <div className="rf-actions">
                    {editing && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
                    <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Scheme' : 'Create Scheme'}</button>
                </div>
            </form>

            <ConfirmDialog
                open={confirm !== null}
                title="Update this scheme?"
                message={`This scheme has paid ${confirm} bonuses. Changes apply only to new awards. Continue?`}
                confirmLabel="Update Scheme"
                onCancel={() => setConfirm(null)}
                onConfirm={() => { setConfirm(null); save(); }}
            />
        </div>
    );
};

export default SchemeForm;
