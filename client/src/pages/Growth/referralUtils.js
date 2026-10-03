// Shared helpers for the Referral & Bonus admin pages
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

export const currencySymbol = (code) => (CURRENCIES.find((c) => c.code === code) || {}).symbol || `${code} `;

export const formatMoney = (amount, currency) => {
    const dp = currency === 'JPY' ? 0 : 2;
    const n = Number(amount || 0);
    const sign = n < 0 ? '-' : '';
    return `${sign}${currencySymbol(currency)}${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
};

export const formatUkDate = (value) => {
    if (!value) return '—';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
};

export const STATUS_META = {
    ACTIVE: { label: 'Active', tone: 'green' },
    INACTIVE: { label: 'Inactive', tone: 'grey' },
    SCHEDULED: { label: 'Scheduled', tone: 'blue' },
    ENDED: { label: 'Ended', tone: 'amber' },
    ARCHIVED: { label: 'Archived', tone: 'grey' },
    REGISTERED: { label: 'Registered', tone: 'blue' },
    PENDING: { label: 'Pending', tone: 'amber' },
    REWARDED: { label: 'Rewarded', tone: 'green' },
    EXPIRED: { label: 'Expired', tone: 'grey' },
    NOT_ELIGIBLE: { label: 'Not eligible', tone: 'red' },
    REVERSED: { label: 'Reversed', tone: 'red' },
};

export const ukTodayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
export const daysAgoIso = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
};

export const downloadUrl = (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
};
