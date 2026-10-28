import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ToastStack, ConfirmDialog } from '../../components/Feedback';
import { useToasts } from '../../components/useToasts';
import { CURRENCIES, COUNTRIES, countryByCode, parseCountryList, corridorLabel, currencySymbol, formatMoney, formatUkDate, ukTodayIso, downloadUrl } from './referralUtils';
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
    name: '', is_enabled: true, reward_type: 'BOTH', base_currency: 'GBP', receive_currency: '',
    send_country_mode: 'ALL', send_countries: [],
    receive_country_mode: 'ALL', receive_countries: [],
    referrer_reward: '5', referee_reward: '10', min_transaction_threshold: '50',
    qualification_window_days: '30', bonus_validity_days: '90',
    max_referrals_cap_type: 'COUNT', max_referrals_per_referrer: '', max_referrals_amount_per_referrer: '', max_scheme_budget: '',
    start_date: '', end_date: '', notify: true,
};

const REGIONS = ['Suggested', 'All Regions', 'Europe', 'Africa', 'North America', 'Asia & Middle East', 'Oceania'];

const TYPE_LABELS = { BOTH: 'Both Parties', REFERRER: 'Referrer Only', REFEREE: 'Referee Only' };

const RULE_AUDIT_LABELS = {
    created: 'Rule Created',
    archived: 'Rule Archived',
    name: 'Rule Name',
    is_enabled: 'Active / Paused Status',
    reward_type: 'Reward Type',
    base_currency: 'Send Currency',
    receive_currency: 'Receive Currency',
    send_country_mode: 'Send Country Mode',
    send_countries: 'Send Countries',
    receive_country_mode: 'Receive Country Mode',
    receive_countries: 'Receive Countries',
    referrer_reward: 'Referrer Bonus',
    referee_reward: 'Referee Bonus',
    min_transaction_threshold: 'Minimum Transfer (Floor)',
    qualification_window_days: 'Qualification Window (Days)',
    bonus_validity_days: 'Bonus Validity (Days)',
    max_referrals_cap_type: 'Per-Referrer Cap Type',
    max_referrals_per_referrer: 'Per-Referrer Headcount Cap',
    max_referrals_amount_per_referrer: 'Per-Referrer Monetary Cap',
    max_scheme_budget: 'Total Scheme Budget Cap',
    start_date: 'Start Date',
    end_date: 'End Date',
};

const formatUkDateTime = (value) => {
    if (!value) return '—';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatAuditFieldVal = (field, rawVal, currency) => {
    if (rawVal === null || rawVal === undefined || rawVal === '') {
        if (field === 'receive_currency') return 'All currencies';
        if (field === 'max_referrals_per_referrer' || field === 'max_referrals_amount_per_referrer' || field === 'max_scheme_budget') return 'Unlimited';
        if (field === 'start_date') return 'Immediate';
        if (field === 'end_date') return 'No end date';
        return '—';
    }
    const s = String(rawVal);
    if (field === 'is_enabled') return s === '1' || s === 'true' ? 'Enabled (Active)' : 'Disabled (Paused)';
    if (field === 'archived') return s === '1' || s === 'true' ? 'Archived' : 'Active';
    if (field === 'reward_type') return TYPE_LABELS[s] || s;
    if (['referrer_reward', 'referee_reward', 'min_transaction_threshold', 'max_referrals_amount_per_referrer', 'max_scheme_budget'].includes(field)) {
        const n = Number(s);
        return Number.isFinite(n) ? formatMoney(n, currency || 'GBP') : s;
    }
    if (field === 'qualification_window_days' || field === 'bonus_validity_days') return `${s} days`;
    if (field === 'max_referrals_per_referrer') return `${s} referrals`;
    if (field === 'send_countries' || field === 'receive_countries') {
        const list = parseCountryList(s);
        if (!list.length) return 'All countries';
        return list.map((code) => {
            const c = countryByCode(code);
            return `${c.flag} ${c.name} (${c.code})`;
        }).join(', ');
    }
    if (field === 'start_date' || field === 'end_date') return formatUkDate(s);
    return s;
};

const ReferralHistoryModal = ({ open, rule, data, loading, onClose }) => {
    const [tab, setTab] = useState('overview');
    const [expanded, setExpanded] = useState(false);
    const [referralSearch, setReferralSearch] = useState('');

    useEffect(() => {
        if (open) {
            setTab('overview');
            setReferralSearch('');
        }
    }, [open, rule?.id]);

    if (!open || !rule) return null;

    const c = rule.base_currency || 'GBP';
    const perf = data?.perf || {};
    const rawAudit = data?.audit || [];
    const referrals = data?.referrals || [];
    const referralsTotal = data?.referralsTotal ?? referrals.length;

    // Ensure seeded rules that predated audit rows still show their initial creation record
    const hasCreatedAudit = rawAudit.some((a) => a.field === 'created');
    const auditRows = hasCreatedAudit
        ? rawAudit
        : [
            ...rawAudit,
            {
                id: `seed-created-${rule.id}`,
                field: 'created',
                old_value: null,
                new_value: `${rule.name} (${corridorLabel(c, rule.receive_currency)} · Referrer ${rule.reward_type === 'REFEREE' ? '—' : formatMoney(rule.referrer_reward, c)} / Referee ${rule.reward_type === 'REFERRER' ? '—' : formatMoney(rule.referee_reward, c)})`,
                admin_user: 'System / Admin',
                created_at: rule.created_at || rule.updated_at,
            },
        ];

    const filteredReferrals = referralSearch.trim()
        ? referrals.filter((r) => {
            const q = referralSearch.trim().toLowerCase();
            const hay = [
                r.id,
                r.referrer_first_name,
                r.referrer_last_name,
                r.referrer_email,
                r.referrer_id,
                r.referee_first_name,
                r.referee_last_name,
                r.referee_email,
                r.referee_id,
                r.registration_channel,
                r.status,
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        })
        : referrals;

    const sendCountries = parseCountryList(rule.send_countries || rule.send_country);
    const rcvCountries = parseCountryList(rule.receive_countries || rule.receive_country);
    const sendScopeLabel = sendCountries.length
        ? `${rule.send_country_mode === 'EXCLUDE' ? 'Exclude' : 'Include only'}: ${sendCountries.join(', ')}`
        : `All ${c} send countries`;
    const rcvScopeLabel = rcvCountries.length
        ? `${rule.receive_country_mode === 'EXCLUDE' ? 'Exclude' : 'Include only'}: ${rcvCountries.join(', ')}`
        : rule.receive_currency ? `All ${rule.receive_currency} receive countries` : 'All destination countries';

    const perUserCapLabel = rule.max_referrals_cap_type === 'AMOUNT' && rule.max_referrals_amount_per_referrer
        ? `${formatMoney(rule.max_referrals_amount_per_referrer, c)} per referrer`
        : rule.max_referrals_per_referrer
            ? `${rule.max_referrals_per_referrer} referrals per referrer`
            : 'Unlimited per referrer';

    const schemeSpend = Number(rule.scheme_spend ?? perf.bonus_issued ?? 0);
    const schemeBudget = Number(rule.max_scheme_budget || 0);
    const datesLabel = rule.start_date || rule.end_date
        ? `${formatUkDate(rule.start_date) === '—' ? 'Immediate' : formatUkDate(rule.start_date)} – ${rule.end_date ? formatUkDate(rule.end_date) : 'No end date'}`
        : 'Always on (no end date)';

    return (
        <div className="rf-cmodal-backdrop" onClick={onClose} data-testid="referral-history-modal">
            <div className={`rf-cmodal rf-hmodal ${expanded ? 'expanded' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="rf-hmodal-title">
                <div className="rf-cmodal-header">
                    <div>
                        <h3 id="rf-hmodal-title">Scheme History — {rule.name}</h3>
                        <p>Complete configuration snapshot, audit change log, budget utilization, and referral activity for this scheme.</p>
                        <div className="rf-hmodal-meta">
                            <span className="rf-chip">{corridorLabel(c, rule.receive_currency)}</span>
                            <StatusPill status={rule.status} />
                            <span className="rf-pill rf-pill-blue">{TYPE_LABELS[rule.reward_type] || rule.reward_type}</span>
                            <span className="rf-sub" style={{ display: 'inline' }}>
                                Rule #{rule.id} • Created {formatUkDateTime(rule.created_at)}
                                {rule.updated_at && rule.updated_at !== rule.created_at ? ` • Last updated ${formatUkDateTime(rule.updated_at)}` : ''}
                            </span>
                        </div>
                    </div>
                    <div className="rf-hmodal-head-actions">
                        <button
                            type="button"
                            className="rf-hmodal-expand-btn"
                            data-testid="toggle-expand-history-modal"
                            onClick={() => setExpanded((v) => !v)}
                            title={expanded ? 'Restore modal size' : 'Expand modal to full screen'}
                        >
                            <span aria-hidden="true">{expanded ? '🗗' : '⛶'}</span>
                            <span>{expanded ? 'Restore Size' : 'Expand View'}</span>
                        </button>
                        <button type="button" className="rf-cmodal-close" aria-label="Close scheme history" data-testid="close-referral-history-modal" onClick={onClose}>&times;</button>
                    </div>
                </div>

                <div className="rf-hmodal-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'overview'}
                        className={`rf-cmodal-tab ${tab === 'overview' ? 'active' : ''}`}
                        data-testid="history-tab-overview"
                        onClick={() => setTab('overview')}
                    >
                        <div>
                            <span className="rf-cmodal-tab-title">1. Overview &amp; KPIs</span>
                            <span className="rf-cmodal-tab-sub">Funnel performance, budget &amp; rule terms</span>
                        </div>
                        <span className="rf-scope-badge all">{corridorLabel(c, rule.receive_currency)}</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'audit'}
                        className={`rf-cmodal-tab ${tab === 'audit' ? 'active' : ''}`}
                        data-testid="history-tab-audit"
                        onClick={() => setTab('audit')}
                    >
                        <div>
                            <span className="rf-cmodal-tab-title">2. Audit &amp; Change Log</span>
                            <span className="rf-cmodal-tab-sub">Every rule edit, status toggle &amp; archive event</span>
                        </div>
                        <span className="rf-scope-badge all">{auditRows.length} {auditRows.length === 1 ? 'entry' : 'entries'}</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'referrals'}
                        className={`rf-cmodal-tab ${tab === 'referrals' ? 'active' : ''}`}
                        data-testid="history-tab-referrals"
                        onClick={() => setTab('referrals')}
                    >
                        <div>
                            <span className="rf-cmodal-tab-title">3. Referrals &amp; Bonus Activity</span>
                            <span className="rf-cmodal-tab-sub">Customers referred &amp; bonuses credited</span>
                        </div>
                        <span className="rf-scope-badge include">{referralsTotal} {referralsTotal === 1 ? 'referral' : 'referrals'}</span>
                    </button>
                </div>

                <div className="rf-cmodal-body">
                    {loading ? (
                        <div className="rf-empty">Loading scheme history…</div>
                    ) : tab === 'overview' ? (
                        <>
                            <div className="rf-hmodal-kpis">
                                <div className="rf-hmodal-kpi">
                                    <div className="rf-hmodal-kpi-label">Funnel &amp; Conversion</div>
                                    <div className="rf-hmodal-kpi-val" data-testid="history-kpi-funnel">
                                        {perf.registrations ?? rule.referral_count ?? 0} joined · {perf.rewarded ?? 0} rewarded
                                    </div>
                                    <div className="rf-hmodal-kpi-sub">
                                        {perf.link_visits ?? 0} link visits · {perf.pending ?? rule.pending_count ?? 0} pending
                                        {perf.conversion_rate != null ? ` · ${perf.conversion_rate}% conv.` : ''}
                                    </div>
                                </div>
                                <div className="rf-hmodal-kpi">
                                    <div className="rf-hmodal-kpi-label">Bonuses Issued &amp; Used</div>
                                    <div className="rf-hmodal-kpi-val" data-testid="history-kpi-bonuses">
                                        {formatMoney(perf.bonus_issued ?? schemeSpend, c)} issued
                                    </div>
                                    <div className="rf-hmodal-kpi-sub">
                                        Used: {formatMoney(perf.bonus_used ?? 0, c)} · Unused: {formatMoney(perf.bonus_unused ?? 0, c)} · Expired: {formatMoney(perf.bonus_expired ?? 0, c)}
                                    </div>
                                </div>
                                <div className="rf-hmodal-kpi">
                                    <div className="rf-hmodal-kpi-label">Scheme Budget &amp; Caps</div>
                                    <div className="rf-hmodal-kpi-val" data-testid="history-kpi-budget">
                                        {schemeBudget > 0 ? `${formatMoney(schemeSpend, c)} / ${formatMoney(schemeBudget, c)}` : `${formatMoney(schemeSpend, c)} utilized`}
                                    </div>
                                    <div className="rf-hmodal-kpi-sub">
                                        {schemeBudget > 0
                                            ? (rule.scheme_cap_reached ? '⚠️ Scheme budget cap reached' : `Remaining: ${formatMoney(Math.max(0, schemeBudget - schemeSpend), c)}`)
                                            : 'Unlimited total scheme budget'} · {perUserCapLabel}
                                    </div>
                                </div>
                                <div className="rf-hmodal-kpi">
                                    <div className="rf-hmodal-kpi-label">Qualifying Volume &amp; Floor</div>
                                    <div className="rf-hmodal-kpi-val" data-testid="history-kpi-volume">
                                        {formatMoney(perf.referred_volume ?? 0, c)} volume
                                    </div>
                                    <div className="rf-hmodal-kpi-sub">
                                        Floor: {formatMoney(rule.min_transaction_threshold, c)} · Validity: {rule.bonus_validity_days ?? 90}d (qualify in {rule.qualification_window_days ?? 30}d)
                                    </div>
                                </div>
                            </div>

                            <div className="rf-section-label" style={{ marginTop: 4, marginBottom: 0 }}>Current Scheme Configuration Snapshot</div>
                            <div className="rf-hmodal-config-grid" data-testid="history-config-snapshot">
                                <div className="rf-hmodal-config-item">
                                    <span>Reward Amounts</span>
                                    <strong>
                                        Referrer: {rule.reward_type === 'REFEREE' ? '—' : formatMoney(rule.referrer_reward, c)} · Referee: {rule.reward_type === 'REFERRER' ? '—' : formatMoney(rule.referee_reward, c)}
                                    </strong>
                                </div>
                                <div className="rf-hmodal-config-item">
                                    <span>Minimum Transfer (Floor)</span>
                                    <strong>{formatMoney(rule.min_transaction_threshold, c)}</strong>
                                </div>
                                <div className="rf-hmodal-config-item">
                                    <span>Send &amp; Receive Scope</span>
                                    <strong>{sendScopeLabel} → {rcvScopeLabel}</strong>
                                </div>
                                <div className="rf-hmodal-config-item">
                                    <span>Link Schedule (Start &amp; End)</span>
                                    <strong>{datesLabel}</strong>
                                </div>
                                <div className="rf-hmodal-config-item">
                                    <span>Qualification &amp; Bonus Validity</span>
                                    <strong>Qualify within {rule.qualification_window_days ?? 30}d · Bonus valid {rule.bonus_validity_days ?? 90}d</strong>
                                </div>
                                <div className="rf-hmodal-config-item">
                                    <span>Per-Referrer &amp; Total Scheme Caps</span>
                                    <strong>{perUserCapLabel} · {schemeBudget > 0 ? `Scheme cap: ${formatMoney(schemeBudget, c)}` : 'No total scheme cap'}</strong>
                                </div>
                            </div>
                        </>
                    ) : tab === 'audit' ? (
                        <div className="rf-hmodal-table-card">
                            <div className="rf-hmodal-table-scroll">
                                <table className="rf-table rf-compact" data-testid="history-audit-table">
                                    <thead>
                                        <tr>
                                            <th>When (UK Time)</th>
                                            <th>Action / Field</th>
                                            <th>Change Details (Previous → New)</th>
                                            <th>Admin User</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditRows.map((row) => {
                                            const isCreate = row.field === 'created';
                                            const isArchive = row.field === 'archived';
                                            return (
                                                <tr key={row.id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{formatUkDateTime(row.created_at)}</td>
                                                    <td>
                                                        <span className="rf-strong">{RULE_AUDIT_LABELS[row.field] || row.field}</span>
                                                    </td>
                                                    <td>
                                                        {isCreate ? (
                                                            <span className="rf-audit-new">Created rule &ldquo;{row.new_value || rule.name}&rdquo;</span>
                                                        ) : isArchive ? (
                                                            <span className="rf-pill rf-pill-amber">Rule archived (stopped for new referrals)</span>
                                                        ) : (
                                                            <div className="rf-audit-diff">
                                                                <span className="rf-audit-old">{formatAuditFieldVal(row.field, row.old_value, c)}</span>
                                                                <span aria-hidden="true">→</span>
                                                                <span className="rf-audit-new">{formatAuditFieldVal(row.field, row.new_value, c)}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{row.admin_user || 'Admin'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : referrals.length === 0 ? (
                        <div className="rf-empty" data-testid="history-referrals-empty">
                            No customer referrals have been recorded under this scheme yet.
                        </div>
                    ) : (
                        <>
                            <div className="rf-cmodal-toolbar">
                                <input
                                    type="search"
                                    className="rf-cmodal-search"
                                    placeholder="Filter referrals by referrer, referee, email, channel, or referral ID..."
                                    value={referralSearch}
                                    onChange={(e) => setReferralSearch(e.target.value)}
                                    data-testid="history-referrals-search"
                                />
                                {referralSearch && (
                                    <button type="button" className="rf-btn-sm" onClick={() => setReferralSearch('')}>
                                        Clear filter
                                    </button>
                                )}
                            </div>
                            <div className="rf-hmodal-table-card">
                                <div className="rf-hmodal-table-scroll">
                                    <table className="rf-table rf-compact" data-testid="history-referrals-table">
                                        <thead>
                                            <tr>
                                                <th>Referrer</th>
                                                <th>Referee</th>
                                                <th>Channel / ID</th>
                                                <th>Joined (UK Time)</th>
                                                <th>Status</th>
                                                <th className="rf-num">Referrer Bonus</th>
                                                <th className="rf-num">Referee Bonus</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredReferrals.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="rf-empty">No referrals match &ldquo;{referralSearch}&rdquo;.</td>
                                                </tr>
                                            ) : filteredReferrals.map((r) => (
                                                <tr key={r.id}>
                                                    <td>
                                                        <div className="rf-strong">{`${r.referrer_first_name || ''} ${r.referrer_last_name || ''}`.trim() || r.referrer_id}</div>
                                                        <span className="rf-sub">{r.referrer_email || r.referrer_id}</span>
                                                    </td>
                                                    <td>
                                                        <div className="rf-strong">{`${r.referee_first_name || ''} ${r.referee_last_name || ''}`.trim() || r.referee_id}</div>
                                                        <span className="rf-sub">{r.referee_email || r.referee_id}</span>
                                                    </td>
                                                    <td>
                                                        <span className="rf-chip">{r.registration_channel || 'WEB'}</span>
                                                        <span className="rf-sub" style={{ fontFamily: 'monospace' }}>{r.id}</span>
                                                    </td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{formatUkDateTime(r.registered_at)}</td>
                                                    <td>
                                                        <StatusPill status={r.status} />
                                                        {r.status_reason && <span className="rf-sub">{r.status_reason}</span>}
                                                    </td>
                                                    <td className="rf-num">{r.referrer_credited ? formatMoney(r.referrer_credited, r.currency || c) : '—'}</td>
                                                    <td className="rf-num">{r.referee_credited ? formatMoney(r.referee_credited, r.currency || c) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="rf-cmodal-footer">
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {tab === 'overview'
                            ? `Viewing overview & KPIs for ${rule.name} (${corridorLabel(c, rule.receive_currency)}).`
                            : tab === 'audit'
                                ? `Showing ${auditRows.length} audit log ${auditRows.length === 1 ? 'entry' : 'entries'} for ${rule.name}.`
                                : `Showing ${filteredReferrals.length} of ${referralsTotal} referrals for ${rule.name}.`}
                    </span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {referralsTotal > 0 && (
                            <button
                                type="button"
                                className="btn-secondary"
                                data-testid="history-export-csv-btn"
                                onClick={() => downloadUrl(`/api/referral/tracking.csv?rule_id=${rule.id}`)}
                            >
                                Export Referrals CSV
                            </button>
                        )}
                        <button type="button" className="btn-primary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
const Field = ({ id, label, required, error, hint, infoTip, children }) => {
    const [infoOpen, setInfoOpen] = useState(false);
    return (
        <div className="rf-field">
            <div className="rf-label-row">
                <label htmlFor={id}>{label}{required && <span className="rf-req">*</span>}</label>
                {infoTip && (
                    <span className="rf-info-wrap">
                        <button
                            type="button"
                            className="rf-info-btn"
                            aria-label={`More info about ${label}`}
                            aria-expanded={infoOpen}
                            data-testid={`${id}-info-btn`}
                            onClick={() => setInfoOpen((v) => !v)}
                        >
                            i
                        </button>
                        {infoOpen && (
                            <div className="rf-info-popover" role="tooltip" data-testid={`${id}-info-popover`}>
                                <div className="rf-info-popover-head">
                                    <strong>{label}</strong>
                                    <button type="button" className="rf-info-close" aria-label="Close info" onClick={() => setInfoOpen(false)}>&times;</button>
                                </div>
                                <div className="rf-info-popover-body">{infoTip}</div>
                            </div>
                        )}
                    </span>
                )}
            </div>
            {children}
            {error ? <div className="rf-error" id={`${id}-error`}>{error}</div> : hint ? <div className="rf-hint">{hint}</div> : null}
        </div>
    );
};

const Toggle = ({ on, onClick, label, disabled }) => (
    <button type="button" className="rf-toggle" onClick={onClick} disabled={disabled} aria-pressed={on} aria-label={label}>
        <span className={`rf-toggle-track ${on ? 'on' : ''}`}><span className="rf-toggle-knob" /></span>
    </button>
);

const CountryScopeBar = ({ direction, currencyCode, mode, countries, onConfigure }) => {
    const list = Array.isArray(countries) ? countries : parseCountryList(countries);
    const effectiveMode = list.length === 0 ? 'ALL' : (mode === 'INCLUDE' || mode === 'EXCLUDE' ? mode : 'INCLUDE');
    const barClass = effectiveMode === 'INCLUDE' ? 'mode-include' : effectiveMode === 'EXCLUDE' ? 'mode-exclude' : '';
    const defaultLabel = direction === 'send'
        ? `All countries sending ${currencyCode}`
        : currencyCode
            ? `All countries receiving ${currencyCode}`
            : 'All destination countries';

    return (
        <div className={`rf-country-scope-bar ${barClass}`} data-testid={`${direction}-country-scope-bar`}>
            <div className="rf-country-scope-info">
                {effectiveMode === 'ALL' ? (
                    <span className="rf-scope-badge all">🌐 {defaultLabel}</span>
                ) : effectiveMode === 'INCLUDE' ? (
                    <>
                        <span className="rf-scope-badge include">✓ Include only ({list.length})</span>
                        <div className="rf-scope-chips">
                            {list.slice(0, 3).map((code) => {
                                const c = countryByCode(code);
                                return <span key={code} className="rf-scope-mini-chip">{c.flag} {c.name}</span>;
                            })}
                            {list.length > 3 && <span className="rf-scope-mini-chip">+{list.length - 3} more</span>}
                        </div>
                    </>
                ) : (
                    <>
                        <span className="rf-scope-badge exclude">⊘ Exclude ({list.length})</span>
                        <div className="rf-scope-chips">
                            {list.slice(0, 3).map((code) => {
                                const c = countryByCode(code);
                                return <span key={code} className="rf-scope-mini-chip exclude">{c.flag} {c.name}</span>;
                            })}
                            {list.length > 3 && <span className="rf-scope-mini-chip">+{list.length - 3} more</span>}
                        </div>
                    </>
                )}
            </div>
            <button
                type="button"
                className="rf-scope-config-btn"
                data-testid={`configure-${direction}-countries-btn`}
                onClick={onConfigure}
            >
                <span>{effectiveMode === 'ALL' ? 'Filter Countries' : 'Edit Countries'}</span>
                <span aria-hidden="true">⚙</span>
            </button>
        </div>
    );
};

const CountryScopeModal = ({ open, initialTab, form, onApply, onClose }) => {
    const [tab, setTab] = useState(initialTab || 'send');
    const [search, setSearch] = useState('');
    const [region, setRegion] = useState('All Regions');
    const [draft, setDraft] = useState({
        send_country_mode: 'ALL',
        send_countries: [],
        receive_country_mode: 'ALL',
        receive_countries: [],
    });

    useEffect(() => {
        if (open) {
            setTab(initialTab || 'send');
            setSearch('');
            setRegion('All Regions');
            const sendList = parseCountryList(form.send_countries);
            const rcvList = parseCountryList(form.receive_countries);
            setDraft({
                send_country_mode: sendList.length ? (form.send_country_mode === 'EXCLUDE' ? 'EXCLUDE' : 'INCLUDE') : (form.send_country_mode || 'ALL'),
                send_countries: sendList,
                receive_country_mode: rcvList.length ? (form.receive_country_mode === 'EXCLUDE' ? 'EXCLUDE' : 'INCLUDE') : (form.receive_country_mode || 'ALL'),
                receive_countries: rcvList,
            });
        }
    }, [open, initialTab, form.send_country_mode, form.send_countries, form.receive_country_mode, form.receive_countries]);

    if (!open) return null;

    const isSend = tab === 'send';
    const activeCurrency = isSend ? form.base_currency : (form.receive_currency || '');
    const modeKey = isSend ? 'send_country_mode' : 'receive_country_mode';
    const listKey = isSend ? 'send_countries' : 'receive_countries';
    const currentMode = draft[modeKey] || 'ALL';
    const currentList = draft[listKey] || [];

    const setMode = (nextMode) => {
        setDraft((d) => ({
            ...d,
            [modeKey]: nextMode,
            [listKey]: nextMode === 'ALL' ? [] : d[listKey],
        }));
    };

    const toggleCountry = (code) => {
        setDraft((d) => {
            const existing = d[listKey] || [];
            const exists = existing.includes(code);
            const nextList = exists ? existing.filter((c) => c !== code) : [...existing, code];
            const nextMode = d[modeKey] === 'ALL' && nextList.length > 0 ? 'INCLUDE' : d[modeKey];
            return {
                ...d,
                [modeKey]: nextMode,
                [listKey]: nextList,
            };
        });
    };

    const filteredCountries = COUNTRIES.filter((c) => {
        if (region === 'Suggested') {
            if (activeCurrency && !c.currencies.includes(activeCurrency)) return false;
        } else if (region !== 'All Regions' && c.region !== region) {
            return false;
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.region.toLowerCase().includes(q);
        }
        return true;
    });

    const selectAllVisible = () => {
        const codes = filteredCountries.map((c) => c.code);
        setDraft((d) => {
            const merged = Array.from(new Set([...(d[listKey] || []), ...codes]));
            return {
                ...d,
                [modeKey]: d[modeKey] === 'ALL' ? 'INCLUDE' : d[modeKey],
                [listKey]: merged,
            };
        });
    };

    const clearCurrentSelection = () => {
        setDraft((d) => ({
            ...d,
            [listKey]: [],
        }));
    };

    const handleSave = () => {
        const sendClean = draft.send_country_mode === 'ALL' || draft.send_countries.length === 0 ? [] : draft.send_countries;
        const rcvClean = draft.receive_country_mode === 'ALL' || draft.receive_countries.length === 0 ? [] : draft.receive_countries;
        onApply({
            send_country_mode: sendClean.length === 0 ? 'ALL' : draft.send_country_mode,
            send_countries: sendClean,
            receive_country_mode: rcvClean.length === 0 ? 'ALL' : draft.receive_country_mode,
            receive_countries: rcvClean,
        });
    };

    const sendSummaryBadge = draft.send_country_mode === 'ALL' || draft.send_countries.length === 0
        ? 'All countries'
        : `${draft.send_country_mode === 'INCLUDE' ? 'Include' : 'Exclude'} (${draft.send_countries.length})`;

    const rcvSummaryBadge = draft.receive_country_mode === 'ALL' || draft.receive_countries.length === 0
        ? 'All countries'
        : `${draft.receive_country_mode === 'INCLUDE' ? 'Include' : 'Exclude'} (${draft.receive_countries.length})`;

    return (
        <div className="rf-cmodal-backdrop" onClick={onClose} data-testid="country-scope-modal">
            <div className="rf-cmodal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="rf-cmodal-title">
                <div className="rf-cmodal-header">
                    <div>
                        <h3 id="rf-cmodal-title">Configure Corridor Country Scope</h3>
                        <p>Include or exclude specific countries for multi-country currencies (such as {form.base_currency}, EUR, or USD) on either side of the transfer corridor.</p>
                    </div>
                    <button type="button" className="rf-cmodal-close" aria-label="Close country configurator" onClick={onClose}>&times;</button>
                </div>

                <div className="rf-cmodal-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={isSend}
                        className={`rf-cmodal-tab ${isSend ? 'active' : ''}`}
                        data-testid="modal-tab-send-countries"
                        onClick={() => { setTab('send'); setSearch(''); }}
                    >
                        <div>
                            <span className="rf-cmodal-tab-title">1. Send Countries ({form.base_currency})</span>
                            <span className="rf-cmodal-tab-sub">Sender&apos;s country of residence</span>
                        </div>
                        <span className={`rf-scope-badge ${draft.send_countries.length === 0 || draft.send_country_mode === 'ALL' ? 'all' : draft.send_country_mode === 'INCLUDE' ? 'include' : 'exclude'}`}>
                            {sendSummaryBadge}
                        </span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={!isSend}
                        className={`rf-cmodal-tab ${!isSend ? 'active' : ''}`}
                        data-testid="modal-tab-receive-countries"
                        onClick={() => { setTab('receive'); setSearch(''); }}
                    >
                        <div>
                            <span className="rf-cmodal-tab-title">2. Receive Countries ({form.receive_currency || 'All Currencies'})</span>
                            <span className="rf-cmodal-tab-sub">Recipient&apos;s destination country</span>
                        </div>
                        <span className={`rf-scope-badge ${draft.receive_countries.length === 0 || draft.receive_country_mode === 'ALL' ? 'all' : draft.receive_country_mode === 'INCLUDE' ? 'include' : 'exclude'}`}>
                            {rcvSummaryBadge}
                        </span>
                    </button>
                </div>

                <div className="rf-cmodal-body">
                    <div className="rf-mode-cards" role="radiogroup" aria-label="Country rule mode">
                        <button
                            type="button"
                            className={`rf-mode-card ${currentMode === 'ALL' ? 'active-all' : ''}`}
                            data-testid="mode-card-ALL"
                            onClick={() => setMode('ALL')}
                        >
                            <div className="rf-mode-card-head">
                                <span>🌐 All Eligible Countries</span>
                                <input type="radio" readOnly checked={currentMode === 'ALL'} />
                            </div>
                            <span className="rf-mode-card-desc">
                                Every country supporting {activeCurrency || 'the selected currency'} is automatically eligible.
                            </span>
                        </button>
                        <button
                            type="button"
                            className={`rf-mode-card ${currentMode === 'INCLUDE' ? 'active-include' : ''}`}
                            data-testid="mode-card-INCLUDE"
                            onClick={() => setMode('INCLUDE')}
                        >
                            <div className="rf-mode-card-head">
                                <span>✓ Include Only (Whitelist)</span>
                                <input type="radio" readOnly checked={currentMode === 'INCLUDE'} />
                            </div>
                            <span className="rf-mode-card-desc">
                                Restrict this rule strictly to the countries you select below.
                            </span>
                        </button>
                        <button
                            type="button"
                            className={`rf-mode-card ${currentMode === 'EXCLUDE' ? 'active-exclude' : ''}`}
                            data-testid="mode-card-EXCLUDE"
                            onClick={() => setMode('EXCLUDE')}
                        >
                            <div className="rf-mode-card-head">
                                <span>⊘ Exclude Selected (Blacklist)</span>
                                <input type="radio" readOnly checked={currentMode === 'EXCLUDE'} />
                            </div>
                            <span className="rf-mode-card-desc">
                                Allow all countries EXCEPT the specific countries you exclude below.
                            </span>
                        </button>
                    </div>

                    <div className="rf-cmodal-toolbar">
                        <input
                            type="search"
                            className="rf-cmodal-search"
                            placeholder={`Search ${isSend ? 'send' : 'receive'} countries by name or ISO code (e.g. United Kingdom, GB, Nigeria)...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            data-testid="country-modal-search"
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="rf-btn-sm" onClick={selectAllVisible} data-testid="country-select-all-visible">
                                {currentMode === 'EXCLUDE' ? 'Exclude Visible' : 'Select Visible'} ({filteredCountries.length})
                            </button>
                            {currentList.length > 0 && (
                                <button type="button" className="rf-btn-sm rf-warn" onClick={clearCurrentSelection} data-testid="country-clear-selection">
                                    Clear ({currentList.length})
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="rf-region-pills">
                        {REGIONS.map((r) => {
                            const label = r === 'Suggested' ? (activeCurrency ? `Suggested for ${activeCurrency}` : 'Suggested') : r;
                            return (
                                <button
                                    key={r}
                                    type="button"
                                    className={`rf-region-pill ${region === r ? 'active' : ''}`}
                                    onClick={() => setRegion(r)}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="rf-country-grid" data-testid="country-modal-grid">
                        {filteredCountries.map((c) => {
                            const selected = currentList.includes(c.code);
                            const selClass = selected
                                ? (currentMode === 'EXCLUDE' ? 'selected-exclude' : 'selected-include')
                                : '';
                            return (
                                <button
                                    key={c.code}
                                    type="button"
                                    className={`rf-country-item ${selClass}`}
                                    data-testid={`country-option-${c.code}`}
                                    onClick={() => toggleCountry(c.code)}
                                >
                                    <div className="rf-country-item-left">
                                        <span className="rf-country-flag">{c.flag}</span>
                                        <div style={{ minWidth: 0 }}>
                                            <span className="rf-country-name">{c.name}</span>
                                            <span className="rf-country-meta">{c.code} • {c.currencies.slice(0, 3).join(', ')}</span>
                                        </div>
                                    </div>
                                    <span className="rf-country-check">
                                        {selected ? (currentMode === 'EXCLUDE' ? '−' : '✓') : ''}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rf-cmodal-footer">
                    <div className="rf-cmodal-selected-list">
                        {currentMode === 'ALL' || currentList.length === 0 ? (
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Currently allowing <strong>all eligible {isSend ? 'send' : 'receive'} countries</strong>. Click any country above to {currentMode === 'EXCLUDE' ? 'exclude' : 'include'} it.
                            </span>
                        ) : (
                            <>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: currentMode === 'EXCLUDE' ? '#be123c' : '#15803d' }}>
                                    {currentMode === 'EXCLUDE' ? 'Excluded:' : 'Included:'}
                                </span>
                                {currentList.map((code) => {
                                    const c = countryByCode(code);
                                    return (
                                        <button
                                            key={code}
                                            type="button"
                                            className={`rf-cmodal-chip-remove ${currentMode === 'EXCLUDE' ? 'exclude' : 'include'}`}
                                            onClick={() => toggleCountry(code)}
                                            title="Click to remove"
                                        >
                                            <span>{c.flag} {c.name} ({c.code})</span>
                                            <span>&times;</span>
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="button" className="btn-primary" data-testid="apply-country-scope-btn" onClick={handleSave}>
                            Apply Country Scope
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
    const [showValiditySummary, setShowValiditySummary] = useState(true);
    const [countryModal, setCountryModal] = useState({ open: false, tab: 'send' });
    const [historyModal, setHistoryModal] = useState({ open: false, rule: null, loading: false, data: null });
    const { toasts, push, dismiss } = useToasts();

    const openHistory = async (rule) => {
        setHistoryModal({ open: true, rule, loading: true, data: null });
        try {
            const [auditRes, perfRes, trackRes] = await Promise.all([
                fetch(`/api/referral-rules/${rule.id}/audit`).then((r) => r.json()).catch(() => ({ data: [] })),
                fetch('/api/referral/performance?include_archived=1').then((r) => r.json()).catch(() => ({ data: [] })),
                fetch(`/api/referral/tracking?rule_id=${rule.id}&page_size=50`).then((r) => r.json()).catch(() => ({ data: [], total: 0 })),
            ]);
            const perfRow = (perfRes.data || []).find((p) => Number(p.rule_id) === Number(rule.id)) || null;
            setHistoryModal({
                open: true,
                rule,
                loading: false,
                data: {
                    audit: auditRes.data || [],
                    perf: perfRow,
                    referrals: trackRes.data || [],
                    referralsTotal: trackRes.total ?? (trackRes.data || []).length,
                },
            });
        } catch {
            setHistoryModal({
                open: true,
                rule,
                loading: false,
                data: { audit: [], perf: null, referrals: [], referralsTotal: 0 },
            });
        }
    };

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
        if (currency === form.receive_currency) patch.receive_currency = ''; // a corridor needs two different currencies
        const d = CURRENCY_DEFAULTS[currency];
        if (d && !editingId) {
            patch.min_transaction_threshold = String(d.floor);
            patch.referrer_reward = form.reward_type === 'REFEREE' ? '0' : String(d.referrer);
            patch.referee_reward = form.reward_type === 'REFERRER' ? '0' : String(d.referee);
        }
        set(patch);
    };

    const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setErrors({}); };

    const payload = () => {
        const sendList = parseCountryList(form.send_countries);
        const rcvList = parseCountryList(form.receive_countries);
        return {
            ...form,
            name: form.name.trim(),
            send_country_mode: sendList.length === 0 ? 'ALL' : (form.send_country_mode || 'INCLUDE'),
            send_countries: sendList,
            send_country: sendList[0] || null,
            receive_country_mode: rcvList.length === 0 ? 'ALL' : (form.receive_country_mode || 'INCLUDE'),
            receive_countries: rcvList,
            receive_country: rcvList[0] || null,
            qualification_window_days: form.bonus_validity_days,
            referrer_reward: form.reward_type === 'REFEREE' ? 0 : form.referrer_reward,
            referee_reward: form.reward_type === 'REFERRER' ? 0 : form.referee_reward,
            max_referrals_cap_type: form.max_referrals_cap_type === 'AMOUNT' ? 'AMOUNT' : 'COUNT',
            max_referrals_per_referrer: form.max_referrals_cap_type === 'AMOUNT' ? null : (form.max_referrals_per_referrer || null),
            max_referrals_amount_per_referrer: form.max_referrals_cap_type === 'AMOUNT' ? (form.max_referrals_amount_per_referrer || null) : null,
            max_scheme_budget: form.max_scheme_budget || null,
        };
    };

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
                if (data.error === 'DUPLICATE_CORRIDOR') setErrors((e) => ({ ...e, receive_currency: data.message }));
                push(data.message || "We couldn't save the rule. Please try again.", 'error');
                return;
            }
            push(editingId ? 'Referral rule updated. Changes apply to new referrals only.' : `Referral rule '${form.name.trim()}' created.`);
            if (data.notification) push(`Customers sending ${corridorLabel(form.base_currency, form.receive_currency)} will be notified: "${data.notification.title}".`, 'info');
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
        const sendList = parseCountryList(rule.send_countries || rule.send_country);
        const rcvList = parseCountryList(rule.receive_countries || rule.receive_country);
        setForm({
            name: rule.name, is_enabled: !!rule.is_enabled, reward_type: rule.reward_type, base_currency: rule.base_currency,
            receive_currency: rule.receive_currency || '', // blank = send-currency-only rule
            send_country_mode: sendList.length ? (rule.send_country_mode === 'EXCLUDE' ? 'EXCLUDE' : 'INCLUDE') : 'ALL',
            send_countries: sendList,
            receive_country_mode: rcvList.length ? (rule.receive_country_mode === 'EXCLUDE' ? 'EXCLUDE' : 'INCLUDE') : 'ALL',
            receive_countries: rcvList,
            referrer_reward: String(rule.referrer_reward), referee_reward: String(rule.referee_reward),
            min_transaction_threshold: String(rule.min_transaction_threshold),
            qualification_window_days: String(rule.qualification_window_days ?? 30), bonus_validity_days: String(rule.bonus_validity_days ?? 90),
            max_referrals_cap_type: rule.max_referrals_cap_type || (rule.max_referrals_amount_per_referrer ? 'AMOUNT' : 'COUNT'),
            max_referrals_per_referrer: rule.max_referrals_per_referrer ? String(rule.max_referrals_per_referrer) : '',
            max_referrals_amount_per_referrer: rule.max_referrals_amount_per_referrer ? String(rule.max_referrals_amount_per_referrer) : '',
            max_scheme_budget: rule.max_scheme_budget ? String(rule.max_scheme_budget) : '',
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
            if (data.notification) push(`Customers sending ${corridorLabel(rule.base_currency, rule.receive_currency)} will be notified: "${data.notification.title}".`, 'info');
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
                message: `Customers sending ${corridorLabel(rule.base_currency, rule.receive_currency)} will see the Refer & Earn offer.`,
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
            <p className="rf-subtitle">Create and manage referral reward programmes. Apply a rule to a whole send currency (e.g. GBP) or to one corridor (e.g. GBP → NGN). A corridor rule takes precedence.</p>

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

                    <div className="rf-grid rf-grid-3">
                        <Field id="rf-reward_type" label="Who gets a bonus?" required>
                            <select id="rf-reward_type" className="rf-select" value={form.reward_type} onChange={(e) => onTypeChange(e.target.value)}>
                                <option value="BOTH">Both Parties (Double-Sided)</option>
                                <option value="REFERRER">Referrer Only</option>
                                <option value="REFEREE">Referee (New User) Only</option>
                            </select>
                        </Field>
                        <Field id="rf-base_currency" label="Send Currency" required error={err('base_currency')}>
                            <select id="rf-base_currency" className="rf-select" value={form.base_currency} onChange={(e) => onCurrencyChange(e.target.value)}>
                                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.currencyName} ({c.symbol.trim()})</option>)}
                            </select>
                            <CountryScopeBar
                                direction="send"
                                currencyCode={form.base_currency}
                                mode={form.send_country_mode}
                                countries={form.send_countries}
                                onConfigure={() => setCountryModal({ open: true, tab: 'send' })}
                            />
                        </Field>
                        <Field id="rf-receive_currency" label="Receive Currency" error={err('receive_currency')}
                            hint={form.receive_currency ? `Applies only to ${corridorLabel(form.base_currency, form.receive_currency)} transfers.` : `Applies to every ${form.base_currency} transfer, unless a specific corridor has its own rule.`}>
                            <select {...aria('receive_currency')} className={`rf-select${err('receive_currency') ? ' rf-invalid' : ''}`} value={form.receive_currency} onChange={(e) => set({ receive_currency: e.target.value })}>
                                <option value="">All currencies (all receive currencies from {form.base_currency})</option>
                                {CURRENCIES.filter((c) => c.code !== form.base_currency).map((c) => <option key={c.code} value={c.code}>{c.code} — {c.currencyName} ({c.symbol.trim()})</option>)}
                            </select>
                            <CountryScopeBar
                                direction="receive"
                                currencyCode={form.receive_currency}
                                mode={form.receive_country_mode}
                                countries={form.receive_countries}
                                onConfigure={() => setCountryModal({ open: true, tab: 'receive' })}
                            />
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
                        <Field id="rf-bonus_validity_days" label="Bonus Validity (days)" required error={err('bonus_validity_days')}
                            infoTip="Referee Bonus Validity: If a referee clicks the link and joins before the End Date, their bonus remains valid for this number of days (e.g., 90 days) from the date they join. Referrer Bonus Validity: The referrer's bonus is triggered and valid for this specified validity period ONLY after the referee completes their first successful transaction (not when a transaction is merely clicked or in 'awaiting payment' status).">
                            <input {...aria('bonus_validity_days')} className={inputCls('bonus_validity_days')} inputMode="numeric"
                                value={form.bonus_validity_days} onChange={(e) => set({ bonus_validity_days: e.target.value, qualification_window_days: e.target.value })} />
                        </Field>
                        <Field id="rf-max_referrals_per_referrer" label="Max Rewarded Referrals per Referrer" error={err('max_referrals_per_referrer') || err('max_referrals_amount_per_referrer')}
                            infoTip="Choose either a maximum Count of referred users (e.g., 5 or 10 people) or a maximum monetary Amount (e.g., £1,000). They cannot both be active at the same time. Leave blank for unlimited.">
                            <div className="rf-radio-group" role="radiogroup" aria-label="Max rewarded referrals cap mode">
                                <label className={`rf-radio-opt ${form.max_referrals_cap_type !== 'AMOUNT' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="max_referrals_cap_type"
                                        value="COUNT"
                                        checked={form.max_referrals_cap_type !== 'AMOUNT'}
                                        onChange={() => set({ max_referrals_cap_type: 'COUNT', max_referrals_amount_per_referrer: '' })}
                                    />
                                    <span>By Count (users)</span>
                                </label>
                                <label className={`rf-radio-opt ${form.max_referrals_cap_type === 'AMOUNT' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="max_referrals_cap_type"
                                        value="AMOUNT"
                                        checked={form.max_referrals_cap_type === 'AMOUNT'}
                                        onChange={() => set({ max_referrals_cap_type: 'AMOUNT', max_referrals_per_referrer: '' })}
                                    />
                                    <span>By Amount ({sym})</span>
                                </label>
                            </div>
                            {form.max_referrals_cap_type === 'AMOUNT' ? (
                                <div className="rf-affix"><span className="rf-prefix">{sym}</span>
                                    <input {...aria('max_referrals_amount_per_referrer')} className={inputCls('max_referrals_amount_per_referrer')} inputMode="decimal" placeholder="Unlimited (e.g. 1000)"
                                        value={form.max_referrals_amount_per_referrer} onChange={(e) => set({ max_referrals_amount_per_referrer: e.target.value })} />
                                </div>
                            ) : (
                                <input {...aria('max_referrals_per_referrer')} className={inputCls('max_referrals_per_referrer')} inputMode="numeric" placeholder="Unlimited (e.g. 5 or 10 people)"
                                    value={form.max_referrals_per_referrer} onChange={(e) => set({ max_referrals_per_referrer: e.target.value })} />
                            )}
                        </Field>
                        <Field id="rf-max_scheme_budget" label="Maximum Cap per Scheme (Total Budget)" error={err('max_scheme_budget')}
                            infoTip="This cap is for the whole referral scheme and includes all referrers' and referees' bonuses combined (in addition to the per-referrer limit). The scheme automatically stops once the combined bonuses paid to all referrers and referees reach this overall cap. Leave blank for no overall budget cap.">
                            <div className="rf-affix"><span className="rf-prefix">{sym}</span>
                                <input {...aria('max_scheme_budget')} className={inputCls('max_scheme_budget')} inputMode="decimal" placeholder="Unlimited scheme budget (e.g. 10000)"
                                    value={form.max_scheme_budget} onChange={(e) => set({ max_scheme_budget: e.target.value })} />
                            </div>
                        </Field>
                    </div>
                    <div className="rf-validity-rules" data-testid="referral-validity-rules-summary">
                        <div className="rf-validity-head">
                            <strong>Validity &amp; Expiry Rules Summary:</strong>
                            <button
                                type="button"
                                className="rf-validity-toggle"
                                aria-expanded={showValiditySummary}
                                data-testid="toggle-validity-rules-summary"
                                onClick={() => setShowValiditySummary((v) => !v)}
                            >
                                {showValiditySummary ? 'Hide summary ▲' : 'Show summary ▼'}
                            </button>
                        </div>
                        {showValiditySummary && (
                            <ul>
                                <li><b>Link Validity (Start Date &amp; End Date):</b> Strictly governs when the referral link itself is active. If a user clicks the link after the End Date, the system states that the referral scheme is closed/expired.</li>
                                <li><b>Referee Bonus Validity:</b> If a referee clicks the link and joins before the End Date, their bonus remains valid for the number of days specified in <i>Bonus Validity (days)</i> (e.g., 90 days) from the date they join.</li>
                                <li><b>Referrer Bonus Validity:</b> The referrer&apos;s bonus is triggered and valid for the specified validity period <b>only after the referee completes their first successful transaction</b> (not when a transaction is merely clicked or in &ldquo;awaiting payment&rdquo; status).</li>
                            </ul>
                        )}
                    </div>
                    <div className="rf-grid rf-grid-2">
                        <Field id="rf-start_date" label="Start Date" error={err('start_date')} hint="Link Validity Start: Strictly governs when the referral link becomes active (blank = active immediately).">
                            <input {...aria('start_date')} type="date" className={inputCls('start_date')} min={editingId ? undefined : ukTodayIso()}
                                value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} />
                        </Field>
                        <Field id="rf-end_date" label="End Date" error={err('end_date')} hint="Link Validity End: Strictly governs when the referral link expires. Clicking the link after this date shows the scheme is closed/expired (referees who joined before this date keep their Bonus Validity window).">
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
                    <table className="rf-table rf-compact">
                        <thead>
                            <tr>
                                <th>Rule</th><th>Corridor</th><th>Status</th><th>Bonus</th>
                                <th className="rf-num">Floor</th><th>Timing</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="rf-empty">Loading referral rules...</td></tr>
                            ) : loadError ? (
                                <tr><td colSpan="7" className="rf-empty">We couldn&apos;t load referral rules. Please refresh the page. <button type="button" className="rf-link" onClick={fetchRules}>Retry</button></td></tr>
                            ) : rules.length === 0 ? (
                                <tr><td colSpan="7" className="rf-empty">No referral rules yet. Create your first rule above.</td></tr>
                            ) : rules.map((rule) => {
                                const archived = rule.status === 'ARCHIVED';
                                const c = rule.base_currency;
                                const sendCountries = parseCountryList(rule.send_countries || rule.send_country);
                                const rcvCountries = parseCountryList(rule.receive_countries || rule.receive_country);
                                const dates = rule.start_date || rule.end_date
                                    ? `${formatUkDate(rule.start_date) === '—' ? 'Now' : formatUkDate(rule.start_date)} – ${rule.end_date ? formatUkDate(rule.end_date) : 'No end'}`
                                    : 'Always on';
                                return (
                                    <tr key={rule.id} data-testid={`rule-row-${c}-${rule.receive_currency || 'ANY'}`}>
                                        <td>
                                            <div className="rf-strong">{rule.name}</div>
                                            <span className="rf-sub">{TYPE_LABELS[rule.reward_type]}</span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="rf-chip">{corridorLabel(c, rule.receive_currency)}</span>
                                            {!rule.receive_currency && <span className="rf-sub">Any destination</span>}
                                            {sendCountries.length > 0 && (
                                                <span className="rf-sub">
                                                    Send {rule.send_country_mode === 'EXCLUDE' ? 'excl.' : 'incl.'}: {sendCountries.join(', ')}
                                                </span>
                                            )}
                                            {rcvCountries.length > 0 && (
                                                <span className="rf-sub">
                                                    Rcv {rule.receive_country_mode === 'EXCLUDE' ? 'excl.' : 'incl.'}: {rcvCountries.join(', ')}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {!archived && <Toggle on={!!rule.is_enabled} onClick={() => handleToggle(rule)} label={`${rule.is_enabled ? 'Deactivate' : 'Activate'} ${rule.name}`} />}
                                                <StatusPill status={rule.status} />
                                            </div>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <div className="rf-bonus"><span>Referrer</span><b>{rule.reward_type === 'REFEREE' ? '—' : formatMoney(rule.referrer_reward, c)}</b></div>
                                            <div className="rf-bonus"><span>Referee</span><b>{rule.reward_type === 'REFERRER' ? '—' : formatMoney(rule.referee_reward, c)}</b></div>
                                        </td>
                                        <td className="rf-num">{formatMoney(rule.min_transaction_threshold, c)}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <div>{rule.bonus_validity_days ?? 90}d valid</div>
                                            <span className="rf-sub">{dates}</span>
                                            <span className="rf-sub">
                                                {rule.max_referrals_cap_type === 'AMOUNT' && rule.max_referrals_amount_per_referrer
                                                    ? `Per-user cap: ${formatMoney(rule.max_referrals_amount_per_referrer, c)}`
                                                    : rule.max_referrals_per_referrer
                                                        ? `Per-user cap: ${rule.max_referrals_per_referrer} users`
                                                        : 'Per-user cap: Unlimited'}
                                                {rule.max_scheme_budget ? ` • Scheme cap: ${formatMoney(rule.max_scheme_budget, c)}` : ''}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button
                                                    type="button"
                                                    className="rf-btn-sm"
                                                    data-testid={`rule-history-btn-${rule.id}`}
                                                    onClick={() => openHistory(rule)}
                                                >
                                                    History
                                                </button>
                                                {!archived && (
                                                    <>
                                                        <button type="button" className="rf-btn-sm" onClick={() => handleEdit(rule)}>Edit</button>
                                                        <button type="button" className="rf-btn-sm rf-warn" onClick={() => handleArchive(rule)}>Archive</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <CountryScopeModal
                open={countryModal.open}
                initialTab={countryModal.tab}
                form={form}
                onClose={() => setCountryModal({ open: false, tab: 'send' })}
                onApply={(patch) => {
                    set(patch);
                    setCountryModal({ open: false, tab: 'send' });
                }}
            />

            <ReferralHistoryModal
                open={historyModal.open}
                rule={historyModal.rule}
                data={historyModal.data}
                loading={historyModal.loading}
                onClose={() => setHistoryModal({ open: false, rule: null, loading: false, data: null })}
            />

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
