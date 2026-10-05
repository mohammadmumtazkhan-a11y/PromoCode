// Promo code validation and redemption – the single source of truth for promo codes in production.
// Rhemito calls /api/promocodes/validate while a customer builds a transfer and /api/promocodes/redeem when the
// transfer is paid. Rhemito keeps no promo codes of its own.
const { segmentMatches, Reject } = require('./bonusEngine');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const schemaReady = new WeakMap(); // one schema check per database connection

function ensureSchema(q) {
    if (!schemaReady.has(q)) {
        schemaReady.set(q, (async () => {
            // A transfer can redeem a code only once, so a retried "redeem" call cannot double count
            await q.run(`CREATE UNIQUE INDEX IF NOT EXISTS ux_promo_redemption_txn ON promo_redemptions(promo_code_id, transaction_id)`);
        })().catch((e) => { schemaReady.delete(q); throw e; }));
    }
    return schemaReady.get(q);
}

// Accept both snake_case (Mito) and camelCase (Rhemito) request fields
function normalise(body = {}) {
    const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));
    return {
        code: String(body.code || '').trim().toUpperCase(),
        amount: num(body.amount),
        fee: num(body.fee),
        currency: body.currency ? String(body.currency).toUpperCase() : undefined,
        userId: body.user_id || body.userId,
        source: body.source_currency || body.sourceCurrency,
        dest: body.dest_currency || body.destCurrency,
        paymentMethod: body.payment_method || body.paymentMethod,
        transactionId: body.transaction_id || body.transactionId,
    };
}

function computeDiscount(promo, { amount, fee }) {
    const value = Number(promo.value) || 0;
    let d = 0;
    switch (promo.type) {
        case 'Percentage': d = ((fee !== undefined ? fee : amount || 0) * value) / 100; break;
        case 'Fixed': d = value; break;
        case 'Waiver': d = fee !== undefined ? fee : 0; break;
        default: d = 0; // FX_BOOST and BONUS_CREDIT change the rate or the wallet, not the price
    }
    if (promo.max_discount && d > promo.max_discount) d = promo.max_discount;
    if (fee !== undefined && d > fee) d = fee; // a fee discount can never exceed the fee
    return round2(d);
}

function displayText(promo, discount) {
    const cur = promo.currency || '';
    switch (promo.type) {
        case 'Percentage': return `${promo.value}% off fees (${cur} ${discount.toFixed(2)} saved)`.replace('( ', '(');
        case 'Fixed': return `${cur} ${discount.toFixed(2)} off`.trim();
        case 'Waiver': return 'Fees waived';
        case 'FX_BOOST': return `+${promo.value} rate boost`;
        case 'BONUS_CREDIT': return `${cur} ${promo.value} bonus credit`.trim();
        default: return 'Discount applied';
    }
}

async function userRedemptions(q, promo, userId) {
    if (!userId) return 0;
    const r = await q.get(`SELECT COUNT(*) AS c FROM promo_redemptions WHERE user_id = ? AND (promo_code_id = ? OR promo_code_id = ?) AND COALESCE(status, 'Redeemed') = 'Redeemed'`,
        [userId, promo.code, String(promo.id)]);
    return r.c;
}

// Mito Admin lists payment methods by display name ("Bank Transfer"); Rhemito sends ids ("bank_deposit", "instant_bank").
// Both are reduced to one key so the same method matches whichever way it is written.
const PAYMENT_METHOD_ALIASES = {
    banktransfer: 'bank', bankdeposit: 'bank', instantbank: 'bank', manualtransfer: 'bank', bank: 'bank',
    card: 'card', creditdebitcard: 'card', debitcard: 'card', creditcard: 'card',
    mobilemoney: 'mobilemoney', ussd: 'ussd', wallet: 'wallet', cashpickup: 'cashpickup'
};
function paymentMethodKey(m) {
    const k = String(m || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return PAYMENT_METHOD_ALIASES[k] || k;
}

// Throws Reject for every business-rule failure; returns { promo, discount } when the code can be used.
async function check(q, body) {
    await ensureSchema(q);
    const n = normalise(body);
    if (!n.code) throw new Reject(400, 'VALIDATION', 'Enter a promo code.', { plain: true });
    const promo = await q.get(`SELECT * FROM promo_codes WHERE code = ?`, [n.code]);
    if (!promo) throw new Reject(404, 'INVALID_CODE', 'Invalid promo code', { plain: true });

    const now = new Date();
    if (promo.status !== 'Active') throw new Reject(400, 'INACTIVE', 'This promo code is not active.', { plain: true });
    if (new Date(promo.start_date) > now) throw new Reject(400, 'INACTIVE', 'This promo code is not valid yet.', { plain: true });
    if (new Date(promo.end_date) < now) throw new Reject(400, 'INACTIVE', 'This promo code has expired.', { plain: true });
    if (promo.usage_limit_global !== -1 && promo.usage_count >= promo.usage_limit_global) {
        throw new Reject(400, 'FULLY_REDEEMED', 'Promo code fully redeemed (Count Limit)', { plain: true });
    }
    if (promo.budget_limit !== -1 && promo.total_discount_utilized >= promo.budget_limit) {
        throw new Reject(400, 'BUDGET_SPENT', 'Promo code fully redeemed (Budget Limit)', { plain: true });
    }
    if (promo.currency && (n.currency || n.source) && String(n.currency || n.source).toUpperCase() !== String(promo.currency).toUpperCase()) {
        throw new Reject(400, 'CURRENCY', `Code is only valid for ${promo.currency} transfers`, { plain: true });
    }
    if (n.amount !== undefined && n.amount < Number(promo.min_threshold || 0)) {
        throw new Reject(400, 'BELOW_MIN', `Transfer amount too low (Min: ${promo.min_threshold})`, { plain: true });
    }

    const restrictions = JSON.parse(promo.restrictions || '{}');
    if (restrictions.corridors && restrictions.corridors.length > 0 && !restrictions.corridors.includes(`${n.source}-${n.dest}`)) {
        throw new Reject(400, 'CORRIDOR', 'Code not valid for this corridor', { plain: true });
    }
    if (restrictions.payment_methods && restrictions.payment_methods.length > 0 && n.paymentMethod
        && !restrictions.payment_methods.some((m) => paymentMethodKey(m) === paymentMethodKey(n.paymentMethod))) {
        throw new Reject(400, 'PAYMENT_METHOD', 'Code not valid for this payment method', { plain: true });
    }

    // Who the code is for
    const seg = promo.user_segment ? JSON.parse(promo.user_segment) : { type: 'all' };
    if (seg.type === 'targeted') {
        if (!n.userId || String(seg.user_id) !== String(n.userId)) throw new Reject(403, 'NOT_YOUR_CODE', 'This code was issued to another customer.', { plain: true });
    } else if (seg.type && seg.type !== 'all') {
        if (!n.userId || !(await segmentMatches(q, seg.type, n.userId, { transferId: n.transactionId }))) {
            throw new Reject(403, 'SEGMENT', 'This code is not available for your account.', { plain: true });
        }
    }

    // Per-customer limit (-1 = unlimited)
    const perUser = promo.usage_limit_per_user === null || promo.usage_limit_per_user === undefined ? 1 : promo.usage_limit_per_user;
    if (perUser !== -1 && n.userId && (await userRedemptions(q, promo, n.userId)) >= perUser) {
        throw new Reject(400, 'ALREADY_USED', 'You have already used this promo code', { plain: true });
    }

    const discount = computeDiscount(promo, n);
    return { promo, discount, n };
}

async function validate(q, body) {
    const { promo, discount } = await check(q, body);
    return { valid: true, promo, appliedDiscount: discount, appliesTo: 'fee', displayText: displayText(promo, discount), display_text: displayText(promo, discount) };
}

// Called when the transfer is paid. The discount is recomputed here, never trusted from the caller.
async function redeem(q, body) {
    await ensureSchema(q);
    const n0 = normalise(body);
    if (!n0.transactionId) throw new Reject(400, 'VALIDATION', 'transaction_id is required to redeem a code.', { plain: true });
    // A retried call for the same transfer succeeds without counting twice
    const dup = await q.get(`SELECT discount_amount, status FROM promo_redemptions WHERE promo_code_id = ? AND transaction_id = ?`, [n0.code, n0.transactionId]);
    if (dup && dup.status === 'Released') throw new Reject(409, 'RELEASED', 'This transfer was cancelled or refunded, so its promo code use was released.', { plain: true });
    if (dup) return { success: true, idempotent: true, discount: dup.discount_amount };
    const { promo, discount, n } = await check(q, body);
    await q.run(`INSERT INTO promo_redemptions (id, promo_code_id, transaction_id, user_id, discount_amount, status, created_at) VALUES (?, ?, ?, ?, ?, 'Redeemed', ?)`,
        [`pr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, promo.code, n.transactionId, n.userId || null, discount, new Date().toISOString()]);
    await q.run(`UPDATE promo_codes SET usage_count = usage_count + 1, total_discount_utilized = total_discount_utilized + ? WHERE id = ?`, [discount, promo.id]);
    return { success: true, discount };
}

// The transfer that used a code was cancelled, failed or refunded: give the use back (per-customer limit, global count, budget).
// transaction_id alone is enough; code is optional. Safe to repeat.
async function release(q, body) {
    await ensureSchema(q);
    const n = normalise(body);
    if (!n.transactionId) throw new Reject(400, 'VALIDATION', 'transaction_id is required to release a code.', { plain: true });
    const rows = await q.all(`SELECT * FROM promo_redemptions WHERE transaction_id = ? AND COALESCE(status, 'Redeemed') = 'Redeemed' ${n.code ? 'AND promo_code_id = ?' : ''}`,
        n.code ? [n.transactionId, n.code] : [n.transactionId]);
    for (const r of rows) {
        await q.run(`UPDATE promo_redemptions SET status = 'Released' WHERE id = ?`, [r.id]);
        await q.run(`UPDATE promo_codes SET usage_count = MAX(0, usage_count - 1), total_discount_utilized = MAX(0, total_discount_utilized - ?) WHERE code = ? OR CAST(id AS TEXT) = ?`,
            [r.discount_amount || 0, r.promo_code_id, String(r.promo_code_id)]);
    }
    return { success: true, released: rows.length };
}

module.exports = { release, validate, redeem, check, computeDiscount, normalise };
