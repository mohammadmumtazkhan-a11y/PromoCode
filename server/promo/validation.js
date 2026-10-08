// Field validation for the promo code form (spec PROMO-MITO §5.2). Server is authoritative; the client mirrors it.
const { SUPPORTED_CURRENCIES, decimalsOk } = require('./money');

const CODE_RE = /^[A-Z0-9-]{3,20}$/;
const PAYMENT_METHODS = ['Bank Transfer', 'Card', 'Mobile Money', 'USSD'];
const AUDIENCE_TYPES = ['all', 'new_customers', 'existing_customers', 'targeted', 'specific_customers'];

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const num = (v) => Number(v);
const isWhole = (v) => /^-?\d+$/.test(String(v).trim());
const parseJson = (s, fallback) => { if (s && typeof s === 'object') return s; try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };

// Returns { errors, clean }. `clean` holds the values to store.
function validatePromo(body = {}, { isNew = true, now = new Date() } = {}) {
    const errors = {};
    const code = String(body.code || '').trim().toUpperCase();
    const type = String(body.type || '');
    const currency = String(body.currency || '').toUpperCase();

    if (!code) errors.code = 'Enter a promo code.';
    else if (!CODE_RE.test(code)) errors.code = 'Use 3–20 letters, numbers or hyphens.';

    const description = body.description === undefined || body.description === null ? null : String(body.description).trim();
    if (description && description.length > 200) errors.description = 'Keep the note under 200 characters.';

    if (!['Fixed', 'Percentage', 'Waiver'].includes(type)) errors.type = 'Choose a type.';
    if (!SUPPORTED_CURRENCIES.includes(currency)) errors.currency = 'Choose a currency.';

    let value = 0;
    if (type === 'Fixed') {
        if (blank(body.value) || Number.isNaN(num(body.value)) || num(body.value) <= 0 || num(body.value) > 1000000 || !decimalsOk(body.value, currency)) {
            errors.value = 'Enter an amount greater than 0.';
        } else value = num(body.value);
    } else if (type === 'Percentage') {
        const v = num(body.value);
        if (blank(body.value) || Number.isNaN(v) || v < 0.01 || v > 100 || !decimalsOk(body.value, 'GBP')) errors.value = 'Enter a percentage between 0.01 and 100.';
        else value = v;
    }

    let maxDiscount = null;
    if (type === 'Percentage' && !blank(body.max_discount)) {
        if (Number.isNaN(num(body.max_discount)) || num(body.max_discount) <= 0) errors.max_discount = 'Enter a cap greater than 0, or leave it blank.';
        else maxDiscount = num(body.max_discount);
    }

    let minThreshold = 0;
    if (!blank(body.min_threshold)) {
        if (Number.isNaN(num(body.min_threshold)) || num(body.min_threshold) < 0) errors.min_threshold = 'Enter 0 or more.';
        else minThreshold = num(body.min_threshold);
    }

    let usageGlobal = -1;
    if (!blank(body.usage_limit_global) && num(body.usage_limit_global) !== -1) {
        if (!isWhole(body.usage_limit_global) || num(body.usage_limit_global) < 1 || num(body.usage_limit_global) > 10000000) {
            errors.usage_limit_global = 'Enter a whole number, or leave it blank for unlimited.';
        } else usageGlobal = num(body.usage_limit_global);
    }

    let budget = -1;
    if (!blank(body.budget_limit) && num(body.budget_limit) !== -1) {
        if (Number.isNaN(num(body.budget_limit)) || num(body.budget_limit) <= 0) errors.budget_limit = 'Enter an amount greater than 0, or leave it blank for unlimited.';
        else budget = num(body.budget_limit);
    }

    let perUser = 1;
    if (!blank(body.usage_limit_per_user)) {
        if (num(body.usage_limit_per_user) === -1) perUser = -1;
        else if (!isWhole(body.usage_limit_per_user) || num(body.usage_limit_per_user) < 1 || num(body.usage_limit_per_user) > 1000) {
            errors.usage_limit_per_user = 'Enter a whole number from 1 to 1,000.';
        } else perUser = num(body.usage_limit_per_user);
    }

    const start = blank(body.start_date) ? null : new Date(body.start_date);
    const end = blank(body.end_date) ? null : new Date(body.end_date);
    if (!start || Number.isNaN(start.getTime())) errors.start_date = 'Choose a start date.';
    if (!end || Number.isNaN(end.getTime())) errors.end_date = 'Choose an end date.';
    if (!errors.start_date && !errors.end_date) {
        if (end <= start) errors.end_date = 'End date must be after the start date.';
        else if (isNew && end <= now) errors.end_date = 'End date must be in the future.';
    }

    const r = parseJson(body.restrictions, {});
    const corridors = Array.isArray(r.corridors) ? [...new Set(r.corridors.map((c) => String(c).toUpperCase()))] : [];
    if (body.all_corridors === false && corridors.length === 0) errors.corridors = 'Add at least one corridor, or tick All corridors.';
    if (corridors.some((c) => { const [s, d] = c.split('-'); return !SUPPORTED_CURRENCIES.includes(s) || !SUPPORTED_CURRENCIES.includes(d) || s === d; })) {
        errors.corridors = 'Each corridor needs two different supported currencies.';
    }
    const paymentMethods = Array.isArray(r.payment_methods) ? [...new Set(r.payment_methods)] : [];
    if (body.all_payment_methods === false && paymentMethods.length === 0) errors.payment_methods = 'Choose at least one payment method, or tick All payment methods.';

    const seg = parseJson(body.user_segment, null) || parseJson(r.user_segment, null) || { type: 'all' };
    let audience = { type: 'all' };
    if (seg.type === 'specific_customers') {
        const ids = (Array.isArray(seg.user_ids) ? seg.user_ids : String(seg.user_ids || '').split(/[\s,]+/)).map((x) => String(x).trim()).filter(Boolean);
        if (ids.length === 0 || ids.length > 500 || ids.some((x) => !/^[A-Za-z0-9_-]{1,64}$/.test(x))) errors.user_segment = 'Enter up to 500 customer IDs.';
        else audience = { type: 'specific_customers', user_ids: [...new Set(ids)] };
    } else if (seg.type === 'targeted') {
        if (!seg.user_id) errors.user_segment = 'Enter up to 500 customer IDs.';
        else audience = { type: 'targeted', user_id: String(seg.user_id) };
    } else if (seg.type && seg.type !== 'all') {
        audience = { type: AUDIENCE_TYPES.includes(seg.type) ? seg.type : String(seg.type) };
    }

    const clean = {
        code, description: description || null, type, value, min_threshold: minThreshold, max_discount: maxDiscount, currency,
        usage_limit_global: usageGlobal, usage_limit_per_user: perUser, budget_limit: budget,
        start_date: start && !Number.isNaN(start.getTime()) ? start.toISOString() : null,
        end_date: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
        restrictions: { corridors, payment_methods: paymentMethods, ...(Array.isArray(r.affiliates) && r.affiliates.length ? { affiliates: r.affiliates } : {}) },
        user_segment: audience,
    };
    return { errors, clean };
}

module.exports = { validatePromo, CODE_RE, PAYMENT_METHODS, AUDIENCE_TYPES };
