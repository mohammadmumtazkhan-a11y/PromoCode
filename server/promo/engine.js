// Promo code engine — the single source of truth for promo codes (spec PROMO-MITO §3).
// Rhemito calls validate while a customer builds a transfer, redeem when the transfer is paid,
// and reports transfer status changes so a cancelled/failed/refunded transfer gives the code use back.
const crypto = require('crypto');
const { PromoError } = require('./errors');
const { roundFor, formatMoney } = require('./money');
const { defaultPorts } = require('./ports');

const clock = { now: () => new Date() };
let ports = null; // set by configure(); falls back to defaults per database
const portsFor = (q) => ports || defaultPorts(q);
function configure(p) { ports = p; }

const LEGACY_TYPES = ['FX_BOOST', 'BONUS_CREDIT'];
const ACTIVE_TYPES = ['Fixed', 'Percentage', 'Waiver'];
const FAIL_STATUSES = ['CANCELLED', 'FAILED', 'REFUNDED', 'RECALLED', 'CHARGEBACK'];

// One redeem/release at a time: the sqlite connection is shared, so limits and budgets are checked and
// updated without another request slipping in between (spec §6.2).
let lock = Promise.resolve();
function exclusive(fn) {
    const run = lock.then(fn, fn);
    lock = run.catch(() => {});
    return run;
}

// Accept both snake_case (Mito) and camelCase (Rhemito) request fields
function normalise(body = {}) {
    const num = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));
    const up = (v) => (v ? String(v).toUpperCase() : undefined);
    return {
        code: String(body.code || '').trim().toUpperCase(),
        amount: num(body.amount),
        fee: num(body.fee),
        currency: up(body.currency),
        userId: body.user_id || body.userId || undefined,
        source: up(body.source_currency || body.sourceCurrency),
        dest: up(body.dest_currency || body.destCurrency),
        paymentMethod: body.payment_method || body.paymentMethod || undefined,
        transactionId: body.transaction_id || body.transactionId || undefined,
    };
}

const parseJson = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };

// Who the code is for: top-level user_segment first, then the copy older forms saved inside restrictions (C8)
function audienceOf(promo) {
    const top = parseJson(promo.user_segment, null);
    if (top && top.type) return top;
    const r = parseJson(promo.restrictions, {});
    if (r.user_segment && r.user_segment.type) return r.user_segment;
    return { type: 'all' };
}

function computeDiscount(promo, { amount, fee }) {
    const value = Number(promo.value) || 0;
    let d = 0;
    switch (promo.type) {
        case 'Percentage': d = ((fee !== undefined ? fee : amount || 0) * value) / 100; break;
        case 'Fixed': d = value; break;
        case 'Waiver': d = fee !== undefined ? fee : 0; break;
        default: d = 0; // FX_BOOST and BONUS_CREDIT (legacy) give no fee discount
    }
    if (promo.max_discount && d > promo.max_discount) d = promo.max_discount;
    if (fee !== undefined && d > fee) d = fee; // a fee discount can never exceed the fee
    if (d < 0) d = 0;
    return roundFor(d, promo.currency);
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

// Mito Admin lists payment methods by display name ("Bank Transfer"); Rhemito sends ids ("bank_deposit", "instant_bank").
const PAYMENT_METHOD_ALIASES = {
    banktransfer: 'bank', bankdeposit: 'bank', instantbank: 'bank', manualtransfer: 'bank', bank: 'bank',
    card: 'card', creditdebitcard: 'card', debitcard: 'card', creditcard: 'card',
    mobilemoney: 'mobilemoney', ussd: 'ussd', wallet: 'wallet', cashpickup: 'cashpickup',
};
function paymentMethodKey(m) {
    const k = String(m || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return PAYMENT_METHOD_ALIASES[k] || k;
}

// ---------- customer activity (module-owned, spec §3.4) ----------
async function customerStats(q, userId, { currency, periodDays, excludeTransferId } = {}) {
    const where = ['customer_id = ?', `status = 'COMPLETED'`];
    const params = [userId];
    if (currency) { where.push('currency = ?'); params.push(String(currency).toUpperCase()); }
    if (periodDays) { where.push('created_at >= ?'); params.push(new Date(clock.now().getTime() - periodDays * 86400000).toISOString()); }
    if (excludeTransferId) { where.push('transfer_id <> ?'); params.push(excludeTransferId); }
    const row = await q.get(`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS volume FROM promo_transfers WHERE ${where.join(' AND ')}`, params);
    return { count: row.count || 0, volume: row.volume || 0 };
}

async function signupDate(q, userId) {
    const row = await q.get('SELECT created_at FROM promo_customers WHERE id = ?', [userId]);
    if (row && row.created_at) return new Date(row.created_at);
    const fromHost = await portsFor(q).customerDirectory.signupDate(userId);
    return fromHost ? new Date(fromHost) : null;
}

const inRange = (n, min, max) => n >= (Number(min) || 0) && (max === null || max === undefined || max === '' || n <= Number(max));

async function segmentMatches(q, segId, userId, ctx = {}) {
    if (segId === 'all') return true;
    if (segId === 'existing_customers') return (await customerStats(q, userId, { excludeTransferId: ctx.transferId })).count >= 1;
    if (segId === 'new_customers') return (await customerStats(q, userId, { excludeTransferId: ctx.transferId })).count === 0;
    const seg = await portsFor(q).segmentProvider.getSegment(segId);
    if (!seg) return false;
    const c = parseJson(seg.criteria, {});
    if (c.signup_start_date || c.signup_end_date) {
        const joined = await signupDate(q, userId);
        if (!joined) return false;
        if (c.signup_start_date && joined < new Date(c.signup_start_date)) return false;
        if (c.signup_end_date && joined > new Date(c.signup_end_date)) return false;
    }
    const stats = await customerStats(q, userId, { periodDays: c.period_days || null, currency: c.type === 'TRANSACTION_VOLUME' ? c.currency : null, excludeTransferId: ctx.transferId });
    if (c.type === 'TRANSACTION_COUNT') return inRange(stats.count, c.min, c.max);
    if (c.type === 'TRANSACTION_VOLUME') return inRange(stats.volume, c.min, c.max);
    if (c.type === 'NEW_USER') return (c.min || c.max) ? inRange(stats.count, c.min, c.max) : true;
    return false;
}

async function userRedemptions(q, promo, userId) {
    if (!userId) return 0;
    const r = await q.get(`SELECT COUNT(*) AS c FROM promo_redemptions WHERE user_id = ? AND (promo_code_id = ? OR promo_code_id = ?) AND COALESCE(status, 'Redeemed') = 'Redeemed'`,
        [userId, promo.code, String(promo.id)]);
    return r.c;
}

// ---------- validation (spec §3.1, order PR-1 … PR-13) ----------
async function check(q, body) {
    const n = normalise(body);
    if (!n.code) throw new PromoError(400, 'VALIDATION', 'Enter a promo code.');
    const promo = await q.get('SELECT * FROM promo_codes WHERE code = ?', [n.code]);
    if (!promo) throw new PromoError(404, 'INVALID_CODE', "This promo code isn't valid. Check it and try again.");

    const now = clock.now();
    if (promo.status !== 'Active') throw new PromoError(400, 'INACTIVE', 'This promo code is not active.');
    if (promo.start_date && new Date(promo.start_date) > now) throw new PromoError(400, 'NOT_STARTED', 'This promo code is not valid yet.');
    if (promo.end_date && new Date(promo.end_date) < now) throw new PromoError(400, 'EXPIRED', 'This promo code has expired.');
    if (promo.usage_limit_global !== -1 && promo.usage_limit_global !== null && promo.usage_count >= promo.usage_limit_global) {
        throw new PromoError(400, 'FULLY_REDEEMED', 'This promo code has reached its limit.');
    }
    if (promo.budget_limit !== -1 && promo.budget_limit !== null && promo.total_discount_utilized >= promo.budget_limit) {
        throw new PromoError(400, 'BUDGET_SPENT', 'This promo code has reached its limit.');
    }
    const cur = n.currency || n.source;
    if (promo.currency && cur && cur !== String(promo.currency).toUpperCase()) {
        throw new PromoError(400, 'CURRENCY', `This code only works on ${promo.currency} transfers.`);
    }
    if (n.amount !== undefined && n.amount < Number(promo.min_threshold || 0)) {
        throw new PromoError(400, 'BELOW_MIN', `Send at least ${formatMoney(promo.min_threshold, promo.currency || cur)} to use this code.`);
    }
    const restrictions = parseJson(promo.restrictions, {});
    if (Array.isArray(restrictions.corridors) && restrictions.corridors.length > 0 && !restrictions.corridors.includes(`${n.source}-${n.dest}`)) {
        throw new PromoError(400, 'CORRIDOR', "This code can't be used for this destination.");
    }
    if (Array.isArray(restrictions.payment_methods) && restrictions.payment_methods.length > 0 && n.paymentMethod
        && !restrictions.payment_methods.some((m) => paymentMethodKey(m) === paymentMethodKey(n.paymentMethod))) {
        throw new PromoError(400, 'PAYMENT_METHOD', "This code can't be used with this payment method.");
    }

    // Who the code is for (PR-12, PR-25 – PR-27)
    const seg = audienceOf(promo);
    if (seg.type === 'targeted') {
        if (!n.userId || String(seg.user_id) !== String(n.userId)) throw new PromoError(403, 'NOT_YOUR_CODE', 'This code was issued to another customer.');
    } else if (seg.type === 'specific_customers') {
        const ids = (seg.user_ids || []).map(String);
        if (!n.userId || !ids.includes(String(n.userId))) throw new PromoError(403, 'NOT_YOUR_CODE', 'This code was issued to another customer.');
    } else if (seg.type && seg.type !== 'all') {
        if (!n.userId || !(await segmentMatches(q, String(seg.type), n.userId, { transferId: n.transactionId }))) {
            throw new PromoError(403, 'SEGMENT', 'This code is not available for your account.');
        }
    }

    // Per-customer limit (-1 = unlimited)
    const perUser = promo.usage_limit_per_user === null || promo.usage_limit_per_user === undefined ? 1 : promo.usage_limit_per_user;
    if (perUser !== -1 && n.userId && (await userRedemptions(q, promo, n.userId)) >= perUser) {
        throw new PromoError(400, 'ALREADY_USED', 'You have already used this promo code.');
    }

    return { promo, discount: computeDiscount(promo, n), n };
}

async function validate(q, body) {
    const { promo, discount } = await check(q, body);
    const text = displayText(promo, discount);
    return { valid: true, promo, appliedDiscount: discount, appliesTo: 'fee', displayText: text, display_text: text, currency: promo.currency || null };
}

// Called when the transfer is paid. The discount is recomputed here, never trusted from the caller (D4).
function redeem(q, body) {
    return exclusive(async () => {
        const n0 = normalise(body);
        if (!n0.transactionId) throw new PromoError(400, 'VALIDATION', 'transaction_id is required to redeem a code.');
        const dup = await q.get('SELECT discount_amount, status FROM promo_redemptions WHERE promo_code_id = ? AND transaction_id = ?', [n0.code, n0.transactionId]);
        if (dup && dup.status === 'Released') throw new PromoError(409, 'RELEASED', 'This transfer was cancelled or refunded, so its promo code use was released.');
        if (dup) return { success: true, idempotent: true, discount: dup.discount_amount };
        const checked = await check(q, body);
        const { promo, n } = checked;
        let { discount } = checked;
        // PR-14: never give more than the budget that is left
        if (promo.budget_limit !== -1 && promo.budget_limit !== null) {
            const left = roundFor(Number(promo.budget_limit) - Number(promo.total_discount_utilized || 0), promo.currency);
            if (left <= 0) throw new PromoError(400, 'BUDGET_SPENT', 'This promo code has reached its limit.');
            if (discount > left) discount = left;
        }
        const id = `pr_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
        await q.run(`INSERT INTO promo_redemptions (id, promo_code_id, transaction_id, user_id, discount_amount, status, created_at,
            currency, send_amount, fee, source_currency, dest_currency, payment_method)
            VALUES (?, ?, ?, ?, ?, 'Redeemed', ?, ?, ?, ?, ?, ?, ?)`,
        [id, promo.code, n.transactionId, n.userId || null, discount, clock.now().toISOString(),
            promo.currency || n.currency || n.source || null, n.amount ?? null, n.fee ?? null, n.source || null, n.dest || null, n.paymentMethod || null]);
        await q.run('UPDATE promo_codes SET usage_count = usage_count + 1, total_discount_utilized = total_discount_utilized + ? WHERE id = ?', [discount, promo.id]);
        return { success: true, discount };
    });
}

// The transfer that used a code was cancelled, failed or refunded: give the use back. Safe to repeat (PR-31).
function release(q, body = {}) {
    return exclusive(async () => {
        const n = normalise(body);
        if (!n.transactionId) throw new PromoError(400, 'VALIDATION', 'transaction_id is required to release a code.');
        const reason = String(body.reason || 'RELEASED').toUpperCase();
        const rows = await q.all(`SELECT * FROM promo_redemptions WHERE transaction_id = ? AND COALESCE(status, 'Redeemed') = 'Redeemed' ${n.code ? 'AND promo_code_id = ?' : ''}`,
            n.code ? [n.transactionId, n.code] : [n.transactionId]);
        for (const r of rows) {
            await q.run(`UPDATE promo_redemptions SET status = 'Released', released_at = ?, release_reason = ? WHERE id = ?`, [clock.now().toISOString(), reason, r.id]);
            await q.run('UPDATE promo_codes SET usage_count = MAX(0, usage_count - 1), total_discount_utilized = MAX(0, total_discount_utilized - ?) WHERE code = ? OR CAST(id AS TEXT) = ?',
                [r.discount_amount || 0, r.promo_code_id, String(r.promo_code_id)]);
        }
        return { success: true, released: rows.length };
    });
}

// ---------- activity reported by Rhemito (PR-32, PR-33) ----------
const TRANSFER_STATUSES = ['PAID', 'COMPLETED', ...FAIL_STATUSES];

async function handleTransferEvent(q, ev = {}) {
    const status = String(ev.status || '').toUpperCase();
    if (!ev.transfer_id || !ev.customer_id || !status) throw new PromoError(400, 'VALIDATION', 'transfer_id, customer_id and status are required.');
    if (!TRANSFER_STATUSES.includes(status)) throw new PromoError(400, 'VALIDATION', 'Unknown transfer status.');
    const now = clock.now().toISOString();
    const prev = await q.get('SELECT * FROM promo_transfers WHERE transfer_id = ?', [ev.transfer_id]);
    await q.run(`INSERT INTO promo_transfers (transfer_id, customer_id, amount, currency, receive_currency, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(transfer_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    [ev.transfer_id, ev.customer_id, Number(ev.amount || (prev && prev.amount) || 0), String(ev.currency || (prev && prev.currency) || '').toUpperCase() || null,
        String(ev.receive_currency || (prev && prev.receive_currency) || '').toUpperCase() || null, status, (prev && prev.created_at) || ev.created_at || now, now]);
    let released = 0;
    if (FAIL_STATUSES.includes(status)) released = (await release(q, { transaction_id: ev.transfer_id, reason: status })).released;
    return { released };
}

async function upsertCustomer(q, c = {}) {
    if (!c.id || !/^[A-Za-z0-9_-]{1,64}$/.test(String(c.id))) throw new PromoError(400, 'VALIDATION', 'Customer id is required.');
    const now = clock.now().toISOString();
    const prev = (await q.get('SELECT * FROM promo_customers WHERE id = ?', [c.id])) || {};
    const pick = (k) => (c[k] !== undefined ? c[k] : prev[k] ?? null);
    await q.run(`INSERT INTO promo_customers (id, created_at, country, send_currency, account_status, first_name, last_name, email, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET created_at = excluded.created_at, country = excluded.country, send_currency = excluded.send_currency,
        account_status = excluded.account_status, first_name = excluded.first_name, last_name = excluded.last_name, email = excluded.email, updated_at = excluded.updated_at`,
    [c.id, pick('created_at') || now, pick('country'), pick('send_currency') ? String(pick('send_currency')).toUpperCase() : null,
        pick('account_status') || 'ACTIVE', pick('first_name'), pick('last_name'), pick('email'), now]);
    return { success: true };
}

// ---------- read functions for other Mito modules (spec §8.4) ----------
async function listRedemptions(q, { userId, codeId, from, to, status } = {}) {
    const cond = []; const params = [];
    if (userId) { cond.push('pr.user_id = ?'); params.push(userId); }
    if (codeId !== undefined && codeId !== null && codeId !== '') {
        cond.push('(pr.promo_code_id = ? OR pr.promo_code_id = (SELECT code FROM promo_codes WHERE CAST(id AS TEXT) = ?))');
        params.push(String(codeId), String(codeId));
    }
    if (from) { cond.push('date(pr.created_at) >= date(?)'); params.push(from); }
    if (to) { cond.push('date(pr.created_at) <= date(?)'); params.push(to); }
    if (status) { cond.push(`COALESCE(pr.status, 'Redeemed') = ?`); params.push(status); }
    return q.all(`SELECT pr.id, pr.promo_code_id, pr.transaction_id, pr.user_id, pr.discount_amount, COALESCE(pr.status, 'Redeemed') AS status, pr.created_at,
            COALESCE(pr.currency, pc.currency) AS currency, pc.code AS code, pc.id AS code_id,
            pr.send_amount, pr.fee, pr.source_currency, pr.dest_currency, pr.payment_method, pr.released_at, pr.release_reason,
            NULLIF(TRIM(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')), '') AS customer_name
        FROM promo_redemptions pr
        LEFT JOIN promo_codes pc ON (pr.promo_code_id = pc.code OR pr.promo_code_id = CAST(pc.id AS TEXT))
        LEFT JOIN promo_customers cu ON cu.id = pr.user_id
        ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY pr.created_at DESC`, params);
}

async function savingsFor(q, userId) {
    const rows = await listRedemptions(q, { userId });
    const saved = {};
    for (const r of rows) {
        if (r.status !== 'Redeemed') continue;
        const cur = r.currency || 'GBP';
        saved[cur] = roundFor((saved[cur] || 0) + Number(r.discount_amount || 0), cur);
    }
    return {
        data: rows.map((r) => ({ id: r.id, code: r.code || r.promo_code_id, transaction_id: r.transaction_id, discount: r.discount_amount, currency: r.currency, status: r.status, created_at: r.created_at })),
        summary: { saved },
    };
}

module.exports = {
    configure, clock, normalise, computeDiscount, displayText, check, validate, redeem, release, handleTransferEvent, upsertCustomer,
    listRedemptions, savingsFor, segmentMatches, customerStats, audienceOf, paymentMethodKey, LEGACY_TYPES, ACTIVE_TYPES, FAIL_STATUSES,
};
