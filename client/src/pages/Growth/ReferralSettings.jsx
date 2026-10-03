import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ToastStack, ConfirmDialog } from '../../components/Feedback';
import { useToasts } from '../../components/useToasts';
import { CURRENCIES, currencySymbol, formatMoney, formatUkDate, ukTodayIso } from './referralUtils';
import StatusPill from './StatusPill';
import { validateForm } from './referralValidation';
import './referral.css';

// Suggested starting values when a currency is picked (admin can change them)
const CURRENCY_DEFAULTS = {
    GBP: { referrer: 5, referee: 10, floor: 50 },
    USD: { referrer: 10, referee: 20, floor: 100 },
    EUR: { referrer: 8, referee: 15, floor: 75 },
    NGN: { referrer: 2000, referee: 5000, floor: 20000 },
};

const EMPTY_FORM = {
    name: '', is_enabled: true, reward_type: 'BOTH', base_currency: 'GBP',
    referrer_reward: '5', referee_reward: '10', min_transaction_threshold: '50',
    qualification_window_days: '30', bonus_validity_days: '90', max_referrals_per_referrer: '',
    min_redeem_amount: '', start_date: '', end_date: '', notify: true,
};

const TYPE_LABELS = { BOTH: 'Both Parties', REFERRER: 'Referrer Only', REFEREE: 'Referee Only' };
const Field = ({ id, label, required, error, hint, children }) => (
    <div className="rf-field">
        <label htmlFor={id}>{label}{required && <span className="rf-req">*</span>}</label>
        {children}
        {error ? <div className="rf-error" id={`${id}-error`}>{error}</div> : hint ? <div className="rf-hint">{hint}</div> : null}
    </div>
);

const Toggle = ({ on, onClick, label, disabled }) => (
    <button type="button" className="rf-toggle" onClick={onClick} disabled={disabled} aria-pressed={on} aria-label={label}>
        <span className={`rf-toggle-track ${on ? 'on' : ''}`}><span className="rf-toggle-knob" /></span>
    </button>
);

const ReferralSettings = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [dialog, setDialog] = useState(null);
    const [dialogNotify, setDialogNotify] = useState(true);
    const { toasts, push, dismiss } = useToasts();

    const fetchRules = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await fetch(`/api/referral-rules${showArchived ? '?include_archived=1' : ''}`);
            if (!res.ok) throw new Error('load');
            const data = await res.json();
            setRules(data.data || []);
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [showArchived]);

    useEffect(() => { fetchRules(); }, [fetchRules]);

    const activeRules = useMemo(() => rules.filter((r) => r.status !== 'ARCHIVED'), [rules]);
    const sym = currencySymbol(form.base_currency);
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    const onTypeChange = (type) => {
        const d = CURRENCY_DEFAULTS[form.base_currency] || {};
        const patch = { reward_type: type };
        if (type === 'REFEREE') patch.referrer_reward = '0';
        if (type === 'REFERRER') patch.referee_reward = '0';
        if (type !== 'REFEREE' && Number(form.referrer_reward) === 0) patch.referrer_reward = String(d.referrer ?? '');
        if (type !== 'REFERRER' && Number(form.referee_reward) === 0) patch.referee_reward = String(d.referee ?? '');
        set(patch);
    };

    // Only the enabled bonus field(s) and the Floor are pre-filled (AC-1.1.5)
    const onCurrencyChange = (currency) => {
        const patch = { base_currency: currency };
        const d = CURRENCY_DEFAULTS[currency];
        if (d && !editingId) {
            patch.min_transaction_threshold = String(d.floor);
            patch.referrer_reward = form.reward_type === 'REFEREE' ? '0' : String(d.referrer);
            patch.referee_reward = form.reward_type === 'REFERRER' ? '0' : String(d.referee);
        }
        set(patch);
    };

    const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setErrors({}); };

    const payload = () => ({
        ...form,
        name: form.name.trim(),
        referrer_reward: form.reward_type === 'REFEREE' ? 0 : form.referrer_reward,
        referee_reward: form.reward_type === 'REFERRER' ? 0 : form.referee_reward,
    });

    const save = async (notify) => {
        setSaving(true);
        try {
            const res = await fetch(editingId ? `/api/referral-rules/${editingId}` : '/api/referral-rules', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload(), notify }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (data.fields) setErrors(data.fields);
                if (data.error === 'DUPLICATE_NAME') setErrors((e) => ({ ...e, name: data.message }));
                push(data.message || "We couldn't save the rule. Please try again.", 'error');
                return;
            }
            push(editingId ? 'Referral rule updated. Changes apply to new referrals only.' : `Referral rule '${form.name.trim()}' created.`);
            if (data.notification) push(`Customers in ${form.base_currency} will be notified: "${data.notification.title}".`, 'info');
            resetForm();
            fetchRules();
        } catch {
            push("We couldn't save the rule. Please try again.", 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validateForm(form, { isNew: !editingId, rules: activeRules, editingId });
        setErrors(errs);
        if (Object.keys(errs).length) {
            const first = Object.keys(errs)[0];
            setTimeout(() => document.getElementById(`rf-${first}`)?.focus(), 0);
            return;
        }
        const floor = Number(form.min_transaction_threshold);
        const big = (form.reward_type !== 'REFEREE' && Number(form.referrer_reward) > floor) || (form.reward_type !== 'REFERRER' && Number(form.referee_reward) > floor);
        const editing = editingId ? rules.find((r) => r.id === editingId) : null;
        const steps = [];
        if (big) steps.push('big');
        if (editing && editing.pending_count > 0) steps.push('pending');
        runSteps(steps, editing);
    };

    const runSteps = (steps, editing) => {
        if (!steps.length) return save(form.notify);
        const [step, ...rest] = steps;
        if (step === 'big') {
            setDialog({
                title: 'Bonus higher than the minimum amount',
                message: 'The bonus is higher than the minimum transaction amount. Customers could earn more than they send. Do you want to continue?',
                confirmLabel: editingId ? 'Save anyway' : 'Create anyway',
                onConfirm: () => { setDialog(null); runSteps(rest, editing); },
            });
        } else {
            setDialog({
                title: 'Pending referrals',
                message: `${editing.pending_count} pending referral${editing.pending_count === 1 ? '' : 's'} will keep their original reward. Only new referrals will use these changes. Continue?`,
                confirmLabel: 'Continue',
                onConfirm: () => { setDialog(null); runSteps(rest, editing); },
            });
        }
    };

    const handleEdit = (rule) => {
        setForm({
            name: rule.name, is_enabled: !!rule.is_enabled, reward_type: rule.reward_type, base_currency: rule.base_currency,
            referrer_reward: String(rule.referrer_reward), referee_reward: String(rule.referee_reward),
            min_transaction_threshold: String(rule.min_transaction_threshold),
            qualification_window_days: String(rule.qualification_window_days ?? 30), bonus_validity_days: String(rule.bonus_validity_days ?? 90),
            max_referrals_per_referrer: rule.max_referrals_per_referrer ? String(rule.max_referrals_per_referrer) : '',
            min_redeem_amount: rule.min_redeem_amount ? String(rule.min_redeem_amount) : '',
            start_date: rule.start_date || '', end_date: rule.end_date || '', notify: true,
        });
        setErrors({});
        setEditingId(rule.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const changeStatus = async (rule, enable, notify) => {
        setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, is_enabled: enable ? 1 : 0 } : r)));
        try {
            const res = await fetch(`/api/referral-rules/${rule.id}/status`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_enabled: enable, notify }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "We couldn't update the rule status. Please try again.");
            push(enable ? 'Rule activated.' : 'Rule deactivated.');
            if (data.notification) push(`Customers in ${rule.base_currency} will be notified: "${data.notification.title}".`, 'info');
        } catch (err) {
            push(err.message || "We couldn't update the rule status. Please try again.", 'error');
        } finally {
            fetchRules();
        }
    };

    const handleToggle = (rule) => {
        if (rule.is_enabled) {
            setDialog({
                title: `Deactivate '${rule.name}'?`,
                message: 'New customers will not be able to join through referral links. Pending referrals will still be rewarded.',
                confirmLabel: 'Deactivate', tone: 'danger',
                onConfirm: () => { setDialog(null); changeStatus(rule, false, false); },
            });
        } else {
            setDialogNotify(true);
            setDialog({
                title: `Activate '${rule.name}'?`,
                message: `Customers sending in ${rule.base_currency} will see the Refer & Earn offer.`,
                confirmLabel: 'Activate', withNotify: true,
                onConfirm: (notify) => { setDialog(null); changeStatus(rule, true, notify); },
            });
        }
    };

    const handleArchive = (rule) => {
        setDialog({
            title: `Archive '${rule.name}'?`,
            message: 'It will stop accepting new referrals. Pending referrals will still be rewarded. This cannot be undone.',
            confirmLabel: 'Archive', tone: 'danger',
            onConfirm: async () => {
                setDialog(null);
                try {
                    const res = await fetch(`/api/referral-rules/${rule.id}/archive`, { method: 'POST' });
                    if (!res.ok) throw new Error();
                    push('Rule archived.');
                    if (editingId === rule.id) resetForm();
                    fetchRules();
                } catch {
                    push("We couldn't archive the rule. Please try again.", 'error');
                }
            },
        });
    };

    const err = (k) => errors[k];
    const inputCls = (k) => `rf-input${err(k) ? ' rf-invalid' : ''}`;
    const aria = (k) => ({ id: `rf-${k}`, 'aria-invalid': !!err(k), 'aria-describedby': err(k) ? `rf-${k}-error` : undefined });

    return (
        <div className="rf-page">
            <ToastStack toasts={toasts} onDismiss={dismiss} />
            <h2 className="rf-title">Referral Scheme Management</h2>
            <p className="rf-subtitle">Create and manage referral reward programmes. One rule per send currency.</p>

            <div className="rf-card rf-card-pad">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 20px' }}>{editingId ? 'Edit Rule' : 'Create New Rule'}</h3>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="rf-grid rf-grid-21">
                        <Field id="rf-name" label="Rule Name" required error={err('name')}>
                            <input {...aria('name')} className={inputCls('name')} placeholder="e.g. UK Standard Programme" maxLength={50}
                                value={form.name} onChange={(e) => set({ name: e.target.value })} />
                        </Field>
                        <Field id="rf-is_enabled" label="Status" required>
                            <select id="rf-is_enabled" className="rf-select" value={form.is_enabled ? '1' : '0'} onChange={(e) => set({ is_enabled: e.target.value === '1' })}>
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </Field>
                    </div>

                    <div className="rf-grid rf-grid-2">
                        <Field id="rf-reward_type" label="Who gets a bonus?" required>
                            <select id="rf-reward_type" className="rf-select" value={form.reward_type} onChange={(e) => onTypeChange(e.target.value)}>
                                <option value="BOTH">Both Parties (Double-Sided)</option>
                                <option value="REFERRER">Referrer Only</option>
                                <option value="REFEREE">Referee (New User) Only</option>
                            </select>
                        </Field>
                        <Field id="rf-base_currency" label="Send Currency" required error={err('base_currency')}>
                            <select id="rf-base_currency" className="rf-select" value={form.base_currency} onChange={(e) => onCurrencyChange(e.target.value)}>
                                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} ({c.name})</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="rf-grid rf-grid-3">
                        <Field id="rf-referrer_reward" label="Referrer Bonus" required={form.reward_type !== 'REFEREE'} error={err('referrer_reward')}
                            hint={form.reward_type === 'REFEREE' ? 'Not used for Referee Only rules.' : undefined}>
                            <div className="rf-affix"><span className="rf-prefix">{sym}</span>
                                <input {...aria('referrer_reward')} className={inputCls('referrer_reward')} inputMode="decimal" disabled={form.reward_type === 'REFEREE'}
                                    value={form.referrer_reward} onChange={(e) => set({ referrer_reward: e.target.value })} />
                            </div>
                        </Field>
                        <Field id="rf-referee_reward" label="Referee (New User) Bonus" required={form.reward_type !== 'REFERRER'} error={err('referee_reward')}
                            hint={form.reward_type === 'REFERRER' ? 'Not used for Referrer Only rules.' : undefined}>
                            <div className="rf-affix"><span className="rf-prefix">{sym}</span>
                                <input {...aria('referee_reward')} className={inputCls('referee_reward')} inputMode="decimal" disabled={form.reward_type === 'REFERRER'}
                                    value={form.referee_reward} onChange={(e) => set({ referee_reward: e.target.value })} />
                            </div>
                        </Field>
                        <Field id="rf-min_transaction_threshold" label="Minimum Transaction Amount (Floor)" required error={err('min_transaction_threshold')}
                            hint="A transfer equal to or above this amount qualifies.">
                            <div className="rf-affix"><span className="rf-prefix">{sym}</span>
                                <input {...aria('min_transaction_threshold')} className={inputCls('min_transaction_threshold')} inputMode="decimal"
                                    value={form.min_transaction_threshold} onChange={(e) => set({ min_transaction_threshold: e.target.value })} />
                            </div>
                        </Field>
                    </div>

                    <div className="rf-section-label">Limits &amp; timing</div>
                    <div className="rf-grid rf-grid-3">
                        <Field id="rf-qualification_window_days" label="Qualification Window (days)" required error={err('qualification_window_days')}
                            hint="Days after joining for the friend to make a qualifying transfer.">
                            <input {...aria('qualification_window_days')} className={inputCls('qualification_window_days')} inputMode="numeric"
                                value={form.qualification_window_days} onChange={(e) => set({ qualification_window_days: e.target.value })} />
                        </Field>
                        <Field id="rf-bonus_validity_days" label="Bonus Validity (days)" required error={err('bonus_validity_days')}
                            hint="Days the bonus credit can be used before it expires.">
                            <input {...aria('bonus_validity_days')} className={inputCls('bonus_validity_days')} inputMode="numeric"
                                value={form.bonus_validity_days} onChange={(e) => set({ bonus_validity_days: e.target.value })} />
                        </Field>
                        <Field id="rf-max_referrals_per_referrer" label="Max Rewarded Referrals per Referrer" error={err('max_referrals_per_referrer')} hint="Leave blank for unlimited.">
                            <input {...aria('max_referrals_per_referrer')} className={inputCls('max_referrals_per_referrer')} inputMode="numeric" placeholder="Unlimited"
                                value={form.max_referrals_per_referrer} onChange={(e) => set({ max_referrals_per_referrer: e.target.value })} />
                        </Field>
                    </div>
                    <div className="rf-grid rf-grid-3">
                        <Field id="rf-min_redeem_amount" label="Minimum Send Amount to Redeem" error={err('min_redeem_amount')} hint="Leave blank for no minimum.">
                            <div className="rf-affix"><span className="rf-prefix">{sym}</span>
                                <input {...aria('min_redeem_amount')} className={inputCls('min_redeem_amount')} inputMode="decimal" placeholder="0.00"
                                    value={form.min_redeem_amount} onChange={(e) => set({ min_redeem_amount: e.target.value })} />
                            </div>
                        </Field>
                        <Field id="rf-start_date" label="Start Date" error={err('start_date')} hint="Blank = starts immediately.">
                            <input {...aria('start_date')} type="date" className={inputCls('start_date')} min={editingId ? undefined : ukTodayIso()}
                                value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} />
                        </Field>
                        <Field id="rf-end_date" label="End Date" error={err('end_date')} hint="Blank = no end date.">
                            <input {...aria('end_date')} type="date" className={inputCls('end_date')}
                                value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} />
                        </Field>
                    </div>

                    <label className="rf-check">
                        <input type="checkbox" checked={form.notify} onChange={(e) => set({ notify: e.target.checked })} />
                        Notify customers in the app when this offer goes live or improves
                    </label>

                    <div className="rf-actions">
                        {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>}
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? (editingId ? 'Saving...' : 'Creating...') : editingId ? 'Save Changes' : 'Create Rule'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="rf-card">
                <div className="rf-card-head">
                    <div>
                        <h3>Existing Rules</h3>
                        <p>Manage your referral incentive programmes</p>
                    </div>
                    <label className="rf-switch-row">
                        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
                    </label>
                </div>
                <div className="rf-table-wrap">
                    <table className="rf-table">
                        <thead>
                            <tr>
                                <th>Rule Name</th><th>Status</th><th>Type</th>
                                <th className="rf-num">Referrer Bonus</th><th className="rf-num">Referee Bonus</th><th className="rf-num">Min Amount (Floor)</th>
                                <th>Currency</th><th className="rf-num">Window</th><th className="rf-num">Validity</th><th>Dates</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="11" className="rf-empty">Loading referral rules...</td></tr>
                            ) : loadError ? (
                                <tr><td colSpan="11" className="rf-empty">We couldn&apos;t load referral rules. Please refresh the page. <button type="button" className="rf-link" onClick={fetchRules}>Retry</button></td></tr>
                            ) : rules.length === 0 ? (
                                <tr><td colSpan="11" className="rf-empty">No referral rules yet. Create your first rule above.</td></tr>
                            ) : rules.map((rule) => {
                                const archived = rule.status === 'ARCHIVED';
                                return (
                                    <tr key={rule.id} data-testid={`rule-row-${rule.base_currency}`}>
                                        <td className="rf-strong">{rule.name}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {!archived && <Toggle on={!!rule.is_enabled} onClick={() => handleToggle(rule)} label={`${rule.is_enabled ? 'Deactivate' : 'Activate'} ${rule.name}`} />}
                                                <StatusPill status={rule.status} />
                                            </div>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{TYPE_LABELS[rule.reward_type]}</td>
                                        <td className="rf-num rf-strong">{rule.reward_type === 'REFEREE' ? <span className="rf-muted">—</span> : <span style={{ color: '#059669' }}>{formatMoney(rule.referrer_reward, rule.base_currency)}</span>}</td>
                                        <td className="rf-num rf-strong">{rule.reward_type === 'REFERRER' ? <span className="rf-muted">—</span> : <span style={{ color: '#059669' }}>{formatMoney(rule.referee_reward, rule.base_currency)}</span>}</td>
                                        <td className="rf-num">{formatMoney(rule.min_transaction_threshold, rule.base_currency)}</td>
                                        <td><span className="rf-chip">{rule.base_currency}</span></td>
                                        <td className="rf-num">{rule.qualification_window_days ?? 30} days</td>
                                        <td className="rf-num">{rule.bonus_validity_days ?? 90} days</td>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                            {rule.start_date || rule.end_date ? `${formatUkDate(rule.start_date) === '—' ? 'Now' : formatUkDate(rule.start_date)} – ${rule.end_date ? formatUkDate(rule.end_date) : 'No end'}` : <span className="rf-muted">Always on</span>}
                                        </td>
                                        <td>
                                            {!archived && (
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                    <button type="button" className="rf-btn-sm" onClick={() => handleEdit(rule)}>Edit</button>
                                                    <button type="button" className="rf-btn-sm rf-warn" onClick={() => handleArchive(rule)}>Archive</button>
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

            <ConfirmDialog
                open={!!dialog}
                title={dialog?.title}
                message={dialog?.message}
                confirmLabel={dialog?.confirmLabel}
                tone={dialog?.tone}
                onCancel={() => setDialog(null)}
                onConfirm={() => dialog?.onConfirm(dialogNotify)}
            >
                {dialog?.withNotify && (
                    <label className="rf-check">
                        <input type="checkbox" checked={dialogNotify} onChange={(e) => setDialogNotify(e.target.checked)} /> Notify customers
                    </label>
                )}
            </ConfirmDialog>
        </div>
    );
};

export default ReferralSettings;
