// Host wiring for the referral module (REFERRAL_MODULE_SPEC_MITO_ADMIN.md §1.3, §10 item 4).
// This is the only place that knows both the referral and the bonus modules. The referral module itself
// only sees the ports built here.

const bonus = require('./bonus');
const { ensureReferralCode, promisify } = require('./referral');

// rewardWallet → the bonus module's public wallet functions; eligibilityGuard → Bonus Blocks; onSpentCreditReversed → Bonus Debt
function referralPorts() {
    return {
        rewardWallet: {
            issueCredit: (input) => bonus.issueCredit(input),
            voidCredit: (creditId, opts) => bonus.voidCredit(creditId, opts),
            creditSummary: (filters) => bonus.creditSummary(filters),
        },
        eligibilityGuard: {
            isEarningBlocked: (customerId) => bonus.isEarningBlocked(customerId),
            recordStrike: (input) => bonus.recordStrike(input),
        },
        onSpentCreditReversed: (ev) => bonus.clawbackCredit(ev.creditId, { eventId: ev.transferId, notes: 'Referral bonus already spent – qualifying transfer reversed' }),
    };
}

// After both modules' tables exist: link referrals to the wallet credits that were issued before credit ids were kept
// on the referral, and apply the one-off prototype seed fixes that used to live in the referral module. Idempotent.
async function finishSetup(db) {
    const q = promisify(db);
    await q.run(`UPDATE referrals SET referrer_credit_id = (SELECT id FROM credit_ledger c WHERE c.type = 'EARNED' AND c.user_id = referrals.referrer_id AND c.reference_id = referrals.id || ':referrer')
        WHERE referrer_credit_id IS NULL AND referrer_credited > 0`);
    await q.run(`UPDATE referrals SET referee_credit_id = (SELECT id FROM credit_ledger c WHERE c.type = 'EARNED' AND c.user_id = referrals.referee_id AND c.reference_id = referrals.id || ':referee')
        WHERE referee_credit_id IS NULL AND referee_credited > 0`);
    await seedFix(q);
}

// One-off data corrections for the seeded prototype data (US-1.9)
async function seedFix(q) {
    await q.run(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT)`);
    const done = await q.get(`SELECT name FROM schema_migrations WHERE name = 'referral_v1_seed_fix'`);
    if (done) return;
    const hasRows = await q.get(`SELECT COUNT(*) AS c FROM credit_ledger`);
    const hasRules = await q.get(`SELECT COUNT(*) AS c FROM referral_rules`);
    if (!hasRows.c || !hasRules.c) return; // fresh database: seeds not written yet, try again on next start
    await q.run(`UPDATE credit_ledger SET id = 'cl_' || rowid WHERE id IS NULL`);
    // Currency from the bonus scheme where one is linked, otherwise GBP
    await q.run(`UPDATE credit_ledger SET currency = COALESCE((SELECT currency FROM bonus_schemes bs WHERE bs.id = credit_ledger.scheme_id AND credit_ledger.reason_code NOT IN ('LOYALTY','REFERRAL_REWARD','PAYMENT_OFFSET','EXPIRY')), 'GBP')`).catch(() => {});
    // Seeded LOYALTY / REFERRAL rows were linked to unrelated schemes
    await q.run(`UPDATE credit_ledger SET scheme_id = NULL WHERE reason_code IN ('LOYALTY','REFERRAL_REWARD') OR reference_id IN ('tx_999','exp_001')`);
    const gbpRule = await q.get(`SELECT id FROM referral_rules WHERE base_currency = 'GBP' ORDER BY id LIMIT 1`);
    const refCredit = await q.get(`SELECT id FROM credit_ledger WHERE reference_id = 'ref_101'`);
    if (refCredit) {
        await q.run(`UPDATE credit_ledger SET referral_rule_id = ? WHERE id = ?`, [gbpRule ? gbpRule.id : null, refCredit.id]);
        await q.run(`UPDATE credit_ledger SET source_credit_id = ?, referral_rule_id = ? WHERE reference_id = 'tx_999'`, [refCredit.id, gbpRule ? gbpRule.id : null]);
    }
    const loyalty = await q.get(`SELECT id FROM credit_ledger WHERE reference_id = 'loyalty_001'`);
    if (loyalty) await q.run(`UPDATE credit_ledger SET source_credit_id = ? WHERE reference_id = 'exp_001'`, [loyalty.id]);

    // Named customers for the seeded ledger users
    const seed = [
        ['user_101', 'Olayinka', 'Adebayo', 'olayinka@example.com', '+447700900101', 'GB', 'GBP'],
        ['user_102', 'Sarah', 'Smith', 'sarah.smith@example.com', '+447700900102', 'GB', 'GBP'],
        ['user_105', 'Mike', 'Ross', 'mike.ross@example.com', '+12025550105', 'US', 'USD'],
        ['user_123', 'John', 'Doe', 'john.doe@example.com', '+447700900123', 'GB', 'GBP'],
        ['user_999', 'Amaka', 'Okafor', 'amaka@example.com', '+447700900999', 'GB', 'GBP'],
    ];
    for (const [id, f, l, e, p, c, cur] of seed) {
        await q.run(`INSERT OR IGNORE INTO customers (id, first_name, last_name, email, phone, country, send_currency, kyc_status, account_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PASSED', 'ACTIVE', ?)`, [id, f, l, e, p, c, cur, '2025-01-01T00:00:00.000Z']);
        await ensureReferralCode(q, id);
    }
    await q.run(`INSERT INTO schema_migrations (name, applied_at) VALUES ('referral_v1_seed_fix', ?)`, [new Date().toISOString()]);
}

module.exports = { referralPorts, finishSetup };
