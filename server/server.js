const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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
            status TEXT DEFAULT 'Active'
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

        const cStmt = db.prepare("INSERT OR IGNORE INTO commissions VALUES (?, ?, ?, ?, ?, ?)");
        cStmt.run("c1", "t1", 5000.00, 2500.00, 7500.00, "Due");
        cStmt.finalize();

        // Seed Promo Codes (Dummy Data for Kill Switch Demo)
        db.run(`CREATE TABLE IF NOT EXISTS promo_redemptions (
            id TEXT PRIMARY KEY,
            promo_code_id TEXT,
            transaction_id TEXT,
            user_id TEXT,
            discount_amount REAL,
            status TEXT,
            created_at TEXT,
            FOREIGN KEY(promo_code_id) REFERENCES promo_codes(id)
        )`, () => {
            // Seed data for cost incurred demo & Global View
            db.get("SELECT count(*) as count FROM promo_redemptions", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO promo_redemptions VALUES (?, ?, ?, ?, ?, ?, ?)");
                    // Existing Seed
                    stmt.run('pr_1', 'SAVE20', 'txn_promo_1', 'user_123', 20.00, 'Redeemed', '2024-05-15T10:00:00Z');
                    stmt.run('pr_2', 'BOOSTRATE', 'txn_promo_2', 'user_123', 5.00, 'Redeemed', '2024-06-01T14:30:00Z');

                    // NEW: Global View Dummy Data
                    stmt.run('pr_3', 'SAVE20', 'txn_promo_3', 'user_101', 20.00, 'Redeemed', '2025-01-10T09:30:00Z');
                    stmt.run('pr_4', 'SAVE20', 'txn_promo_4', 'user_102', 20.00, 'Redeemed', '2025-01-11T14:15:00Z');
                    stmt.run('pr_5', 'BOOSTRATE', 'txn_promo_5', 'user_105', 5.00, 'Redeemed', '2025-01-12T16:45:00Z');
                    stmt.finalize();
                }
            });
        });



        db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
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
        )`, () => {
            const pStmt = db.prepare(`INSERT OR IGNORE INTO promo_codes 
                (code, type, value, min_threshold, currency, usage_limit_global, usage_count, start_date, end_date, status, restrictions) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            // Active Code
            pStmt.run('SAVE20', 'Percentage', 20, 100, 'USD', 1000, 45, '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', 'Active', '{}');

            // Disabled Code (Kill Switch Demo)
            pStmt.run('GLITCH500', 'Fixed', 500, 0, 'USD', 50, 12, '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', 'Disabled', '{}');

            // FX Boost Code
            pStmt.run('BOOSTRATE', 'FX_BOOST', 5.0, 500, 'GBP', -1, 89, '2024-06-01T00:00:00Z', '2024-08-31T23:59:59Z', 'Active', '{}');

            pStmt.finalize();

        });
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
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            // Seed sample rules
            const stmt = db.prepare(`INSERT OR IGNORE INTO referral_rules (name, is_enabled, min_transaction_threshold, referrer_reward, referee_reward, reward_type, base_currency) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            stmt.run('Default UK Program', 1, 50.0, 5.00, 10.00, 'BOTH', 'GBP');
            stmt.run('US High Value', 1, 100.0, 10.00, 20.00, 'BOTH', 'USD');
            stmt.run('Nigeria Special', 0, 20000.0, 2000.00, 5000.00, 'REFEREE', 'NGN');
            stmt.finalize();
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

// --- Promo Code Logic ---

// 1. List Promo Codes
app.get('/api/promocodes', (req, res) => {
    const query = `
        SELECT *
        FROM promo_codes
        ORDER BY start_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const processed = rows.map(r => ({
            ...r,
            restrictions: JSON.parse(r.restrictions || '{}'),
            user_segment: r.user_segment ? JSON.parse(r.user_segment) : { type: 'all' },
            user_segment_criteria: r.user_segment_criteria ? JSON.parse(r.user_segment_criteria) : {}
        }));
        res.json({ data: processed });
    });
});

// 2. Create Promo Code
app.post('/api/promocodes', (req, res) => {
    const {
        code, type, value, min_threshold, max_discount, currency,
        usage_limit_global, usage_limit_per_user, budget_limit, start_date, end_date,
        restrictions, user_segment, user_segment_criteria
    } = req.body;

    // Strict Input Validation (Basic)
    if (!code || !type || !value || !start_date || !end_date) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Explicit Column Insert
    const stmt = db.prepare(`INSERT INTO promo_codes (
        code, type, value, min_threshold, max_discount, currency, 
        usage_limit_global, usage_limit_per_user, budget_limit, 
        start_date, end_date, status, restrictions, user_segment, user_segment_criteria
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    // Reliable parsing helper
    const parseNum = (val, isInt = false) => {
        if (val === '' || val === null || val === undefined) return null;
        const num = isInt ? parseInt(val) : parseFloat(val);
        return Number.isNaN(num) ? null : num;
    };

    console.log('[DEBUG] Creating Promo Payload:', { code, type, value });

    stmt.run(
        code.toUpperCase(),
        type,
        parseNum(value),
        parseNum(min_threshold) || 0,
        parseNum(max_discount),
        currency || null,
        parseNum(usage_limit_global, true) || -1,
        parseNum(usage_limit_per_user, true) || 1,
        parseNum(budget_limit) || -1,
        start_date,
        end_date,
        'Active',
        JSON.stringify(restrictions || {}),
        JSON.stringify(user_segment || { type: 'all' }),
        JSON.stringify(user_segment_criteria || {}),
        function (err) {
            if (err) {
                console.error("[ERROR] Insert Failed:", err);
                if (err.message.includes('UNIQUE')) return res.status(409).json({ error: "Promo code already exists" });
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
    stmt.finalize();
});

// 3. Bulk Generate Codes (Story 1.3)
const crypto = require('crypto');
app.post('/api/promocodes/generate', (req, res) => {
    const { batch_size, prefix, config } = req.body;
    let createdCount = 0;

    db.serialize(() => {
        const stmt = db.prepare(`INSERT INTO promo_codes (
            code, type, value, min_threshold, max_discount, currency, 
            usage_limit_global, usage_limit_per_user, budget_limit, 
            start_date, end_date, status, restrictions, user_segment, user_segment_criteria
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        for (let i = 0; i < batch_size; i++) {
            const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
            const code = (prefix ? prefix + '-' : '') + randomStr;

            stmt.run(
                code, config.type, config.value, config.min_threshold || 0, config.max_discount, config.currency,
                config.usage_limit_global || -1, config.usage_limit_per_user || 1, config.budget_limit || -1,
                config.start_date, config.end_date, 'Active',
                JSON.stringify(config.restrictions || {}),
                JSON.stringify(config.user_segment || { type: 'all' }),
                JSON.stringify(config.user_segment_criteria || {}),
                (err) => {
                    if (!err) createdCount++;
                }
            );
        }
        stmt.finalize(() => {
            res.json({ success: true, message: `Batch generation initiated for ${batch_size} codes.` });
        });
    });
});

// 4. Toggle Status / Emergency Kill Switch (Story 1.4)
app.put('/api/promocodes/:id/status', (req, res) => {
    const { status } = req.body; // 'Active' or 'Disabled'
    db.run("UPDATE promo_codes SET status = ? WHERE id = ?", [status, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 5. User Journey: Validate Code (Story 3.1)
app.post('/api/promocodes/validate', (req, res) => {
    const { code, amount, currency, userId, source_currency, dest_currency, payment_method } = req.body;

    db.get("SELECT * FROM promo_codes WHERE code = ?", [code.toUpperCase()], (err, promo) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!promo) return res.status(404).json({ error: "Invalid promo code" });

        const now = new Date();
        if (promo.status !== 'Active' || new Date(promo.start_date) > now || new Date(promo.end_date) < now) {
            return res.status(400).json({ error: "Promo code expired or inactive" });
        }

        // Global Cap (Count)
        if (promo.usage_limit_global !== -1 && promo.usage_count >= promo.usage_limit_global) {
            return res.status(400).json({ error: "Promo code fully redeemed (Count Limit)" });
        }

        // Global Cap (Budget)
        if (promo.budget_limit !== -1 && promo.total_discount_utilized >= promo.budget_limit) {
            return res.status(400).json({ error: "Promo code fully redeemed (Budget Limit)" });
        }

        // Threshold
        if (amount < promo.min_threshold) {
            return res.status(400).json({ error: `Transfer amount too low (Min: ${promo.min_threshold})` });
        }

        const restrictions = JSON.parse(promo.restrictions || '{}');
        const userSeg = promo.user_segment ? JSON.parse(promo.user_segment) : { type: 'all' };
        const userCrit = promo.user_segment_criteria ? JSON.parse(promo.user_segment_criteria) : {};

        // Validations...
        if (restrictions.corridors?.length > 0) {
            const corridorKey = `${source_currency}-${dest_currency}`;
            if (!restrictions.corridors.includes(corridorKey)) {
                return res.status(400).json({ error: "Code not valid for this corridor" });
            }
        }

        if (restrictions.payment_methods?.length > 0) {
            if (!restrictions.payment_methods.includes(payment_method)) {
                return res.status(400).json({ error: "Code not valid for this payment method" });
            }
        }

        // Continue validation...
        res.json({
            valid: true,
            promo: promo,
            display_text: "Code Valid"
        });
    });
});

// 6. User Journey: Apply/Lock Code
app.post('/api/promocodes/apply', (req, res) => {
    const { code, discount_amount } = req.body;

    // Simple update for prototype
    db.run("UPDATE promo_codes SET usage_count = usage_count + 1, total_discount_utilized = total_discount_utilized + ? WHERE code = ?",
        [discount_amount, code],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// 7. Segments
app.get('/api/segments', (req, res) => {
    res.json({ data: { new_users: 10, churned_users: 5 } }); // Mock
});

// 8. Distribute Promos (Story 2.0)
app.post('/api/promocodes/distribute', (req, res) => {
    const { segment, promo_config, criteria, existing_code_id } = req.body;

    const distributeToTargets = (targets) => {
        if (targets.length === 0) return res.json({ success: true, count: 0, message: "No users in segment" });

        const now = new Date().toISOString();

        // If distributing an EXISTING code, just log the campaign without creating new codes
        if (existing_code_id) {
            db.serialize(() => {
                const logStmt = db.prepare("INSERT INTO email_logs VALUES (?, ?, ?, ?, ?, ?)");
                let count = 0;
                targets.forEach(user => {
                    logStmt.run('log_' + Date.now() + '_' + count, user.id, existing_code_id, segment, now, 'Sent');
                    console.log(`[EMAIL SIMULATION] Sending existing code ${existing_code_id} to ${user.email}`);
                    count++;
                });
                logStmt.finalize();
                res.json({ success: true, count, segment, existing_code: existing_code_id });
            });
            return;
        }

        // Otherwise, create NEW unique codes for each target
        db.serialize(() => {
            const stmt = db.prepare(`INSERT INTO promo_codes (
                id, code, type, value, min_threshold, max_discount, currency, 
                usage_limit_global, usage_limit_per_user, budget_limit, 
                start_date, end_date, status, restrictions, user_segment, user_segment_criteria
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            const logStmt = db.prepare("INSERT INTO email_logs VALUES (?, ?, ?, ?, ?, ?)");

            let count = 0;
            const parseNum = (val, isInt = false) => {
                if (val === '' || val === null || val === undefined) return null;
                const num = isInt ? parseInt(val) : parseFloat(val);
                return Number.isNaN(num) ? null : num;
            };

            targets.forEach(user => {
                const uniqueCode = (promo_config.prefix || 'OFFER') + Math.random().toString(36).substring(7).toUpperCase();
                const id = 'pc_' + Date.now() + '_' + count;
                const restrictions = { ...promo_config.restrictions };
                if (promo_config.corridors) restrictions.corridors = promo_config.corridors;
                if (promo_config.affiliates) restrictions.affiliates = promo_config.affiliates;

                stmt.run(
                    id, uniqueCode, promo_config.type, parseNum(promo_config.value), parseNum(promo_config.min_threshold) || 0,
                    parseNum(promo_config.max_discount), promo_config.currency || null, 1, 1, -1,
                    promo_config.start_date, promo_config.end_date, 'Active',
                    JSON.stringify(restrictions),
                    JSON.stringify({ type: 'targeted', user_id: user.id }),
                    JSON.stringify({})
                );

                logStmt.run('log_' + Date.now() + '_' + count, user.id, uniqueCode, segment, now, 'Sent');
                console.log(`[EMAIL SIMULATION] Sending code ${uniqueCode} to ${user.email}`);
                count++;
            });

            stmt.finalize();
            logStmt.finalize();
            res.json({ success: true, count, segment });
        });
    };

    // 1. Check if Segment is Dynamic (Numeric ID)
    if (!isNaN(segment)) {
        db.get("SELECT * FROM user_segments WHERE id = ?", [segment], (err, segRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!segRow) return res.status(404).json({ error: "Segment not found" });

            const crit = JSON.parse(segRow.criteria || '{}');
            let sql = "SELECT m.* FROM merchants m ";
            const params = [];

            // Build Dynamic Query
            if (crit.type === 'TRANSACTION_COUNT' || crit.type === 'TRANSACTION_VOLUME') {
                sql += " LEFT JOIN transactions t ON t.merchant_id = m.id ";

                // Time Period Filter (Moved to ON clause for LEFT JOIN)
                if (crit.period_days) {
                    sql += " AND t.debit_date >= date('now', '-' || ? || ' days') ";
                    params.push(crit.period_days);
                }

                sql += " GROUP BY m.id ";

                // Aggregation Filter
                if (crit.type === 'TRANSACTION_COUNT') {
                    // Count(t.id) handles NULLs correctly (returns 0)
                    sql += " HAVING COUNT(t.id) >= ? ";
                    params.push(crit.min || 0);
                    if (crit.max !== null && crit.max !== undefined) {
                        sql += " AND COUNT(t.id) <= ? ";
                        params.push(crit.max);
                    }
                } else { // VOLUME
                    // Use COALESCE to handle NULL sums as 0
                    sql += " HAVING COALESCE(SUM(t.amount_debit_ngn), 0) >= ? ";
                    params.push(crit.min || 0);
                    if (crit.max !== null && crit.max !== undefined) {
                        sql += " AND COALESCE(SUM(t.amount_debit_ngn), 0) <= ? ";
                        params.push(crit.max);
                    }
                }
            } else {
                // Default: All merchants if no valid type
                // Or maybe 'New Users' logic if we implemented 'ACCOUNT_AGE'
            }

            console.log("[DEBUG] Segment Query:", sql, params);

            db.all(sql, params, (err, users) => {
                if (err) return res.status(500).json({ error: err.message });
                distributeToTargets(users);
            });
        });
    } else {
        // 2. Handle 'all' users or Invalid
        if (segment === 'all') {
            db.all("SELECT * FROM merchants", [], (err, users) => {
                if (err) return res.status(500).json({ error: err.message });
                distributeToTargets(users);
            });
        } else {
            return res.status(400).json({ error: "Invalid segment ID. Use a numeric ID or 'all'." });
        }
    }
});

// --- Phase 1: Referral Scheme API (CRUD) ---

// 1. Get All Referral Rules
app.get('/api/referral-rules', (req, res) => {
    db.all("SELECT * FROM referral_rules ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// 2. Create New Referral Rule
app.post('/api/referral-rules', (req, res) => {
    const { name, is_enabled, min_transaction_threshold, referrer_reward, referee_reward, reward_type, base_currency } = req.body;

    if (!name) return res.status(400).json({ error: "Name is required" });

    // Check if currency already exists
    db.get("SELECT id, name FROM referral_rules WHERE base_currency = ?", [base_currency], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });

        if (existing) {
            return res.status(409).json({
                error: "DUPLICATE_CURRENCY",
                message: `A referral rule for ${base_currency} already exists ("${existing.name}"). Please edit or delete it first.`,
                existing_rule: existing
            });
        }

        // Proceed with creation
        const enabledInt = is_enabled ? 1 : 0;
        const stmt = db.prepare(`INSERT INTO referral_rules 
            (name, is_enabled, min_transaction_threshold, referrer_reward, referee_reward, reward_type, base_currency) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`);

        stmt.run(name, enabledInt, min_transaction_threshold, referrer_reward, referee_reward, reward_type, base_currency, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
        stmt.finalize();
    });
});

// 3. Update Referral Rule
app.put('/api/referral-rules/:id', (req, res) => {
    const { id } = req.params;
    const { name, is_enabled, min_transaction_threshold, referrer_reward, referee_reward, reward_type, base_currency } = req.body;

    // Check if another rule already uses this currency
    db.get("SELECT id, name FROM referral_rules WHERE base_currency = ? AND id != ?", [base_currency, id], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });

        if (existing) {
            return res.status(409).json({
                error: "DUPLICATE_CURRENCY",
                message: `Another rule ("${existing.name}") already uses ${base_currency}. Please delete it first.`,
                existing_rule: existing
            });
        }

        // Proceed with update
        const enabledInt = is_enabled ? 1 : 0;

        const stmt = db.prepare(`UPDATE referral_rules SET 
            name = ?,
            is_enabled = ?, 
            min_transaction_threshold = ?, 
            referrer_reward = ?, 
            referee_reward = ?, 
            reward_type = ?, 
            base_currency = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`);

        stmt.run(name, enabledInt, min_transaction_threshold, referrer_reward, referee_reward, reward_type, base_currency, id, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
        stmt.finalize();
    });
});

// 4. Delete Referral Rule
app.delete('/api/referral-rules/:id', (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM referral_rules WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

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
    const { startDate, endDate, eventType, schemeId } = req.query;

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
                SELECT cl.*, 'BONUS' as source_type, bs.name as scheme_name 
                FROM credit_ledger cl
                LEFT JOIN bonus_schemes bs ON cl.scheme_id = bs.id
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
            if (schemeId) {
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

            // 2. Promo Redemptions Query
            const promoPromise = new Promise((resolve, reject) => {
                // Only include promos if no specific non-APPLIED event type is requested
                if (!eventType || eventType === 'APPLIED') {
                    let pQuery = `
                        SELECT pr.id, pr.created_at, -pr.discount_amount as amount, 'APPLIED' as type, 
                        pr.promo_code_id as scheme_id, pr.transaction_id as reference_id, 
                        'PROMO_REDEMPTION' as reason_code, 
                        'PROMO' as source_type,
                        (pc.code || ' (Promo Code)') as scheme_name,
                        ('Promo Code: ' || pc.code) as notes,
                        'System' as admin_user,
                        pr.user_id
                        FROM promo_redemptions pr
                        LEFT JOIN promo_codes pc ON (pr.promo_code_id = pc.id OR pr.promo_code_id = pc.code)
                    `;
                    const pParams = [];
                    let pConditions = [];

                    if (!isGlobal) {
                        pConditions.push("pr.user_id = ?");
                        pParams.push(userId);
                    }
                    if (startDate) {
                        pConditions.push("date(pr.created_at) >= date(?)");
                        pParams.push(startDate);
                    }
                    if (endDate) {
                        pConditions.push("date(pr.created_at) <= date(?)");
                        pParams.push(endDate);
                    }
                    // Fix for Scheme/Promo Filter Collision - Now works even when filtering
                    if (schemeId) {
                        pConditions.push("(pr.promo_code_id = ? OR pr.promo_code_id = (SELECT code FROM promo_codes WHERE id = ?))");
                        pParams.push(schemeId);
                        pParams.push(schemeId);
                    }

                    if (pConditions.length > 0) {
                        pQuery += " WHERE " + pConditions.join(" AND ");
                    }

                    db.all(pQuery, pParams, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    });
                } else {
                    resolve([]);
                }
            });

            Promise.all([ledgerPromise, promoPromise]).then(([ledgerRows, promoRows]) => {
                // Merge and Sort by Date Descending
                const allHistory = [...ledgerRows, ...promoRows].sort((a, b) => {
                    return new Date(b.created_at) - new Date(a.created_at);
                });

                // Calculate cost_incurred dynamically from exactly what's in the table
                // Use absolute values to represent the total "volume" of rewards/spending incurrence
                const dynamicCost = allHistory.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

                res.json({
                    balance: balance,
                    cost_incurred: dynamicCost,
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
app.post('/api/credits/award-bonus', (req, res) => {
    const { user_id, scheme_id, transaction_id, admin_user, idempotency_key } = req.body;

    if (!user_id || !scheme_id) {
        return res.status(400).json({ error: "user_id and scheme_id are required" });
    }

    // Phase 4: Idempotency Check (FRD Section 4.2)
    if (idempotency_key) {
        const checkIdemStmt = db.prepare("SELECT * FROM credit_ledger WHERE reference_id = ?");
        checkIdemStmt.get([`idem_${idempotency_key}`], (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existing) {
                return res.json({
                    success: true,
                    id: existing.id,
                    amount: existing.amount,
                    idempotent: true,
                    message: "Bonus already awarded (Idempotent)"
                });
            }
            // Not found, proceed
            processAwarding(idempotency_key);
        });
        checkIdemStmt.finalize();
    } else {
        processAwarding(null);
    }

    function processAwarding(idemKey) {
        // Get scheme details
        db.get("SELECT * FROM bonus_schemes WHERE id = ?", [scheme_id], (err, scheme) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!scheme) return res.status(404).json({ error: "Bonus scheme not found" });

            // 1. Status Check
            if (scheme.status !== 'ACTIVE') {
                return res.status(400).json({
                    error: "SCHEME_INACTIVE",
                    message: `Bonus scheme "${scheme.name}" is not active (status: ${scheme.status})`
                });
            }

            // 2. Date Validity Check (Strict Parsing)
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Check Start Date
            if (scheme.start_date && todayStr < scheme.start_date) {
                return res.status(400).json({
                    error: "SCHEME_NOT_STARTED",
                    message: `Bonus scheme "${scheme.name}" has not started yet (starts ${scheme.start_date})`
                });
            }

            // Check End Date
            if (scheme.end_date && todayStr > scheme.end_date) {
                return res.status(400).json({
                    error: "SCHEME_EXPIRED",
                    message: `Bonus scheme "${scheme.name}" expired on ${scheme.end_date}`
                });
            }

            // 3. Eligibility Rules
            const rules = JSON.parse(scheme.eligibility_rules || '{}');

            // 3a. Segment Check
            if (rules.segments && Array.isArray(rules.segments) && rules.segments.length > 0 && !rules.segments.includes('all')) {
                // Verify against first segment (FRD implies one segment per rule usually, or ANY?)
                // Assuming ANY match is sufficient or ALL? UI allows single selection usually.
                // We will check all listed segments. If user matches ANY, they are eligible.
                // If the list is inclusive.

                const segmentIds = rules.segments;

                // Helper to check a single segment - wrapped in Promise
                const verifySegment = (segId) => {
                    return new Promise((resolve, reject) => {
                        db.get("SELECT * FROM user_segments WHERE id = ?", [segId], (err, segment) => {
                            if (err) return reject(err);
                            if (!segment) return resolve(false); // Segment doesn't exist? Fail.

                            const criteria = JSON.parse(segment.criteria || '{}');

                            // 1. Check User/Merchant Created At (Registration Date)
                            // Note: `user_id` passed to this endpoint corresponds to `merchants.mito_id` or `id`?
                            // Based on test usage 'user_test_fixed_1', it seems to be an arbitrary ID string.
                            // In real usages, it should match `merchants.id` or `merchants.mito_id`.
                            // Let's assume `user_id` matches `merchants.id` for joining.
                            db.get("SELECT created_at FROM merchants WHERE id = ?", [user_id], (err, merchant) => {
                                // If merchant not found, we can't verify registration date.
                                // If strict, fail. If relaxed, ignore?
                                // Let's proceed if merchant exists.

                                if (criteria.signup_start_date || criteria.signup_end_date) {
                                    if (!merchant || !merchant.created_at) {
                                        // If we can't verify date, assume fail if date criteria exists
                                        return resolve(false);
                                    }
                                    const signupDate = new Date(merchant.created_at);

                                    if (criteria.signup_start_date && signupDate < new Date(criteria.signup_start_date)) {
                                        return resolve(false);
                                    }
                                    if (criteria.signup_end_date && signupDate > new Date(criteria.signup_end_date)) {
                                        return resolve(false);
                                    }
                                }

                                // If type is NEW_USER, we strictly check date and ignore transactions (or ensure count is 0 if implied? "New User" usually implies just date.)
                                // The user asked for "New User" option strictly.
                                if (criteria.type === 'NEW_USER') {
                                    // If we passed the date check above (which returns false if fail), we are good.
                                    // But wait, the date check above returns `resolve(false)` on failure, but doesn't return `resolve(true)` on pass.
                                    // It falls through to transaction query.

                                    // Update: User requested transaction filter for NEW_USER as well.
                                    // So we simply fall through to the transaction query below.
                                    // No short-circuit.
                                    // return resolve(true);
                                }

                                // 2. Query Transactions
                                // Note: transactions table uses `merchant_id` to link to user.
                                let query = "SELECT COUNT(*) as count, SUM(amount_debit_ngn) as volume FROM transactions WHERE merchant_id = ?";
                                let params = [user_id];
                                // ... existing transaction query logic ...


                                // Date filter for transactions
                                if (criteria.period_days) {
                                    const date = new Date();
                                    date.setDate(date.getDate() - criteria.period_days);
                                    query += " AND created_at >= ?"; // Note: check transactions schema for created_at vs debit_date
                                    // Schema said `debit_date`. created_at wasn't listed in PRAGMA for transactions?
                                    // Wait, PRAGMA output for transactions: id, ref_number, merchant_id, type, amount_debit_ngn, debit_date, status.
                                    // It MISSES created_at.
                                    // We should use `debit_date`.
                                    params.push(date.toISOString());
                                }

                                // Fix query to use debit_date if created_at missing
                                if (criteria.period_days) {
                                    // Re-construct query with correct column
                                    query = "SELECT COUNT(*) as count, SUM(amount_debit_ngn) as volume FROM transactions WHERE merchant_id = ? AND debit_date >= ?";
                                }

                                db.get(query, params, (err, stats) => {
                                    if (err) return reject(err);
                                    const count = stats.count || 0;
                                    const volume = stats.volume || 0;

                                    if (criteria.type === 'TRANSACTION_COUNT') {
                                        if (count >= criteria.min && (criteria.max === null || count <= criteria.max)) {
                                            return resolve(true);
                                        }
                                    } else if (criteria.type === 'TRANSACTION_VOLUME') {
                                        if (volume >= criteria.min && (criteria.max === null || volume <= criteria.max)) {
                                            return resolve(true);
                                        }
                                    }
                                    resolve(false);
                                });
                            });
                        });
                    });
                };

                // Execute Checks
                // We need to wait for checks. Since we are in callback hell, let's use async/await wrapper or simple recursive check?
                // Actually, `processAwarding` is not async.
                // We must use a callback-based approach or Promise chain.
                // Refactoring `processAwarding` to be async is easiest.
                // But `sqlite` driver is callback based.
                // I'll call a helper function `checkSegments(ids, callback)`.

                checkSegments(segmentIds, (err, isEligible) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (!isEligible) {
                        return res.status(403).json({
                            error: "USER_INELIGIBLE",
                            message: "User does not meet the requirements for this bonus segment."
                        });
                    }
                    // Proceed to next step
                    checkOneTime();
                });
                return; // Stop execution, wait for callback
            } else {
                checkOneTime();
            }

            function checkSegments(ids, cb) {
                // Check sequentially or parallel. Parallel is fine.
                let checks = ids.map(id => verifySegment(id)); // verifySegment must be hoisted or defined
                Promise.all(checks).then(results => {
                    // If ANY true?
                    const pass = results.some(r => r === true);
                    cb(null, pass);
                }).catch(err => cb(err));
            }



            // 3b. One-Time Bonus Rule
            function checkOneTime() {
                const isOneTime = rules.oneTimeOnly !== false;
                // ... logic continues ...
                doCheckDuplicate();
            }

            function doCheckDuplicate() {
                const isOneTime = rules.oneTimeOnly !== false;
                // ... duplicate code moved here ...
                if (isOneTime) {
                    db.get(
                        "SELECT id, created_at FROM credit_ledger WHERE user_id = ? AND scheme_id = ? AND type = 'EARNED'",
                        [user_id, scheme_id],
                        (err, existing) => {
                            if (err) return res.status(500).json({ error: err.message });
                            if (existing) {
                                return res.status(409).json({
                                    error: "ALREADY_EARNED",
                                    message: `User has already earned bonus from "${scheme.name}" on ${existing.created_at}. This is a one-time bonus.`
                                });
                            }
                            calculateAndAward();
                        }
                    );
                } else {
                    calculateAndAward();
                }
            }

            function calculateAndAward() {
                // ... Existing calculation logic ...
                // Calculate Bonus Amount
                if (scheme.is_tiered) {
                    if (!transaction_id) {
                        return res.status(400).json({ error: "Transaction ID is required for tiered commissions" });
                    }

                    db.get("SELECT amount_debit_ngn FROM transactions WHERE id = ?", [transaction_id], (err, txn) => {
                        if (err) return res.status(500).json({ error: err.message });
                        if (!txn) return res.status(404).json({ error: "Transaction not found for tiered calculation" });

                        const amount = txn.amount_debit_ngn;
                        const tiers = JSON.parse(scheme.tiers || '[]');
                        let bonusAmount = 0;

                        const matchedTier = tiers.find(t => {
                            const min = parseFloat(t.min);
                            const max = t.max ? parseFloat(t.max) : Infinity;
                            return amount >= min && amount <= max;
                        });

                        if (matchedTier) {
                            if (scheme.commission_type === 'PERCENTAGE') {
                                bonusAmount = (amount * parseFloat(matchedTier.value)) / 100;
                            } else {
                                bonusAmount = parseFloat(matchedTier.value);
                            }
                            awardBonus(bonusAmount, idemKey);
                        } else {
                            return res.status(400).json({
                                error: "TIER_MISMATCH",
                                message: `Transaction amount ${amount} does not match any commission tiers.`
                            });
                        }
                    });
                } else {
                    let bonusAmount = scheme.credit_amount;
                    if (scheme.commission_type === 'PERCENTAGE') {
                        if (!transaction_id) {
                            return res.status(400).json({ error: "Transaction ID required for percentage commission" });
                        }

                        db.get("SELECT amount_debit_ngn FROM transactions WHERE id = ?", [transaction_id], (err, txn) => {
                            if (err) return res.status(500).json({ error: err.message });
                            if (!txn) return res.status(404).json({ error: "Transaction not found" });

                            bonusAmount = (txn.amount_debit_ngn * scheme.commission_percentage) / 100;
                            awardBonus(bonusAmount, idemKey);
                        });
                        return;
                    }

                    awardBonus(scheme.credit_amount, idemKey);
                }
            }

            function awardBonus(finalAmount, key) {
                // ... (Keep existing awardBonus logic) ...
                const id = 'crd_' + Date.now();
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 90);
                const expires_at = expiryDate.toISOString().split('T')[0];

                const refId = key ? `idem_${key}` : (transaction_id || `bonus_${id}`);

                const stmt = db.prepare(`INSERT INTO credit_ledger 
                    (id, user_id, amount, type, scheme_id, reference_id, admin_user, expires_at) 
                    VALUES (?, ?, ?, 'EARNED', ?, ?, ?, ?)`);

                stmt.run(
                    id,
                    user_id,
                    finalAmount,
                    scheme_id,
                    refId,
                    admin_user || 'System',
                    expires_at,
                    function (err) {
                        if (err) {
                            if (err.message.includes('UNIQUE')) {
                                return res.status(409).json({ error: "Duplicate bonus award (Reference conflict)" });
                            }
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({
                            success: true,
                            id: id,
                            amount: finalAmount,
                            expires_at: expires_at,
                            scheme_name: scheme.name
                        });
                    }
                );
                stmt.finalize();
            }
        });
    }
});


// Handle SPA routing - return index.html for all non-API routes (MUST BE LAST)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;

