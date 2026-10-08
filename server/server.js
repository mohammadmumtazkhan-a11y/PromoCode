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

// User segments, bonus schemes, the bonus wallet and the credit ledger are served by the bonus module (server/bonus).

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
        // user_segments, bonus_schemes and credit_ledger (with their seeds) are created by the bonus module (server/bonus/schema.js)

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

// --- Bonus module (spec BONUS_MODULE_SPEC_MITO_ADMIN.md v1.1) ---
// Owns bonus schemes, user segments, the customer's one bonus wallet (credit_ledger, every source), clawback debt,
// blocks and the Bonus admin API. The host connects other modules through its ports.
const bonus = require('./bonus');
const bonusModule = bonus.register(app, db, {
    customerDirectory: hostCustomerFacts,
    // The wallet's promo_redemptions list comes from the promo module's read function (PROMO-MITO §8.4)
    promoRedemptions: (customerId) => promo.listRedemptions({ userId: customerId }),
    // Promo redemptions shown in the admin ledger (same row shape as before; source_type 'PROMO')
    historySources: [async (f) => {
        if (!((!f.eventType || f.eventType === 'APPLIED') && !f.isReferralRule)) return [];
        const ids = [];
        if (!f.isGlobal) ids.push(f.userId);
        if (f.customerId) ids.push(f.customerId);
        if (ids.length === 2 && ids[0] !== ids[1]) return [];
        const rows = await promo.listRedemptions({ userId: ids[0], codeId: f.schemeId || undefined, from: f.startDate, to: f.endDate });
        const names = await hostCustomerFacts.names(rows.map((r) => r.user_id).filter(Boolean));
        return rows.map((r) => ({
            id: r.id, created_at: r.created_at, amount: -r.discount_amount, type: 'APPLIED',
            scheme_id: r.promo_code_id, reference_id: r.transaction_id, reason_code: 'PROMO_REDEMPTION', source_type: 'PROMO',
            scheme_name: r.code ? `${r.code} (Promo Code)` : null, notes: r.code ? `Promo Code: ${r.code}` : null,
            admin_user: 'System', user_id: r.user_id, currency: r.currency || 'GBP',
            customer_name: names[r.user_id] || r.customer_name || null,
        }));
    }],
    // Referral rule names, corridors and the customer's role, for ledger rows paid by the referral programme
    ledgerDecorator: async (rows) => {
        const ruleIds = [...new Set(rows.filter((r) => r.referral_rule_id).map((r) => r.referral_rule_id))];
        const refIds = [...new Set(rows.filter((r) => r.referral_id).map((r) => r.referral_id))];
        const rules = {}; const refs = {};
        for (const id of ruleIds) { try { rules[id] = await dbq.get('SELECT id, name, base_currency, receive_currency FROM referral_rules WHERE id = ?', [id]); } catch { /* table absent */ } }
        for (const id of refIds) { try { refs[id] = await dbq.get('SELECT referrer_id, referee_id FROM referrals WHERE id = ?', [id]); } catch { /* table absent */ } }
        for (const r of rows) {
            const rule = rules[r.referral_rule_id];
            const ref = refs[r.referral_id];
            if (rule) {
                if (!r.scheme_name) r.scheme_name = `${rule.name} (Referral)`;
                r.rule_send_currency = rule.base_currency; r.rule_receive_currency = rule.receive_currency;
            }
            r.referral_role = ref ? (ref.referrer_id === r.user_id ? 'Referrer' : ref.referee_id === r.user_id ? 'Referee' : null) : null;
        }
        return rows;
    },
    // Promo codes that target a saved segment (so the segment cannot be deleted from under them)
    segmentUsage: async (segmentId) => {
        const rows = await dbq.all('SELECT user_segment, restrictions FROM promo_codes').catch(() => []);
        const typeOf = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
        return rows.filter((r) => {
            const top = typeOf(r.user_segment); const restr = typeOf(r.restrictions);
            return String((top && top.type) || '') === String(segmentId) || String((restr && restr.user_segment && restr.user_segment.type) || '') === String(segmentId);
        }).length;
    },
}, { dbFile: path.resolve('./database.sqlite') });

// --- Referral programme (rules, referrals, reporting) ---
// See server/referral.js and Docs/Requirements/referral-and-bonus-user-stories.md
const { registerReferralRoutes } = require('./referral');
const referralHost = require('./referralHost');
const referralModule = registerReferralRoutes(app, db, {
    // The referral module's only required dependency is the rewardWallet port; the host maps the ports to the bonus module
    ...referralHost.referralPorts(),
    // The bonus module creates credit_ledger (and its seeds) first
    dependsOn: bonusModule.ready,
    // Transition (BONUS-MITO §6, PROMO-MITO C3): until Rhemito reports to POST /api/bonus/transfer-events and
    // /api/promocodes/transfer-events, both modules also hear transfer events here. Every step is idempotent, so both
    // paths running is safe, and a failure here never fails the transfer event.
    afterTransferEvent: async (ev) => {
        try { await promo.handleTransferEvent(ev); } catch (err) { console.error('[promo] transfer event not recorded', ev.transfer_id, err.message); }
        // Loyalty / threshold awards for a completed transfer; reversal and returned bonus for a cancelled or refunded one
        return bonus.transferEventForHook(ev);
    },
});
// Once the referral tables exist, the promo and bonus modules copy the customer activity they need (idempotent)
Promise.resolve(referralModule && referralModule.ready)
    // The referral seed fixes and credit links go first: the bonus backfill reads what they write
    .then(() => referralHost.finishSetup(db).catch((e) => console.error('[referral] host setup failed', e.message)))
    .then(() => Promise.all([
        promo.runBackfill().catch((e) => console.error('[promo] backfill failed', e.message)),
        bonus.runBackfill().catch((e) => console.error('[bonus] backfill failed', e.message)),
    ]));


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
    // Daily bonus jobs (credit expiry for every source, expiring reminders) — hourly, acting once per UK day
    bonus.startJobs();
    // Daily referral jobs (expiry of referrals, "offer ending" notices) — checked hourly
    const runReferralJobs = () => fetch(`http://localhost:${PORT}/api/referral/run-jobs`, { method: 'POST' }).catch(() => {});
    setTimeout(runReferralJobs, 5000);
    setInterval(runReferralJobs, 60 * 60 * 1000);
}

module.exports = app;

