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
    await ensureDemoSeparatePills(q);
}

async function ensureDemoSeparatePills(q) {
    try {
        const gbpRule = await q.get(`SELECT id, min_transaction_threshold, qualification_window_days, bonus_validity_days FROM referral_rules WHERE base_currency = 'GBP' AND COALESCE(is_archived,0) = 0 ORDER BY is_enabled DESC, id LIMIT 1`);
        const gbpScheme = await q.get(`SELECT id FROM bonus_schemes WHERE currency = 'GBP' AND status = 'ACTIVE' AND min_transaction_threshold > 0 ORDER BY id DESC LIMIT 1`);
        await q.run(`UPDATE credit_ledger SET credit_source = 'SCHEME', credit_source_detail = 'LOYALTY_CREDIT', scheme_id = COALESCE(scheme_id, ?) WHERE id = 'cl_1' AND user_id = 'user_123'`, [gbpScheme ? gbpScheme.id : null]);
        const hasRef = await q.get(`SELECT id FROM credit_ledger WHERE user_id = 'user_123' AND credit_source = 'REFERRAL' AND type = 'EARNED'`);
        if (!hasRef) {
            await q.run(`INSERT OR IGNORE INTO credit_ledger (id, user_id, amount, type, scheme_id, reference_id, referral_id, reason_code, notes, admin_user, created_at, currency, referral_rule_id, credit_source, credit_source_detail)
                VALUES ('cl_ref_123', 'user_123', 15.00, 'EARNED', NULL, 'ref_demo_123', 'ref_demo_123', 'REFERRAL_REWARD', 'Referrer reward – referred Sarah S.', 'System', '2025-01-10 10:00:00', 'GBP', ?, 'REFERRAL', 'REFERRER')`,
                [gbpRule ? gbpRule.id : null]);
        } else {
            await q.run(`UPDATE credit_ledger SET referral_id = COALESCE(referral_id, 'ref_demo_123') WHERE id = 'cl_ref_123' AND user_id = 'user_123'`);
        }

        // Keep the referrals table in sync with the seeded cl_ref_123 referral credit so "My referrals" and "History" match
        const john = await q.get(`SELECT id, referral_code FROM customers WHERE id = 'user_123'`);
        const sarah = await q.get(`SELECT id FROM customers WHERE id = 'user_102'`);
        if (john && sarah) {
            await q.run(`INSERT OR IGNORE INTO referrals (
                id, referrer_id, referee_id, code, rule_id, currency, reward_type,
                referrer_reward, referee_reward, floor, qualification_window_days, bonus_validity_days,
                qualification_deadline, status, registered_at, rewarded_at,
                referrer_credited, referee_credited, referrer_credit_id, registration_channel, attribution_method, updated_at
            ) VALUES (
                'ref_demo_123', 'user_123', 'user_102', ?, ?, 'GBP', 'BOTH',
                15.00, 10.00, ?, ?, ?,
                '2025-04-10', 'REWARDED', '2025-01-05T10:00:00.000Z', '2025-01-10T10:00:00.000Z',
                15.00, 10.00, 'cl_ref_123', 'WEB', 'DIRECT_LINK', '2025-01-10T10:00:00.000Z'
            )`, [
                john.referral_code || 'JOHN2880',
                gbpRule ? gbpRule.id : 1,
                gbpRule ? Number(gbpRule.min_transaction_threshold || 50) : 50,
                gbpRule ? Number(gbpRule.qualification_window_days || 30) : 30,
                gbpRule ? Number(gbpRule.bonus_validity_days || 90) : 90,
            ]);
        }
    } catch { /* ignore in isolated test dbs */ }
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
