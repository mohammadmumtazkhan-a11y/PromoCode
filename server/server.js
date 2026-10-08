const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bonusEngine = require('./bonusEngine');
const bonusBlocks = require('./bonusBlocks');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve Static Files
app.use(express.static(path.join(__dirname, '../client/dist')));

// --- User Segments API ---
app.get('/api/user-segments', (req, res) => {
    db.all("SELECT * FROM user_segments ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const segments = rows.map(seg => ({
            ...seg,
            criteria: JSON.parse(seg.criteria || '{}')
        }));
        res.json({ data: segments });
    });
});

app.post('/api/user-segments', (req, res) => {
    const { name, description, criteria } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const stmt = db.prepare("INSERT INTO user_segments (name, description, criteria) VALUES (?, ?, ?)");
    stmt.run(name, description, JSON.stringify(criteria || {}), function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
    stmt.finalize();
});

app.put('/api/user-segments/:id', (req, res) => {
    const { name, description, criteria } = req.body;
    const stmt = db.prepare("UPDATE user_segments SET name = ?, description = ?, criteria = ? WHERE id = ?");
    stmt.run(name, description, JSON.stringify(criteria || {}), req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
    stmt.finalize();
});

app.delete('/api/user-segments/:id', (req, res) => {
    db.run("DELETE FROM user_segments WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// SPA Catch-all Route (Must be after API routes, handled at bottom)

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to the file-based SQLite database.');
        initializeDatabase();
    }
});

// Promise wrapper over the sqlite connection, used by the bonus and promo engines
const dbq = {
    run: (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (err) { err ? rej(err) : res(this); })),
    get: (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => (err ? rej(err) : res(row)))),
    all: (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows || [])))),
};

// Business-rule refusals keep their status and code; anything else is a 500
function sendEngineError(res, err) {
    if (err instanceof bonusEngine.Reject) return res.status(err.status).json(err.body());
    console.error('[engine]', err);
    return res.status(500).json({ error: err.message });
}

function initializeDatabase() {
    db.serialize(() => {
        // Merchants
        db.run(`CREATE TABLE IF NOT EXISTS merchants (
            id TEXT PRIMARY KEY,
            mito_id TEXT UNIQUE,
            type TEXT,
            name TEXT,
            reg_number TEXT,
            email TEXT,
            base_currency TEXT,
            payout_currency TEXT,
            status TEXT DEFAULT 'Active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Transactions
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            ref_number TEXT UNIQUE,
            merchant_id TEXT,
            type TEXT,
            amount_debit_ngn REAL,
            debit_date TEXT,
            status TEXT,
            FOREIGN KEY(merchant_id) REFERENCES merchants(id)
        )`);

        // Forex Logs
        db.run(`CREATE TABLE IF NOT EXISTS forex_logs (
            id TEXT PRIMARY KEY,
            transaction_id TEXT,
            conversion_date TEXT,
            rate_applied REAL,
            amount_input_ngn REAL,
            amount_output_target REAL,
            FOREIGN KEY(transaction_id) REFERENCES transactions(id)
        )`);

        // Commissions
        db.run(`CREATE TABLE IF NOT EXISTS commissions (
            id TEXT PRIMARY KEY,
            transaction_id TEXT,
            base_commission_ngn REAL,
            forex_spread_ngn REAL,
            total_commission_ngn REAL,
            base_currency TEXT,
            payout_currency TEXT,
            status TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed Data
        const stmt = db.prepare("INSERT OR IGNORE INTO merchants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run("m1", "MITO001", "Business", "Global Tech Ltd", "RC12345", "contact@globaltech.com", "NGN", "USD", "Active", "2024-01-01T00:00:00Z");
        stmt.run("m2", "MITO002", "Individual", "John Doe Logistics", "N/A", "john@doelogistics.com", "NGN", "GBP", "Onboarding", "2025-01-01T00:00:00Z");
        stmt.finalize();

        // Seed Transactions, Forex, Commissions
        const tStmt = db.prepare("INSERT OR IGNORE INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?)");
        tStmt.run("t1", "TXN100001", "m1", "Debit", 500000.00, "2024-10-24T10:30:00Z", "Successful");
        tStmt.run("t2", "TXN100002", "m2", "Debit", 150000.00, "2024-10-24T11:15:00Z", "Pending");
        tStmt.finalize();

        const fStmt = db.prepare("INSERT OR IGNORE INTO forex_logs VALUES (?, ?, ?, ?, ?, ?)");
        fStmt.run("f1", "t1", "2024-10-24T14:00:00Z", 1545.79, 500000.00, 323.45);
        fStmt.finalize();

        const cStmt = db.prepare("INSERT OR IGNORE INTO commissions (id, transaction_id, base_commission_ngn, forex_spread_ngn, total_commission_ngn, status) VALUES (?, ?, ?, ?, ?, ?)");
        cStmt.run("c1", "t1", 5000.00, 2500.00, 7500.00, "Due");
        cStmt.finalize();

        // Referral Rules (Multi-Record)
        db.run(`CREATE TABLE IF NOT EXISTS referral_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            is_enabled INTEGER DEFAULT 1,
            min_transaction_threshold REAL DEFAULT 100.0,
            referrer_reward REAL DEFAULT 5.0,
            referee_reward REAL DEFAULT 10.0,
            reward_type TEXT DEFAULT 'BOTH',
            base_currency TEXT DEFAULT 'GBP',
            receive_currency TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            // Seed sample rules (only when the table is empty, so restarts don't duplicate them)
            db.get("SELECT COUNT(*) AS c FROM referral_rules", [], (cErr, row) => {
                if (cErr || (row && row.c > 0)) return;
                // One rule per corridor: base_currency is the send currency, receive_currency the destination
                const stmt = db.prepare(`INSERT INTO referral_rules (name, is_enabled, min_transaction_threshold, referrer_reward, referee_reward, reward_type, base_currency, receive_currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
                stmt.run('Default UK Program', 1, 50.0, 5.00, 10.00, 'BOTH', 'GBP', 'NGN');
                stmt.run('US High Value', 1, 100.0, 10.00, 20.00, 'BOTH', 'USD', 'NGN');
                stmt.run('Nigeria Special', 0, 20000.0, 2000.00, 5000.00, 'REFEREE', 'NGN', 'GBP');
                stmt.finalize();
            });
        });

        // User Segments (New)
        db.run(`CREATE TABLE IF NOT EXISTS user_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            criteria TEXT DEFAULT '{}', -- JSON: { type: 'TRANSACTION_COUNT'|'TRANSACTION_VOLUME', min, max, period_days, currency }
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Bonus Schemes (Phase 1: FRD)
        db.run(`CREATE TABLE IF NOT EXISTS bonus_schemes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            bonus_type TEXT NOT NULL, -- REFERRAL_CREDIT, LOYALTY_CREDIT, TRANSACTION_THRESHOLD_CREDIT, REQUEST_MONEY
            credit_amount REAL NOT NULL,
            currency TEXT DEFAULT 'GBP',
            min_transaction_threshold REAL DEFAULT 0,
            min_transactions INTEGER DEFAULT 0,
            time_period_days INTEGER DEFAULT 0,
            commission_type TEXT DEFAULT 'FIXED', -- FIXED, PERCENTAGE
            commission_percentage REAL DEFAULT 0,
            is_tiered INTEGER DEFAULT 0, -- Boolean (0/1)
            tiers TEXT DEFAULT '[]', -- JSON: [{min, max, value}]
            eligibility_rules TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            // Migration: Ensure new columns exist
            const migrations = [
                "ALTER TABLE bonus_schemes ADD COLUMN currency TEXT DEFAULT 'GBP'",
                "ALTER TABLE bonus_schemes ADD COLUMN min_transactions INTEGER DEFAULT 0",
                "ALTER TABLE bonus_schemes ADD COLUMN time_period_days INTEGER DEFAULT 0",
                "ALTER TABLE bonus_schemes ADD COLUMN commission_type TEXT DEFAULT 'FIXED'",
                "ALTER TABLE bonus_schemes ADD COLUMN commission_percentage REAL DEFAULT 0",
                "ALTER TABLE bonus_schemes ADD COLUMN is_tiered INTEGER DEFAULT 0",
                "ALTER TABLE bonus_schemes ADD COLUMN tiers TEXT DEFAULT '[]'"
            ];

            // Migrations (Redundant for fresh DB)
            /*
            db.serialize(() => {
                migrations.forEach(query => {
                    db.run(query, (err) => { });
                });
            });
            */

            // Seed sample bonus schemes if empty
            db.get("SELECT count(*) as count FROM bonus_schemes", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare(`INSERT INTO bonus_schemes 
                        (name, bonus_type, credit_amount, currency, min_transaction_threshold, min_transactions, time_period_days, eligibility_rules, start_date, end_date, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                    stmt.run('High Value Threshold Bonus', 'TRANSACTION_THRESHOLD_CREDIT', 25.00, 'USD', 500.0, 0, 0,
                        JSON.stringify({ paymentMethods: ['bank_transfer'], segments: ['all'] }),
                        '2024-06-01', '2024-12-31', 'ACTIVE');
                    stmt.run('Loyalty Credit (Expired)', 'LOYALTY_CREDIT', 5.00, 'EUR', 0.0, 3, 30,
                        JSON.stringify({ segments: ['existing_customers'] }),
                        '2023-01-01', '2023-12-31', 'EXPIRED');

                    // NEW: Request Money Scheme Seed (ID will be 3)
                    stmt.run('Request Money Scheme', 'REQUEST_MONEY', 0.00, 'GBP', 0.0, 0, 0,
                        JSON.stringify({ segments: ['all'] }),
                        '2024-01-01', '2025-12-31', 'ACTIVE');

                    stmt.finalize();
                }
            });
        });

        // Credit Ledger (Append-Only) - Enhanced with FRD fields
        db.run(`CREATE TABLE IF NOT EXISTS credit_ledger (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            amount REAL, -- Positive for earn, Negative for spend/void
            type TEXT, -- EARNED, APPLIED, EXPIRED, VOIDED
            scheme_id INTEGER, -- FK to bonus_schemes
            reference_id TEXT, -- Transaction ID, Promo Code ID, or Manual Reason Code
            reason_code TEXT, -- LOYALTY, CORRECTION, MANUAL_ADJUSTMENT (Phase 3: FRD)
            notes TEXT, -- Admin notes (Phase 3: FRD)
            admin_user TEXT, -- For audit trail
            admin_user_id TEXT, -- Admin ID (Phase 4: FRD)
            expires_at TEXT, -- Credit expiry date (Phase 4: FRD)
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (scheme_id) REFERENCES bonus_schemes(id)
        )`, () => {
            // Seed data for Credit Ledger if empty (or just append dummy for dev for user_123, user_101, etc)
            db.get("SELECT count(*) as count FROM credit_ledger", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO credit_ledger (user_id, amount, type, scheme_id, reference_id, reason_code, notes, created_at, admin_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    // User 123 (Main Demo User)
                    stmt.run('user_123', 50.00, 'EARNED', 1, 'ref_001', 'LOYALTY', 'Initial Loyalty Bonus', '2025-01-01 10:00:00', 'System');

                    // Global View Dummy Data
                    stmt.run('user_101', 15.00, 'EARNED', 2, 'ref_101', 'REFERRAL_REWARD', 'Referral: user_999', '2025-01-10 10:00:00', 'System');
                    stmt.run('user_101', -5.00, 'APPLIED', 2, 'tx_999', 'PAYMENT_OFFSET', 'Used for Txn #123', '2025-01-12 14:00:00', 'System');

                    stmt.run('user_102', 25.00, 'EARNED', 1, 'loyalty_001', 'LOYALTY', 'VIP Tier reached', '2025-01-01 09:00:00', 'Admin_Jane');
                    stmt.run('user_102', -25.00, 'EXPIRED', 1, 'exp_001', 'EXPIRY', 'Unused credit expired', '2025-04-01 00:00:00', 'System');

                    stmt.run('user_105', 10.00, 'EARNED', 1, 'bonus_105', 'TRANSACTION_THRESHOLD', 'Hit 500 USD volume', '2025-01-15 16:20:00', 'System');

                    // NEW: Request Money Scheme Entry (ID 3)
                    stmt.run('user_105', 100.00, 'EARNED', 3, 'req_001', 'REQUEST_MONEY', 'Money Requested', '2025-01-16 09:00:00', 'System');

                    stmt.finalize();
                }
            });
        });

        // Rate Audit Log
        db.run(`CREATE TABLE IF NOT EXISTS rate_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rate_id TEXT NOT NULL,
            corridor TEXT,
            change_type TEXT NOT NULL,
            field_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            admin_id TEXT NOT NULL,
            admin_name TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )`, () => {
            db.get("SELECT count(*) as count FROM rate_audit_log", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare(`INSERT INTO rate_audit_log
                        (rate_id, corridor, change_type, field_name, old_value, new_value, admin_id, admin_name, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                    stmt.run('1246', 'EUR → SGD', 'RATE', 'Money-R Buy', '1.3800', '1.3900', 'admin_john', 'John Smith', '2026-02-10 09:15:00');
                    stmt.run('1246', 'EUR → SGD', 'FACTOR', 'Money (All) Factor', '0.95', '1.00', 'admin_john', 'John Smith', '2026-02-10 09:15:00');
                    stmt.run('2309', 'GBP → INR', 'OVERRIDE', 'Override Enabled', 'No', 'Yes', 'admin_jane', 'Jane Doe', '2026-02-09 14:30:00');
                    stmt.run('2309', 'GBP → INR', 'RATE', 'Money-W Sell', '104.5000', '105.0000', 'admin_jane', 'Jane Doe', '2026-02-09 14:32:00');
                    stmt.run('2269', 'EUR → TRY', 'FACTOR', 'Airtime Factor', '1.00', '0.98', 'admin_john', 'John Smith', '2026-02-08 11:20:00');
                    stmt.run('1203', 'NGN → USD', 'RATE', 'Money-W Buy', '640.0000', '643.0000', 'admin_jane', 'Jane Doe', '2026-02-07 16:45:00');
                    stmt.finalize();
                }
            });
        });
    });
}

// Routes
app.get('/api/dashboard/kpi', (req, res) => {
    res.json({
        commission_earned: { pending: 1250000, available: 4500000, paid_out: 12000000 },
        forex_payout: { pending_conversion: 2500000, to_be_paid: 1500, paid_out: 50000 }
    });
});

app.get('/api/transactions', (req, res) => {
    db.all(`SELECT t.*, m.name as merchant_name, f.amount_output_target, f.rate_applied, c.total_commission_ngn 
            FROM transactions t 
            JOIN merchants m ON t.merchant_id = m.id 
            LEFT JOIN forex_logs f ON t.id = f.transaction_id
            LEFT JOIN commissions c ON t.id = c.transaction_id`, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ data: rows });
    });
});

// Financial Endpoints
app.get('/api/financials/debits', (req, res) => {
    db.all("SELECT t.ref_number, m.name, t.amount_debit_ngn, t.debit_date, t.status FROM transactions t JOIN merchants m ON t.merchant_id = m.id WHERE t.type = 'Debit'", [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ data: rows });
    });
});

app.get('/api/financials/payouts', (req, res) => {
    db.all(`SELECT t.ref_number, m.name, f.conversion_date, t.amount_debit_ngn, f.rate_applied, f.amount_output_target, t.status 
            FROM transactions t 
            JOIN merchants m ON t.merchant_id = m.id 
            JOIN forex_logs f ON t.id = f.transaction_id`, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ data: rows });
    });
});

app.get('/api/merchants', (req, res) => {
    db.all("SELECT * FROM merchants", [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ data: rows });
    });
});

// NOTE: SPA catch-all and app.listen are at the end of the file, AFTER all API routes

// --- Promo code module (spec PROMO_MODULE_SPEC_MITO_ADMIN.md) ---
// Owns promo codes, validation, redemption, release and the Promo Codes admin API. Host wiring below only adds
// customer facts this app already knows (signup date, names) through the module's optional ports.
const promo = require('./promo');
const hostCustomerFacts = {
    async signupDate(id) {
        for (const sql of ['SELECT created_at FROM customers WHERE id = ?', 'SELECT created_at FROM merchants WHERE id = ?']) {
            try { const r = await dbq.get(sql, [id]); if (r && r.created_at) return r.created_at; } catch { /* table absent */ }
        }
        return null;
    },
    async names(ids) {
        const out = {};
        for (const id of [...new Set(ids)]) {
            try {
                const r = await dbq.get("SELECT NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), '') AS n FROM customers WHERE id = ?", [id]);
                if (r && r.n) out[id] = r.n;
            } catch { /* table absent */ }
        }
        return out;
    },
};
promo.register(app, db, { customerDirectory: hostCustomerFacts });

// 7. Segments
app.get('/api/segments', (req, res) => {
    res.json({ data: { new_users: 10, churned_users: 5 } }); // Mock
});

// --- Referral & Bonus engine (rules, referrals, wallet, reporting) ---
// See server/referral.js and Docs/Requirements/referral-and-bonus-user-stories.md
const { registerReferralRoutes } = require('./referral');
bonusBlocks.registerBonusBlockRoutes(app, dbq);
const referralModule = registerReferralRoutes(app, db, {
    // The wallet's promo_redemptions list comes from the promo module's read function (PROMO-MITO §8.4)
    promoRedemptions: (customerId) => promo.listRedemptions({ userId: customerId }),
    // A completed transfer may also earn loyalty / threshold bonuses; failures here must never fail the transfer event
    afterTransferEvent: async (ev) => {
        const status = String(ev.status || '').toUpperCase();
        // Transition (PROMO-MITO C3): until Rhemito reports to POST /api/promocodes/transfer-events, the promo module also
        // hears transfer events here (records the activity, releases the code use on failure). Idempotent, so both paths are safe.
        try { await promo.handleTransferEvent(ev); } catch (err) { console.error('[promo] transfer event not recorded', ev.transfer_id, err.message); }
        // Cancelled, failed or refunded: take back scheme bonuses the transfer earned
        if (['CANCELLED', 'FAILED', 'REFUNDED', 'RECALLED', 'CHARGEBACK'].includes(status)) {
            try {
                return (await bonusEngine.reverseEvent(dbq, ev.transfer_id, status)).map((r) => ({ ...r, status: 'REVERSED' }));
            } catch (err) {
                console.error('[bonus] could not reverse bonuses for transfer', ev.transfer_id, err.message);
                return [];
            }
        }
        if (status !== 'COMPLETED') return [];
        try {
            return await bonusEngine.triggerEvent(dbq, {
                type: 'TRANSFER_COMPLETED', customer_id: ev.customer_id, event_id: ev.transfer_id, amount: Number(ev.amount), currency: ev.currency,
            });
        } catch (err) {
            console.error('[bonus] could not evaluate bonus schemes for transfer', ev.transfer_id, err.message);
            return [];
        }
    },
});// Once the referral tables exist, let the promo module copy their customer activity (PROMO-MITO §4.4)
Promise.resolve(referralModule && referralModule.ready).then(() => promo.runBackfill()).catch((e) => console.error('[promo] backfill failed', e.message));


// --- Phase 1: Bonus Scheme Configuration API (FRD) ---

// 1. Get All Bonus Schemes
app.get('/api/bonus-schemes', (req, res) => {
    db.all("SELECT * FROM bonus_schemes ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Parse JSON fields
        const schemes = rows.map(scheme => ({
            ...scheme,
            eligibility_rules: JSON.parse(scheme.eligibility_rules || '{}'),
            tiers: JSON.parse(scheme.tiers || '[]'),
            is_tiered: !!scheme.is_tiered // Convert to boolean
        }));

        res.json({ data: schemes });
    });
});

// 2. Create Bonus Scheme
// 2. Create Bonus Scheme
app.post('/api/bonus-schemes', (req, res) => {
    const {
        name, bonus_type, credit_amount, currency, min_transaction_threshold,
        min_transactions, time_period_days, commission_type, commission_percentage,
        is_tiered, tiers, eligibility_rules, start_date, end_date, status
    } = req.body;

    // FRD Validations (Section 3.1)
    if (!name) return res.status(400).json({ error: "Bonus Name is required" });
    if (!bonus_type) return res.status(400).json({ error: "Bonus Type is required" });
    if (bonus_type === 'REFERRAL_CREDIT') {
        return res.status(400).json({ error: "Referral rewards are managed in Growth > Referral Settings." });
    }
    if (!credit_amount && commission_type !== 'PERCENTAGE') {
        // It's okay if credit_amount is 0 if it's percentage or tiered (maybe)
        // But for simplicity let's keep basic check or refine it.
        // If tiered, credit_amount might be 0/unused.
    }

    if (!start_date || !end_date) return res.status(400).json({ error: "Validity Period is required" });
    if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ error: "Please select a valid date range. Start date must be before end date." });
    }

    // Loyalty Credit specific validations
    if (bonus_type === 'LOYALTY_CREDIT') {
        if (!min_transactions || min_transactions <= 0) {
            return res.status(400).json({ error: "Number of Transactions is required for Loyalty Credit" });
        }
        if (!time_period_days || time_period_days <= 0) {
            return res.status(400).json({ error: "Time Period (Days) is required for Loyalty Credit" });
        }
    }

    const stmt = db.prepare(`INSERT INTO bonus_schemes 
        (name, bonus_type, credit_amount, currency, min_transaction_threshold, min_transactions, time_period_days, commission_type, commission_percentage, is_tiered, tiers, eligibility_rules, start_date, end_date, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    // Default to GBP if not provided (Safety net)
    const safeCurrency = currency || 'GBP';

    stmt.run(
        name,
        bonus_type,
        credit_amount || 0,
        safeCurrency,
        min_transaction_threshold || 0,
        min_transactions || 0,
        time_period_days || 0,
        commission_type || 'FIXED',
        commission_percentage || 0,
        is_tiered ? 1 : 0,
        JSON.stringify(tiers || []),
        JSON.stringify(eligibility_rules || {}),
        start_date,
        end_date,
        status || 'ACTIVE',
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
    stmt.finalize();
});

// 3. Update Bonus Scheme
app.put('/api/bonus-schemes/:id', (req, res) => {
    const { id } = req.params;
    const {
        name, bonus_type, credit_amount, currency, min_transaction_threshold,
        min_transactions, time_period_days, commission_type, commission_percentage,
        is_tiered, tiers, eligibility_rules, start_date, end_date, status
    } = req.body;

    // FRD Validations
    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ error: "Please select a valid date range" });
    }

    const stmt = db.prepare(`UPDATE bonus_schemes SET 
        name = ?,
        bonus_type = ?,
        credit_amount = ?,
        currency = ?,
        min_transaction_threshold = ?,
        min_transactions = ?,
        time_period_days = ?,
        commission_type = ?,
        commission_percentage = ?,
        is_tiered = ?,
        tiers = ?,
        eligibility_rules = ?,
        start_date = ?,
        end_date = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`);

    // Default to GBP if not provided (safety)
    const safeCurrency = currency || 'GBP';

    stmt.run(
        name,
        bonus_type,
        credit_amount || 0,
        safeCurrency,
        min_transaction_threshold || 0,
        min_transactions || 0,
        time_period_days || 0,
        commission_type || 'FIXED',
        commission_percentage || 0,
        is_tiered ? 1 : 0,
        JSON.stringify(tiers || []),
        JSON.stringify(eligibility_rules || {}),
        start_date,
        end_date,
        status,
        id,
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
    stmt.finalize();
});

// 4. Delete Bonus Scheme
app.delete('/api/bonus-schemes/:id', (req, res) => {
    const { id } = req.params;

    db.run("UPDATE bonus_schemes SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Scheme archived" });
    });
});

// --- Phase 2: Enhanced Credits Ledger API (FRD) ---

// 1. Get User Credit Balance & History with Advanced Filtering
app.get('/api/credits/:userId', (req, res) => {
    const userId = req.params.userId;
    const { startDate, endDate, eventType, schemeId, customerId } = req.query;
    const isReferralRule = typeof schemeId === 'string' && schemeId.startsWith('rr_');

    db.serialize(() => {
        // Calculate Balance
        const isGlobal = userId === 'all';

        // Calculate Balance (Individual or Total Liability)
        const balanceQuery = isGlobal
            ? "SELECT SUM(amount) as balance FROM credit_ledger"
            : "SELECT SUM(amount) as balance FROM credit_ledger WHERE user_id = ?";
        const balanceParams = isGlobal ? [] : [userId];

        db.get(balanceQuery, balanceParams, (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            const balance = row && row.balance ? row.balance : 0;

            // Build dynamic query with filters
            let query = `
                SELECT cl.*, COALESCE(cl.currency, 'GBP') as currency, 'BONUS' as source_type,
                    COALESCE(bs.name, CASE WHEN rr.id IS NOT NULL THEN rr.name || ' (Referral)' END,
                        CASE WHEN COALESCE(src.reason_code, cl.reason_code) = 'LOYALTY' THEN 'Manual loyalty credit' END) as scheme_name,
                    NULLIF(TRIM(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')), '') as customer_name,
                    rr.base_currency as rule_send_currency, rr.receive_currency as rule_receive_currency,
                    CASE WHEN rf.referrer_id = cl.user_id THEN 'Referrer' WHEN rf.referee_id = cl.user_id THEN 'Referee' END as referral_role
                FROM credit_ledger cl
                LEFT JOIN bonus_schemes bs ON cl.scheme_id = bs.id
                LEFT JOIN referral_rules rr ON cl.referral_rule_id = rr.id
                LEFT JOIN referrals rf ON rf.id = cl.referral_id
                LEFT JOIN customers cu ON cu.id = cl.user_id
                LEFT JOIN credit_ledger src ON src.id = cl.source_credit_id
            `;
            const params = [];

            // Add WHERE clause start if needed
            let conditions = [];
            if (!isGlobal) {
                conditions.push("cl.user_id = ?");
                params.push(userId);
            }

            // Phase 2: FRD Filters (Section 3.2)
            if (startDate) {
                conditions.push("date(cl.created_at) >= date(?)");
                params.push(startDate);
            }
            if (endDate) {
                conditions.push("date(cl.created_at) <= date(?)");
                params.push(endDate);
            }
            if (eventType) {
                conditions.push("cl.type = ?");
                params.push(eventType);
            }
            if (customerId) {
                conditions.push("cl.user_id = ?");
                params.push(customerId);
            }
            if (isReferralRule) {
                conditions.push("cl.referral_rule_id = ?");
                params.push(parseInt(schemeId.slice(3)));
            } else if (schemeId) {
                conditions.push("cl.scheme_id = ?");
                params.push(parseInt(schemeId));
            }

            if (conditions.length > 0) {
                query += " WHERE " + conditions.join(" AND ");
            }

            query += " ORDER BY cl.created_at DESC";

            // Get Filtered History (Union of Credit Ledger + Promo Redemptions)

            // 1. Credit Ledger Query
            const ledgerPromise = new Promise((resolve, reject) => {
                db.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

            // 2. Promo redemptions, read through the promo module (PROMO-MITO §8.4). Same row shape as before.
            const promoPromise = (async () => {
                // Only include promos if no specific non-APPLIED event type is requested
                if (!((!eventType || eventType === 'APPLIED') && !isReferralRule)) return [];
                const ids = [];
                if (!isGlobal) ids.push(userId);
                if (customerId) ids.push(customerId);
                if (ids.length === 2 && ids[0] !== ids[1]) return [];
                const rows = await promo.listRedemptions({ userId: ids[0], codeId: schemeId || undefined, from: startDate, to: endDate });
                const names = await hostCustomerFacts.names(rows.map((r) => r.user_id).filter(Boolean));
                return rows.map((r) => ({
                    id: r.id, created_at: r.created_at, amount: -r.discount_amount, type: 'APPLIED',
                    scheme_id: r.promo_code_id, reference_id: r.transaction_id, reason_code: 'PROMO_REDEMPTION', source_type: 'PROMO',
                    scheme_name: r.code ? `${r.code} (Promo Code)` : null, notes: r.code ? `Promo Code: ${r.code}` : null,
                    admin_user: 'System', user_id: r.user_id, currency: r.currency || 'GBP',
                    customer_name: names[r.user_id] || r.customer_name || null,
                }));
            })();

            Promise.all([ledgerPromise, promoPromise]).then(([ledgerRows, promoRows]) => {
                // Merge and Sort by Date Descending
                const allHistory = [...ledgerRows, ...promoRows].sort((a, b) => {
                    return new Date(b.created_at) - new Date(a.created_at);
                });

                // Calculate cost_incurred dynamically from exactly what's in the table
                // Use absolute values to represent the total "volume" of rewards/spending incurrence
                const dynamicCost = allHistory.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
                // Never add different currencies together (AC-1.9.3)
                const costByCurrency = {};
                allHistory.forEach(entry => {
                    const cur = entry.currency || 'GBP';
                    costByCurrency[cur] = Math.round(((costByCurrency[cur] || 0) + Math.abs(entry.amount)) * 100) / 100;
                });
                // Running balance per customer (oldest first), shown when one customer is selected (AC-1.9.4)
                const running = {};
                [...allHistory].reverse().forEach(entry => {
                    if (entry.source_type !== 'BONUS') return; // promo discounts are not wallet money
                    const key = `${entry.user_id}|${entry.currency || 'GBP'}`;
                    running[key] = Math.round(((running[key] || 0) + entry.amount) * 100) / 100;
                    entry.running_balance = running[key];
                });

                res.json({
                    balance: balance,
                    cost_incurred: dynamicCost,
                    cost_by_currency: costByCurrency,
                    currency: 'GBP',
                    history: allHistory
                });
            }).catch(err => res.status(500).json({ error: err.message }));
        });
    });
});

// 2. Manual Credit Adjustment (Grant/Void) - Phase 3 + 4: FRD  
app.post('/api/credits/manual', (req, res) => {
    const { user_id, amount, type, reason_code, notes, scheme_id, admin_user, idempotency_key } = req.body;

    // Phase 3: FRD Validations (Section 3.3)
    if (!user_id || !amount || !type) {
        return res.status(400).json({ error: "Missing required fields: user_id, amount, type" });
    }
    if (!reason_code) {
        return res.status(400).json({ error: "Reason code is required (GOODWILL, CORRECTION, MANUAL_ADJUSTMENT)" });
    }
    if (!notes || notes.trim().length === 0) {
        return res.status(400).json({ error: "Notes must be provided for manual adjustments" });
    }

    // Phase 4: Idempotency Check (FRD Section 4.2)
    if (idempotency_key) {
        db.get("SELECT * FROM credit_ledger WHERE reference_id = ?", [`idem_${idempotency_key}`], (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existing) {
                // Already processed - return existing record
                return res.json({
                    success: true,
                    id: existing.id,
                    new_balance_impact: existing.amount,
                    idempotent: true,
                    message: "Request already processed"
                });
            }
            // Not found, proceed with insertion
            performManualAdjustment();
        });
    } else {
        performManualAdjustment();
    }

    function performManualAdjustment() {
        const id = 'crd_' + Date.now();
        const parsedAmount = parseFloat(amount);
        const reference_id = idempotency_key ? `idem_${idempotency_key}` : `manual_${id}`;

        const stmt = db.prepare(`INSERT INTO credit_ledger 
            (id, user_id, amount, type, scheme_id, reference_id, reason_code, notes, admin_user) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        stmt.run(
            id,
            user_id,
            parsedAmount,
            type,
            scheme_id || null,
            reference_id,
            reason_code,
            notes,
            admin_user || 'Admin',
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, id: id, new_balance_impact: parsedAmount });
            }
        );
        stmt.finalize();
    }
});

// 3. Award Bonus Credit (with One-Time & Expiry Rules) - Phase 4: FRD
// All eligibility rules (dates, currency, thresholds, loyalty counts, segments, one-time) are enforced in bonusEngine.js.
app.post('/api/credits/award-bonus', async (req, res) => {
    try {
        res.json(await bonusEngine.awardScheme(dbq, req.body || {}));
    } catch (err) {
        sendEngineError(res, err);
    }
});

// 3b. Rhemito reports an activity that can earn a non-referral bonus (money request paid).
// Completed transfers reach the same engine through /api/referral/transfer-events.
app.post('/api/bonus/events', async (req, res) => {
    try {
        const b = req.body || {};
        if (b.type === 'MONEY_REQUEST_REFUNDED') {
            // A paid money request was refunded: take back the unused part of the bonus it earned
            if (!b.event_id) return res.status(400).json({ error: 'VALIDATION', message: 'event_id is required.' });
            return res.json({ awards: (await bonusEngine.reverseEvent(dbq, b.event_id, 'REFUNDED')).map((r) => ({ ...r, status: 'REVERSED' })) });
        }
        const awards = await bonusEngine.triggerEvent(dbq, {
            type: b.type, customer_id: b.customer_id, event_id: b.event_id, amount: b.amount, currency: b.currency,
        });
        res.json({ awards });
    } catch (err) {
        sendEngineError(res, err);
    }
});


// --- Rate Audit Log API ---

// 1. Get Audit Log Entries
app.get('/api/rate-audit-log', (req, res) => {
    const { rate_id } = req.query;
    let sql = 'SELECT * FROM rate_audit_log';
    const params = [];
    if (rate_id) {
        sql += ' WHERE rate_id = ?';
        params.push(rate_id);
    }
    sql += ' ORDER BY created_at DESC';
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// 2. Create Audit Log Entry
app.post('/api/rate-audit-log', (req, res) => {
    const { rate_id, corridor, change_type, field_name, old_value, new_value, admin_id, admin_name } = req.body;
    if (!rate_id || !change_type || !field_name || !admin_id) {
        return res.status(400).json({ error: 'Missing required fields: rate_id, change_type, field_name, admin_id' });
    }
    const stmt = db.prepare(`INSERT INTO rate_audit_log
        (rate_id, corridor, change_type, field_name, old_value, new_value, admin_id, admin_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(rate_id, corridor || '', change_type, field_name, old_value || '', new_value || '', admin_id, admin_name || '', function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
    stmt.finalize();
});

// Handle SPA routing - return index.html for all non-API routes (MUST BE LAST)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
    // Daily referral jobs (expiry of referrals and bonus credit, "offer ending" notices) — checked hourly
    const runReferralJobs = () => fetch(`http://localhost:${PORT}/api/referral/run-jobs`, { method: 'POST' }).catch(() => {});
    setTimeout(runReferralJobs, 5000);
    setInterval(runReferralJobs, 60 * 60 * 1000);
}

module.exports = app;

