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
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to the in-memory SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Merchants
        db.run(`CREATE TABLE merchants (
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
        db.run(`CREATE TABLE transactions (
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
        db.run(`CREATE TABLE forex_logs (
            id TEXT PRIMARY KEY,
            transaction_id TEXT,
            conversion_date TEXT,
            rate_applied REAL,
            amount_input_ngn REAL,
            amount_output_target REAL,
            FOREIGN KEY(transaction_id) REFERENCES transactions(id)
        )`);

        // Commissions
        db.run(`CREATE TABLE commissions (
            id TEXT PRIMARY KEY,
            transaction_id TEXT,
            base_commission_ngn REAL,
            forex_spread_ngn REAL,
            total_commission_ngn REAL,
            payout_status TEXT,
            FOREIGN KEY(transaction_id) REFERENCES transactions(id)
        )`);

        // Seed Data
        const stmt = db.prepare("INSERT INTO merchants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run("m1", "MITO001", "Business", "Global Tech Ltd", "RC12345", "contact@globaltech.com", "NGN", "USD", "Active");
        stmt.run("m2", "MITO002", "Individual", "John Doe Logistics", "N/A", "john@doelogistics.com", "NGN", "GBP", "Onboarding");
        stmt.finalize();

        // Seed Transactions, Forex, Commissions
        const tStmt = db.prepare("INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?)");
        tStmt.run("t1", "TXN100001", "m1", "Debit", 500000.00, "2024-10-24T10:30:00Z", "Successful");
        tStmt.run("t2", "TXN100002", "m2", "Debit", 150000.00, "2024-10-24T11:15:00Z", "Pending");
        tStmt.finalize();

        const fStmt = db.prepare("INSERT INTO forex_logs VALUES (?, ?, ?, ?, ?, ?)");
        fStmt.run("f1", "t1", "2024-10-24T14:00:00Z", 1545.79, 500000.00, 323.45);
        fStmt.finalize();

        const cStmt = db.prepare("INSERT INTO commissions VALUES (?, ?, ?, ?, ?, ?)");
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

        db.run(`CREATE TABLE IF NOT EXISTS email_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            code TEXT,
            segment TEXT,
            sent_at TEXT,
            status TEXT,
            campaign_id TEXT -- Link to parent campaign
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS campaign_history (
            id TEXT PRIMARY KEY,
            name TEXT,
            template_id TEXT,
            segment TEXT,
            promo_code TEXT,
            sent_count INTEGER,
            sent_at TEXT,
            status TEXT
        )`, () => {
            // Seed data
            const campStmt = db.prepare("INSERT INTO campaign_history VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            campStmt.run('camp_1', 'Welcome Blast Jan', 'welcome_v1', 'new_users', 'SAVE20', 120, '2026-01-10T10:00:00Z', 'Completed');
            campStmt.finalize();
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
            const pStmt = db.prepare(`INSERT INTO promo_codes 
                (code, type, value, min_threshold, currency, usage_limit_global, usage_count, start_date, end_date, status, restrictions) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            // Active Code
            pStmt.run('SAVE20', 'Percentage', 20, 100, 'USD', 1000, 45, '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', 'Active', '{}');

            // Disabled Code (Kill Switch Demo)
            pStmt.run('GLITCH500', 'Fixed', 500, 0, 'USD', 50, 12, '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', 'Disabled', '{}');

            // FX Boost Code
            pStmt.run('BOOSTRATE', 'FX_BOOST', 5.0, 500, 'GBP', -1, 89, '2024-06-01T00:00:00Z', '2024-08-31T23:59:59Z', 'Active', '{}');

            pStmt.finalize();

            // Sample email campaign logs
            const emailStmt = db.prepare("INSERT INTO email_logs VALUES (?, ?, ?, ?, ?, ?, ?)");
            emailStmt.run('log_demo_1', 'user_001', 'SAVE20', 'new_users', '2026-01-14T10:30:00Z', 'Sent', null);
            emailStmt.run('log_demo_2', 'user_002', 'SAVE20', 'new_users', '2026-01-14T10:30:00Z', 'Sent', null);
            emailStmt.run('log_demo_3', 'user_003', 'BOOSTRATE', 'churned_users', '2026-01-12T14:15:00Z', 'Sent', null);
            emailStmt.finalize();
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
            const stmt = db.prepare(`INSERT INTO referral_rules (name, is_enabled, min_transaction_threshold, referrer_reward, referee_reward, reward_type, base_currency) VALUES (?, ?, ?, ?, ?, ?, ?)`);
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

// 1. List Promo Codes (with last campaign sent date)
app.get('/api/promocodes', (req, res) => {
    const query = `
        SELECT p.*, MAX(e.sent_at) as last_campaign_sent
        FROM promo_codes p
        LEFT JOIN email_logs e ON p.code = e.code
        GROUP BY p.id
        ORDER BY p.start_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const processed = rows.map(r => ({
            ...r,
            restrictions: JSON.parse(r.restrictions || '{}'),
            user_segment: r.user_segment ? JSON.parse(r.user_segment) : { type: 'all' },
            user_segment_criteria: r.user_segment_criteria ? JSON.parse(r.user_segment_criteria) : {},
            last_campaign_sent: r.last_campaign_sent || null
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
        is_tiered, tiers, eligibility_rules, start_date, end_date
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`);

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

    db.run("DELETE FROM bonus_schemes WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
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
                SELECT cl.*, bs.name as scheme_name 
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

            // Cost Incurred Calculation (Bonuses + Promos)
            let costQueryCredits = "SELECT SUM(amount) as total FROM credit_ledger WHERE type = 'EARNED'";
            let costQueryPromos = "SELECT SUM(discount_amount) as total FROM promo_redemptions";
            // Check if we need to start WHERE clause for cost queries
            let costConditions = [];
            const costParams = [];

            if (!isGlobal) {
                costConditions.push("user_id = ?");
                costParams.push(userId);
            }
            if (startDate) {
                costConditions.push("date(created_at) >= date(?)");
                costParams.push(startDate);
            }
            if (endDate) {
                costConditions.push("date(created_at) <= date(?)");
                costParams.push(endDate);
            }

            if (costConditions.length > 0) {
                // Add conditional ANDs for Credits
                costConditions.forEach(cond => {
                    // Careful: 'user_id' works for both. 'created_at' works for both.
                    costQueryCredits += " AND " + cond;
                });

                // For Promos, we start with WHERE or add AND if one existed? None existed.
                if (costConditions.length > 0) {
                    costQueryPromos += " WHERE " + costConditions.join(" AND ");
                }
            }

            // Execute parallel queries for cost
            const getCredits = new Promise((resolve) => {
                db.get(costQueryCredits, costParams, (err, row) => resolve(row?.total || 0));
            });

            const getPromos = new Promise((resolve) => {
                db.get(costQueryPromos, costParams, (err, row) => resolve(row?.total || 0));
            });

            Promise.all([getCredits, getPromos]).then(([creditTotal, promoTotal]) => {
                // Cost logic: Sum of EARNED credits + Promo Discounts
                // creditTotal is Sum(amount) where type=EARNED (positive).
                // promoTotal is Sum(discount_amount) (positive).
                const costIncurred = (creditTotal || 0) + (promoTotal || 0);

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
                    if ((!eventType || eventType === 'APPLIED') && !schemeId) {
                        let pQuery = `
                            SELECT pr.id, pr.created_at, -pr.discount_amount as amount, 'APPLIED' as type, 
                            pr.promo_code_id as scheme_id, pr.transaction_id as reference_id, 
                            'PROMO_REDEMPTION' as reason_code, 
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
                        // Fix for Scheme/Promo Filter Collision
                        if (schemeId) {
                            // If schemeId is numeric, it might be a Bonus Scheme OR a Promo Code ID.
                            // If it's alphanumeric (e.g. 'SAVE20'), it's definitely a Promo Code... but frontend sends IDs.
                            // The current logic in `query` (Credit Ledger) filters `cl.scheme_id = ?`.
                            // If `schemeId` passed is a Bonus Scheme ID, we do NOT want Promo Redemptions unless that Promo is somehow linked (it isn't).
                            // So if filtering by a Bonus Scheme, Promo Redemptions should logically be EMPTY unless we want to show everything mixed.
                            // BUT, if the user selects a "Promo Code" from the dropdown (which sends an ID), we want to filter Promo Redemptions by `promo_code_id`.

                            // Heuristic: Check if schemeId matches a Promo Code ID validly?
                            // Or, since we lack a 'type' param in the filter API, we assume ambiguous ID means "Try to match both".
                            // If I select Bonus Scheme 1, I get Bonus 1 credits AND Promo 1 redemptions.
                            // This is the accepted behavior for now given the API constraint.
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

                    res.json({
                        balance: balance,
                        cost_incurred: costIncurred,
                        currency: 'GBP',
                        history: allHistory
                    });
                }).catch(err => res.status(500).json({ error: err.message }));
            });
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
    const { user_id, scheme_id, transaction_id, admin_user } = req.body;

    if (!user_id || !scheme_id) {
        return res.status(400).json({ error: "user_id and scheme_id are required" });
    }

    // Get scheme details
    db.get("SELECT * FROM bonus_schemes WHERE id = ?", [scheme_id], (err, scheme) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!scheme) return res.status(404).json({ error: "Bonus scheme not found" });

        // Phase 4: Check if scheme is expired (FRD Section 4.1)
        const now = new Date().toISOString().split('T')[0];
        if (now > scheme.end_date) {
            return res.status(400).json({
                error: "SCHEME_EXPIRED",
                message: `Bonus scheme "${scheme.name}" expired on ${scheme.end_date}`
            });
        }
        if (scheme.status !== 'ACTIVE') {
            return res.status(400).json({
                error: "SCHEME_INACTIVE",
                message: `Bonus scheme "${scheme.name}" is not active (status: ${scheme.status})`
            });
        }

        // Phase 4: One-Time Bonus Rule (FRD Section 4.1)
        // Check if user already earned from this scheme
        const rules = JSON.parse(scheme.eligibility_rules || '{}');
        const isOneTime = rules.oneTimeOnly !== false; // Default to one-time

        const checkDuplicate = (callback) => {
            if (isOneTime) {
                db.get(
                    "SELECT id, created_at FROM credit_ledger WHERE user_id = ? AND scheme_id = ? AND type = 'EARNED'",
                    [user_id, scheme_id],
                    (err, existing) => {
                        if (err) return callback(err);
                        if (existing) {
                            return res.status(409).json({
                                error: "ALREADY_EARNED",
                                message: `User has already earned bonus from "${scheme.name}" on ${existing.created_at}. This is a one-time bonus.`
                            });
                        }
                        callback(null);
                    }
                );
            } else {
                callback(null);
            }
        };

        checkDuplicate((err) => {
            if (err) return res.status(500).json({ error: err.message });

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

                    // Find matching tier
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
                        awardBonus(bonusAmount);
                    } else {
                        // No tier matched - RETURN ERROR or 0? 
                        // Usually 0 if not eligible but technically they shouldn't trigger this if not eligible.
                        // However, let's return 0 success or error. Error is clearer for debugging.
                        return res.status(400).json({
                            error: "TIER_MISMATCH",
                            message: `Transaction amount ${amount} does not match any commission tiers.`
                        });
                    }
                });
            } else {
                // Fixed or Simple Percentage
                let bonusAmount = scheme.credit_amount;

                // If Percentage but NOT Tiered, we must calculate based on transaction amount
                if (scheme.commission_type === 'PERCENTAGE') {
                    if (!transaction_id) {
                        // Fallback: If no transaction ID, we can't calculate percentage. 
                        // But if credit_amount is set (e.g. flat value stored), use it? No, percentage implies calculation.
                        return res.status(400).json({ error: "Transaction ID required for percentage commission" });
                    }

                    db.get("SELECT amount_debit_ngn FROM transactions WHERE id = ?", [transaction_id], (err, txn) => {
                        if (err) return res.status(500).json({ error: err.message });
                        if (!txn) return res.status(404).json({ error: "Transaction not found" });

                        // Use commission_percentage
                        bonusAmount = (txn.amount_debit_ngn * scheme.commission_percentage) / 100;
                        awardBonus(bonusAmount);
                    });
                    return;
                }

                // Default Fixed Amount
                awardBonus(scheme.credit_amount);
            }
        });

        function awardBonus(finalAmount) {
            const id = 'crd_' + Date.now();
            // Phase 4: Calculate expiry date (FRD Section 4.1)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 90); // 90 days from now
            const expires_at = expiryDate.toISOString().split('T')[0];

            const stmt = db.prepare(`INSERT INTO credit_ledger 
                (id, user_id, amount, type, scheme_id, reference_id, admin_user, expires_at) 
                VALUES (?, ?, ?, 'EARNED', ?, ?, ?, ?)`);

            stmt.run(
                id,
                user_id,
                finalAmount,
                scheme_id,
                transaction_id || `bonus_${id}`,
                admin_user || 'System',
                expires_at,
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
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
});

// 1. Get Campaign History
app.get('/api/campaigns', (req, res) => {
    db.all("SELECT * FROM campaign_history ORDER BY sent_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// 2. Audience Preview (Estimate Count)
app.post('/api/segments/preview', (req, res) => {
    const { segment, criteria } = req.body;

    // Mock Logic for Prototype (In real app, would query users table with filters)
    let count = 0;
    if (segment === 'new_users') count = 1250;
    else if (segment === 'churned_users') count = 450;
    else if (segment === 'all') count = 5000;
    else count = 0;

    // Simulate delay
    setTimeout(() => {
        res.json({ count: count });
    }, 500);
});

// 3. Send Campaign
app.post('/api/campaigns/send', (req, res) => {
    const { name, template_id, segment, promo_code_id, criteria } = req.body;

    // 1. Create Campaign Record
    const campaignId = 'camp_' + Date.now();
    const now = new Date().toISOString();

    // Mock Sending Logic (Reusing distribution logic simplified)
    let sentCount = 0;
    // For prototype, we just "say" we sent it.
    if (segment === 'new_users') sentCount = 1250;
    else if (segment === 'churned_users') sentCount = 450;
    else sentCount = 5000;

    const stmt = db.prepare(`INSERT INTO campaign_history 
        (id, name, template_id, segment, promo_code, sent_count, sent_at, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    stmt.run(campaignId, name, template_id, segment, promo_code_id, sentCount, now, 'Completed', function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, campaign_id: campaignId, sent_count: sentCount });
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
}

module.exports = app;

