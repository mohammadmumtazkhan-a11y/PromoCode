// Shared helpers for the Promo Codes admin page (PROMO-MITO §5)
export const CURRENCIES = [
    { code: 'GBP', name: 'United Kingdom', symbol: '£' },
    { code: 'USD', name: 'United States', symbol: '$' },
    { code: 'EUR', name: 'Eurozone', symbol: '€' },
    { code: 'NGN', name: 'Nigeria', symbol: '₦' },
    { code: 'CAD', name: 'Canada', symbol: 'C$' },
    { code: 'AUD', name: 'Australia', symbol: 'A$' },
    { code: 'JPY', name: 'Japan', symbol: '¥' },
    { code: 'CNY', name: 'China', symbol: '¥' },
    { code: 'INR', name: 'India', symbol: '₹' },
    { code: 'ZAR', name: 'South Africa', symbol: 'R' },
    { code: 'KES', name: 'Kenya', symbol: 'KSh' },
    { code: 'GHS', name: 'Ghana', symbol: 'GH₵' },
    { code: 'AED', name: 'United Arab Emirates', symbol: 'AED ' },
];
export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);
export const PAYMENT_METHODS = ['Bank Transfer', 'Card', 'Mobile Money', 'USSD'];

export const TYPE_LABELS = {
    Fixed: 'Fixed', Percentage: 'Percentage', Waiver: 'Fee waiver', FX_BOOST: 'FX Boost (legacy)', BONUS_CREDIT: 'Bonus Credit (legacy)',
};
export const TYPE_OPTIONS = [
    { value: 'Fixed', label: 'Fixed amount off the fee' },
    { value: 'Percentage', label: 'Percentage of the fee' },
    { value: 'Waiver', label: 'Fee waiver' },
];
export const STATUS_OPTIONS = ['Active', 'Scheduled', 'Expired', 'Disabled', 'Fully redeemed', 'Budget spent'];
export const STATUS_TONE = {
    Active: 'green', Scheduled: 'blue', Expired: 'red', Disabled: 'grey', 'Fully redeemed': 'amber', 'Budget spent': 'amber',
};

export const symbolFor = (code) => (CURRENCIES.find((c) => c.code === code) || {}).symbol || (code ? `${code} ` : '');
export const decimalsFor = (code) => (code === 'JPY' ? 0 : 2);

export function formatMoney(amount, currency) {
    const dp = decimalsFor(currency);
    const n = Number(amount || 0);
    const sign = n < 0 ? '-' : '';
    return `${sign}${symbolFor(currency)}${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

const pad = (n) => String(n).padStart(2, '0');
export function formatUkDate(value, withTime = false) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const date = d.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
    if (!withTime) return date;
    const time = d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
}
export function formatShortDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in the admin's own time zone.
export function toLocalInput(d) {
    if (!d) return '';
    const t = String(d);
    if (t.length > 10 && /(Z|[+-]\d\d:?\d\d)$/i.test(t)) {
        const x = new Date(t);
        return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
    }
    return t.length <= 10 ? `${t}T00:00` : t.slice(0, 16);
}
// What the admin typed is in their own time zone; the server compares against UTC.
export const toUtcIso = (local) => (local ? new Date(local).toISOString() : '');

export function valueLabel(p) {
    if (p.type === 'Percentage') return `${p.value}%${p.max_discount ? ` (max ${formatMoney(p.max_discount, p.currency)})` : ''}`;
    if (p.type === 'Fixed') return formatMoney(p.value, p.currency);
    if (p.type === 'Waiver') return 'Whole fee';
    if (p.type === 'FX_BOOST') return `+${p.value}`;
    if (p.type === 'BONUS_CREDIT') return formatMoney(p.value, p.currency);
    return String(p.value ?? '');
}

export function whoLabel(seg, segments = []) {
    const s = seg || { type: 'all' };
    if (s.type === 'all') return 'Everyone';
    if (s.type === 'new_customers') return 'New customers';
    if (s.type === 'existing_customers') return 'Existing customers';
    if (s.type === 'targeted') return '1 customer';
    if (s.type === 'specific_customers') { const n = (s.user_ids || []).length; return `${n} customer${n === 1 ? '' : 's'}`; }
    const found = segments.find((x) => String(x.id) === String(s.type));
    return found ? found.name : 'Saved segment';
}

// Live summary line under the form (PROMO-MITO §5.2)
export function previewSentence(f) {
    const cur = f.currency || 'GBP';
    const corridors = f.allCorridors || !f.corridors.length ? '' : f.corridors.map((c) => c.replace('-', ' → ')).join(', ');
    const methods = f.allMethods || !f.payment_methods.length ? '' : ` by ${f.payment_methods.join(' or ')}`;
    const who = { all: 'Customers', new_customers: 'New customers', existing_customers: 'Existing customers', specific_customers: 'Selected customers', segment: 'Customers in the selected segment' }[f.audience] || 'Customers';
    let what;
    if (f.type === 'Percentage') what = `${f.value || '…'}% off the fee${f.max_discount ? ` (max ${formatMoney(f.max_discount, cur)})` : ''}`;
    else if (f.type === 'Waiver') what = 'the fee waived';
    else what = `${f.value ? formatMoney(f.value, cur) : '…'} off the fee`;
    const min = Number(f.min_threshold) > 0 ? ` on transfers of ${formatMoney(f.min_threshold, cur)} or more` : '';
    const times = f.perUserUnlimited ? ', any number of times' : Number(f.usage_limit_per_user) === 1 ? ', once each' : `, up to ${f.usage_limit_per_user || '…'} times each`;
    const until = f.end_date ? `, until ${formatUkDate(new Date(f.end_date), true)}` : '';
    return `${who} sending ${corridors || cur}${methods} get ${what}${min}${times}${until}.`;
}

export const downloadUrl = (url) => {
    const a = document.createElement('a');
    a.href = url; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
};
