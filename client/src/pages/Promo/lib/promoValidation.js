// Mirrors server/promo/validation.js so admins see errors before submitting (PROMO-MITO §5.2).
import { CURRENCY_CODES } from './promoUtils';

const CODE_RE = /^[A-Z0-9-]{3,20}$/;
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const isWhole = (v) => /^-?\d+$/.test(String(v).trim());
const dpOk = (v, cur) => { const s = String(v); const dp = s.includes('.') ? s.split('.')[1].length : 0; return dp <= (cur === 'JPY' ? 0 : 2); };

// f = form state (see PromoCodeForm). existingCodes = codes of other promo codes (for the duplicate check).
export function validatePromoForm(f, { isNew = true, existingCodes = [], now = new Date() } = {}) {
    const e = {};
    const code = String(f.code || '').trim().toUpperCase();
    if (!code) e.code = 'Enter a promo code.';
    else if (!CODE_RE.test(code)) e.code = 'Use 3–20 letters, numbers or hyphens.';
    else if (existingCodes.some((c) => String(c).toUpperCase() === code)) e.code = 'This promo code already exists.';

    if (f.description && String(f.description).trim().length > 200) e.description = 'Keep the note under 200 characters.';
    if (!['Fixed', 'Percentage', 'Waiver'].includes(f.type)) e.type = 'Choose a type.';
    if (!CURRENCY_CODES.includes(f.currency)) e.currency = 'Choose a currency.';

    if (f.type === 'Fixed') {
        const v = Number(f.value);
        if (blank(f.value) || Number.isNaN(v) || v <= 0 || v > 1000000 || !dpOk(f.value, f.currency)) e.value = 'Enter an amount greater than 0.';
    } else if (f.type === 'Percentage') {
        const v = Number(f.value);
        if (blank(f.value) || Number.isNaN(v) || v < 0.01 || v > 100 || !dpOk(f.value, 'GBP')) e.value = 'Enter a percentage between 0.01 and 100.';
        if (!blank(f.max_discount) && (Number.isNaN(Number(f.max_discount)) || Number(f.max_discount) <= 0)) e.max_discount = 'Enter a cap greater than 0, or leave it blank.';
    }
    if (!blank(f.min_threshold) && (Number.isNaN(Number(f.min_threshold)) || Number(f.min_threshold) < 0)) e.min_threshold = 'Enter 0 or more.';
    if (!blank(f.usage_limit_global) && (!isWhole(f.usage_limit_global) || Number(f.usage_limit_global) < 1 || Number(f.usage_limit_global) > 10000000)) {
        e.usage_limit_global = 'Enter a whole number, or leave it blank for unlimited.';
    }
    if (!blank(f.budget_limit) && (Number.isNaN(Number(f.budget_limit)) || Number(f.budget_limit) <= 0)) e.budget_limit = 'Enter an amount greater than 0, or leave it blank for unlimited.';
    if (!f.perUserUnlimited && (!isWhole(f.usage_limit_per_user) || Number(f.usage_limit_per_user) < 1 || Number(f.usage_limit_per_user) > 1000)) {
        e.usage_limit_per_user = 'Enter a whole number from 1 to 1,000.';
    }

    const start = blank(f.start_date) ? null : new Date(f.start_date);
    const end = blank(f.end_date) ? null : new Date(f.end_date);
    if (!start || Number.isNaN(start.getTime())) e.start_date = 'Choose a start date.';
    if (!end || Number.isNaN(end.getTime())) e.end_date = 'Choose an end date.';
    if (!e.start_date && !e.end_date) {
        if (end <= start) e.end_date = 'End date must be after the start date.';
        else if (isNew && end <= now) e.end_date = 'End date must be in the future.';
    }

    if (!f.allCorridors && (!f.corridors || f.corridors.length === 0)) e.corridors = 'Add at least one corridor, or tick All corridors.';
    if (!f.allMethods && (!f.payment_methods || f.payment_methods.length === 0)) e.payment_methods = 'Choose at least one payment method, or tick All payment methods.';
    if (f.audience === 'specific_customers') {
        const ids = String(f.customer_ids || '').split(/[\s,]+/).filter(Boolean);
        if (ids.length === 0 || ids.length > 500) e.customer_ids = 'Enter up to 500 customer IDs.';
    }
    if (f.audience === 'segment' && !f.segment_id) e.segment_id = 'Choose a saved segment.';
    return e;
}

// Form state → request body for POST/PUT /api/promocodes
export function toPayload(f, toUtcIso) {
    let user_segment = { type: 'all' };
    if (f.audience === 'new_customers' || f.audience === 'existing_customers') user_segment = { type: f.audience };
    if (f.audience === 'specific_customers') user_segment = { type: 'specific_customers', user_ids: String(f.customer_ids || '').split(/[\s,]+/).filter(Boolean) };
    if (f.audience === 'segment') user_segment = { type: String(f.segment_id) };
    if (f.audience === 'targeted') user_segment = { type: 'targeted', user_id: f.targeted_user_id };
    return {
        code: String(f.code || '').trim().toUpperCase(),
        description: String(f.description || '').trim() || null,
        type: f.type,
        value: f.type === 'Waiver' ? 0 : f.value,
        currency: f.currency,
        max_discount: f.type === 'Percentage' ? f.max_discount : '',
        min_threshold: f.min_threshold,
        usage_limit_global: f.usage_limit_global,
        budget_limit: f.budget_limit,
        usage_limit_per_user: f.perUserUnlimited ? -1 : f.usage_limit_per_user,
        start_date: toUtcIso(f.start_date),
        end_date: toUtcIso(f.end_date),
        all_corridors: !!f.allCorridors,
        all_payment_methods: !!f.allMethods,
        restrictions: { corridors: f.allCorridors ? [] : f.corridors, payment_methods: f.allMethods ? [] : f.payment_methods },
        user_segment,
    };
}
