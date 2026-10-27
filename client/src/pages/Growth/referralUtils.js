// Shared helpers for the Referral & Bonus admin pages
export const CURRENCIES = [
    { code: 'GBP', name: 'United Kingdom', currencyName: 'British Pound', symbol: '£' },
    { code: 'USD', name: 'United States', currencyName: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Eurozone', currencyName: 'Euro', symbol: '€' },
    { code: 'NGN', name: 'Nigeria', currencyName: 'Nigerian Naira', symbol: '₦' },
    { code: 'CAD', name: 'Canada', currencyName: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australia', currencyName: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japan', currencyName: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'China', currencyName: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'India', currencyName: 'Indian Rupee', symbol: '₹' },
    { code: 'ZAR', name: 'South Africa', currencyName: 'South African Rand', symbol: 'R' },
    { code: 'KES', name: 'Kenya', currencyName: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'GHS', name: 'Ghana', currencyName: 'Ghanaian Cedi', symbol: 'GH₵' },
    { code: 'AED', name: 'United Arab Emirates', currencyName: 'UAE Dirham', symbol: 'AED ' },
];

export const COUNTRIES = [
    { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'CA', name: 'Canada' },
    { code: 'GH', name: 'Ghana' },
    { code: 'KE', name: 'Kenya' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    { code: 'EU', name: 'Eurozone' },
];

// "GBP → NGN". A rule with no receive currency covers every destination, so it shows the fallback ("All").
export const corridorLabel = (send, receive, fallback = 'All') => `${send} → ${receive || fallback}`;

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
