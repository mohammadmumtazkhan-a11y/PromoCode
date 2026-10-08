// Money helpers for the bonus module: currency list, decimals, rounding and display.
const SUPPORTED_CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'ZAR', 'KES', 'GHS', 'AED'];
const ZERO_DECIMAL = ['JPY'];
const SYMBOLS = { GBP: '£', USD: '$', EUR: '€', NGN: '₦', CAD: 'C$', AUD: 'A$', JPY: '¥', CNY: '¥', INR: '₹', ZAR: 'R', KES: 'KSh', GHS: 'GH₵', AED: 'AED ' };

const cur = (c) => String(c || 'GBP').toUpperCase();
const decimalsFor = (currency) => (ZERO_DECIMAL.includes(cur(currency)) ? 0 : 2);

// Round half-up to the currency's decimals (JPY 0, others 2) — BS-24
function roundFor(amount, currency) {
    const f = 10 ** decimalsFor(currency);
    return Math.round((Number(amount) + Number.EPSILON) * f) / f;
}
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// "£10.00", "¥150"
function formatMoney(amount, currency) {
    const c = cur(currency);
    const dp = decimalsFor(c);
    const sym = SYMBOLS[c] || `${c} `;
    const n = Number(amount || 0);
    return `${n < 0 ? '-' : ''}${sym}${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

// "GBP 5.00" — the format used in block reasons and strike details (unchanged)
const plainMoney = (n, c) => `${c || ''} ${Number(n).toFixed(2)}`.trim();

function decimalsOk(value, currency) {
    const s = String(value);
    const dp = s.includes('.') ? s.split('.')[1].length : 0;
    return dp <= decimalsFor(currency);
}

module.exports = { SUPPORTED_CURRENCIES, cur, decimalsFor, roundFor, round2, formatMoney, plainMoney, decimalsOk };
