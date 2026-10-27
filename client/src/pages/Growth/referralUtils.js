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
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe', currencies: ['GBP', 'EUR', 'USD'] },
    { code: 'US', name: 'United States', flag: '🇺🇸', region: 'North America', currencies: ['USD', 'GBP', 'EUR'] },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'Africa', currencies: ['NGN', 'USD', 'GBP', 'EUR'] },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'Africa', currencies: ['GHS', 'USD', 'GBP'] },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'Africa', currencies: ['KES', 'USD', 'GBP'] },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa', currencies: ['ZAR', 'USD', 'GBP'] },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'North America', currencies: ['CAD', 'USD', 'GBP'] },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe', currencies: ['EUR', 'GBP', 'USD'] },
    { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe', currencies: ['EUR', 'GBP', 'USD'] },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪', region: 'Europe', currencies: ['EUR', 'GBP', 'USD'] },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe', currencies: ['EUR', 'USD'] },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe', currencies: ['EUR', 'USD'] },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe', currencies: ['EUR', 'USD'] },
    { code: 'BE', name: 'Belgium', flag: '🇧🇪', region: 'Europe', currencies: ['EUR', 'USD'] },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', region: 'Europe', currencies: ['EUR', 'USD'] },
    { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia & Middle East', currencies: ['INR', 'USD', 'GBP', 'EUR'] },
    { code: 'CN', name: 'China', flag: '🇨🇳', region: 'Asia & Middle East', currencies: ['CNY', 'USD'] },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Asia & Middle East', currencies: ['AED', 'USD', 'GBP'] },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania', currencies: ['AUD', 'USD', 'GBP'] },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia & Middle East', currencies: ['JPY', 'USD'] },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬', region: 'Africa', currencies: ['USD', 'GBP', 'KES'] },
    { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', region: 'Africa', currencies: ['USD', 'GBP', 'KES'] },
    { code: 'CM', name: 'Cameroon', flag: '🇨🇲', region: 'Africa', currencies: ['EUR', 'USD'] },
    { code: 'SN', name: 'Senegal', flag: '🇸🇳', region: 'Africa', currencies: ['EUR', 'USD'] },
];

export const countryByCode = (code) => COUNTRIES.find((c) => c.code === code) || { code, name: code, flag: '🏳️', region: 'Other', currencies: [] };

export const parseCountryList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
    const s = String(val).trim();
    if (!s) return [];
    if (s.startsWith('[')) {
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
        } catch {
            // fallback to CSV
        }
    }
    return s.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
};

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
