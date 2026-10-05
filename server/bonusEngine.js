// Bonus scheme engine: decides whether a customer is eligible for a non-referral bonus scheme
// (loyalty, transaction threshold, request money), works out the amount, and writes it to the credit ledger.
//
// Two ways in:
//   * awardScheme()  – an admin (or the manual award API) names a scheme and a customer.
//   * triggerEvent() – Rhemito reports something that happened (a transfer completed, a money request was
//                      paid) and every ACTIVE scheme of the matching type is evaluated automatically.
// Both go through the same eligibility checks, so the rules are enforced the same way on the server.
const crypto = require('crypto');
const debt = require('./bonusDebt');
const blocks = require('./bonusBlocks');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const newId = (p) => `${p}_${crypto.randomBytes(8).toString('hex')}`;
const today = () => new Date().toISOString().split('T')[0];
const addDaysYmd = (days) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().split('T')[0]; };

// Which scheme types react to which Rhemito event
const EVENT_SCHEME_TYPES = Object.freeze({
    TRANSFER_COMPLETED: ['LOYALTY_CREDIT', 'TRANSACTION_THRESHOLD_CREDIT'],
    MONEY_REQUEST_PAID: ['REQUEST_MONEY'],
});
const THRESHOLD_TYPES = ['TRANSACTION_THRESHOLD_CREDIT', 'REQUEST_MONEY'];
const DEFAULT_VALIDITY_DAYS = 90;

// A business-rule refusal. `plain` keeps the older { error: "<sentence>" } response shape for the messages that always used it.
class Reject extends Error {
    constructor(status, code, message, { plain = false } = {}) {
        super(message);
        this.status = status; this.code = code; this.plain = plain;
    }
    body() { return this.plain ? { error: this.message } : { error: this.code, message: this.message }; }
}

const schemaReady = new WeakMap(); // one schema check per database connection
function ensureSchema(q) {
    if (!schemaReady.has(q)) {
        schemaReady.set(q, (async () => {
            const cols = await q.all(`PRAGMA table_info(credit_ledger)`);
            if (!cols.some((c) => c.name === 'currency')) await q.run(`ALTER TABLE credit_ledger ADD COLUMN currency TEXT DEFAULT 'GBP'`);
            // A replayed Rhemito event can never pay the same scheme twice, even under concurrent requests
            await q.run(`CREATE UNIQUE INDEX IF NOT EXISTS ux_credit_scheme_event ON credit_ledger(scheme_id, reference_id) WHERE reference_id LIKE 'evt:%'`);
        })().catch((e) => { schemaReady.delete(q); throw e; }));
    }
    return schemaReady.get(q);
}

// ---------- customer history ----------
// Completed transfers reported by Rhemito; falls back to the legacy merchant transactions for older records.
async function customerStats(q, userId, { currency, periodDays, excludeTransferId } = {}) {
    let known = false;
    try { known = !!(await q.get(`SELECT 1 AS x FROM referral_transfers WHERE customer_id = ? LIMIT 1`, [userId])); } catch { /* table not created yet */ }
    const cutoff = periodDays ? new Date(Date.now() - periodDays * 86400000).toISOString() : null;
    if (known) {
        const where = [`customer_id = ?`, `status = 'COMPLETED'`]; const params = [userId];
        if (currency) { where.push(`currency = ?`); params.push(String(currency).toUpperCase()); }
        if (cutoff) { where.push(`created_at >= ?`); params.push(cutoff); }
        if (excludeTransferId) { where.push(`transfer_id <> ?`); params.push(excludeTransferId); }
        const row = await q.get(`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS volume FROM referral_transfers WHERE ${where.join(' AND ')}`, params);
        return { count: row.count || 0, volume: row.volume || 0 };
    }
    try {
        const row = await q.get(`SELECT COUNT(*) AS count, COALESCE(SUM(amount_debit_ngn), 0) AS volume FROM transactions WHERE merchant_id = ? ${cutoff ? 'AND debit_date >= ?' : ''}`,
            cutoff ? [userId, cutoff] : [userId]);
        return { count: row.count || 0, volume: row.volume || 0 };
    } catch { return { count: 0, volume: 0 }; }
}

async function signupDate(q, userId) {
    for (const sql of [`SELECT created_at FROM customers WHERE id = ?`, `SELECT created_at FROM merchants WHERE id = ?`]) {
        try { const r = await q.get(sql, [userId]); if (r && r.created_at) return new Date(r.created_at); } catch { /* table absent */ }
    }
    return null;
}

const inRange = (n, min, max) => n >= (Number(min) || 0) && (max === null || max === undefined || max === '' || n <= Number(max));

// One user segment (Growth > Bonus Scheme Manager > User Segments), or one of the built-in names
async function segmentMatches(q, segId, userId, ctx) {
    if (segId === 'all') return true;
    if (segId === 'existing_customers') {
        const prior = await customerStats(q, userId, { excludeTransferId: ctx.transferId });
        return prior.count >= 1;
    }
    const seg = await q.get(`SELECT * FROM user_segments WHERE id = ?`, [segId]);
    if (!seg) return false;
    const c = JSON.parse(seg.criteria || '{}');
    if (c.signup_start_date || c.signup_end_date) {
        const joined = await signupDate(q, userId);
        if (!joined) return false;
        if (c.signup_start_date && joined < new Date(c.signup_start_date)) return false;
        if (c.signup_end_date && joined > new Date(c.signup_end_date)) return false;
    }
    const stats = await customerStats(q, userId, { periodDays: c.period_days || null, currency: c.type === 'TRANSACTION_VOLUME' ? c.currency : null });
    if (c.type === 'TRANSACTION_COUNT') return inRange(stats.count, c.min, c.max);
    if (c.type === 'TRANSACTION_VOLUME') return inRange(stats.volume, c.min, c.max);
    if (c.type === 'NEW_USER') return (c.min || c.max) ? inRange(stats.count, c.min, c.max) : true;
    return false;
}

// ---------- eligibility ----------
async function checkEligibility(q, scheme, ctx) {
    // A customer with too many cancelled / refunded bonus-earning transfers earns no bonus until a Growth Manager approves them
    const block = await blocks.activeBlock(q, ctx.userId);
    if (block) throw new Reject(403, 'BONUS_BLOCKED', `Bonus is blocked for this customer: ${block.reason}`);
    if (scheme.status !== 'ACTIVE') {
        throw new Reject(400, 'SCHEME_INACTIVE', `Bonus scheme "${scheme.name}" is not active (status: ${scheme.status})`);
    }
    const t = today();
    if (scheme.start_date && t < scheme.start_date) throw new Reject(400, 'SCHEME_NOT_STARTED', `Bonus scheme "${scheme.name}" has not started yet (starts ${scheme.start_date})`);
    if (scheme.end_date && t > scheme.end_date) throw new Reject(400, 'SCHEME_EXPIRED', `Bonus scheme "${scheme.name}" expired on ${scheme.end_date}`);

    // The bonus is paid in the scheme's currency, so it only reacts to activity in that currency
    if (ctx.currency && scheme.currency && String(ctx.currency).toUpperCase() !== String(scheme.currency).toUpperCase()) {
        throw new Reject(400, 'CURRENCY_MISMATCH', `Bonus scheme "${scheme.name}" applies to ${scheme.currency}, not ${String(ctx.currency).toUpperCase()}.`);
    }

    // Minimum amount (threshold and request-money schemes)
    const threshold = Number(scheme.min_transaction_threshold || 0);
    if (THRESHOLD_TYPES.includes(scheme.bonus_type) && threshold > 0 && ctx.amount !== null && ctx.amount !== undefined && Number(ctx.amount) < threshold) {
        throw new Reject(400, 'BELOW_THRESHOLD', `Amount ${ctx.amount} is below the ${threshold} minimum for "${scheme.name}".`);
    }

    // Loyalty: enough completed transfers inside the time period
    if (scheme.bonus_type === 'LOYALTY_CREDIT') {
        const need = Number(scheme.min_transactions || 0);
        if (need > 0) {
            const stats = await customerStats(q, ctx.userId, { currency: ctx.event ? scheme.currency : null, periodDays: Number(scheme.time_period_days) || null });
            if (stats.count < need) {
                throw new Reject(403, 'LOYALTY_NOT_MET', `Customer has ${stats.count} of the ${need} transactions needed${scheme.time_period_days ? ` in ${scheme.time_period_days} days` : ''} for "${scheme.name}".`);
            }
        }
    }

    const rules = JSON.parse(scheme.eligibility_rules || '{}');
    const segs = Array.isArray(rules.segments) ? rules.segments.filter((s) => s !== '' && s !== null) : [];
    // A loyalty scheme is always for existing customers, whatever the stored rule says
    if (scheme.bonus_type === 'LOYALTY_CREDIT' && !segs.includes('existing_customers')) segs.push('existing_customers');
    if (segs.length && !segs.includes('all')) {
        const results = await Promise.all(segs.map((s) => segmentMatches(q, s, ctx.userId, ctx)));
        if (!results.some(Boolean)) throw new Reject(403, 'USER_INELIGIBLE', 'User does not meet the requirements for this bonus segment.');
    }

    // One-time bonus (default)
    if (rules.oneTimeOnly !== false) {
        const existing = await q.get(`SELECT id, created_at FROM credit_ledger WHERE user_id = ? AND scheme_id = ? AND type = 'EARNED'`, [ctx.userId, scheme.id]);
        if (existing) throw new Reject(409, 'ALREADY_EARNED', `User has already earned bonus from "${scheme.name}" on ${existing.created_at}. This is a one-time bonus.`);
    }
    return rules;
}

function computeAmount(scheme, baseAmount) {
    if (scheme.is_tiered) {
        if (baseAmount === null || baseAmount === undefined) throw new Reject(400, 'TXN_REQUIRED', 'Transaction ID is required for tiered commissions', { plain: true });
        const tiers = JSON.parse(scheme.tiers || '[]');
        const tier = tiers.find((x) => baseAmount >= parseFloat(x.min) && baseAmount <= (x.max ? parseFloat(x.max) : Infinity));
        if (!tier) throw new Reject(400, 'TIER_MISMATCH', `Transaction amount ${baseAmount} does not match any commission tiers.`);
        return round2(scheme.commission_type === 'PERCENTAGE' ? (baseAmount * parseFloat(tier.value)) / 100 : parseFloat(tier.value));
    }
    if (scheme.commission_type === 'PERCENTAGE') {
        if (baseAmount === null || baseAmount === undefined) throw new Reject(400, 'TXN_REQUIRED', 'Transaction ID required for percentage commission', { plain: true });
        return round2((baseAmount * scheme.commission_percentage) / 100);
    }
    return round2(scheme.credit_amount);
}

// ---------- awarding ----------
// input: { scheme_id | scheme, user_id, transaction_id?, amount?, currency?, admin_user?, idempotency_key?, event_id?, event? }
async function awardScheme(q, input) {
    await ensureSchema(q);
    const { user_id, scheme_id, transaction_id, admin_user, idempotency_key, event_id } = input;
    if (!user_id || !(scheme_id || input.scheme)) throw new Reject(400, 'VALIDATION', 'user_id and scheme_id are required', { plain: true });

    if (idempotency_key) {
        const existing = await q.get(`SELECT * FROM credit_ledger WHERE reference_id = ?`, [`idem_${idempotency_key}`]);
        if (existing) return { success: true, id: existing.id, amount: existing.amount, idempotent: true, message: 'Bonus already awarded (Idempotent)' };
    }
    const scheme = input.scheme || await q.get(`SELECT * FROM bonus_schemes WHERE id = ?`, [scheme_id]);
    if (!scheme) throw new Reject(404, 'NOT_FOUND', 'Bonus scheme not found', { plain: true });

    // The amount the bonus is measured on: reported by Rhemito, or looked up from a legacy transaction id
    let baseAmount = input.amount !== undefined && input.amount !== null ? Number(input.amount) : null;
    let currency = input.currency || null;
    if (baseAmount === null && transaction_id && (scheme.is_tiered || scheme.commission_type === 'PERCENTAGE' || Number(scheme.min_transaction_threshold) > 0)) {
        const txn = await q.get(`SELECT amount_debit_ngn FROM transactions WHERE id = ?`, [transaction_id]);
        if (txn) baseAmount = txn.amount_debit_ngn;
        else if (scheme.is_tiered) throw new Reject(404, 'TXN_NOT_FOUND', 'Transaction not found for tiered calculation', { plain: true });
        else if (scheme.commission_type === 'PERCENTAGE') throw new Reject(404, 'TXN_NOT_FOUND', 'Transaction not found', { plain: true });
    }
    const ctx = { userId: user_id, amount: baseAmount, currency, transferId: event_id || transaction_id || null, event: !!input.event };
    const rules = await checkEligibility(q, scheme, ctx);
    const amount = computeAmount(scheme, baseAmount);

    const id = newId('crd');
    const validity = Number(rules.validityDays) > 0 ? Number(rules.validityDays) : DEFAULT_VALIDITY_DAYS;
    const expires_at = addDaysYmd(validity);
    const refId = event_id ? `evt:${scheme.id}:${event_id}` : idempotency_key ? `idem_${idempotency_key}` : (transaction_id || `bonus_${id}`);
    try {
        await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, scheme_id, reference_id, reason_code, notes, admin_user, expires_at, currency)
            VALUES (?, ?, ?, 'EARNED', ?, ?, 'SCHEME_BONUS', ?, ?, ?, ?)`,
        [id, user_id, amount, scheme.id, refId, scheme.name, admin_user || 'System', expires_at, String(scheme.currency || 'GBP').toUpperCase()]);
    } catch (err) {
        if (String(err.message).includes('UNIQUE')) throw new Reject(409, 'DUPLICATE_AWARD', 'Duplicate bonus award (Reference conflict)', { plain: true });
        throw err;
    }
    await debt.settle(q, user_id, String(scheme.currency || 'GBP').toUpperCase());
    return { success: true, id, amount, expires_at, scheme_name: scheme.name, currency: String(scheme.currency || 'GBP').toUpperCase() };
}

// Evaluate every ACTIVE scheme that reacts to this event. Ineligible schemes are reported, not treated as errors.
// ev: { type: 'TRANSFER_COMPLETED' | 'MONEY_REQUEST_PAID', customer_id, event_id, amount, currency }
async function triggerEvent(q, ev) {
    const types = EVENT_SCHEME_TYPES[ev.type];
    if (!types) throw new Reject(400, 'UNKNOWN_EVENT', `Unknown event type "${ev.type}".`);
    if (!ev.customer_id || !ev.event_id) throw new Reject(400, 'VALIDATION', 'customer_id and event_id are required.');
    await ensureSchema(q);
    const schemes = await q.all(`SELECT * FROM bonus_schemes WHERE status = 'ACTIVE' AND bonus_type IN (${types.map(() => '?').join(',')}) ORDER BY id`, types);
    const results = [];
    for (const scheme of schemes) {
        try {
            const dup = await q.get(`SELECT id FROM credit_ledger WHERE scheme_id = ? AND reference_id = ?`, [scheme.id, `evt:${scheme.id}:${ev.event_id}`]);
            if (dup) { results.push({ scheme_id: scheme.id, scheme_name: scheme.name, status: 'SKIPPED', reason: 'DUPLICATE_EVENT' }); continue; }
            const out = await awardScheme(q, { scheme, user_id: ev.customer_id, amount: ev.amount, currency: ev.currency, event_id: ev.event_id, event: true, admin_user: 'System' });
            results.push({ scheme_id: scheme.id, scheme_name: scheme.name, status: 'AWARDED', id: out.id, amount: out.amount, currency: out.currency, expires_at: out.expires_at });
        } catch (err) {
            if (!(err instanceof Reject)) throw err;
            results.push({ scheme_id: scheme.id, scheme_name: scheme.name, status: 'SKIPPED', reason: err.code, message: err.message });
        }
    }
    return results;
}

// A transfer / request that earned scheme bonuses was cancelled, failed or refunded: take back what is still unused.
// Bonus the customer already spent on another transfer stays spent (the same rule referral rewards follow).
// outcome: what happened to the transfer (CANCELLED, REFUNDED, ...). FAILED is not the customer's doing, so it is not counted as a strike.
async function reverseEvent(q, eventId, outcome = 'REFUNDED') {
    await ensureSchema(q);
    const credits = await q.all(`SELECT * FROM credit_ledger WHERE type = 'EARNED' AND amount > 0 AND reference_id LIKE ?`, [`evt:%:${eventId}`]);
    const out = [];
    for (const c of credits) {
        const done = await q.get(`SELECT id FROM credit_ledger WHERE source_credit_id = ? AND reason_code = 'SCHEME_REVERSAL'`, [c.id]);
        let voided = 0;
        if (!done) {
            const used = await q.get(`SELECT COALESCE(SUM(amount), 0) AS s FROM credit_ledger WHERE source_credit_id = ?`, [c.id]);
            voided = round2(Number(c.amount) + Number(used.s));
            if (voided > 0) {
                await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, scheme_id, reference_id, reason_code, notes, admin_user, currency, source_credit_id, transfer_id)
                    VALUES (?, ?, ?, 'VOIDED', ?, ?, 'SCHEME_REVERSAL', ?, 'System', ?, ?, ?)`,
                [newId('crd'), c.user_id, -voided, c.scheme_id, `rev:${eventId}`, `Bonus removed – ${eventId} was cancelled or refunded`, c.currency, c.id, eventId]);
            } else voided = 0;
        }
        // The part the customer already spent becomes a debt repaid from their next bonus (see bonusDebt.js)
        const clawed = await debt.clawback(q, c, { eventId, notes: `Bonus already spent – ${eventId} was cancelled or refunded` });
        if (voided > 0 || clawed > 0) {
            const entry = { credit_id: c.id, scheme_id: c.scheme_id, voided, clawed_back: clawed };
            if (String(outcome).toUpperCase() !== 'FAILED') {
                const strike = await blocks.recordStrike(q, { customerId: c.user_id, eventId, kind: 'SCHEME', outcome: String(outcome).toUpperCase(), amountLost: round2(voided + clawed), currency: c.currency });
                entry.strikes = strike.strikes; entry.blocked = strike.blocked;
            }
            out.push(entry);
        }
    }
    return out;
}

module.exports = { reverseEvent, awardScheme, triggerEvent, checkEligibility, customerStats, segmentMatches, Reject, EVENT_SCHEME_TYPES, ensureSchema };
