// Clawback of bonus that was already spent.
//
// When the transfer that earned a bonus is cancelled or refunded, the unused part of the bonus is voided (see
// bonusEngine.reverseEvent and referral voidReferralCredits). If the customer had already spent part of it on another
// transfer, that spent part is recorded here as a debt (ledger type CLAWBACK, negative). The debt is paid off
// automatically from the customer's next bonus credits (ledger type CLAWBACK_SETTLED, positive, plus a VOIDED row on the
// credit it was taken from), so the customer's balance never pays out below zero but future bonus is reduced until the
// debt is cleared. Set BONUS_CLAWBACK=off to void unused bonus only.
const crypto = require('crypto');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const newId = (p) => `${p}_${crypto.randomBytes(8).toString('hex')}`;
const today = () => new Date().toISOString().split('T')[0];
const enabled = () => String(process.env.BONUS_CLAWBACK || 'on').toLowerCase() !== 'off';
const DEBT_TYPES = `('CLAWBACK', 'CLAWBACK_SETTLED')`;

async function outstanding(q, userId, currency) {
    const r = await q.get(`SELECT COALESCE(-SUM(amount), 0) AS d FROM credit_ledger WHERE user_id = ? AND currency = ? AND type IN ${DEBT_TYPES}`, [userId, currency]);
    return Math.max(0, round2(r.d));
}

// Record the spent part of `credit` as debt. Safe to repeat.
async function clawback(q, credit, { notes, eventId }) {
    if (!enabled()) return 0;
    const spent = await q.get(`SELECT COALESCE(-SUM(amount), 0) AS s FROM credit_ledger WHERE source_credit_id = ? AND type = 'APPLIED'`, [credit.id]);
    const claimed = await q.get(`SELECT COALESCE(-SUM(amount), 0) AS s FROM credit_ledger WHERE reference_id = ? AND type = 'CLAWBACK'`, [`clawback:${credit.id}`]);
    const owe = round2(Number(spent.s) - Number(claimed.s));
    if (owe <= 0) return 0;
    // No source_credit_id on purpose: the debt must not change the credit's own remaining balance
    await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, scheme_id, reference_id, reason_code, notes, admin_user, currency, transfer_id)
        VALUES (?, ?, ?, 'CLAWBACK', ?, ?, 'BONUS_CLAWBACK', ?, 'System', ?, ?)`,
    [newId('cl'), credit.user_id, -owe, credit.scheme_id || null, `clawback:${credit.id}`, notes || 'Bonus already spent – earning transfer cancelled or refunded', credit.currency || 'GBP', eventId || null]);
    await settle(q, credit.user_id, credit.currency || 'GBP');
    return owe;
}

// Pay off outstanding debt from the customer's usable credits, oldest expiry first.
async function settle(q, userId, currency) {
    let debt = await outstanding(q, userId, currency);
    if (debt <= 0) return 0;
    const credits = await q.all(`SELECT * FROM credit_ledger WHERE user_id = ? AND currency = ? AND type = 'EARNED' AND amount > 0
        AND (expires_at IS NULL OR expires_at >= ?) ORDER BY COALESCE(expires_at, '9999-12-31'), created_at`, [userId, currency, today()]);
    let paid = 0;
    for (const c of credits) {
        if (debt <= 0) break;
        const used = await q.get(`SELECT COALESCE(SUM(amount), 0) AS s FROM credit_ledger WHERE source_credit_id = ?`, [c.id]);
        const remaining = round2(Number(c.amount) + Number(used.s));
        const take = round2(Math.min(remaining, debt));
        if (take <= 0) continue;
        await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, scheme_id, reference_id, reason_code, notes, admin_user, currency, source_credit_id)
            VALUES (?, ?, ?, 'VOIDED', ?, ?, 'CLAWBACK_OFFSET', 'Used to repay bonus clawback', 'System', ?, ?)`,
        [newId('cl'), userId, -take, c.scheme_id || null, `offset:${c.id}`, currency, c.id]);
        await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, reference_id, reason_code, notes, admin_user, currency)
            VALUES (?, ?, ?, 'CLAWBACK_SETTLED', ?, 'BONUS_CLAWBACK', 'Clawback repaid from new bonus', 'System', ?)`,
        [newId('cl'), userId, take, `offset:${c.id}`, currency]);
        debt = round2(debt - take); paid = round2(paid + take);
    }
    return paid;
}

module.exports = { clawback, settle, outstanding, enabled };
