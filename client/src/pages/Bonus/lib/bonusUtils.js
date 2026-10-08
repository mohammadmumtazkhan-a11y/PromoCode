// Shared helpers for the Bonus admin pages (BONUS_MODULE_SPEC_MITO_ADMIN.md §5)

export const CURRENCIES = [
    { code: 'GBP', name: 'British Pound (£)' }, { code: 'USD', name: 'US Dollar ($)' }, { code: 'EUR', name: 'Euro (€)' },
    { code: 'NGN', name: 'Nigerian Naira (₦)' }, { code: 'CAD', name: 'Canadian Dollar (C$)' }, { code: 'AUD', name: 'Australian Dollar (A$)' },
    { code: 'JPY', name: 'Japanese Yen (¥)' }, { code: 'CNY', name: 'Chinese Yuan (¥)' }, { code: 'INR', name: 'Indian Rupee (₹)' },
    { code: 'ZAR', name: 'South African Rand (R)' }, { code: 'KES', name: 'Kenyan Shilling (KSh)' }, { code: 'GHS', name: 'Ghanaian Cedi (GH₵)' },
    { code: 'AED', name: 'UAE Dirham (AED)' },
];
const SYMBOLS = { GBP: '£', USD: '$', EUR: '€', NGN: '₦', CAD: 'C$', AUD: 'A$', JPY: '¥', CNY: '¥', INR: '₹', ZAR: 'R', KES: 'KSh', GHS: 'GH₵', AED: 'AED ' };

export const TYPE_LABELS = {
    LOYALTY_CREDIT: 'Loyalty Credit', TRANSACTION_THRESHOLD_CREDIT: 'Transaction Threshold Credit',
    REQUEST_MONEY: 'Request Money Credit', REFERRAL_CREDIT: 'Referral Credit',
};

export const decimalsFor = (currency) => (String(currency || '').toUpperCase() === 'JPY' ? 0 : 2);

export function formatMoney(amount, currency) {
    const c = String(currency || 'GBP').toUpperCase();
    const dp = decimalsFor(c);
    const n = Number(amount || 0);
    const sym = SYMBOLS[c] || `${c} `;
    return `${n < 0 ? '−' : ''}${sym}${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

// YYYY-MM-DD or an ISO timestamp → DD/MM/YYYY (UK)
export function fmtDate(value) {
    if (!value) return '—';
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/');
    const d = new Date(s.includes('T') || s.endsWith('Z') ? s : s.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return s.slice(0, 10);
    return d.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
}

export const ukToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

// Same rule as the server (§2.2): Archived → Inactive → Ended → Scheduled → Active
export function displayStatus(s, today = ukToday()) {
    if (s.display_status) return s.display_status;
    if (s.status === 'ARCHIVED') return 'Archived';
    if (s.status === 'INACTIVE') return 'Inactive';
    if (s.status === 'EXPIRED' || (s.end_date && s.end_date < today)) return 'Ended';
    if (s.start_date && s.start_date > today) return 'Scheduled';
    return 'Active';
}

export const STATUS_TONE = { Active: 'green', Scheduled: 'blue', Inactive: 'grey', Ended: 'amber', Archived: 'grey' };

function rewardText(f) {
    if (f.is_tiered && (f.tiers || []).length) return 'a bonus that depends on the amount';
    if (f.commission_type === 'PERCENTAGE') {
        const cap = Number(f.max_award) > 0 ? ` (up to ${formatMoney(f.max_award, f.currency)})` : '';
        return `${Number(f.commission_percentage) || 0}% of the amount${cap} as bonus credit`;
    }
    return `${formatMoney(f.credit_amount, f.currency)} bonus credit`;
}

// Live summary line under the form (§5.2), same wording as the server's summary
export function summaryLine(f) {
    const rules = f.eligibility_rules || {};
    const validity = Number(rules.validityDays) > 0 ? Number(rules.validityDays) : 90;
    const once = rules.oneTimeOnly !== false ? 'once only' : 'every time they qualify';
    const c = String(f.currency || 'GBP').toUpperCase();
    let who;
    if (f.bonus_type === 'LOYALTY_CREDIT') who = `Customers who complete ${Number(f.min_transactions) || 0} ${c} transfers within ${Number(f.time_period_days) || 0} days earn`;
    else if (f.bonus_type === 'REQUEST_MONEY') who = Number(f.min_transaction_threshold) > 0 ? `Customers whose money request of ${formatMoney(f.min_transaction_threshold, c)} or more is paid earn` : 'Customers whose money request is paid earn';
    else who = Number(f.min_transaction_threshold) > 0 ? `Customers who send ${formatMoney(f.min_transaction_threshold, c)} or more in one transfer earn` : `Customers who complete a ${c} transfer earn`;
    return `${who} ${rewardText(f)}, valid for ${validity} days, ${once}.`;
}

// Reward column (§5.3): "£10.00", "5% (max £20.00)", or the tier list
export function rewardCell(s) {
    if (s.is_tiered) {
        return (s.tiers || []).map((t) => `${t.min}–${t.max === null || t.max === '' || t.max === undefined || t.max === Infinity ? '∞' : t.max}: ${s.commission_type === 'PERCENTAGE' ? `${t.value}%` : formatMoney(t.value, s.currency)}`).join(' · ') || '—';
    }
    if (s.commission_type === 'PERCENTAGE') return `${s.commission_percentage}%${Number(s.max_award) > 0 ? ` (max ${formatMoney(s.max_award, s.currency)})` : ''}`;
    return formatMoney(s.credit_amount, s.currency);
}

// Minimum / Rule column: threshold or "3 in 30 days"
export function ruleCell(s) {
    if (s.bonus_type === 'LOYALTY_CREDIT') return `${s.min_transactions || 0} in ${s.time_period_days || 0} days`;
    return Number(s.min_transaction_threshold) > 0 ? `Min ${formatMoney(s.min_transaction_threshold, s.currency)}` : 'No minimum';
}

export function segmentName(id, segments) {
    if (!id || id === 'all') return 'All Users';
    if (id === 'existing_customers') return 'Existing customers';
    const seg = (segments || []).find((x) => String(x.id) === String(id));
    return seg ? seg.name : `Segment #${id}`;
}

export const SOURCE_LABELS = { REFERRAL: 'Referrals', SCHEME: 'Bonus offers', MANUAL: 'From Rhemito' };
export const SOURCE_TONE = { REFERRAL: 'blue', SCHEME: 'green', MANUAL: 'amber' };
