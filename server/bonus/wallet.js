// The customer's one bonus wallet (spec §3.9 – §3.11, decision D13).
//
// Every credit, whatever its source (bonus scheme, referral, manual), is one balance per currency, spent soonest
// expiry first (D9). Each EARNED row records how it was earned (credit_source + credit_source_detail); negative rows
// (APPLIED, EXPIRED, VOIDED) point at the credit they came from (source_credit_id), so used / expired / removed
// amounts are known per source.
//
// Functions here take `q` first and do not lock: callers (index.js, routes) wrap changes in db.write().
const crypto = require('crypto');
const { round2, roundFor, formatMoney, cur } = require('./money');
const { ukToday, nowIso, addDays, fmtUk } = require('./time');
const { Reject } = require('./errors');
const debt = require('./debt');
const feed = require('./feed');
const { MANUAL_REASONS } = require('./schema');

const newId = (p) => `${p}_${crypto.randomBytes(8).toString('hex')}`;
const DEFAULT_VALIDITY_DAYS = 90;
const RETURN_GRACE_DAYS = 14;
const REVERSAL_REASONS = ['REFERRAL_REVERSAL', 'SCHEME_REVERSAL'];

// ---------- sources and labels (BS-80, BS-83) ----------
const SOURCES = ['REFERRAL', 'SCHEME', 'MANUAL'];
const GROUP_LABELS = { REFERRAL: 'Referrals', SCHEME: 'Bonus offers', MANUAL: 'From Rhemito' };
const DETAIL_LABELS = {
    REFERRER: 'Referrer', REFEREE: 'Referee', LOYALTY_CREDIT: 'Loyalty', TRANSACTION_THRESHOLD_CREDIT: 'Large transfer',
    REQUEST_MONEY: 'Request money', REFERRAL_CREDIT: 'Legacy referral', GOODWILL: 'Goodwill', LOYALTY: 'Loyalty',
    CORRECTION: 'Correction', MANUAL_ADJUSTMENT: 'Manual adjustment',
};
const SCHEME_PREFIX = { LOYALTY_CREDIT: 'Loyalty bonus', TRANSACTION_THRESHOLD_CREDIT: 'Transfer bonus', REQUEST_MONEY: 'Request money bonus' };

const between = (notes, re) => { const m = re.exec(String(notes || '')); return m ? m[1].trim() : null; };

// What the customer sees for a credit, e.g. "Loyalty bonus – Summer Saver", "Welcome bonus – invited by Olayinka A."
function sourceLabel(row) {
    const source = row.credit_source;
    const detail = row.credit_source_detail;
    if (source === 'REFERRAL') {
        if (detail === 'REFERRER') {
            const friend = between(row.notes, /referred (.+?)(?: \(approved by|$)/);
            return friend ? `Referral bonus – ${friend}` : 'Referral bonus';
        }
        const by = between(row.notes, /invited by (.+?)(?: \(approved by|$)/);
        return by ? `Welcome bonus – invited by ${by}` : 'Welcome bonus';
    }
    if (source === 'SCHEME') {
        const name = row.scheme_name || row.notes;
        const prefix = SCHEME_PREFIX[detail] || 'Bonus';
        return name ? `${prefix} – ${name}` : prefix;
    }
    if (source === 'MANUAL') return 'Goodwill credit from Rhemito';
    return null;
}

// Admin label: "Referrals · Referrer"
const adminSourceLabel = (source, detail) => (source ? `${GROUP_LABELS[source] || source}${detail ? ` · ${DETAIL_LABELS[detail] || detail}` : ''}` : null);

// ---------- reading credits ----------
// Every EARNED credit with what is left of it and its status (BS-60, BS-64). Two queries, however many credits.
async function creditsWithRemaining(q, userId, currency, { today = ukToday() } = {}) {
    const params = [userId];
    if (currency) params.push(cur(currency));
    const credits = await q.all(`SELECT cl.*, bs.name AS scheme_name FROM credit_ledger cl LEFT JOIN bonus_schemes bs ON bs.id = cl.scheme_id
        WHERE cl.user_id = ? AND cl.type = 'EARNED' AND cl.amount > 0 ${currency ? 'AND cl.currency = ?' : ''}
        ORDER BY COALESCE(cl.expires_at, '9999-12-31'), cl.created_at, cl.rowid`, params);
    if (!credits.length) return [];
    const children = await q.all(`SELECT source_credit_id AS id, COALESCE(SUM(amount), 0) AS s,
            MAX(CASE WHEN type = 'EXPIRED' THEN 1 ELSE 0 END) AS expired,
            MAX(CASE WHEN type = 'VOIDED' AND reason_code IN ('REFERRAL_REVERSAL', 'SCHEME_REVERSAL') THEN 1 ELSE 0 END) AS reversed
        FROM credit_ledger WHERE user_id = ? AND source_credit_id IS NOT NULL ${currency ? 'AND currency = ?' : ''} GROUP BY source_credit_id`, params);
    const byId = new Map(children.map((c) => [c.id, c]));
    for (const c of credits) {
        const k = byId.get(c.id) || { s: 0, expired: 0, reversed: 0 };
        c.remaining = round2(Number(c.amount) + Number(k.s));
        if (k.reversed) c.status = 'REVERSED';
        else if (k.expired) c.status = 'EXPIRED';
        else if (c.remaining <= 0) c.status = 'USED';
        else if (c.remaining < c.amount) c.status = 'PARTLY_USED';
        else c.status = 'UNUSED';
        c.usable = c.remaining > 0 && !['EXPIRED', 'REVERSED'].includes(c.status) && (!c.expires_at || c.expires_at >= today);
        c.source_label = sourceLabel(c);
    }
    return credits;
}

async function creditRemaining(q, credit) {
    const row = await q.get('SELECT COALESCE(SUM(amount), 0) AS s FROM credit_ledger WHERE source_credit_id = ?', [credit.id]);
    return round2(Number(credit.amount) + Number(row.s));
}

async function available(q, userId, currency) {
    const credits = await creditsWithRemaining(q, userId, currency);
    return round2(credits.filter((c) => c.usable).reduce((s, c) => s + c.remaining, 0));
}

// ---------- writing ----------
// A positive credit. Every EARNED row carries its source (BS-80).
async function insertEarned(q, f) {
    const id = f.id || newId('crd');
    await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, scheme_id, reference_id, reason_code, notes, admin_user, admin_user_id,
            expires_at, created_at, currency, referral_id, referral_rule_id, transfer_id, credit_source, credit_source_detail, returned_from_credit_id)
        VALUES (?, ?, ?, 'EARNED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, f.userId, roundFor(f.amount, f.currency), f.schemeId || null, f.referenceId, f.reason, f.notes || null, f.adminUser || 'System', f.adminUserId || null,
        f.expiresAt, nowIso(), cur(f.currency), f.referralId || null, f.ruleId || null, f.transferId || null,
        f.creditSource, f.creditSourceDetail || null, f.returnedFrom || null]);
    return id;
}

// A negative row taken from one credit (keeps the credit's links so reports per source and per referral stay right)
async function debit(q, credit, amount, type, { reason, referenceId, notes, transferId, adminUser }) {
    const id = newId('cl');
    await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, reference_id, reason_code, notes, admin_user, created_at, currency,
            referral_id, referral_rule_id, source_credit_id, transfer_id, scheme_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, credit.user_id, -roundFor(amount, credit.currency), type, referenceId, reason, notes, adminUser || 'System', nowIso(), credit.currency,
        credit.referral_id || null, credit.referral_rule_id || null, credit.id, transferId || null, credit.scheme_id || null]);
    return id;
}

const bySource = (parts) => {
    const out = {};
    for (const p of parts) out[p.credit_source || 'MANUAL'] = round2((out[p.credit_source || 'MANUAL'] || 0) + p.amount);
    return Object.entries(out).map(([credit_source, amount]) => ({ credit_source, amount }));
};

// Public: issue a credit from any source (spec §1.3). Idempotent on referenceId. Settles clawback debt (BS-31).
async function issueCredit(q, input) {
    const currency = cur(input.currency);
    const amount = roundFor(input.amount, currency);
    if (!input.customerId) throw new Reject(400, 'VALIDATION', 'customerId is required.');
    if (!(amount > 0)) throw new Reject(400, 'VALIDATION', 'Enter an amount greater than 0.');
    if (!SOURCES.includes(input.creditSource)) throw new Reject(400, 'VALIDATION', `creditSource must be one of ${SOURCES.join(', ')}.`);
    if (input.referenceId) {
        const existing = await q.get(`SELECT id FROM credit_ledger WHERE user_id = ? AND reference_id = ? AND type = 'EARNED'`, [input.customerId, input.referenceId]);
        if (existing) return { creditId: existing.id, duplicate: true };
    }
    const validity = Number(input.validityDays) > 0 ? Number(input.validityDays) : DEFAULT_VALIDITY_DAYS;
    const expiresAt = input.expiresOn || addDays(ukToday(), validity);
    const reason = input.reason || (input.creditSource === 'REFERRAL' ? 'REFERRAL_REWARD' : input.creditSource === 'SCHEME' ? 'SCHEME_BONUS' : input.creditSourceDetail);
    const creditId = await insertEarned(q, {
        userId: input.customerId, amount, currency, schemeId: input.schemeId, referenceId: input.referenceId || `crd_${crypto.randomBytes(6).toString('hex')}`,
        reason, notes: input.notes, adminUser: input.actor || 'System', expiresAt, referralId: input.referralId, ruleId: input.ruleId,
        transferId: input.transferId, creditSource: input.creditSource, creditSourceDetail: input.creditSourceDetail,
    });
    await debt.settle(q, input.customerId, currency);
    // Referral rewards are announced by the referral module's own feed, so the customer is told once (spec §8)
    if (input.creditSource !== 'REFERRAL') {
        const row = await q.get('SELECT cl.*, bs.name AS scheme_name FROM credit_ledger cl LEFT JOIN bonus_schemes bs ON bs.id = cl.scheme_id WHERE cl.id = ?', [creditId]);
        await feed.emit(q, input.customerId, 'BONUS_EARNED', {
            credit_id: creditId, credit_source: input.creditSource, credit_source_detail: input.creditSourceDetail || null,
            source_label: sourceLabel(row), credit_source_label: sourceLabel(row), scheme_name: row.scheme_name || null,
            amount, currency, expires_on: expiresAt,
        }, `be:${creditId}`);
    }
    return { creditId, amount, currency, expires_at: expiresAt };
}

// Public: void what is left of one credit (spec §1.3). With clawback, the spent part becomes debt.
async function voidCredit(q, creditId, { reason = 'SCHEME_REVERSAL', notes, eventId, clawback = false } = {}) {
    const credit = await q.get(`SELECT * FROM credit_ledger WHERE id = ? AND type = 'EARNED'`, [creditId]);
    if (!credit) throw new Reject(404, 'NOT_FOUND', 'Credit not found.');
    const done = await q.get(`SELECT id FROM credit_ledger WHERE source_credit_id = ? AND type = 'VOIDED' AND reason_code = ?`, [creditId, reason]);
    let voided = 0;
    if (!done) {
        const remaining = await creditRemaining(q, credit);
        if (remaining > 0) {
            await debit(q, credit, remaining, 'VOIDED', { reason, referenceId: eventId || `void:${creditId}`, notes: notes || 'Bonus removed', transferId: eventId });
            voided = remaining;
        }
    }
    const spentRow = await q.get(`SELECT COALESCE(-SUM(amount), 0) AS s FROM credit_ledger WHERE source_credit_id = ? AND type = 'APPLIED'`, [creditId]);
    const spent = round2(spentRow.s);
    let clawedBack = 0;
    if (clawback) clawedBack = await debt.clawback(q, credit, { eventId, notes });
    return { voided: round2(voided), spent, clawed_back: clawedBack };
}

// Public: totals for reports (spec §1.3) — per currency { issued, used, returned, expired, voided }
async function creditSummary(q, { referralIds, schemeIds } = {}) {
    const cond = []; const params = [];
    if (referralIds && referralIds.length) { cond.push(`c.referral_id IN (${referralIds.map(() => '?').join(',')})`); params.push(...referralIds); }
    if (schemeIds && schemeIds.length) { cond.push(`c.scheme_id IN (${schemeIds.map(() => '?').join(',')})`); params.push(...schemeIds.map(Number)); }
    const where = cond.length ? `AND (${cond.join(' OR ')})` : '';
    const rows = await q.all(`SELECT c.currency AS currency,
            SUM(CASE WHEN c.type = 'EARNED' AND COALESCE(c.reason_code, '') <> 'BONUS_RETURNED' THEN c.amount ELSE 0 END) AS issued,
            SUM(CASE WHEN c.type = 'APPLIED' THEN -c.amount ELSE 0 END) AS used,
            SUM(CASE WHEN c.reason_code = 'BONUS_RETURNED' THEN c.amount ELSE 0 END) AS returned,
            SUM(CASE WHEN c.type = 'EXPIRED' THEN -c.amount ELSE 0 END) AS expired,
            SUM(CASE WHEN c.type = 'VOIDED' THEN -c.amount ELSE 0 END) AS voided
        FROM credit_ledger c WHERE c.type IN ('EARNED', 'APPLIED', 'EXPIRED', 'VOIDED') ${where} GROUP BY c.currency`, params);
    const out = {};
    for (const r of rows) out[r.currency || 'GBP'] = { issued: round2(r.issued), used: round2(r.used), returned: round2(r.returned), expired: round2(r.expired), voided: round2(r.voided) };
    return out;
}

// ---------- spending (BS-62) ----------
async function applyBonus(q, customerId, { amount, currency, transfer_id, send_amount } = {}) {
    currency = cur(currency);
    amount = roundFor(amount, currency);
    if (!transfer_id || !(amount > 0)) throw Object.assign(new Error('transfer_id and a positive amount are required'), { status: 400 });
    const already = await q.get(`SELECT id FROM credit_ledger WHERE user_id = ? AND transfer_id = ? AND type = 'APPLIED'`, [customerId, transfer_id]);
    if (already) throw Object.assign(new Error('Bonus has already been applied to this transfer.'), { status: 409, code: 'ALREADY_APPLIED' });
    // No minimum send amount to use bonus (D9); it can never exceed the send amount
    if (send_amount !== undefined && send_amount !== null && amount > Number(send_amount)) throw Object.assign(new Error('Bonus cannot be more than the send amount.'), { status: 400 });
    const credits = (await creditsWithRemaining(q, customerId, currency)).filter((c) => c.usable);
    const avail = round2(credits.reduce((s, c) => s + c.remaining, 0));
    if (avail < amount) throw Object.assign(new Error('Your bonus balance has changed. Please review your transfer.'), { status: 409, code: 'BALANCE_CHANGED', available: avail });
    let left = amount;
    const parts = [];
    for (const c of credits) { // soonest expiry first, then oldest (D9), whatever the source (D13)
        if (left <= 0) break;
        const take = round2(Math.min(left, c.remaining));
        await debit(q, c, take, 'APPLIED', { reason: 'BONUS_REDEMPTION', referenceId: transfer_id, notes: `Used on transfer ${transfer_id}`, transferId: transfer_id });
        parts.push({ credit_source: c.credit_source, amount: take });
        left = round2(left - take);
    }
    await feed.emit(q, customerId, 'BONUS_USED', { amount, currency, transfer_id, by_source: bySource(parts) }, `bu:${customerId}:${transfer_id}`);
    return { applied: amount, available: round2(avail - amount) };
}

// Bonus used on a transfer that was cancelled, failed or refunded comes back (D10, BS-63, BS-81). Idempotent.
async function releaseBonus(q, customerId, transferId) {
    if (!transferId) return 0;
    const applied = await q.all(`SELECT * FROM credit_ledger WHERE user_id = ? AND transfer_id = ? AND type = 'APPLIED' AND amount < 0 ORDER BY rowid`, [customerId, transferId]);
    const returned = await q.get(`SELECT id FROM credit_ledger WHERE user_id = ? AND reference_id = ? AND reason_code = 'BONUS_RETURNED'`, [customerId, `return:${transferId}`]);
    if (!applied.length || returned) return 0;
    const today = ukToday();
    let total = 0; let currency = null; let latestExpiry = null;
    const parts = [];
    for (const a of applied) {
        const source = await q.get('SELECT * FROM credit_ledger WHERE id = ?', [a.source_credit_id]);
        const expiresOn = source && source.expires_at && source.expires_at >= today ? source.expires_at : addDays(today, RETURN_GRACE_DAYS);
        await insertEarned(q, {
            userId: customerId, amount: -a.amount, currency: a.currency, schemeId: source ? source.scheme_id : null, referenceId: `return:${transferId}`,
            reason: 'BONUS_RETURNED', notes: `Bonus returned – transfer ${transferId} cancelled or refunded`, expiresAt: expiresOn,
            referralId: a.referral_id, ruleId: a.referral_rule_id, transferId,
            creditSource: (source && source.credit_source) || 'MANUAL', creditSourceDetail: (source && source.credit_source_detail) || 'CORRECTION',
            returnedFrom: a.source_credit_id,
        });
        parts.push({ credit_source: (source && source.credit_source) || 'MANUAL', amount: -a.amount });
        total = round2(total - a.amount); currency = a.currency;
        if (!latestExpiry || expiresOn > latestExpiry) latestExpiry = expiresOn;
    }
    await debt.settle(q, customerId, currency || 'GBP');
    await feed.emit(q, customerId, 'BONUS_RETURNED', { amount: total, currency, transfer_id: transferId, expires_on: latestExpiry, by_source: bySource(parts) }, `br:${customerId}:${transferId}`);
    return total;
}

// ---------- manual adjustments (BS-70 – BS-73) ----------
async function manualAdjust(q, body, actorName) {
    const { user_id, type, reason_code, scheme_id, idempotency_key } = body;
    const notes = String(body.notes || '').trim();
    if (!user_id || !body.amount || !type) throw new Reject(400, 'VALIDATION', 'Missing required fields: user_id, amount, type', { plain: true });
    if (!reason_code) throw new Reject(400, 'VALIDATION', 'Reason code is required (GOODWILL, CORRECTION, MANUAL_ADJUSTMENT)', { plain: true });
    if (!notes) throw new Reject(400, 'VALIDATION', 'Notes must be provided for manual adjustments', { plain: true });
    if (notes.length < 10 || notes.length > 500) throw new Reject(400, 'VALIDATION', 'Enter notes of 10–500 characters.', { plain: true, fields: { notes: 'Enter notes of 10–500 characters.' } });
    const kind = String(type).toUpperCase();
    if (!['EARNED', 'VOIDED'].includes(kind)) throw new Reject(400, 'VALIDATION', 'Type must be EARNED (grant) or VOIDED (remove).', { plain: true });
    const reason = String(reason_code).toUpperCase();
    if (!MANUAL_REASONS.includes(reason)) throw new Reject(400, 'VALIDATION', 'Reason code is required (GOODWILL, CORRECTION, MANUAL_ADJUSTMENT)', { plain: true });
    const currency = cur(body.currency);
    const amount = roundFor(Math.abs(Number(body.amount)), currency); // older screens sent removals as negative numbers
    if (!(amount > 0)) throw new Reject(400, 'VALIDATION', 'Enter an amount greater than 0.', { plain: true, fields: { amount: 'Enter an amount greater than 0.' } });

    const referenceId = idempotency_key ? `idem_${idempotency_key}` : null;
    if (referenceId) {
        const existing = await q.get('SELECT * FROM credit_ledger WHERE reference_id = ? ORDER BY rowid LIMIT 1', [referenceId]);
        if (existing) {
            const impact = await q.get('SELECT COALESCE(SUM(amount), 0) AS s FROM credit_ledger WHERE reference_id = ?', [referenceId]);
            return { success: true, id: existing.id, new_balance_impact: round2(impact.s), idempotent: true, message: 'Request already processed' };
        }
    }

    if (kind === 'EARNED') {
        const validity = Number(body.validity_days) > 0 ? Math.floor(Number(body.validity_days)) : DEFAULT_VALIDITY_DAYS;
        const out = await issueCredit(q, {
            customerId: user_id, amount, currency, validityDays: validity, creditSource: 'MANUAL', creditSourceDetail: reason, reason,
            schemeId: scheme_id || null, referenceId: referenceId || `manual_${newId('m')}`, notes, actor: actorName,
        });
        return { success: true, id: out.creditId, new_balance_impact: amount, currency, expires_at: out.expires_at, message: `Credit of ${formatMoney(amount, currency)} granted to ${user_id}.` };
    }

    // Remove: voided from credits in spending order, each row linked to its credit so balances stay right (BS-71)
    const credits = (await creditsWithRemaining(q, user_id, currency)).filter((c) => c.usable);
    const avail = round2(credits.reduce((s, c) => s + c.remaining, 0));
    if (amount > avail) {
        const msg = `You can remove at most ${formatMoney(avail, currency)}.`;
        throw new Reject(400, 'VALIDATION', msg, { plain: true, fields: { amount: msg }, extra: { available: avail } });
    }
    let left = amount; let firstId = null;
    const ref = referenceId || `manual_${newId('m')}`;
    for (const c of credits) {
        if (left <= 0) break;
        const take = round2(Math.min(left, c.remaining));
        const id = await debit(q, c, take, 'VOIDED', { reason, referenceId: ref, notes, adminUser: actorName });
        if (scheme_id) await q.run('UPDATE credit_ledger SET scheme_id = COALESCE(scheme_id, ?) WHERE id = ?', [scheme_id, id]);
        firstId = firstId || id;
        left = round2(left - take);
    }
    return { success: true, id: firstId, new_balance_impact: -amount, currency, message: `${formatMoney(amount, currency)} removed from ${user_id}.` };
}

// ---------- expiry (BS-65) ----------
// Expire what is left of every credit past its date. Skips credits that already have an EXPIRED row, so a run of the
// old referral job during deployment does no harm.
async function expireDue(q, { today = ukToday() } = {}) {
    const due = await q.all(`SELECT * FROM credit_ledger WHERE type = 'EARNED' AND amount > 0 AND expires_at IS NOT NULL AND expires_at < ?`, [today]);
    let count = 0;
    for (const c of due) {
        const hasExpiry = await q.get(`SELECT id FROM credit_ledger WHERE source_credit_id = ? AND type = 'EXPIRED'`, [c.id]);
        if (hasExpiry) continue;
        const reversed = await q.get(`SELECT id FROM credit_ledger WHERE source_credit_id = ? AND type = 'VOIDED' AND reason_code IN ('REFERRAL_REVERSAL', 'SCHEME_REVERSAL')`, [c.id]);
        if (reversed) continue;
        const remaining = await creditRemaining(q, c);
        if (remaining <= 0) continue;
        await debit(q, c, remaining, 'EXPIRED', { reason: 'EXPIRY', referenceId: `exp:${c.id}`, notes: `Unused bonus credit expired on ${fmtUk(c.expires_at)}` });
        await feed.emit(q, c.user_id, 'BONUS_EXPIRED', {
            credit_id: c.id, amount: remaining, currency: c.currency, expired_on: c.expires_at,
            by_source: [{ credit_source: c.credit_source || 'MANUAL', amount: remaining }],
        }, `bx:${c.id}`);
        count++;
    }
    return count;
}

// Credits expiring in exactly 7 days get one reminder each
async function expiringReminders(q, { today = ukToday() } = {}) {
    const target = addDays(today, 7);
    const due = await q.all(`SELECT * FROM credit_ledger WHERE type = 'EARNED' AND amount > 0 AND expires_at = ?`, [target]);
    let count = 0;
    for (const c of due) {
        const remaining = await creditRemaining(q, c);
        if (remaining <= 0) continue;
        const sent = await feed.emit(q, c.user_id, 'BONUS_EXPIRING', {
            credit_id: c.id, remaining, currency: c.currency, expires_on: c.expires_at,
            by_source: [{ credit_source: c.credit_source || 'MANUAL', amount: remaining }],
        }, `bx7:${c.id}`);
        if (sent) count++;
    }
    return count;
}

// ---------- the wallet view for Rhemito (API-S3) ----------
const emptyGroup = () => ({ earned: 0, used: 0, expired: 0, removed: 0, available: 0 });

async function walletView(q, id, { currency, creditSource, promoRedemptions, blocked } = {}) {
    const currencyFilter = currency ? cur(currency) : null;
    const sourceFilter = creditSource && SOURCES.includes(String(creditSource).toUpperCase()) ? String(creditSource).toUpperCase() : null;
    const credits = await creditsWithRemaining(q, id, currencyFilter);
    const params = currencyFilter ? [id, currencyFilter] : [id];
    // Negative rows take their source from the credit they came from (BS-82)
    const entries = await q.all(`SELECT cl.*, COALESCE(cl.credit_source, src.credit_source) AS eff_source,
            COALESCE(cl.credit_source_detail, src.credit_source_detail) AS eff_detail,
            CASE WHEN cl.type = 'EARNED' THEN cl.notes ELSE src.notes END AS label_notes,
            COALESCE(bs.name, sbs.name) AS scheme_name
        FROM credit_ledger cl
        LEFT JOIN credit_ledger src ON src.id = cl.source_credit_id
        LEFT JOIN bonus_schemes bs ON bs.id = cl.scheme_id
        LEFT JOIN bonus_schemes sbs ON sbs.id = src.scheme_id
        WHERE cl.user_id = ? ${currencyFilter ? 'AND cl.currency = ?' : ''} ORDER BY cl.created_at DESC, cl.rowid DESC`, params);

    const byCurrency = {};
    const bucket = (c) => (byCurrency[c] = byCurrency[c] || { currency: c, available: 0, earned: 0, used: 0, expired: 0, used_transfers: new Set(), referral_credits: 0, other_credits: 0, groups: {} });
    const group = (b, s) => (b.groups[s || 'MANUAL'] = b.groups[s || 'MANUAL'] || emptyGroup());
    for (const e of entries) {
        const b = bucket(e.currency || 'GBP');
        const g = () => group(b, e.eff_source); // clawback rows are not a source (BS-85)
        if (e.type === 'EARNED' && e.reason_code !== 'BONUS_RETURNED') {
            b.earned += e.amount; g().earned += e.amount;
            if (e.reason_code === 'REFERRAL_REWARD') b.referral_credits++; else b.other_credits++;
        }
        if (e.type === 'APPLIED') { b.used -= e.amount; g().used -= e.amount; if (e.transfer_id || e.reference_id) b.used_transfers.add(e.transfer_id || e.reference_id); }
        if (e.reason_code === 'BONUS_RETURNED') { b.used -= e.amount; g().used -= e.amount; }
        if (e.type === 'EXPIRED') { b.expired -= e.amount; g().expired -= e.amount; }
        if (e.type === 'VOIDED') { b.expired -= e.amount; g().removed -= e.amount; }
    }
    for (const c of credits) {
        if (!c.usable) continue;
        const b = bucket(c.currency || 'GBP');
        b.available += c.remaining; group(b, c.credit_source).available += c.remaining;
    }
    const debts = await q.all(`SELECT currency, -SUM(amount) AS d FROM credit_ledger WHERE user_id = ? AND type IN ('CLAWBACK', 'CLAWBACK_SETTLED') GROUP BY currency`, [id]);
    for (const d of debts) if (d.d > 0 && (!currencyFilter || d.currency === currencyFilter)) bucket(d.currency || 'GBP');
    const debtOf = (c) => round2((debts.find((x) => (x.currency || 'GBP') === c) || { d: 0 }).d);

    const balances = Object.values(byCurrency).map((b) => ({
        outstanding_debt: debtOf(b.currency),
        currency: b.currency, available: round2(b.available), earned: round2(b.earned), used: round2(b.used), expired: round2(b.expired),
        used_transfer_count: b.used_transfers.size, referral_credit_count: b.referral_credits, other_credit_count: b.other_credits,
        by_source: SOURCES.filter((s) => b.groups[s]).map((s) => ({
            credit_source: s, label: GROUP_LABELS[s],
            earned: round2(b.groups[s].earned), used: round2(b.groups[s].used), expired: round2(b.groups[s].expired),
            removed: round2(b.groups[s].removed), available: round2(b.groups[s].available),
        })),
    }));

    const keep = (row) => !sourceFilter || row.credit_source === sourceFilter;
    const srcFields = (row) => ({ credit_source: row.credit_source || null, credit_source_detail: row.credit_source_detail || null, credit_source_label: row.source_label || null, source_label: row.source_label || null });
    const historyRows = entries.map((e) => {
        const view = { credit_source: e.eff_source || null, credit_source_detail: e.eff_detail || null, notes: e.label_notes, scheme_name: e.scheme_name };
        const label = view.credit_source ? sourceLabel(view) : null;
        return {
            id: e.id, created_at: e.created_at, type: e.type, reason_code: e.reason_code, amount: e.amount, currency: e.currency, notes: e.notes,
            transfer_id: e.transfer_id, source_credit_id: e.source_credit_id, expires_on: e.expires_at,
            credit_source: view.credit_source, credit_source_detail: view.credit_source_detail, credit_source_label: label, source_label: label,
        };
    });

    let promos = [];
    if (promoRedemptions) {
        try { promos = (await promoRedemptions(id)).filter((p) => !p.status || p.status === 'Redeemed').map((p) => ({ ...p, code: p.code || p.promo_code_id })); } catch { promos = []; }
    }

    return {
        customer_id: id, balances,
        // Only the fact, never the reason: the customer is told to contact support (D7)
        bonus_blocked: !!blocked,
        unused: credits.filter((c) => c.remaining > 0 && ['UNUSED', 'PARTLY_USED'].includes(c.status)).filter(keep).map((c) => ({
            id: c.id, source: c.notes, reason_code: c.reason_code, amount: c.amount, remaining: c.remaining, currency: c.currency,
            earned_on: c.created_at, expires_on: c.expires_at, status: c.status, ...srcFields(c),
        })),
        credits: credits.filter(keep).map((c) => ({
            id: c.id, amount: c.amount, remaining: c.remaining, currency: c.currency, status: c.status, expires_on: c.expires_at,
            notes: c.notes, reason_code: c.reason_code, created_at: c.created_at, ...srcFields(c),
        })),
        history: historyRows.filter((h) => !sourceFilter || h.credit_source === sourceFilter),
        promo_redemptions: promos.map((p) => ({ id: p.id, code: p.code, amount: -p.discount_amount, currency: p.currency, transfer_id: p.transaction_id, created_at: p.created_at })),
    };
}

// Outstanding bonus per currency and source (admin KPI)
async function outstandingBySource(q, { userId } = {}) {
    const users = userId ? [{ user_id: userId }] : await q.all(`SELECT DISTINCT user_id FROM credit_ledger WHERE type = 'EARNED' AND amount > 0`);
    const out = {};
    for (const u of users) {
        for (const c of await creditsWithRemaining(q, u.user_id)) {
            if (!c.usable) continue;
            const k = c.currency || 'GBP';
            out[k] = out[k] || { total: 0, by_source: {} };
            out[k].total = round2(out[k].total + c.remaining);
            const s = c.credit_source || 'MANUAL';
            out[k].by_source[s] = round2((out[k].by_source[s] || 0) + c.remaining);
        }
    }
    return out;
}

module.exports = {
    SOURCES, GROUP_LABELS, DETAIL_LABELS, DEFAULT_VALIDITY_DAYS, REVERSAL_REASONS,
    sourceLabel, adminSourceLabel, creditsWithRemaining, creditRemaining, available, insertEarned, debit,
    issueCredit, voidCredit, creditSummary, applyBonus, releaseBonus, manualAdjust, expireDue, expiringReminders,
    walletView, outstandingBySource, newId,
};
