// Tables owned by the bonus module (spec §4). Existing tables are kept; only columns, indexes and new tables are added.
// Seeds are the same rows server.js used to write, and only outside production (NFR-3).
const fs = require('fs');
const { addColumnIfMissing } = require('./db');
const { nowIso } = require('./time');

const SCHEME_TYPES = ['LOYALTY_CREDIT', 'TRANSACTION_THRESHOLD_CREDIT', 'REQUEST_MONEY', 'REFERRAL_CREDIT'];
const MANUAL_REASONS = ['GOODWILL', 'LOYALTY', 'CORRECTION', 'MANUAL_ADJUSTMENT'];
const seedsAllowed = () => process.env.NODE_ENV !== 'production';

async function initSchema(q, { seed: withSeeds = true } = {}) {
    await q.run(`CREATE TABLE IF NOT EXISTS user_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,
        criteria TEXT DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
    await addColumnIfMissing(q, 'user_segments', 'updated_at', 'TEXT');

    await q.run(`CREATE TABLE IF NOT EXISTS bonus_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, bonus_type TEXT NOT NULL, credit_amount REAL NOT NULL,
        currency TEXT DEFAULT 'GBP', min_transaction_threshold REAL DEFAULT 0, min_transactions INTEGER DEFAULT 0,
        time_period_days INTEGER DEFAULT 0, commission_type TEXT DEFAULT 'FIXED', commission_percentage REAL DEFAULT 0,
        is_tiered INTEGER DEFAULT 0, tiers TEXT DEFAULT '[]', eligibility_rules TEXT, start_date TEXT NOT NULL,
        end_date TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
    for (const [col, ddl] of [
        ['currency', "TEXT DEFAULT 'GBP'"], ['min_transactions', 'INTEGER DEFAULT 0'], ['time_period_days', 'INTEGER DEFAULT 0'],
        ['commission_type', "TEXT DEFAULT 'FIXED'"], ['commission_percentage', 'REAL DEFAULT 0'], ['is_tiered', 'INTEGER DEFAULT 0'],
        ['tiers', "TEXT DEFAULT '[]'"], ['max_award', 'REAL'], ['description', 'TEXT'], ['created_by', 'TEXT'], ['archived_at', 'TEXT'],
    ]) await addColumnIfMissing(q, 'bonus_schemes', col, ddl);

    await q.run(`CREATE TABLE IF NOT EXISTS credit_ledger (
        id TEXT PRIMARY KEY, user_id TEXT, amount REAL, type TEXT, scheme_id INTEGER, reference_id TEXT,
        reason_code TEXT, notes TEXT, admin_user TEXT, admin_user_id TEXT, expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (scheme_id) REFERENCES bonus_schemes(id))`);
    for (const [col, ddl] of [
        ['currency', "TEXT DEFAULT 'GBP'"], ['referral_id', 'TEXT'], ['referral_rule_id', 'INTEGER'], ['source_credit_id', 'TEXT'],
        ['transfer_id', 'TEXT'], ['credit_source', 'TEXT'], ['credit_source_detail', 'TEXT'], ['returned_from_credit_id', 'TEXT'],
    ]) await addColumnIfMissing(q, 'credit_ledger', col, ddl);
    // A replayed Rhemito event can never pay the same scheme twice, even under concurrent requests (BS-33)
    await q.run(`CREATE UNIQUE INDEX IF NOT EXISTS ux_credit_scheme_event ON credit_ledger(scheme_id, reference_id) WHERE reference_id LIKE 'evt:%'`);
    await q.run('CREATE INDEX IF NOT EXISTS ix_credit_user_cur_type ON credit_ledger(user_id, currency, type)');
    await q.run('CREATE INDEX IF NOT EXISTS ix_credit_user_cur_source ON credit_ledger(user_id, currency, credit_source)');
    await q.run('CREATE INDEX IF NOT EXISTS ix_credit_source_credit ON credit_ledger(source_credit_id)');
    await q.run('CREATE INDEX IF NOT EXISTS ix_credit_transfer ON credit_ledger(transfer_id)');
    await q.run('CREATE INDEX IF NOT EXISTS ix_credit_reference ON credit_ledger(reference_id)');

    await q.run(`CREATE TABLE IF NOT EXISTS bonus_strikes (
        id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, event_id TEXT NOT NULL, kind TEXT, outcome TEXT,
        amount_lost REAL DEFAULT 0, currency TEXT, detail TEXT, created_at TEXT, UNIQUE (customer_id, event_id))`);
    await q.run(`CREATE TABLE IF NOT EXISTS bonus_blocks (
        id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, status TEXT NOT NULL, strikes INTEGER, reason TEXT,
        blocked_at TEXT, lifted_at TEXT, lifted_by TEXT, lift_reason TEXT)`);
    await q.run('CREATE INDEX IF NOT EXISTS ix_bonus_blocks_customer ON bonus_blocks(customer_id, status)');

    await q.run(`CREATE TABLE IF NOT EXISTS bonus_customers (
        id TEXT PRIMARY KEY, created_at TEXT, country TEXT, send_currency TEXT, account_status TEXT,
        first_name TEXT, last_name TEXT, email TEXT, updated_at TEXT)`);
    await q.run(`CREATE TABLE IF NOT EXISTS bonus_transfers (
        transfer_id TEXT PRIMARY KEY, customer_id TEXT, amount REAL, currency TEXT, receive_currency TEXT,
        status TEXT, created_at TEXT, updated_at TEXT)`);
    await q.run('CREATE INDEX IF NOT EXISTS ix_bonus_transfers_customer ON bonus_transfers(customer_id, status, currency)');
    await q.run(`CREATE TABLE IF NOT EXISTS bonus_scheme_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT, scheme_id INTEGER, field TEXT, old_value TEXT, new_value TEXT,
        admin_name TEXT, created_at TEXT)`);
    await q.run(`CREATE TABLE IF NOT EXISTS bonus_feed (
        id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT, type TEXT, payload TEXT, dedupe_key TEXT UNIQUE, created_at TEXT)`);
    await q.run('CREATE TABLE IF NOT EXISTS bonus_job_state (name TEXT PRIMARY KEY, value TEXT)');

    if (withSeeds && seedsAllowed()) await seed(q);
}

// Same sample rows server.js wrote before the move (only into empty tables)
async function seed(q) {
    const schemes = await q.get('SELECT COUNT(*) AS c FROM bonus_schemes');
    if (!schemes.c) {
        const sql = `INSERT INTO bonus_schemes (name, bonus_type, credit_amount, currency, min_transaction_threshold, min_transactions,
            time_period_days, eligibility_rules, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await q.run(sql, ['High Value Threshold Bonus', 'TRANSACTION_THRESHOLD_CREDIT', 25.00, 'USD', 500.0, 0, 0,
            JSON.stringify({ paymentMethods: ['bank_transfer'], segments: ['all'] }), '2024-06-01', '2024-12-31', 'ACTIVE']);
        await q.run(sql, ['Loyalty Credit (Expired)', 'LOYALTY_CREDIT', 5.00, 'EUR', 0.0, 3, 30,
            JSON.stringify({ segments: ['existing_customers'] }), '2023-01-01', '2023-12-31', 'EXPIRED']);
        await q.run(sql, ['Request Money Scheme', 'REQUEST_MONEY', 0.00, 'GBP', 0.0, 0, 0,
            JSON.stringify({ segments: ['all'] }), '2024-01-01', '2025-12-31', 'ACTIVE']);
    }
    const ledger = await q.get('SELECT COUNT(*) AS c FROM credit_ledger');
    if (!ledger.c) {
        const sql = 'INSERT INTO credit_ledger (user_id, amount, type, scheme_id, reference_id, reason_code, notes, created_at, admin_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const rows = [
            ['user_123', 50.00, 'EARNED', 1, 'ref_001', 'LOYALTY', 'Initial Loyalty Bonus', '2025-01-01 10:00:00', 'System'],
            ['user_101', 15.00, 'EARNED', 2, 'ref_101', 'REFERRAL_REWARD', 'Referral: user_999', '2025-01-10 10:00:00', 'System'],
            ['user_101', -5.00, 'APPLIED', 2, 'tx_999', 'PAYMENT_OFFSET', 'Used for Txn #123', '2025-01-12 14:00:00', 'System'],
            ['user_102', 25.00, 'EARNED', 1, 'loyalty_001', 'LOYALTY', 'VIP Tier reached', '2025-01-01 09:00:00', 'Admin_Jane'],
            ['user_102', -25.00, 'EXPIRED', 1, 'exp_001', 'EXPIRY', 'Unused credit expired', '2025-04-01 00:00:00', 'System'],
            ['user_105', 10.00, 'EARNED', 1, 'bonus_105', 'TRANSACTION_THRESHOLD', 'Hit 500 USD volume', '2025-01-15 16:20:00', 'System'],
            ['user_105', 100.00, 'EARNED', 3, 'req_001', 'REQUEST_MONEY', 'Money Requested', '2025-01-16 09:00:00', 'System'],
        ];
        for (const r of rows) await q.run(sql, r);
    }
}

const tableExists = async (q, name) => !!(await q.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, [name]));

// Backfill "bonus_v1" (spec §4). Safe to run any number of times: it copies activity the module did not record itself
// yet, and tags every credit that has no source. The host runs it at start and again once the referral tables exist.
async function backfill(q, { dbFile, log = console.log } = {}) {
    const marker = await q.get(`SELECT value FROM bonus_job_state WHERE name = 'migration:bonus_v1'`);
    if (!marker && dbFile && dbFile !== ':memory:' && fs.existsSync(dbFile)) {
        const backup = dbFile.replace(/database\.sqlite$/, 'database.backup-before-bonus-module.sqlite');
        if (backup !== dbFile && !fs.existsSync(backup)) {
            try { fs.copyFileSync(dbFile, backup); log(`[bonus] database backed up to ${backup}`); } catch (e) { log(`[bonus] backup failed: ${e.message}`); }
        }
    }

    // Seeded rows were written without an id (the referral migration uses the same formula)
    await q.run(`UPDATE credit_ledger SET id = 'cl_' || rowid WHERE id IS NULL`);

    const copied = { transfers: 0, customers: 0 };
    if (await tableExists(q, 'referral_transfers')) {
        const r = await q.run(`INSERT OR IGNORE INTO bonus_transfers (transfer_id, customer_id, amount, currency, receive_currency, status, created_at, updated_at)
            SELECT transfer_id, customer_id, amount, currency, receive_currency, status, created_at, updated_at FROM referral_transfers`);
        copied.transfers = r.changes;
    }
    if (await tableExists(q, 'customers')) {
        const r = await q.run(`INSERT OR IGNORE INTO bonus_customers (id, created_at, country, send_currency, account_status, first_name, last_name, email, updated_at)
            SELECT id, created_at, country, send_currency, account_status, first_name, last_name, email, ? FROM customers`, [nowIso()]);
        copied.customers = r.changes;
    }

    const tagged = await tagSources(q, log);
    if (!marker) {
        await q.run(`INSERT OR REPLACE INTO bonus_job_state (name, value) VALUES ('migration:bonus_v1', ?)`, [nowIso()]);
    }
    if (copied.transfers || copied.customers || Object.keys(tagged).length) {
        log(`[bonus] backfill: transfers ${copied.transfers}, customers ${copied.customers}, sources tagged ${JSON.stringify(tagged)}`);
    }
    return { ...copied, tagged };
}

// BS-80 / §4: give every EARNED row without a source its credit_source + credit_source_detail
async function tagSources(q, log = console.log) {
    const counts = {};
    const add = (key, n) => { if (n) counts[key] = (counts[key] || 0) + n; };
    const manual = MANUAL_REASONS.map(() => '?').join(',');

    add('REFERRAL', (await q.run(`UPDATE credit_ledger SET credit_source = 'REFERRAL',
        credit_source_detail = CASE WHEN reference_id LIKE '%:referrer' THEN 'REFERRER' ELSE 'REFEREE' END
        WHERE type = 'EARNED' AND credit_source IS NULL AND reason_code = 'REFERRAL_REWARD'`)).changes);
    add('MANUAL', (await q.run(`UPDATE credit_ledger SET credit_source = 'MANUAL', credit_source_detail = reason_code
        WHERE type = 'EARNED' AND credit_source IS NULL AND reason_code IN (${manual})`, MANUAL_REASONS)).changes);
    add('SCHEME', (await q.run(`UPDATE credit_ledger SET credit_source = 'SCHEME',
        credit_source_detail = (SELECT bonus_type FROM bonus_schemes bs WHERE bs.id = credit_ledger.scheme_id)
        WHERE type = 'EARNED' AND credit_source IS NULL AND COALESCE(reason_code, '') <> 'BONUS_RETURNED'
          AND scheme_id IS NOT NULL AND EXISTS (SELECT 1 FROM bonus_schemes bs WHERE bs.id = credit_ledger.scheme_id)`)).changes);

    // Returned credit keeps the source of the credit it came from (BS-81)
    const returned = await q.all(`SELECT * FROM credit_ledger WHERE type = 'EARNED' AND credit_source IS NULL AND reason_code = 'BONUS_RETURNED'`);
    for (const r of returned) {
        let origin = null;
        if (r.returned_from_credit_id) origin = await q.get('SELECT credit_source, credit_source_detail FROM credit_ledger WHERE id = ?', [r.returned_from_credit_id]);
        if (!origin || !origin.credit_source) {
            const transferId = String(r.reference_id || '').replace(/^return:/, '');
            const applied = await q.all(`SELECT source_credit_id, amount FROM credit_ledger WHERE user_id = ? AND type = 'APPLIED' AND (transfer_id = ? OR reference_id = ?)`,
                [r.user_id, transferId, transferId]);
            const match = applied.find((a) => Math.abs(Number(a.amount) + Number(r.amount)) < 0.005) || applied[0];
            if (match && match.source_credit_id) {
                origin = await q.get('SELECT credit_source, credit_source_detail FROM credit_ledger WHERE id = ?', [match.source_credit_id]);
                if (origin && origin.credit_source) await q.run('UPDATE credit_ledger SET returned_from_credit_id = COALESCE(returned_from_credit_id, ?) WHERE id = ?', [match.source_credit_id, r.id]);
            }
        }
        if (origin && origin.credit_source) {
            await q.run('UPDATE credit_ledger SET credit_source = ?, credit_source_detail = ? WHERE id = ?', [origin.credit_source, origin.credit_source_detail, r.id]);
            add(origin.credit_source, 1);
        }
    }

    // Anything else: unknown origin → MANUAL / CORRECTION, logged
    const unknown = await q.all(`SELECT id FROM credit_ledger WHERE type = 'EARNED' AND credit_source IS NULL`);
    if (unknown.length) {
        await q.run(`UPDATE credit_ledger SET credit_source = 'MANUAL', credit_source_detail = 'CORRECTION' WHERE type = 'EARNED' AND credit_source IS NULL`);
        log(`[bonus] ${unknown.length} credit(s) had no known source and were tagged MANUAL/CORRECTION: ${unknown.map((u) => u.id).join(', ')}`);
        add('MANUAL', unknown.length);
    }
    return counts;
}

module.exports = { initSchema, backfill, tagSources, SCHEME_TYPES, MANUAL_REASONS };
