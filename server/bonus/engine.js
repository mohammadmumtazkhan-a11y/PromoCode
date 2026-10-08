// Bonus scheme engine (spec §3.2 – §3.6): decides whether a customer is eligible for a bonus scheme (loyalty,
// transaction threshold, request money), works out the amount, and pays it into the customer's one bonus wallet.
//
// Two ways in:
//   * awardScheme()  – an admin (or the manual award API) names a scheme and a customer.
//   * triggerEvent() – Rhemito reports something that happened (a transfer completed, a money request was paid) and
//                      every ACTIVE scheme of the matching type is evaluated automatically.
// Both go through the same eligibility checks. Functions take `q` first and do not lock; callers use db.write().
const { Reject } = require('./errors');
const { roundFor, cur } = require('./money');
const { ukToday, nowIso, fmtUk } = require('./time');
const blocks = require('./blocks');
const debt = require('./debt');
const feed = require('./feed');
const wallet = require('./wallet');
const { customerStats, segmentMatches, parseCriteria } = require('./segments');

// Which scheme types react to which Rhemito event (BS-40)
const EVENT_SCHEME_TYPES = Object.freeze({
    TRANSFER_COMPLETED: ['LOYALTY_CREDIT', 'TRANSACTION_THRESHOLD_CREDIT'],
    MONEY_REQUEST_PAID: ['REQUEST_MONEY'],
});
const THRESHOLD_TYPES = ['TRANSACTION_THRESHOLD_CREDIT', 'REQUEST_MONEY'];
const FAIL_STATUSES = ['CANCELLED', 'FAILED', 'REFUNDED', 'RECALLED', 'CHARGEBACK'];

// Kept for older callers: the bonus module creates its schema when it registers
const ensureSchema = async () => {};

// ---------- eligibility (BS-10 – BS-18, first failure wins) ----------
async function checkEligibility(q, scheme, ctx) {
    const block = await blocks.activeBlock(q, ctx.userId);
    if (block) throw new Reject(403, 'BONUS_BLOCKED', `Bonus is blocked for this customer: ${block.reason}`);
    if (scheme.bonus_type === 'REFERRAL_CREDIT') throw new Reject(400, 'SCHEME_INACTIVE', `Bonus scheme "${scheme.name}" is not active (status: LEGACY)`);
    if (scheme.status !== 'ACTIVE') throw new Reject(400, 'SCHEME_INACTIVE', `Bonus scheme "${scheme.name}" is not active (status: ${scheme.status})`);
    const t = ukToday();
    if (scheme.start_date && t < scheme.start_date) throw new Reject(400, 'SCHEME_NOT_STARTED', `Bonus scheme "${scheme.name}" has not started yet (starts ${fmtUk(scheme.start_date)})`);
    if (scheme.end_date && t > scheme.end_date) throw new Reject(400, 'SCHEME_EXPIRED', `Bonus scheme "${scheme.name}" ended on ${fmtUk(scheme.end_date)}`);

    // The bonus is paid in the scheme's currency, so it only reacts to activity in that currency (D1)
    if (ctx.currency && scheme.currency && cur(ctx.currency) !== cur(scheme.currency)) {
        throw new Reject(400, 'CURRENCY_MISMATCH', `Bonus scheme "${scheme.name}" applies to ${cur(scheme.currency)}, not ${cur(ctx.currency)}.`);
    }

    const threshold = Number(scheme.min_transaction_threshold || 0);
    if (THRESHOLD_TYPES.includes(scheme.bonus_type) && threshold > 0 && ctx.amount !== null && ctx.amount !== undefined && Number(ctx.amount) < threshold) {
        throw new Reject(400, 'BELOW_THRESHOLD', `Amount ${ctx.amount} is below the ${threshold} minimum for "${scheme.name}".`);
    }

    if (scheme.bonus_type === 'LOYALTY_CREDIT') {
        const need = Number(scheme.min_transactions || 0);
        if (need > 0) {
            const stats = await customerStats(q, ctx.userId, { currency: ctx.event ? scheme.currency : null, periodDays: Number(scheme.time_period_days) || null });
            if (stats.count < need) {
                throw new Reject(403, 'LOYALTY_NOT_MET', `Customer has ${stats.count} of the ${need} transactions needed${scheme.time_period_days ? ` in ${scheme.time_period_days} days` : ''} for "${scheme.name}".`);
            }
        }
    }

    const rules = parseCriteria(scheme.eligibility_rules);
    const segs = Array.isArray(rules.segments) ? rules.segments.filter((s) => s !== '' && s !== null).map(String) : [];
    // A loyalty scheme is always for existing customers, whatever the stored rule says (D2)
    if (scheme.bonus_type === 'LOYALTY_CREDIT' && !segs.includes('existing_customers')) segs.push('existing_customers');
    if (segs.length && !segs.includes('all')) {
        let ok = false;
        for (const s of segs) { if (await segmentMatches(q, s, ctx.userId, ctx)) { ok = true; break; } }
        if (!ok) throw new Reject(403, 'USER_INELIGIBLE', 'Customer does not meet the requirements for this bonus segment.');
    }

    if (rules.oneTimeOnly !== false) {
        const existing = await q.get(`SELECT id, created_at FROM credit_ledger WHERE user_id = ? AND scheme_id = ? AND type = 'EARNED' AND COALESCE(reason_code, '') <> 'BONUS_RETURNED' ORDER BY created_at LIMIT 1`, [ctx.userId, scheme.id]);
        if (existing) throw new Reject(409, 'ALREADY_EARNED', `Customer already earned "${scheme.name}" on ${fmtUk(existing.created_at)}. This is a one-time bonus.`);
    }
    return rules;
}

// ---------- amount (BS-20 – BS-24) ----------
function computeAmount(scheme, baseAmount) {
    const currency = scheme.currency || 'GBP';
    const tiers = typeof scheme.tiers === 'string' ? parseCriteria(scheme.tiers) : (scheme.tiers || []);
    let amount;
    if (scheme.is_tiered) {
        if (baseAmount === null || baseAmount === undefined) throw new Reject(400, 'TXN_REQUIRED', 'Transaction ID is required for tiered commissions', { plain: true });
        const list = Array.isArray(tiers) ? tiers : [];
        const tier = list.find((x) => baseAmount >= parseFloat(x.min) && baseAmount <= (x.max === '' || x.max === null || x.max === undefined ? Infinity : parseFloat(x.max)));
        if (!tier) throw new Reject(400, 'TIER_MISMATCH', `Transaction amount ${baseAmount} does not match any commission tiers.`);
        amount = scheme.commission_type === 'PERCENTAGE' ? (baseAmount * parseFloat(tier.value)) / 100 : parseFloat(tier.value);
    } else if (scheme.commission_type === 'PERCENTAGE') {
        if (baseAmount === null || baseAmount === undefined) throw new Reject(400, 'TXN_REQUIRED', 'Transaction ID required for percentage commission', { plain: true });
        amount = (baseAmount * scheme.commission_percentage) / 100;
    } else {
        amount = Number(scheme.credit_amount);
    }
    const cap = Number(scheme.max_award);
    if (cap > 0) amount = Math.min(amount, cap);
    return roundFor(amount, currency);
}

// ---------- awarding (BS-30 – BS-33) ----------
// input: { scheme_id | scheme, user_id, transaction_id?, amount?, currency?, admin_user?, idempotency_key?, event_id?, event? }
async function awardScheme(q, input) {
    const { user_id, scheme_id, transaction_id, admin_user, idempotency_key, event_id } = input;
    if (!user_id || !(scheme_id || input.scheme)) throw new Reject(400, 'VALIDATION', 'user_id and scheme_id are required', { plain: true });

    if (idempotency_key) {
        const existing = await q.get('SELECT * FROM credit_ledger WHERE reference_id = ?', [`idem_${idempotency_key}`]);
        if (existing) return { success: true, id: existing.id, amount: existing.amount, idempotent: true, message: 'Bonus already awarded (Idempotent)' };
    }
    const scheme = input.scheme || await q.get('SELECT * FROM bonus_schemes WHERE id = ?', [scheme_id]);
    if (!scheme) throw new Reject(404, 'NOT_FOUND', 'Bonus scheme not found', { plain: true });

    // The amount the bonus is measured on: reported by Rhemito, or looked up from a legacy transaction id (BS-25)
    let baseAmount = input.amount !== undefined && input.amount !== null && input.amount !== '' ? Number(input.amount) : null;
    const currency = input.currency || null;
    if (baseAmount === null && transaction_id && (scheme.is_tiered || scheme.commission_type === 'PERCENTAGE' || Number(scheme.min_transaction_threshold) > 0)) {
        const txn = await q.get('SELECT amount_debit_ngn FROM transactions WHERE id = ?', [transaction_id]).catch(() => null);
        if (txn) baseAmount = txn.amount_debit_ngn;
        else if (scheme.is_tiered) throw new Reject(404, 'TXN_NOT_FOUND', 'Transaction not found for tiered calculation', { plain: true });
        else if (scheme.commission_type === 'PERCENTAGE') throw new Reject(404, 'TXN_NOT_FOUND', 'Transaction not found', { plain: true });
    }
    const ctx = { userId: user_id, amount: baseAmount, currency, transferId: event_id || transaction_id || null, event: !!input.event };
    const rules = await checkEligibility(q, scheme, ctx);
    const amount = computeAmount(scheme, baseAmount);
    if (!(amount > 0)) throw new Reject(400, 'ZERO_AMOUNT', `The bonus from "${scheme.name}" works out at 0 for this activity, so nothing was awarded.`);

    const refId = event_id ? `evt:${scheme.id}:${event_id}` : idempotency_key ? `idem_${idempotency_key}` : (transaction_id || null);
    let out;
    try {
        out = await wallet.issueCredit(q, {
            customerId: user_id, amount, currency: scheme.currency || 'GBP', validityDays: Number(rules.validityDays) > 0 ? Number(rules.validityDays) : wallet.DEFAULT_VALIDITY_DAYS,
            creditSource: 'SCHEME', creditSourceDetail: scheme.bonus_type, reason: 'SCHEME_BONUS', schemeId: scheme.id,
            referenceId: refId || `bonus_${wallet.newId('b')}`, notes: scheme.name, actor: admin_user || 'System',
            transferId: input.event && input.eventType === 'TRANSFER_COMPLETED' ? event_id : null,
        });
    } catch (err) {
        if (String(err.message).includes('UNIQUE')) throw new Reject(409, 'DUPLICATE_AWARD', 'Duplicate bonus award (Reference conflict)', { plain: true });
        throw err;
    }
    if (out.duplicate) {
        const row = await q.get('SELECT * FROM credit_ledger WHERE id = ?', [out.creditId]);
        return { success: true, id: out.creditId, amount: row.amount, idempotent: true, message: 'Bonus already awarded (Idempotent)' };
    }
    return { success: true, id: out.creditId, amount, expires_at: out.expires_at, scheme_name: scheme.name, currency: cur(scheme.currency) };
}

// Evaluate every ACTIVE scheme that reacts to this event. Ineligible schemes are reported, not treated as errors.
// ev: { type: 'TRANSFER_COMPLETED' | 'MONEY_REQUEST_PAID', customer_id, event_id, amount, currency }
async function triggerEvent(q, ev) {
    const types = EVENT_SCHEME_TYPES[ev.type];
    if (!types) throw new Reject(400, 'UNKNOWN_EVENT', `Unknown event type "${ev.type}".`);
    if (!ev.customer_id || !ev.event_id) throw new Reject(400, 'VALIDATION', 'customer_id and event_id are required.');
    const schemes = await q.all(`SELECT * FROM bonus_schemes WHERE status = 'ACTIVE' AND bonus_type IN (${types.map(() => '?').join(',')}) ORDER BY id`, types);
    const results = [];
    for (const scheme of schemes) {
        try {
            const dup = await q.get('SELECT id FROM credit_ledger WHERE scheme_id = ? AND reference_id = ?', [scheme.id, `evt:${scheme.id}:${ev.event_id}`]);
            if (dup) { results.push({ scheme_id: scheme.id, scheme_name: scheme.name, status: 'SKIPPED', reason: 'DUPLICATE_EVENT' }); continue; }
            const out = await awardScheme(q, {
                scheme, user_id: ev.customer_id, amount: ev.amount, currency: ev.currency, event_id: ev.event_id, event: true, eventType: ev.type, admin_user: 'System',
            });
            results.push({ scheme_id: scheme.id, scheme_name: scheme.name, status: 'AWARDED', id: out.id, amount: out.amount, currency: out.currency, expires_at: out.expires_at });
        } catch (err) {
            if (!(err instanceof Reject)) throw err;
            results.push({ scheme_id: scheme.id, scheme_name: scheme.name, status: 'SKIPPED', reason: err.code, message: err.message });
        }
    }
    return results;
}

// ---------- reversal (BS-45) ----------
// A transfer / request that earned scheme bonuses was cancelled, failed or refunded: void what is still unused; the
// spent part becomes clawback debt (when enabled). FAILED is not the customer's doing, so it is not a strike.
async function reverseEvent(q, eventId, outcome = 'REFUNDED') {
    const credits = await q.all(`SELECT * FROM credit_ledger WHERE type = 'EARNED' AND amount > 0 AND reference_id LIKE ?`, [`evt:%:${eventId}`]);
    const out = [];
    const perCustomer = {};
    for (const c of credits) {
        const done = await q.get(`SELECT id FROM credit_ledger WHERE source_credit_id = ? AND reason_code = 'SCHEME_REVERSAL'`, [c.id]);
        let voided = 0;
        if (!done) {
            const remaining = await wallet.creditRemaining(q, c);
            if (remaining > 0) {
                await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, scheme_id, reference_id, reason_code, notes, admin_user, currency, source_credit_id, transfer_id, created_at)
                    VALUES (?, ?, ?, 'VOIDED', ?, ?, 'SCHEME_REVERSAL', ?, 'System', ?, ?, ?, ?)`,
                [wallet.newId('crd'), c.user_id, -remaining, c.scheme_id, `rev:${eventId}`, `Bonus removed – ${eventId} was cancelled or refunded`, c.currency, c.id, eventId, nowIso()]);
                voided = remaining;
            }
        }
        const clawed = await debt.clawback(q, c, { eventId, notes: `Bonus already spent – ${eventId} was cancelled or refunded` });
        if (voided > 0 || clawed > 0) {
            const entry = { credit_id: c.id, scheme_id: c.scheme_id, voided, clawed_back: clawed };
            if (String(outcome).toUpperCase() !== 'FAILED') {
                const strike = await blocks.recordStrike(q, { customerId: c.user_id, eventId, kind: 'SCHEME', outcome: String(outcome).toUpperCase(), amountLost: roundFor(voided + clawed, c.currency), currency: c.currency });
                entry.strikes = strike.strikes; entry.blocked = strike.blocked;
            }
            out.push(entry);
            const p = (perCustomer[c.user_id] = perCustomer[c.user_id] || { voided: 0, clawed_back: 0, currency: c.currency });
            p.voided += voided; p.clawed_back += clawed;
        }
    }
    for (const [customerId, p] of Object.entries(perCustomer)) {
        await feed.emit(q, customerId, 'BONUS_REVERSED', { event_id: eventId, voided: roundFor(p.voided, p.currency), clawed_back: roundFor(p.clawed_back, p.currency), currency: p.currency }, `bv:${customerId}:${eventId}`);
    }
    return out;
}

// ---------- customer activity (API-S1, API-S6) ----------
async function upsertTransfer(q, ev) {
    const status = String(ev.status || '').toUpperCase();
    const prev = await q.get('SELECT * FROM bonus_transfers WHERE transfer_id = ?', [ev.transfer_id]);
    const createdAt = (prev && prev.created_at) || ev.created_at || nowIso();
    await q.run(`INSERT INTO bonus_transfers (transfer_id, customer_id, amount, currency, receive_currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(transfer_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at,
            amount = COALESCE(bonus_transfers.amount, excluded.amount), currency = COALESCE(NULLIF(bonus_transfers.currency, ''), excluded.currency),
            receive_currency = COALESCE(bonus_transfers.receive_currency, excluded.receive_currency)`,
    [ev.transfer_id, ev.customer_id, Number(ev.amount || (prev && prev.amount) || 0), String(ev.currency || (prev && prev.currency) || '').toUpperCase(),
        String(ev.receive_currency || (prev && prev.receive_currency) || '').toUpperCase() || null, status, createdAt, nowIso()]);
    return q.get('SELECT * FROM bonus_transfers WHERE transfer_id = ?', [ev.transfer_id]);
}

async function upsertCustomer(q, c) {
    if (!c || !c.id) throw new Reject(400, 'VALIDATION', 'id is required.');
    await q.run(`INSERT INTO bonus_customers (id, created_at, country, send_currency, account_status, first_name, last_name, email, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET country = COALESCE(excluded.country, country), send_currency = COALESCE(excluded.send_currency, send_currency),
            account_status = COALESCE(excluded.account_status, account_status), first_name = COALESCE(excluded.first_name, first_name),
            last_name = COALESCE(excluded.last_name, last_name), email = COALESCE(excluded.email, email),
            created_at = COALESCE(created_at, excluded.created_at), updated_at = excluded.updated_at`,
    [c.id, c.created_at || nowIso(), c.country || null, c.send_currency ? cur(c.send_currency) : null, c.account_status || null,
        c.first_name || null, c.last_name || null, c.email || null, nowIso()]);
}

// A transfer changed status (BS-41). Never throws for evaluation problems (BS-43).
async function handleTransferEvent(q, ev) {
    const status = String((ev && ev.status) || '').toUpperCase();
    if (!ev || !ev.transfer_id || !ev.customer_id || !status) throw new Reject(400, 'VALIDATION', 'transfer_id, customer_id and status are required.');
    await upsertTransfer(q, ev);
    const result = { awards: [], returned: 0, reversed: [] };
    if (status === 'COMPLETED') {
        result.awards = await triggerEvent(q, { type: 'TRANSFER_COMPLETED', customer_id: ev.customer_id, event_id: ev.transfer_id, amount: Number(ev.amount), currency: ev.currency });
    } else if (FAIL_STATUSES.includes(status)) {
        result.returned = await wallet.releaseBonus(q, ev.customer_id, ev.transfer_id);
        result.reversed = await reverseEvent(q, ev.transfer_id, status);
    }
    return result;
}

module.exports = {
    EVENT_SCHEME_TYPES, THRESHOLD_TYPES, FAIL_STATUSES, Reject, ensureSchema,
    checkEligibility, computeAmount, awardScheme, triggerEvent, reverseEvent, customerStats, segmentMatches,
    upsertTransfer, upsertCustomer, handleTransferEvent,
};
