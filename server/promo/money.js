// Money helpers for the promo module: currency list, decimals, rounding and display.
const SUPPORTED_CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'ZAR', 'KES', 'GHS', 'AED'];
const ZERO_DECIMAL = ['JPY'];
const SYMBOLS = { GBP: '£', USD: '$', EUR: '€', NGN: '₦', CAD: 'C$', AUD: 'A$', JPY: '¥', CNY: '¥', INR: '₹', ZAR: 'R', KES: 'KSh', GHS: 'GH₵', AED: 'AED ' };

const decimalsFor = (currency) => (ZERO_DECIMAL.includes(String(currency || '').toUpperCase()) ? 0 : 2);

// Round half-up to the currency's decimals (JPY 0, others 2)
function roundFor(amount, currency) {
    const dp = decimalsFor(currency);
    const f = 10 ** dp;
    return Math.round((Number(amount) + Number.EPSILON) * f) / f;
}

function formatMoney(amount, currency) {
    const cur = String(currency || '').toUpperCase();
    const dp = decimalsFor(cur);
    const sym = SYMBOLS[cur] || (cur ? `${cur} ` : '');
    return `${sym}${Number(amount || 0).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

function decimalsOk(value, currency) {
    const s = String(value);
    const dp = s.includes('.') ? s.split('.')[1].length : 0;
    return dp <= decimalsFor(currency);
}

module.exports = { SUPPORTED_CURRENCIES, decimalsFor, roundFor, formatMoney, decimalsOk };
