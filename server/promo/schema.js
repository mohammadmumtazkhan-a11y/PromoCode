// Promo module schema: owns promo_codes, promo_redemptions, promo_customers, promo_transfers, promo_audit.
// Existing tables and columns are kept (other code reads them); new columns are only added.

async function hasTable(q, name) {
    return !!(await q.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, [name]));
}

async function addColumnIfMissing(q, table, column, ddl) {
    const cols = await q.all(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === column)) await q.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

async function createCoreTables(q) {
    // Same definitions as the original server.js (unchanged so existing data keeps working)
    await q.run(`CREATE TABLE IF NOT EXISTS promo_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        type TEXT,
        value REAL,
        min_threshold REAL DEFAULT 0,
        max_discount REAL,
        currency TEXT,
        usage_limit_global INTEGER DEFAULT -1,
        usage_limit_per_user INTEGER DEFAULT 1,
        usage_count INTEGER DEFAULT 0,
        total_discount_utilized REAL DEFAULT 0,
        budget_limit REAL DEFAULT -1,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'Active',
        restrictions TEXT,
        user_segment TEXT,
        user_segment_criteria TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    await q.run(`CREATE TABLE IF NOT EXISTS promo_redemptions (
        id TEXT PRIMARY KEY,
        promo_code_id TEXT,
        transaction_id TEXT,
        user_id TEXT,
        discount_amount REAL,
        status TEXT,
        created_at TEXT,
        FOREIGN KEY(promo_code_id) REFERENCES promo_codes(id)
    )`);
}

// Demo data (unchanged from the original server.js): redemptions always seeded on an empty table (cost-incurred demo),
// demo codes only outside production.
async function seed(q) {
    const r = await q.get('SELECT COUNT(*) AS c FROM promo_redemptions');
    if (r && r.c === 0) {
        const rows = [
            ['pr_1', 'SAVE20', 'txn_promo_1', 'user_123', 20.00, 'Redeemed', '2024-05-15T10:00:00Z'],
            ['pr_2', 'BOOSTRATE', 'txn_promo_2', 'user_123', 5.00, 'Redeemed', '2024-06-01T14:30:00Z'],
            ['pr_3', 'SAVE20', 'txn_promo_3', 'user_101', 20.00, 'Redeemed', '2025-01-10T09:30:00Z'],
            ['pr_4', 'SAVE20', 'txn_promo_4', 'user_102', 20.00, 'Redeemed', '2025-01-11T14:15:00Z'],
            ['pr_5', 'BOOSTRATE', 'txn_promo_5', 'user_105', 5.00, 'Redeemed', '2025-01-12T16:45:00Z'],
        ];
        for (const row of rows) {
            await q.run(`INSERT OR IGNORE INTO promo_redemptions (id, promo_code_id, transaction_id, user_id, discount_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, row);
        }
    }
    if (process.env.NODE_ENV === 'production') return;
    const codes = [
        ['SAVE20', 'Percentage', 20, 100, 'USD', 1000, 45, '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', 'Active', '{}'],
        ['GLITCH500', 'Fixed', 500, 0, 'USD', 50, 12, '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', 'Disabled', '{}'],
        ['BOOSTRATE', 'FX_BOOST', 5.0, 500, 'GBP', -1, 89, '2024-06-01T00:00:00Z', '2024-08-31T23:59:59Z', 'Active', '{}'],
    ];
    for (const c of codes) {
        await q.run(`INSERT OR IGNORE INTO promo_codes (code, type, value, min_threshold, currency, usage_limit_global, usage_count, start_date, end_date, status, restrictions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, c);
    }
}

async function extend(q) {
    for (const [col, ddl] of [['description', 'TEXT'], ['updated_at', 'TEXT'], ['created_by', 'TEXT'], ['disabled_at', 'TEXT']]) {
        await addColumnIfMissing(q, 'promo_codes', col, ddl);
    }
    for (const [col, ddl] of [['currency', 'TEXT'], ['send_amount', 'REAL'], ['fee', 'REAL'], ['source_currency', 'TEXT'], ['dest_currency', 'TEXT'],
        ['payment_method', 'TEXT'], ['released_at', 'TEXT'], ['release_reason', 'TEXT']]) {
        await addColumnIfMissing(q, 'promo_redemptions', col, ddl);
    }
    // A transfer can redeem a code only once, so a retried "redeem" call cannot double count
    await q.run(`CREATE UNIQUE INDEX IF NOT EXISTS ux_promo_redemption_txn ON promo_redemptions(promo_code_id, transaction_id)`);
    await q.run(`CREATE INDEX IF NOT EXISTS ix_promo_redemptions_user ON promo_redemptions(user_id)`);
    await q.run(`CREATE INDEX IF NOT EXISTS ix_promo_redemptions_txn ON promo_redemptions(transaction_id)`);

    await q.run(`CREATE TABLE IF NOT EXISTS promo_customers (
        id TEXT PRIMARY KEY, created_at TEXT, country TEXT, send_currency TEXT, account_status TEXT,
        first_name TEXT, last_name TEXT, email TEXT, updated_at TEXT)`);
    await q.run(`CREATE TABLE IF NOT EXISTS promo_transfers (
        transfer_id TEXT PRIMARY KEY, customer_id TEXT, amount REAL, currency TEXT, receive_currency TEXT,
        status TEXT, created_at TEXT, updated_at TEXT)`);
    await q.run(`CREATE INDEX IF NOT EXISTS ix_promo_transfers_customer ON promo_transfers(customer_id, status)`);
    await q.run(`CREATE TABLE IF NOT EXISTS promo_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT, promo_code_id TEXT, field TEXT, old_value TEXT, new_value TEXT,
        admin_name TEXT, created_at TEXT)`);
    await q.run(`CREATE TABLE IF NOT EXISTS promo_schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT)`);
}

// One-off backfill (spec §4.4): customer activity and profiles from the tables audience checks used to read,
// so "new / existing customer" and segment codes give the same answers on day one.
// The copy only adds rows that are missing (INSERT OR IGNORE), so it is safe to run again: the host runs it once more
// after the other modules have created their tables at startup.
async function backfill(q) {
    const counts = { transfers: 0, customers: 0, redemption_currency: 0 };
    if (await hasTable(q, 'referral_transfers')) {
        const r = await q.run(`INSERT OR IGNORE INTO promo_transfers (transfer_id, customer_id, amount, currency, receive_currency, status, created_at, updated_at)
            SELECT transfer_id, customer_id, amount, currency, receive_currency, status, created_at, updated_at FROM referral_transfers`);
        counts.transfers = r.changes || 0;
    }
    if (await hasTable(q, 'customers')) {
        const r = await q.run(`INSERT OR IGNORE INTO promo_customers (id, created_at, country, send_currency, account_status, first_name, last_name, email, updated_at)
            SELECT id, created_at, country, send_currency, account_status, first_name, last_name, email, created_at FROM customers`);
        counts.customers = r.changes || 0;
    }
    const r = await q.run(`UPDATE promo_redemptions SET currency = (SELECT pc.currency FROM promo_codes pc
        WHERE pc.code = promo_redemptions.promo_code_id OR CAST(pc.id AS TEXT) = promo_redemptions.promo_code_id LIMIT 1) WHERE currency IS NULL`);
    counts.redemption_currency = r.changes || 0;
    await q.run(`INSERT OR REPLACE INTO promo_schema_migrations (name, applied_at) VALUES ('promo_module_v1', ?)`, [new Date().toISOString()]);
    if (process.env.NODE_ENV !== 'test') console.log('[promo] backfill promo_module_v1', counts);
    return counts;
}

async function initSchema(q) {
    await createCoreTables(q);
    await seed(q);
    await extend(q);
    await backfill(q);
}

module.exports = { initSchema, extend, backfill, hasTable };
