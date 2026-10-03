// Referral & Bonus engine (see Docs/Requirements/referral-and-bonus-user-stories.md)
// Owns: referral rules, customers' referral codes, referrals, link visits,
// offer notifications, bonus wallet (on top of credit_ledger) and admin reporting.
const crypto = require('crypto');

// ---------- small helpers ----------
const clock = { now: () => new Date() };

const UK_TZ = 'Europe/London';
const ukDate = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: UK_TZ }); // YYYY-MM-DD
const addDays = (ymd, days) => {
    const d = new Date(`${ymd}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Number(days));
    return d.toISOString().slice(0, 10);
};
const ukToday = () => ukDate(clock.now());
const nowIso = () => clock.now().toISOString();
const newId = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const SUPPORTED_CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'ZAR', 'KES', 'GHS', 'AED'];
const ZERO_DECIMAL = ['JPY'];
const SYMBOLS = { GBP: '£', USD: '$', EUR: '€', NGN: '₦', CAD: 'C$', AUD: 'A$', JPY: '¥', CNY: '¥', INR: '₹', ZAR: 'R', KES: 'KSh', GHS: 'GH₵', AED: 'AED ' };
const money = (amount, currency) => {
    const dp = ZERO_DECIMAL.includes(currency) ? 0 : 2;
    return `${SYMBOLS[currency] || currency + ' '}${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
};
// A referral rule applies to a corridor: the currency the customer sends and the currency the recipient receives
const corridorLabel = (send, receive) => (receive ? `${send} → ${receive}` : `${send} (all destinations)`);
const maskName = (first, last) => `${first || 'Customer'}${last ? ' ' + last.trim()[0].toUpperCase() + '.' : ''}`;
const fmtUkDate = (ymd) => (ymd ? ymd.split('-').reverse().join('/') : '');

function promisify(db) {
    return {
        run: (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (err) { err ? rej(err) : res(this); })),
        get: (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => (err ? rej(err) : res(row)))),
        all: (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows || [])))),
    };
}

// ---------- schema ----------
async function addColumnIfMissing(q, table, column, ddl) {
    const cols = await q.all(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === column)) await q.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

async function initSchema(db) {
    const q = promisify(db);
    await q.run(`CREATE TABLE IF NOT EXISTS referral_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, is_enabled INTEGER DEFAULT 1,
        min_transaction_threshold REAL DEFAULT 100.0, referrer_reward REAL DEFAULT 5.0, referee_reward REAL DEFAULT 10.0,
        reward_type TEXT DEFAULT 'BOTH', base_currency TEXT DEFAULT 'GBP',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
    await addColumnIfMissing(q, 'referral_rules', 'qualification_window_days', 'INTEGER DEFAULT 30');
    await addColumnIfMissing(q, 'referral_rules', 'bonus_validity_days', 'INTEGER DEFAULT 90');
    await addColumnIfMissing(q, 'referral_rules', 'max_referrals_per_referrer', 'INTEGER');
    await addColumnIfMissing(q, 'referral_rules', 'min_redeem_amount', 'REAL DEFAULT 0');
    await addColumnIfMissing(q, 'referral_rules', 'start_date', 'TEXT');
    await addColumnIfMissing(q, 'referral_rules', 'end_date', 'TEXT');
    await addColumnIfMissing(q, 'referral_rules', 'is_archived', 'INTEGER DEFAULT 0');
    await addColumnIfMissing(q, 'referral_rules', 'archived_at', 'TEXT');
    // Corridor: the receive currency. NULL only on rules created before corridors existed ("any destination") until an admin edits them.
    await addColumnIfMissing(q, 'referral_rules', 'receive_currency', 'TEXT');

    await q.run(`CREATE TABLE IF NOT EXISTS referral_rule_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT, rule_id INTEGER, field TEXT, old_value TEXT, new_value TEXT,
        admin_user TEXT, created_at TEXT)`);

    await q.run(`CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY, first_name TEXT, last_name TEXT, email TEXT, phone TEXT, country TEXT,
        send_currency TEXT, kyc_status TEXT DEFAULT 'PENDING', account_status TEXT DEFAULT 'ACTIVE',
        device_id TEXT, payment_fingerprints TEXT DEFAULT '[]', referral_code TEXT UNIQUE, created_at TEXT)`);

    await q.run(`CREATE TABLE IF NOT EXISTS referral_link_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, referrer_id TEXT, currency TEXT, visitor_id TEXT, created_at TEXT)`);

    await q.run(`CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY, referrer_id TEXT, referee_id TEXT UNIQUE, code TEXT, rule_id INTEGER, currency TEXT,
        reward_type TEXT, referrer_reward REAL DEFAULT 0, referee_reward REAL DEFAULT 0, floor REAL,
        qualification_window_days INTEGER, bonus_validity_days INTEGER, qualification_deadline TEXT,
        status TEXT, status_reason TEXT, registered_at TEXT,
        qualifying_transfer_id TEXT, qualifying_amount REAL, pending_at TEXT, rewarded_at TEXT,
        referrer_credited REAL DEFAULT 0, referee_credited REAL DEFAULT 0, reversed_at TEXT,
        approved_by TEXT, approval_reason TEXT, updated_at TEXT)`);

    await q.run(`CREATE TABLE IF NOT EXISTS referral_transfers (
        transfer_id TEXT PRIMARY KEY, customer_id TEXT, amount REAL, currency TEXT, status TEXT,
        created_at TEXT, updated_at TEXT)`);

    await q.run(`CREATE TABLE IF NOT EXISTS referral_offer_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT, rule_id INTEGER, currency TEXT, kind TEXT, title TEXT, message TEXT, created_at TEXT)`);
    await addColumnIfMissing(q, 'referral_offer_notifications', 'receive_currency', 'TEXT');
    await addColumnIfMissing(q, 'referral_link_visits', 'receive_currency', 'TEXT');
    await addColumnIfMissing(q, 'referrals', 'receive_currency', 'TEXT');
    await addColumnIfMissing(q, 'referrals', 'referrer_deadline', 'TEXT');
    await addColumnIfMissing(q, 'referral_transfers', 'receive_currency', 'TEXT');

    // credit_ledger gains currency + referral linkage + per-credit tracking
    await q.run(`CREATE TABLE IF NOT EXISTS credit_ledger (
        id TEXT PRIMARY KEY, user_id TEXT, amount REAL, type TEXT, scheme_id INTEGER, reference_id TEXT,
        reason_code TEXT, notes TEXT, admin_user TEXT, admin_user_id TEXT, expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
    await addColumnIfMissing(q, 'credit_ledger', 'currency', "TEXT DEFAULT 'GBP'");
    await addColumnIfMissing(q, 'credit_ledger', 'referral_id', 'TEXT');
    await addColumnIfMissing(q, 'credit_ledger', 'referral_rule_id', 'INTEGER');
    await addColumnIfMissing(q, 'credit_ledger', 'source_credit_id', 'TEXT');
    await addColumnIfMissing(q, 'credit_ledger', 'transfer_id', 'TEXT');

    await q.run(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT)`);
    await runDataMigrations(q);
}

// One-off data corrections for the seeded prototype data (US-1.9)
async function runDataMigrations(q) {
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
    await q.run(`INSERT INTO schema_migrations (name, applied_at) VALUES ('referral_v1_seed_fix', ?)`, [nowIso()]);
}

// ---------- rules ----------
function ruleStatus(rule, today = ukToday()) {
    if (rule.is_archived) return 'ARCHIVED';
    if (rule.end_date && rule.end_date < today) return 'ENDED';
    if (!rule.is_enabled) return 'INACTIVE';
    if (rule.start_date && rule.start_date > today) return 'SCHEDULED';
    return 'ACTIVE';
}
const isLive = (rule) => !!rule && ruleStatus(rule) === 'ACTIVE';

// Deadlines counted from the referee's registration day.
// The referrer is only rewarded inside the Qualification Window. The referee's bonus can still be earned, on a transfer
// of at least the Floor, until Bonus Validity ends. `qualification_deadline` is the later of the two (when the referee is rewarded).
const referrerDeadlineFor = (rule, day) => addDays(day, rule.qualification_window_days || 30);
const overallDeadlineFor = (rule, day) => addDays(day, rule.reward_type === 'REFERRER'
    ? (rule.qualification_window_days || 30)
    : Math.max(rule.qualification_window_days || 30, rule.bonus_validity_days || 90));

const NAME_RE = /^[A-Za-z0-9 &-]{3,50}$/;
function decimalsOk(v, currency) {
    const s = String(v);
    const dp = s.includes('.') ? s.split('.')[1].length : 0;
    return dp <= (ZERO_DECIMAL.includes(currency) ? 0 : 2);
}
const isIntIn = (v, min, max) => Number.isInteger(Number(v)) && String(v).trim() !== '' && Number(v) >= min && Number(v) <= max;
const blank = (v) => v === undefined || v === null || String(v).trim() === '';

function validateRule(body, { isNew }) {
    const errors = {};
    const currency = String(body.base_currency || '').toUpperCase();
    const receive = String(body.receive_currency || '').toUpperCase();
    const name = String(body.name || '').trim();
    const type = body.reward_type || 'BOTH';
    const amountMsg = currency === 'JPY' ? 'Enter a whole amount greater than 0.' : 'Enter an amount greater than 0 with up to 2 decimal places.';

    if (!name) errors.name = 'Enter a rule name.';
    else if (!NAME_RE.test(name)) errors.name = "Rule name must be 3–50 characters and use letters, numbers, spaces, '-' or '&' only.";
    if (!['BOTH', 'REFERRER', 'REFEREE'].includes(type)) errors.reward_type = 'Select who gets a bonus.';
    if (!SUPPORTED_CURRENCIES.includes(currency)) errors.base_currency = 'Select a send currency.';
    // Receive currency is optional: blank makes a send-currency-only rule that covers every destination.
    // A rule for a specific corridor (send + receive) takes precedence over it.
    if (blank(body.receive_currency)) { /* all destinations */ }
    else if (!SUPPORTED_CURRENCIES.includes(receive)) errors.receive_currency = 'Select a receive currency.';
    else if (receive === currency) errors.receive_currency = 'Receive currency must be different from the send currency.';

    const checkAmount = (field, max) => {
        const v = body[field];
        if (blank(v) || isNaN(Number(v)) || Number(v) <= 0 || Number(v) > max || !decimalsOk(v, currency)) errors[field] = amountMsg;
    };
    if (type !== 'REFEREE') checkAmount('referrer_reward', 1000000);
    if (type !== 'REFERRER') checkAmount('referee_reward', 1000000);
    const floor = body.min_transaction_threshold;
    if (blank(floor) || isNaN(Number(floor)) || Number(floor) <= 0 || Number(floor) > 10000000 || !decimalsOk(floor, currency)) {
        errors.min_transaction_threshold = 'Enter a minimum transaction amount greater than 0.';
    }
    const qw = blank(body.qualification_window_days) ? 30 : body.qualification_window_days;
    if (!isIntIn(qw, 1, 365)) errors.qualification_window_days = 'Enter a whole number of days from 1 to 365.';
    const bv = blank(body.bonus_validity_days) ? 90 : body.bonus_validity_days;
    if (!isIntIn(bv, 1, 730)) errors.bonus_validity_days = 'Enter a whole number of days from 1 to 730.';
    if (!blank(body.max_referrals_per_referrer) && !isIntIn(body.max_referrals_per_referrer, 1, 10000)) {
        errors.max_referrals_per_referrer = 'Leave blank for unlimited, or enter a whole number from 1 to 10,000.';
    }
    if (!blank(body.min_redeem_amount) && (isNaN(Number(body.min_redeem_amount)) || Number(body.min_redeem_amount) < 0 || !decimalsOk(body.min_redeem_amount, currency))) {
        errors.min_redeem_amount = 'Enter 0 or an amount with up to 2 decimal places.';
    }
    const today = ukToday();
    const start = blank(body.start_date) ? null : String(body.start_date).slice(0, 10);
    const end = blank(body.end_date) ? null : String(body.end_date).slice(0, 10);
    if (start && isNew && start < today) errors.start_date = 'Start date cannot be in the past.';
    if (end && (isNew ? end <= (start || today) : start && end <= start)) errors.end_date = 'End date must be after the start date.';

    const clean = {
        name,
        is_enabled: body.is_enabled === false || body.is_enabled === 0 || body.is_enabled === '0' ? 0 : 1,
        reward_type: type,
        base_currency: currency,
        receive_currency: receive || null,
        referrer_reward: type === 'REFEREE' ? 0 : round2(body.referrer_reward),
        referee_reward: type === 'REFERRER' ? 0 : round2(body.referee_reward),
        min_transaction_threshold: round2(floor),
        qualification_window_days: Number(qw),
        bonus_validity_days: Number(bv),
        max_referrals_per_referrer: blank(body.max_referrals_per_referrer) ? null : Number(body.max_referrals_per_referrer),
        min_redeem_amount: blank(body.min_redeem_amount) ? 0 : round2(body.min_redeem_amount),
        start_date: start,
        end_date: end,
    };
    return { errors, clean };
}

const RULE_FIELDS = ['name', 'is_enabled', 'reward_type', 'base_currency', 'receive_currency', 'referrer_reward', 'referee_reward',
    'min_transaction_threshold', 'qualification_window_days', 'bonus_validity_days', 'max_referrals_per_referrer',
    'min_redeem_amount', 'start_date', 'end_date'];

function offerText(rule) {
    const c = rule.base_currency;
    const r = money(rule.referrer_reward, c), e = money(rule.referee_reward, c), f = money(rule.min_transaction_threshold, c);
    const days = rule.qualification_window_days || 30;
    const to = rule.receive_currency ? ` to ${rule.receive_currency}` : '';
    if (rule.reward_type === 'REFERRER') return `Invite friends with your link and get ${r} bonus credit when they send ${f} or more${to} within ${days} days of joining.`;
    if (rule.reward_type === 'REFEREE') return `Give your friends ${e} bonus credit when they join with your link and send ${f} or more${to} within ${days} days.`;
    const validity = rule.bonus_validity_days || 90;
    const friendLonger = validity > days ? ` Your friend can still earn theirs for up to ${validity} days.` : '';
    return `Invite friends with your link. You get ${r} and your friend gets ${e} in bonus credit when they send ${f} or more${to} within ${days} days of joining.${friendLonger}`;
}

function publicOffer(rule) {
    return {
        rule_id: rule.id, name: rule.name, currency: rule.base_currency, receive_currency: rule.receive_currency,
        corridor: corridorLabel(rule.base_currency, rule.receive_currency), reward_type: rule.reward_type,
        referrer_reward: rule.referrer_reward, referee_reward: rule.referee_reward,
        floor: rule.min_transaction_threshold, qualification_window_days: rule.qualification_window_days,
        bonus_validity_days: rule.bonus_validity_days, min_redeem_amount: rule.min_redeem_amount,
        max_referrals_per_referrer: rule.max_referrals_per_referrer, end_date: rule.end_date,
        text: offerText(rule),
    };
}

// All live rules for a send currency (one per corridor)
async function liveRulesForSend(q, currency) {
    const rows = await q.all(`SELECT * FROM referral_rules WHERE base_currency = ? AND COALESCE(is_archived,0) = 0 ORDER BY receive_currency, id`, [currency]);
    return rows.filter(isLive);
}

// The live rule for one corridor. A rule created before corridors existed (no receive currency) still covers any destination.
async function liveRuleFor(q, currency, receiveCurrency) {
    const live = await liveRulesForSend(q, currency);
    const receive = String(receiveCurrency || '').toUpperCase();
    return live.find((r) => r.receive_currency === receive) || live.find((r) => !r.receive_currency) || null;
}

// Rules to show for an offer: the exact corridor when the destination is known, otherwise every live rule for the send currency
async function offerRulesFor(q, currency, receiveCurrency) {
    if (receiveCurrency) {
        const rule = await liveRuleFor(q, currency, String(receiveCurrency).toUpperCase());
        return rule ? [rule] : [];
    }
    return liveRulesForSend(q, currency);
}

// Rule an existing referral should be judged against (admin approval of a not-eligible referral)
async function ruleForReferral(q, r) {
    if (r.receive_currency) return liveRuleFor(q, r.currency, r.receive_currency);
    const live = await liveRulesForSend(q, r.currency);
    return live.length === 1 ? live[0] : null;
}

// Offer notifications (US-6.1)
const isImprovement = (oldR, newR) =>
    Number(newR.referrer_reward) > Number(oldR.referrer_reward) ||
    Number(newR.referee_reward) > Number(oldR.referee_reward) ||
    Number(newR.min_transaction_threshold) < Number(oldR.min_transaction_threshold);

async function notifyOffer(q, rule, kind) {
    if (kind === 'LIVE') {
        const recent = await q.get(`SELECT id FROM referral_offer_notifications WHERE rule_id = ? AND kind = 'LIVE' AND created_at >= ?`,
            [rule.id, new Date(clock.now().getTime() - 7 * 86400000).toISOString()]);
        if (recent) return null; // AC-6.1.8: no repeat within 7 days
    }
    const c = rule.base_currency;
    const to = rule.receive_currency ? ` to ${rule.receive_currency}` : '';
    let title, message;
    if (kind === 'LIVE') {
        title = 'New offer: Refer & Earn';
        message = rule.reward_type === 'REFEREE'
            ? `Give friends ${money(rule.referee_reward, c)} when they join with your link and send ${money(rule.min_transaction_threshold, c)} or more${to}.`
            : `Invite friends and get ${money(rule.referrer_reward, c)} each time they send ${money(rule.min_transaction_threshold, c)} or more${to}.${rule.reward_type === 'BOTH' ? ` Your friend gets ${money(rule.referee_reward, c)} too.` : ''}`;
    } else if (kind === 'IMPROVED') {
        title = 'Better offer: Refer & Earn';
        message = rule.reward_type === 'REFEREE'
            ? `Better offer: your friends now get ${money(rule.referee_reward, c)} when they send ${money(rule.min_transaction_threshold, c)} or more${to}.`
            : `Better offer: you now get ${money(rule.referrer_reward, c)} for every friend who sends ${money(rule.min_transaction_threshold, c)} or more${to}.`;
    } else {
        title = 'Refer & Earn ends soon';
        message = `Refer & Earn ends on ${fmtUkDate(rule.end_date)}. Share your link now.`;
    }
    const r = await q.run(`INSERT INTO referral_offer_notifications (rule_id, currency, receive_currency, kind, title, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [rule.id, c, rule.receive_currency || null, kind, title, message, nowIso()]);
    return { id: r.lastID, kind, title, message };
}

// ---------- customers & codes ----------
async function ensureReferralCode(q, customerId) {
    const c = await q.get(`SELECT id, first_name, referral_code FROM customers WHERE id = ?`, [customerId]);
    if (!c) return null;
    if (c.referral_code) return c.referral_code;
    const base = String(c.first_name || 'RHEMITO').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'RHEMITO';
    const prefix = base.length < 2 ? (base + 'RM') : base;
    for (let i = 0; i < 50; i++) {
        const code = `${prefix}${String(crypto.randomInt(0, 10000)).padStart(4, '0')}`;
        const clash = await q.get(`SELECT id FROM customers WHERE referral_code = ?`, [code]);
        if (!clash) {
            await q.run(`UPDATE customers SET referral_code = ? WHERE id = ?`, [code, customerId]);
            return code;
        }
    }
    throw new Error('Could not generate a unique referral code');
}

// ---------- ledger / wallet ----------
async function creditRemaining(q, credit) {
    const row = await q.get(`SELECT COALESCE(SUM(amount),0) AS s FROM credit_ledger WHERE source_credit_id = ?`, [credit.id]);
    return round2(Number(credit.amount) + Number(row.s));
}

async function addCredit(q, { userId, amount, currency, reason, referenceId, notes, referralId, ruleId, validityDays, expiresOn }) {
    const id = newId('cl');
    const expires = expiresOn || addDays(ukToday(), validityDays || 90);
    await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, reference_id, reason_code, notes, admin_user, expires_at, created_at, currency, referral_id, referral_rule_id)
        VALUES (?, ?, ?, 'EARNED', ?, ?, ?, 'System', ?, ?, ?, ?, ?)`,
    [id, userId, round2(amount), referenceId, reason, notes, expires, nowIso(), currency, referralId || null, ruleId || null]);
    return id;
}

async function debitCredit(q, credit, amount, type, { reason, referenceId, notes, transferId, adminUser }) {
    const id = newId('cl');
    await q.run(`INSERT INTO credit_ledger (id, user_id, amount, type, reference_id, reason_code, notes, admin_user, created_at, currency, referral_id, referral_rule_id, source_credit_id, transfer_id, scheme_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, credit.user_id, -round2(amount), type, referenceId, reason, notes, adminUser || 'System', nowIso(), credit.currency,
        credit.referral_id, credit.referral_rule_id, credit.id, transferId || null, credit.scheme_id || null]);
    return id;
}

async function creditsWithRemaining(q, userId, currency) {
    const credits = await q.all(`SELECT * FROM credit_ledger WHERE user_id = ? AND type = 'EARNED' AND amount > 0 ${currency ? 'AND currency = ?' : ''} ORDER BY COALESCE(expires_at,'9999-12-31'), created_at`,
        currency ? [userId, currency] : [userId]);
    for (const c of credits) {
        c.remaining = await creditRemaining(q, c);
        const linked = await q.all(`SELECT type, reason_code, amount FROM credit_ledger WHERE source_credit_id = ?`, [c.id]);
        if (linked.some((l) => l.type === 'VOIDED' && l.reason_code === 'REFERRAL_REVERSAL')) c.status = 'REVERSED';
        else if (linked.some((l) => l.type === 'EXPIRED')) c.status = 'EXPIRED';
        else if (c.remaining <= 0) c.status = 'USED';
        else if (c.remaining < c.amount) c.status = 'PARTLY_USED';
        else c.status = 'UNUSED';
    }
    return credits;
}

// ---------- referrals ----------
function sameIdentity(a, b) {
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    if (a.email && norm(a.email) === norm(b.email)) return 'email';
    if (a.phone && norm(a.phone).replace(/\D/g, '') === norm(b.phone).replace(/\D/g, '')) return 'phone number';
    if (a.device_id && a.device_id === b.device_id) return 'device';
    const pa = JSON.parse(a.payment_fingerprints || '[]'), pb = JSON.parse(b.payment_fingerprints || '[]');
    if (pa.some((x) => pb.includes(x))) return 'payment method';
    return null;
}

async function upsertCustomer(q, c) {
    if (!c || !c.id) throw Object.assign(new Error('Customer id is required'), { status: 400 });
    const existing = await q.get(`SELECT * FROM customers WHERE id = ?`, [c.id]);
    const merged = { ...(existing || {}), ...Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)) };
    if (Array.isArray(merged.payment_fingerprints)) merged.payment_fingerprints = JSON.stringify(merged.payment_fingerprints);
    await q.run(`INSERT INTO customers (id, first_name, last_name, email, phone, country, send_currency, kyc_status, account_status, device_id, payment_fingerprints, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name, last_name=excluded.last_name, email=excluded.email, phone=excluded.phone,
        country=excluded.country, send_currency=excluded.send_currency, kyc_status=excluded.kyc_status, account_status=excluded.account_status,
        device_id=excluded.device_id, payment_fingerprints=excluded.payment_fingerprints`,
    [merged.id, merged.first_name, merged.last_name, merged.email, merged.phone, merged.country, (merged.send_currency || 'GBP').toUpperCase(),
        merged.kyc_status || 'PENDING', merged.account_status || 'ACTIVE', merged.device_id || null, merged.payment_fingerprints || '[]',
        merged.created_at || nowIso()]);
    await ensureReferralCode(q, merged.id);
    // A KYC pass can release referrals waiting for it (AC-4.3.3)
    if ((merged.kyc_status || '') === 'PASSED') {
        const waiting = await q.all(`SELECT * FROM referrals WHERE status = 'PENDING' AND status_reason LIKE 'Awaiting%' AND (referrer_id = ? OR referee_id = ?)`, [merged.id, merged.id]);
        for (const r of waiting) await tryAward(q, r);
    }
    return q.get(`SELECT * FROM customers WHERE id = ?`, [merged.id]);
}

async function lookupCode(q, code) {
    const clean = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(clean)) return { valid: false, reason: 'INVALID_FORMAT', message: 'Referral codes are 6–12 letters and numbers.' };
    const referrer = await q.get(`SELECT * FROM customers WHERE referral_code = ?`, [clean]);
    if (!referrer) return { valid: false, reason: 'NOT_FOUND', message: "We couldn't find this referral code. Check it or leave the field blank." };
    if (referrer.account_status !== 'ACTIVE') return { valid: false, reason: 'REFERRER_INACTIVE', message: 'This referral link is no longer active. You can still sign up.' };
    return { valid: true, code: clean, referrer };
}

async function createReferral(q, { code, referee }) {
    const look = await lookupCode(q, code);
    if (!look.valid) throw Object.assign(new Error(look.message), { status: 400, code: look.reason });
    const referrer = look.referrer;
    if (!referee || !referee.id) throw Object.assign(new Error('Referee details are required'), { status: 400 });
    if (referee.id === referrer.id) throw Object.assign(new Error('You cannot use your own referral link.'), { status: 400, code: 'OWN_LINK' });
    const existingRef = await q.get(`SELECT * FROM referrals WHERE referee_id = ?`, [referee.id]);
    if (existingRef) return existingRef; // idempotent

    const before = await q.get(`SELECT * FROM customers WHERE id = ?`, [referee.id]);
    // Returning customer: same email/phone as a closed account (AC-4.3.2)
    const returning = await q.get(`SELECT id FROM customers WHERE account_status = 'CLOSED' AND id != ? AND (lower(email) = lower(?) OR phone = ?)`,
        [referee.id, referee.email || '', referee.phone || '']);
    const refereeRow = await upsertCustomer(q, { ...(before || {}), ...referee });

    // The rule is chosen by corridor. When the referee has not chosen a destination yet and there is more than one
    // live corridor for their send currency, the rule is bound later, by the corridor of their qualifying transfer.
    const currency = (refereeRow.send_currency || 'GBP').toUpperCase();
    const receive = String(referee.receive_currency || '').toUpperCase() || null;
    const liveForSend = await liveRulesForSend(q, currency);
    let rule = null, deferred = false;
    if (receive) rule = await liveRuleFor(q, currency, receive);
    else if (liveForSend.length === 1) rule = liveForSend[0];
    else if (liveForSend.length > 1) deferred = true;
    const registeredAt = nowIso();
    const regDay = ukToday();
    const id = `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    let status = 'REGISTERED', reason = null;
    const match = sameIdentity(referrer, refereeRow);
    if (!rule && !deferred) { status = 'NOT_ELIGIBLE'; reason = `No active referral programme for ${corridorLabel(currency, receive)}`; }
    else if (match) { status = 'NOT_ELIGIBLE'; reason = `Self-referral: same ${match}`; }
    else if (returning) { status = 'NOT_ELIGIBLE'; reason = 'Returning customer'; }

    const latest = deferred ? liveForSend.map((x) => overallDeadlineFor(x, regDay)).sort().pop() : null;
    const referrerBy = deferred ? liveForSend.map((x) => referrerDeadlineFor(x, regDay)).sort().pop() : null;
    await q.run(`INSERT INTO referrals (id, referrer_id, referee_id, code, rule_id, currency, receive_currency, reward_type, referrer_reward, referee_reward, floor,
        qualification_window_days, bonus_validity_days, qualification_deadline, referrer_deadline, status, status_reason, registered_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, referrer.id, referee.id, look.code, rule ? rule.id : null, currency, rule ? rule.receive_currency : receive,
        rule ? rule.reward_type : null, rule ? rule.referrer_reward : 0, rule ? rule.referee_reward : 0, rule ? rule.min_transaction_threshold : null,
        rule ? rule.qualification_window_days : null, rule ? rule.bonus_validity_days : null,
        rule ? overallDeadlineFor(rule, regDay) : latest, rule ? referrerDeadlineFor(rule, regDay) : referrerBy, status, reason, registeredAt, registeredAt]);
    return q.get(`SELECT * FROM referrals WHERE id = ?`, [id]);
}

async function rewardedCountForReferrer(q, referrerId, ruleId) {
    const r = await q.get(`SELECT COUNT(*) AS c FROM referrals WHERE referrer_id = ? AND rule_id = ? AND referrer_credited > 0`, [referrerId, ruleId]);
    return r.c;
}

// Credit the parties of a PENDING referral if every check passes (US-4.1, US-4.3)
async function tryAward(q, referral) {
    const r = await q.get(`SELECT * FROM referrals WHERE id = ?`, [referral.id]);
    if (!r || r.status !== 'PENDING') return r;
    const transfer = await q.get(`SELECT * FROM referral_transfers WHERE transfer_id = ?`, [r.qualifying_transfer_id]);
    if (!transfer || transfer.status !== 'COMPLETED') return r;
    const referrer = await q.get(`SELECT * FROM customers WHERE id = ?`, [r.referrer_id]);
    const referee = await q.get(`SELECT * FROM customers WHERE id = ?`, [r.referee_id]);
    // The referee can earn their bonus until Bonus Validity ends; the referrer only inside the Qualification Window
    const referrerLate = ukDate(transfer.created_at) > (r.referrer_deadline || r.qualification_deadline);
    const referrerEntitled = r.reward_type !== 'REFEREE' && r.referrer_reward > 0;
    const rewardsReferrer = referrerEntitled && !referrerLate;
    const rewardsReferee = r.reward_type !== 'REFERRER' && r.referee_reward > 0;

    if (rewardsReferee && referee.kyc_status !== 'PASSED') {
        await q.run(`UPDATE referrals SET status_reason = 'Awaiting referee KYC', updated_at = ? WHERE id = ?`, [nowIso(), r.id]);
        return q.get(`SELECT * FROM referrals WHERE id = ?`, [r.id]);
    }
    if (rewardsReferrer && referrer.account_status === 'ACTIVE' && referrer.kyc_status !== 'PASSED') {
        await q.run(`UPDATE referrals SET status_reason = 'Awaiting referrer KYC', updated_at = ? WHERE id = ?`, [nowIso(), r.id]);
        return q.get(`SELECT * FROM referrals WHERE id = ?`, [r.id]);
    }

    const rule = await q.get(`SELECT * FROM referral_rules WHERE id = ?`, [r.rule_id]);
    const notes = [];
    if (referrerEntitled && referrerLate) notes.push('Referrer qualification window ended');
    let referrerCredited = 0, refereeCredited = 0;
    if (rewardsReferrer) {
        const cap = rule && rule.max_referrals_per_referrer;
        if (referrer.account_status !== 'ACTIVE') notes.push('Referrer account not active');
        else if (cap && (await rewardedCountForReferrer(q, r.referrer_id, r.rule_id)) >= cap) notes.push('Referrer cap reached');
        else {
            await addCredit(q, {
                userId: r.referrer_id, amount: r.referrer_reward, currency: r.currency, reason: 'REFERRAL_REWARD',
                referenceId: `${r.id}:referrer`, notes: `Referrer reward – referred ${maskName(referee.first_name, referee.last_name)}`,
                referralId: r.id, ruleId: r.rule_id, validityDays: r.bonus_validity_days,
            });
            referrerCredited = r.referrer_reward;
        }
    }
    if (rewardsReferee) {
        await addCredit(q, {
            userId: r.referee_id, amount: r.referee_reward, currency: r.currency, reason: 'REFERRAL_REWARD',
            referenceId: `${r.id}:referee`, notes: `Referee reward – invited by ${maskName(referrer.first_name, referrer.last_name)}`,
            referralId: r.id, ruleId: r.rule_id, validityDays: r.bonus_validity_days,
        });
        refereeCredited = r.referee_reward;
    }
    await q.run(`UPDATE referrals SET status = 'REWARDED', status_reason = ?, rewarded_at = ?, referrer_credited = ?, referee_credited = ?, updated_at = ? WHERE id = ?`,
        [notes.join('; ') || null, nowIso(), referrerCredited, refereeCredited, nowIso(), r.id]);
    return q.get(`SELECT * FROM referrals WHERE id = ?`, [r.id]);
}

async function voidReferralCredits(q, r) {
    const credits = await q.all(`SELECT * FROM credit_ledger WHERE referral_id = ? AND type = 'EARNED' AND amount > 0`, [r.id]);
    for (const c of credits) {
        const remaining = await creditRemaining(q, c);
        if (remaining > 0) {
            await debitCredit(q, c, remaining, 'VOIDED', {
                reason: 'REFERRAL_REVERSAL', referenceId: r.qualifying_transfer_id,
                notes: 'Qualifying transfer reversed – unused referral bonus removed',
            });
        }
    }
}

// Fix a deferred referral to the rule of the corridor the referee actually sent on (terms are snapshotted now)
async function bindRule(q, r, rule) {
    await q.run(`UPDATE referrals SET rule_id = ?, receive_currency = ?, reward_type = ?, referrer_reward = ?, referee_reward = ?, floor = ?,
        qualification_window_days = ?, bonus_validity_days = ?, qualification_deadline = ?, referrer_deadline = ?, updated_at = ? WHERE id = ?`,
    [rule.id, rule.receive_currency, rule.reward_type, rule.referrer_reward, rule.referee_reward, rule.min_transaction_threshold,
        rule.qualification_window_days, rule.bonus_validity_days, overallDeadlineFor(rule, ukDate(r.registered_at)), referrerDeadlineFor(rule, ukDate(r.registered_at)), nowIso(), r.id]);
}

const QUALIFY_STATUSES = ['PAID', 'COMPLETED'];
const FAIL_STATUSES = ['CANCELLED', 'FAILED'];
const REVERSE_STATUSES = ['REFUNDED', 'RECALLED', 'CHARGEBACK'];

async function handleTransferEvent(q, ev) {
    const status = String(ev.status || '').toUpperCase();
    if (!ev.transfer_id || !ev.customer_id || !status) throw Object.assign(new Error('transfer_id, customer_id and status are required'), { status: 400 });
    const prev = await q.get(`SELECT * FROM referral_transfers WHERE transfer_id = ?`, [ev.transfer_id]);
    const createdAt = (prev && prev.created_at) || ev.created_at || nowIso();
    await q.run(`INSERT INTO referral_transfers (transfer_id, customer_id, amount, currency, receive_currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(transfer_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    [ev.transfer_id, ev.customer_id, Number(ev.amount || (prev && prev.amount) || 0), String(ev.currency || (prev && prev.currency) || '').toUpperCase(),
        String(ev.receive_currency || (prev && prev.receive_currency) || '').toUpperCase() || null, status, createdAt, nowIso()]);
    const transfer = await q.get(`SELECT * FROM referral_transfers WHERE transfer_id = ?`, [ev.transfer_id]);

    // A refunded transfer that used bonus gets the bonus back (AC-5.2.10)
    if (FAIL_STATUSES.includes(status) || REVERSE_STATUSES.includes(status)) await releaseBonus(q, ev.customer_id, ev.transfer_id);

    let r = await q.get(`SELECT * FROM referrals WHERE referee_id = ?`, [ev.customer_id]);
    if (!r) return { referral: null };

    if (QUALIFY_STATUSES.includes(status) && r.status === 'REGISTERED') {
        // Referee joined before choosing a destination: the corridor of this transfer decides which rule applies
        if (!r.rule_id && transfer.currency === r.currency && transfer.receive_currency) {
            const rule = await liveRuleFor(q, r.currency, transfer.receive_currency);
            if (rule && Number(transfer.amount) >= Number(rule.min_transaction_threshold) &&
                ukDate(transfer.created_at) <= overallDeadlineFor(rule, ukDate(r.registered_at))) {
                await bindRule(q, r, rule);
                r = await q.get(`SELECT * FROM referrals WHERE id = ?`, [r.id]);
            }
        }
        // The transfer must be on the rule's corridor: same send currency and, where the rule names one, the same receive currency
        const qualifies = !!r.rule_id && transfer.currency === r.currency && (!r.receive_currency || transfer.receive_currency === r.receive_currency) &&
            Number(transfer.amount) >= Number(r.floor) && ukDate(transfer.created_at) <= r.qualification_deadline;
        if (qualifies) {
            await q.run(`UPDATE referrals SET status = 'PENDING', status_reason = NULL, qualifying_transfer_id = ?, qualifying_amount = ?, pending_at = ?, updated_at = ? WHERE id = ?`,
                [transfer.transfer_id, transfer.amount, nowIso(), nowIso(), r.id]);
            r = await q.get(`SELECT * FROM referrals WHERE id = ?`, [r.id]);
        }
    }
    if (status === 'COMPLETED' && r.status === 'PENDING' && r.qualifying_transfer_id === transfer.transfer_id) {
        r = await tryAward(q, r);
    } else if ((FAIL_STATUSES.includes(status) || REVERSE_STATUSES.includes(status)) && r.qualifying_transfer_id === transfer.transfer_id) {
        if (r.status === 'PENDING') {
            await q.run(`UPDATE referrals SET status = 'REGISTERED', status_reason = NULL, qualifying_transfer_id = NULL, qualifying_amount = NULL, pending_at = NULL, updated_at = ? WHERE id = ?`, [nowIso(), r.id]);
        } else if (r.status === 'REWARDED' && REVERSE_STATUSES.includes(status)) {
            await voidReferralCredits(q, r);
            await q.run(`UPDATE referrals SET status = 'REVERSED', status_reason = 'Qualifying transfer refunded', reversed_at = ?, updated_at = ? WHERE id = ?`, [nowIso(), nowIso(), r.id]);
        }
        r = await q.get(`SELECT * FROM referrals WHERE id = ?`, [r.id]);
    }
    return { referral: r };
}

async function applyBonus(q, customerId, { amount, currency, receive_currency, transfer_id, send_amount }) {
    currency = String(currency || '').toUpperCase();
    const receive = String(receive_currency || '').toUpperCase() || null;
    amount = round2(amount);
    if (!transfer_id || !(amount > 0)) throw Object.assign(new Error('transfer_id and a positive amount are required'), { status: 400 });
    const already = await q.get(`SELECT id FROM credit_ledger WHERE user_id = ? AND transfer_id = ? AND type = 'APPLIED'`, [customerId, transfer_id]);
    if (already) throw Object.assign(new Error('Bonus has already been applied to this transfer.'), { status: 409, code: 'ALREADY_APPLIED' });
    // Minimum-to-redeem follows the transfer's corridor. If the caller does not say where the money is going, use the most lenient live rule for the send currency.
    let rule = receive ? await liveRuleFor(q, currency, receive) : null;
    if (!rule && !receive) rule = (await liveRulesForSend(q, currency)).sort((a, b) => Number(a.min_redeem_amount || 0) - Number(b.min_redeem_amount || 0))[0] || null;
    if (!rule) {
        rule = await q.get(`SELECT * FROM referral_rules WHERE base_currency = ? ${receive ? 'AND (receive_currency = ? OR receive_currency IS NULL)' : ''} ORDER BY is_archived, id DESC LIMIT 1`,
            receive ? [currency, receive] : [currency]);
    }
    const minRedeem = rule ? Number(rule.min_redeem_amount || 0) : 0;
    if (minRedeem > 0 && Number(send_amount || 0) < minRedeem) {
        throw Object.assign(new Error(`Send ${money(minRedeem, currency)} or more to use your bonus.`), { status: 400, code: 'BELOW_MIN_REDEEM' });
    }
    if (send_amount !== undefined && amount > Number(send_amount)) throw Object.assign(new Error('Bonus cannot be more than the send amount.'), { status: 400 });
    const today = ukToday();
    const credits = (await creditsWithRemaining(q, customerId, currency)).filter((c) => c.remaining > 0 && (!c.expires_at || c.expires_at >= today) && c.status !== 'EXPIRED');
    const available = round2(credits.reduce((s, c) => s + c.remaining, 0));
    if (available < amount) throw Object.assign(new Error('Your bonus balance has changed. Please review your transfer.'), { status: 409, code: 'BALANCE_CHANGED', available });
    let left = amount;
    for (const c of credits) { // oldest expiry first (AC-5.4.2)
        if (left <= 0) break;
        const take = round2(Math.min(left, c.remaining));
        await debitCredit(q, c, take, 'APPLIED', { reason: 'BONUS_REDEMPTION', referenceId: transfer_id, notes: `Used on transfer ${transfer_id}`, transferId: transfer_id });
        left = round2(left - take);
    }
    return { applied: amount, available: round2(available - amount) };
}

async function releaseBonus(q, customerId, transferId) {
    const applied = await q.all(`SELECT * FROM credit_ledger WHERE user_id = ? AND transfer_id = ? AND type = 'APPLIED' AND amount < 0`, [customerId, transferId]);
    const returned = await q.get(`SELECT id FROM credit_ledger WHERE user_id = ? AND reference_id = ? AND reason_code = 'BONUS_RETURNED'`, [customerId, `return:${transferId}`]);
    if (!applied.length || returned) return 0;
    let total = 0;
    for (const a of applied) {
        const source = await q.get(`SELECT * FROM credit_ledger WHERE id = ?`, [a.source_credit_id]);
        const today = ukToday();
        const expiresOn = source && source.expires_at && source.expires_at >= today ? source.expires_at : addDays(today, 14);
        await addCredit(q, {
            userId: customerId, amount: -a.amount, currency: a.currency, reason: 'BONUS_RETURNED', referenceId: `return:${transferId}`,
            notes: `Bonus returned – transfer ${transferId} cancelled or refunded`, referralId: a.referral_id, ruleId: a.referral_rule_id, expiresOn,
        });
        total += -a.amount;
    }
    return round2(total);
}

// Daily jobs: expire referrals and credits, warn about ending offers (US-4.2, US-5.4, AC-6.1.9)
async function runJobs(q) {
    const today = ukToday();
    const expiredReferrals = await q.run(`UPDATE referrals SET status = 'EXPIRED', status_reason = 'Qualification window ended on ' ||
        substr(qualification_deadline,9,2) || '/' || substr(qualification_deadline,6,2) || '/' || substr(qualification_deadline,1,4), updated_at = ?
        WHERE status = 'REGISTERED' AND qualification_deadline < ?`, [nowIso(), today]);
    const kycWait = await q.all(`SELECT * FROM referrals WHERE status = 'PENDING' AND status_reason LIKE 'Awaiting%'`);
    for (const r of kycWait) {
        if (addDays(r.qualification_deadline, 30) < today) {
            await q.run(`UPDATE referrals SET status = 'EXPIRED', status_reason = ?, updated_at = ? WHERE id = ?`, [`${r.status_reason} – not completed in time`, nowIso(), r.id]);
        }
    }
    let creditsExpired = 0;
    const due = await q.all(`SELECT * FROM credit_ledger WHERE type = 'EARNED' AND amount > 0 AND expires_at IS NOT NULL AND expires_at < ?`, [today]);
    for (const c of due) {
        const hasExpiry = await q.get(`SELECT id FROM credit_ledger WHERE source_credit_id = ? AND type = 'EXPIRED'`, [c.id]);
        if (hasExpiry) continue;
        const remaining = await creditRemaining(q, c);
        if (remaining > 0) {
            await debitCredit(q, c, remaining, 'EXPIRED', { reason: 'EXPIRY', referenceId: `exp:${c.id}`, notes: `Unused bonus credit expired on ${fmtUkDate(c.expires_at)}` });
            creditsExpired++;
        }
    }
    let ending = 0;
    const rules = await q.all(`SELECT * FROM referral_rules WHERE COALESCE(is_archived,0) = 0 AND end_date IS NOT NULL`);
    for (const rule of rules) {
        if (isLive(rule) && rule.end_date === addDays(today, 3)) {
            const sent = await q.get(`SELECT id FROM referral_offer_notifications WHERE rule_id = ? AND kind = 'ENDING'`, [rule.id]);
            if (!sent) { await notifyOffer(q, rule, 'ENDING'); ending++; }
        }
    }
    return { referrals_expired: expiredReferrals.changes, credits_expired: creditsExpired, ending_notifications: ending };
}

// ---------- reporting ----------
const STATUS_LABELS = {
    REGISTERED: 'Joined', PENDING: 'In progress', REWARDED: 'Earned', EXPIRED: 'Expired', NOT_ELIGIBLE: 'Not eligible', REVERSED: 'Reversed',
};

function trackingWhere(f) {
    const cond = [], params = [];
    if (f.status) { cond.push('r.status = ?'); params.push(f.status); }
    if (f.currency) { cond.push('r.currency = ?'); params.push(f.currency); }
    if (f.receive_currency) { cond.push('r.receive_currency = ?'); params.push(f.receive_currency); }
    if (f.rule_id) { cond.push('r.rule_id = ?'); params.push(Number(f.rule_id)); }
    if (f.status_group === 'pending') cond.push("r.status IN ('REGISTERED','PENDING')");
    if (f.status_group === 'closed') cond.push("r.status IN ('EXPIRED','NOT_ELIGIBLE','REVERSED')");
    if (f.from) { cond.push('date(r.registered_at) >= date(?)'); params.push(f.from); }
    if (f.to) { cond.push('date(r.registered_at) <= date(?)'); params.push(f.to); }
    if (f.q) {
        const like = `%${String(f.q).toLowerCase()}%`;
        cond.push(`(lower(r.id) LIKE ? OR lower(r.code) LIKE ? OR lower(a.id) LIKE ? OR lower(b.id) LIKE ? OR lower(a.first_name || ' ' || a.last_name) LIKE ? OR lower(b.first_name || ' ' || b.last_name) LIKE ? OR lower(a.email) LIKE ? OR lower(b.email) LIKE ?)`);
        params.push(like, like, like, like, like, like, like, like);
    }
    return { where: cond.length ? `WHERE ${cond.join(' AND ')}` : '', params };
}

const TRACKING_SELECT = `SELECT r.*, rr.name AS rule_name,
    a.first_name AS referrer_first_name, a.last_name AS referrer_last_name, a.email AS referrer_email,
    b.first_name AS referee_first_name, b.last_name AS referee_last_name, b.email AS referee_email
    FROM referrals r LEFT JOIN customers a ON a.id = r.referrer_id LEFT JOIN customers b ON b.id = r.referee_id
    LEFT JOIN referral_rules rr ON rr.id = r.rule_id`;

async function tracking(q, f) {
    const { where, params } = trackingWhere(f);
    const pageSize = Math.min(Number(f.page_size) || 25, 500);
    const page = Math.max(Number(f.page) || 1, 1);
    const total = (await q.get(`SELECT COUNT(*) AS c FROM referrals r LEFT JOIN customers a ON a.id = r.referrer_id LEFT JOIN customers b ON b.id = r.referee_id ${where}`, params)).c;
    const data = await q.all(`${TRACKING_SELECT} ${where} ORDER BY r.registered_at DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    const s = await q.all(`SELECT r.status, r.currency, COUNT(*) AS c, SUM(r.referrer_credited + r.referee_credited) AS issued
        FROM referrals r LEFT JOIN customers a ON a.id = r.referrer_id LEFT JOIN customers b ON b.id = r.referee_id ${where} GROUP BY r.status, r.currency`, params);
    const summary = { total: 0, pending: 0, rewarded: 0, conversion_rate: null, bonus_issued: {} };
    for (const row of s) {
        summary.total += row.c;
        if (['REGISTERED', 'PENDING'].includes(row.status)) summary.pending += row.c;
        if (row.status === 'REWARDED') summary.rewarded += row.c;
        if (row.issued) summary.bonus_issued[row.currency] = round2((summary.bonus_issued[row.currency] || 0) + row.issued);
    }
    summary.conversion_rate = summary.total ? round2((summary.rewarded / summary.total) * 1000) / 10 : null;
    return { data, total, page, page_size: pageSize, summary };
}

async function performance(q, { from, to, include_archived }) {
    const rules = await q.all(`SELECT * FROM referral_rules ${include_archived ? '' : 'WHERE COALESCE(is_archived,0) = 0'} ORDER BY base_currency, receive_currency`);
    const rangeCond = (col) => `${from ? ` AND date(${col}) >= date('${from.replace(/[^0-9-]/g, '')}')` : ''}${to ? ` AND date(${col}) <= date('${to.replace(/[^0-9-]/g, '')}')` : ''}`;
    const rows = [];
    for (const rule of rules) {
        const counts = await q.all(`SELECT status, COUNT(*) AS c FROM referrals WHERE rule_id = ?${rangeCond('registered_at')} GROUP BY status`, [rule.id]);
        const cnt = (st) => counts.filter((c) => st.includes(c.status)).reduce((s, c) => s + c.c, 0);
        // Visits count for the rule's send currency. A visit that named a destination counts for that corridor only;
        // one that did not (link opened without a destination) counts for every corridor of that send currency.
        const visits = (await q.get(`SELECT COUNT(*) AS c FROM referral_link_visits WHERE currency = ?${rule.receive_currency ? ' AND (receive_currency IS NULL OR receive_currency = ?)' : ''}${rangeCond('created_at')}`,
            rule.receive_currency ? [rule.base_currency, rule.receive_currency] : [rule.base_currency])).c;
        const registrations = cnt(['REGISTERED', 'PENDING', 'REWARDED', 'EXPIRED', 'NOT_ELIGIBLE', 'REVERSED']);
        const rewarded = cnt(['REWARDED']);
        const refIds = `SELECT id FROM referrals WHERE rule_id = ${Number(rule.id)}${rangeCond('registered_at')}`;
        const sum = async (sql) => round2((await q.get(sql)).s || 0);
        const issued = await sum(`SELECT SUM(amount) AS s FROM credit_ledger WHERE type = 'EARNED' AND reason_code = 'REFERRAL_REWARD' AND referral_id IN (${refIds})`);
        const used = -(await sum(`SELECT SUM(amount) AS s FROM credit_ledger WHERE type = 'APPLIED' AND referral_id IN (${refIds}) AND source_credit_id IN (SELECT id FROM credit_ledger WHERE reason_code = 'REFERRAL_REWARD')`));
        const returned = await sum(`SELECT SUM(amount) AS s FROM credit_ledger WHERE reason_code = 'BONUS_RETURNED' AND referral_id IN (${refIds})`);
        const expired = -(await sum(`SELECT SUM(amount) AS s FROM credit_ledger WHERE type IN ('EXPIRED','VOIDED') AND referral_id IN (${refIds})`));
        const volume = await sum(`SELECT SUM(t.amount) AS s FROM referral_transfers t JOIN referrals r ON r.referee_id = t.customer_id
            WHERE r.rule_id = ${Number(rule.id)} AND t.status = 'COMPLETED' AND t.currency = r.currency
            AND (r.receive_currency IS NULL OR t.receive_currency = r.receive_currency)${rangeCond('r.registered_at')}`);
        const netUsed = round2(used - returned);
        rows.push({
            rule_id: rule.id, name: rule.name, currency: rule.base_currency, receive_currency: rule.receive_currency,
            corridor: corridorLabel(rule.base_currency, rule.receive_currency), status: ruleStatus(rule),
            link_visits: visits, registrations, pending: cnt(['REGISTERED', 'PENDING']), rewarded,
            closed: cnt(['EXPIRED', 'NOT_ELIGIBLE', 'REVERSED']),
            conversion_rate: registrations ? Math.round((rewarded / registrations) * 1000) / 10 : null,
            bonus_issued: issued, bonus_used: netUsed, bonus_expired: round2(expired),
            bonus_unused: round2(issued + returned - used - expired), referred_volume: volume,
        });
    }
    return rows;
}

const csvEscape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (headers, rows) => [headers.map((h) => csvEscape(h[0])).join(','), ...rows.map((r) => headers.map((h) => csvEscape(typeof h[1] === 'function' ? h[1](r) : r[h[1]])).join(','))].join('\n');

// ---------- routes ----------
function registerReferralRoutes(app, db) {
    const q = promisify(db);
    const ready = initSchema(db).catch((e) => console.error('Referral schema init failed', e));
    const wrap = (fn) => async (req, res) => {
        try { await ready; await fn(req, res); } catch (err) {
            res.status(err.status || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message, ...(err.available !== undefined ? { available: err.available } : {}) });
        }
    };

    const withMeta = async (rule) => {
        const c = await q.all(`SELECT status, COUNT(*) AS c FROM referrals WHERE rule_id = ? GROUP BY status`, [rule.id]);
        const n = (st) => c.filter((x) => st.includes(x.status)).reduce((s, x) => s + x.c, 0);
        return { ...rule, status: ruleStatus(rule), pending_count: n(['REGISTERED', 'PENDING']), referral_count: n(Object.keys(STATUS_LABELS)) };
    };

    // ---- Admin: rules (US-1.1 – US-1.5) ----
    app.get('/api/referral-rules', wrap(async (req, res) => {
        const all = req.query.include_archived === '1' || req.query.include_archived === 'true';
        const rows = await q.all(`SELECT * FROM referral_rules ${all ? '' : 'WHERE COALESCE(is_archived,0) = 0'} ORDER BY created_at DESC, id DESC`);
        res.json({ data: await Promise.all(rows.map(withMeta)) });
    }));

    const checkDuplicates = async (clean, id) => {
        // One non-archived rule per corridor (send → receive)
        const sameCorridor = await q.get(`SELECT id, name FROM referral_rules WHERE base_currency = ? AND receive_currency IS ? AND COALESCE(is_archived,0) = 0 ${id ? 'AND id != ?' : ''}`,
            id ? [clean.base_currency, clean.receive_currency, id] : [clean.base_currency, clean.receive_currency]);
        if (sameCorridor) {
            throw Object.assign(new Error(`A referral rule for ${corridorLabel(clean.base_currency, clean.receive_currency)} already exists ('${sameCorridor.name}'). Edit or archive it first.`), { status: 409, code: 'DUPLICATE_CORRIDOR' });
        }
        const sameName = await q.get(`SELECT id FROM referral_rules WHERE lower(name) = lower(?) AND COALESCE(is_archived,0) = 0 ${id ? 'AND id != ?' : ''}`,
            id ? [clean.name, id] : [clean.name]);
        if (sameName) throw Object.assign(new Error('A rule with this name already exists.'), { status: 409, code: 'DUPLICATE_NAME' });
    };

    app.post('/api/referral-rules', wrap(async (req, res) => {
        const { errors, clean } = validateRule(req.body || {}, { isNew: true });
        if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', message: 'Please correct the highlighted fields.', fields: errors });
        await checkDuplicates(clean);
        const r = await q.run(`INSERT INTO referral_rules (${RULE_FIELDS.join(', ')}, created_at, updated_at) VALUES (${RULE_FIELDS.map(() => '?').join(', ')}, ?, ?)`,
            [...RULE_FIELDS.map((f) => clean[f]), nowIso(), nowIso()]);
        const rule = await q.get(`SELECT * FROM referral_rules WHERE id = ?`, [r.lastID]);
        await q.run(`INSERT INTO referral_rule_audit (rule_id, field, old_value, new_value, admin_user, created_at) VALUES (?, 'created', NULL, ?, ?, ?)`,
            [rule.id, rule.name, req.body.admin_user || 'Admin', nowIso()]);
        let notification = null;
        if (isLive(rule) && req.body.notify !== false) notification = await notifyOffer(q, rule, 'LIVE');
        res.status(201).json({ success: true, id: rule.id, data: await withMeta(rule), notification });
    }));

    const updateRule = async (req, res, patch) => {
        const id = Number(req.params.id);
        const old = await q.get(`SELECT * FROM referral_rules WHERE id = ?`, [id]);
        if (!old) return res.status(404).json({ error: 'NOT_FOUND', message: 'Referral rule not found.' });
        if (old.is_archived) return res.status(400).json({ error: 'ARCHIVED', message: 'Archived rules cannot be changed.' });
        const merged = { ...old, ...patch };
        const enabling = !(merged.is_enabled === false || merged.is_enabled === 0 || merged.is_enabled === '0');
        if (enabling && merged.end_date && String(merged.end_date).slice(0, 10) < ukToday()) {
            return res.status(400).json({ error: 'RULE_ENDED', message: 'This rule has ended. Update the end date before activating it.' });
        }
        const { errors, clean } = validateRule(merged, { isNew: false });
        if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', message: 'Please correct the highlighted fields.', fields: errors });
        await checkDuplicates(clean, id);
        await q.run(`UPDATE referral_rules SET ${RULE_FIELDS.map((f) => `${f} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, [...RULE_FIELDS.map((f) => clean[f]), nowIso(), id]);
        for (const f of RULE_FIELDS) {
            if (String(old[f] ?? '') !== String(clean[f] ?? '')) {
                await q.run(`INSERT INTO referral_rule_audit (rule_id, field, old_value, new_value, admin_user, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                    [id, f, old[f] === null ? null : String(old[f]), clean[f] === null ? null : String(clean[f]), (req.body && req.body.admin_user) || 'Admin', nowIso()]);
            }
        }
        const rule = await q.get(`SELECT * FROM referral_rules WHERE id = ?`, [id]);
        let notification = null;
        if (req.body.notify !== false) {
            if (isLive(rule) && !isLive(old)) notification = await notifyOffer(q, rule, 'LIVE');
            else if (isLive(rule) && isLive(old) && isImprovement(old, rule)) notification = await notifyOffer(q, rule, 'IMPROVED');
        }
        res.json({ success: true, data: await withMeta(rule), notification });
    };

    app.put('/api/referral-rules/:id', wrap((req, res) => updateRule(req, res, req.body || {})));
    app.patch('/api/referral-rules/:id/status', wrap((req, res) => updateRule(req, res, { is_enabled: req.body && req.body.is_enabled ? 1 : 0 })));

    const archive = async (req, res) => {
        const id = Number(req.params.id);
        const rule = await q.get(`SELECT * FROM referral_rules WHERE id = ?`, [id]);
        if (!rule) return res.status(404).json({ error: 'NOT_FOUND', message: 'Referral rule not found.' });
        if (!rule.is_archived) {
            await q.run(`UPDATE referral_rules SET is_archived = 1, is_enabled = 0, archived_at = ?, updated_at = ? WHERE id = ?`, [nowIso(), nowIso(), id]);
            await q.run(`INSERT INTO referral_rule_audit (rule_id, field, old_value, new_value, admin_user, created_at) VALUES (?, 'archived', '0', '1', ?, ?)`,
                [id, (req.body && req.body.admin_user) || 'Admin', nowIso()]);
        }
        res.json({ success: true });
    };
    app.post('/api/referral-rules/:id/archive', wrap(archive));
    app.delete('/api/referral-rules/:id', wrap(archive)); // rules are never hard-deleted (AC-1.5.1)

    app.get('/api/referral-rules/:id/audit', wrap(async (req, res) => {
        res.json({ data: await q.all(`SELECT * FROM referral_rule_audit WHERE rule_id = ? ORDER BY id DESC`, [Number(req.params.id)]) });
    }));

    // ---- Customer-facing API used by Rhemito ----
    app.post('/api/referral/customers', wrap(async (req, res) => {
        const c = await upsertCustomer(q, req.body || {});
        res.json({ data: c });
    }));

    app.get('/api/referral/customers/:id', wrap(async (req, res) => {
        const c = await q.get(`SELECT * FROM customers WHERE id = ?`, [req.params.id]);
        if (!c) return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found.' });
        res.json({ data: c });
    }));

    // Offer + link for the Refer & Earn card (US-2.1)
    // Pass receive_currency to get the offer for one corridor. Without it, `offer` is set only when the send currency has a single
    // live corridor; otherwise `offers` lists them all (one per corridor).
    app.get('/api/referral/offer', wrap(async (req, res) => {
        let currency = String(req.query.currency || '').toUpperCase();
        const receive = String(req.query.receive_currency || '').toUpperCase() || null;
        let customer = null;
        if (req.query.customer_id) {
            customer = await q.get(`SELECT * FROM customers WHERE id = ?`, [req.query.customer_id]);
            if (customer && !currency) currency = customer.send_currency;
        }
        if (customer && customer.account_status !== 'ACTIVE') return res.json({ offer: null, offers: [], reason: 'ACCOUNT_NOT_ACTIVE' });
        const rules = await offerRulesFor(q, currency || 'GBP', receive);
        if (!rules.length) return res.json({ offer: null, offers: [], reason: 'NO_ACTIVE_RULE' });
        const offers = [];
        for (const rule of rules) {
            const offer = publicOffer(rule);
            if (customer) {
                offer.referral_code = await ensureReferralCode(q, customer.id);
                offer.referral_link = `https://rhemito.com/ref/${offer.referral_code}`;
                const rewarded = await rewardedCountForReferrer(q, customer.id, rule.id);
                offer.cap_reached = !!(rule.max_referrals_per_referrer && rewarded >= rule.max_referrals_per_referrer && rule.reward_type !== 'REFEREE');
            }
            offers.push(offer);
        }
        res.json({ offer: offers.length === 1 ? offers[0] : null, offers, ...(offers.length > 1 ? { reason: 'MULTIPLE_CORRIDORS' } : {}) });
    }));

    // Validate a referral code / link (US-3.1, US-3.2)
    app.get('/api/referral/codes/:code', wrap(async (req, res) => {
        const look = await lookupCode(q, req.params.code);
        if (!look.valid) return res.status(look.reason === 'INVALID_FORMAT' ? 400 : 404).json({ valid: false, error: look.reason, message: look.message });
        const rules = await offerRulesFor(q, String(req.query.currency || look.referrer.send_currency || 'GBP').toUpperCase(), req.query.receive_currency);
        res.json({ valid: true, code: look.code, referrer_first_name: look.referrer.first_name, offer: rules.length === 1 ? publicOffer(rules[0]) : null, offers: rules.map(publicOffer) });
    }));

    // Record a link visit (AC-3.1.10) — repeat visits within 24h count once
    app.post('/api/referral/visits', wrap(async (req, res) => {
        const look = await lookupCode(q, (req.body || {}).code);
        if (!look.valid) return res.status(404).json({ error: look.reason, message: look.message });
        const visitor = String(req.body.visitor_id || 'anonymous').slice(0, 64);
        const since = new Date(clock.now().getTime() - 86400000).toISOString();
        const dup = await q.get(`SELECT id FROM referral_link_visits WHERE code = ? AND visitor_id = ? AND created_at >= ?`, [look.code, visitor, since]);
        if (!dup) {
            await q.run(`INSERT INTO referral_link_visits (code, referrer_id, currency, receive_currency, visitor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                [look.code, look.referrer.id, look.referrer.send_currency, String(req.body.receive_currency || '').toUpperCase() || null, visitor, nowIso()]);
        }
        res.json({ success: true, counted: !dup });
    }));

    // Create the referral on email verification (AC-3.1.5 – 3.1.7)
    app.post('/api/referral/referrals', wrap(async (req, res) => {
        const r = await createReferral(q, req.body || {});
        res.status(201).json({ data: r });
    }));

    // My referrals (US-2.3) — Referee names masked
    app.get('/api/referral/referrals', wrap(async (req, res) => {
        if (!req.query.referrer_id) return res.status(400).json({ error: 'VALIDATION', message: 'referrer_id is required' });
        const rows = await q.all(`SELECT r.*, b.first_name, b.last_name FROM referrals r LEFT JOIN customers b ON b.id = r.referee_id WHERE r.referrer_id = ? ORDER BY r.registered_at DESC`, [req.query.referrer_id]);
        const data = rows.map((r) => ({
            id: r.id, friend: maskName(r.first_name, r.last_name), joined_on: r.registered_at, status: r.status,
            status_label: STATUS_LABELS[r.status] || r.status, currency: r.currency, receive_currency: r.receive_currency, floor: r.floor,
            qualification_deadline: r.qualification_deadline, reward: r.referrer_credited || (r.reward_type === 'REFEREE' ? 0 : r.referrer_reward), credited: r.referrer_credited,
        }));
        const earned = {};
        for (const r of rows) if (r.referrer_credited) earned[r.currency] = round2((earned[r.currency] || 0) + r.referrer_credited);
        res.json({ data, summary: { joined: rows.length, earned_count: rows.filter((r) => r.referrer_credited > 0).length, total_earned: earned } });
    }));

    // Transfer lifecycle events from Rhemito (US-4.1, US-4.4, AC-5.2.10)
    app.post('/api/referral/transfer-events', wrap(async (req, res) => {
        res.json(await handleTransferEvent(q, req.body || {}));
    }));

    app.post('/api/referral/referrals/:id/approve', wrap(async (req, res) => {
        const { admin_user, reason } = req.body || {};
        if (!reason || String(reason).trim().length < 10 || String(reason).trim().length > 250) {
            return res.status(400).json({ error: 'VALIDATION', message: 'Enter a reason of 10–250 characters.' });
        }
        const r = await q.get(`SELECT * FROM referrals WHERE id = ?`, [req.params.id]);
        if (!r) return res.status(404).json({ error: 'NOT_FOUND', message: 'Referral not found.' });
        if (r.status !== 'NOT_ELIGIBLE') return res.status(400).json({ error: 'INVALID_STATUS', message: 'Only "Not eligible" referrals can be approved.' });
        const rule = r.rule_id ? await q.get(`SELECT * FROM referral_rules WHERE id = ?`, [r.rule_id]) : await ruleForReferral(q, r);
        if (!rule) return res.status(400).json({ error: 'NO_RULE', message: `There is no referral rule for ${corridorLabel(r.currency, r.receive_currency)} to approve against.` });
        const referrer = await q.get(`SELECT * FROM customers WHERE id = ?`, [r.referrer_id]);
        const referee = await q.get(`SELECT * FROM customers WHERE id = ?`, [r.referee_id]);
        let referrerCredited = 0, refereeCredited = 0;
        const rr = r.rule_id ? r.referrer_reward : rule.referrer_reward, re = r.rule_id ? r.referee_reward : rule.referee_reward;
        const type = r.reward_type || rule.reward_type;
        const note = ` (approved by ${admin_user || 'Admin'}: ${String(reason).trim()})`;
        if (type !== 'REFEREE' && rr > 0) {
            await addCredit(q, { userId: r.referrer_id, amount: rr, currency: r.currency, reason: 'REFERRAL_REWARD', referenceId: `${r.id}:referrer`, notes: `Referrer reward – referred ${maskName(referee.first_name, referee.last_name)}${note}`, referralId: r.id, ruleId: rule.id, validityDays: rule.bonus_validity_days });
            referrerCredited = rr;
        }
        if (type !== 'REFERRER' && re > 0) {
            await addCredit(q, { userId: r.referee_id, amount: re, currency: r.currency, reason: 'REFERRAL_REWARD', referenceId: `${r.id}:referee`, notes: `Referee reward – invited by ${maskName(referrer.first_name, referrer.last_name)}${note}`, referralId: r.id, ruleId: rule.id, validityDays: rule.bonus_validity_days });
            refereeCredited = re;
        }
        await q.run(`UPDATE referrals SET status = 'REWARDED', rule_id = ?, receive_currency = ?, rewarded_at = ?, referrer_credited = ?, referee_credited = ?, approved_by = ?, approval_reason = ?, status_reason = 'Approved by admin', updated_at = ? WHERE id = ?`,
            [rule.id, rule.receive_currency, nowIso(), referrerCredited, refereeCredited, admin_user || 'Admin', String(reason).trim(), nowIso(), r.id]);
        res.json({ data: await q.get(`SELECT * FROM referrals WHERE id = ?`, [r.id]) });
    }));

    // ---- Bonus wallet for Rhemito (US-5.1 – 5.4) ----
    app.get('/api/wallet/:customerId', wrap(async (req, res) => {
        const id = req.params.customerId;
        const currencyFilter = req.query.currency ? String(req.query.currency).toUpperCase() : null;
        const credits = await creditsWithRemaining(q, id, currencyFilter);
        const entries = await q.all(`SELECT * FROM credit_ledger WHERE user_id = ? ${currencyFilter ? 'AND currency = ?' : ''} ORDER BY created_at DESC`, currencyFilter ? [id, currencyFilter] : [id]);
        const byCurrency = {};
        const bucket = (c) => (byCurrency[c] = byCurrency[c] || { currency: c, available: 0, earned: 0, used: 0, expired: 0, used_transfers: new Set(), referral_credits: 0, other_credits: 0 });
        for (const e of entries) {
            const b = bucket(e.currency || 'GBP');
            if (e.type === 'EARNED' && e.reason_code !== 'BONUS_RETURNED') { b.earned += e.amount; if (e.reason_code === 'REFERRAL_REWARD') b.referral_credits++; else b.other_credits++; }
            if (e.type === 'APPLIED') { b.used -= e.amount; if (e.transfer_id || e.reference_id) b.used_transfers.add(e.transfer_id || e.reference_id); }
            if (e.reason_code === 'BONUS_RETURNED') b.used -= e.amount;
            if (e.type === 'EXPIRED' || e.type === 'VOIDED') b.expired -= e.amount;
        }
        const today = ukToday();
        for (const c of credits) {
            if (c.remaining > 0 && c.status !== 'EXPIRED' && c.status !== 'REVERSED' && (!c.expires_at || c.expires_at >= today)) bucket(c.currency || 'GBP').available += c.remaining;
        }
        const balances = Object.values(byCurrency).map((b) => ({
            currency: b.currency, available: round2(b.available), earned: round2(b.earned), used: round2(b.used), expired: round2(b.expired),
            used_transfer_count: b.used_transfers.size, referral_credit_count: b.referral_credits, other_credit_count: b.other_credits,
        }));
        const promos = await q.all(`SELECT pr.*, pc.code, pc.currency FROM promo_redemptions pr LEFT JOIN promo_codes pc ON (pr.promo_code_id = pc.id OR pr.promo_code_id = pc.code) WHERE pr.user_id = ? ORDER BY pr.created_at DESC`, [id]);
        res.json({
            customer_id: id, balances,
            unused: credits.filter((c) => c.remaining > 0 && ['UNUSED', 'PARTLY_USED'].includes(c.status)).map((c) => ({
                id: c.id, source: c.notes, reason_code: c.reason_code, amount: c.amount, remaining: c.remaining, currency: c.currency, earned_on: c.created_at, expires_on: c.expires_at, status: c.status,
            })),
            credits: credits.map((c) => ({ id: c.id, amount: c.amount, remaining: c.remaining, currency: c.currency, status: c.status, expires_on: c.expires_at, notes: c.notes, reason_code: c.reason_code, created_at: c.created_at })),
            history: entries.map((e) => ({ id: e.id, created_at: e.created_at, type: e.type, reason_code: e.reason_code, amount: e.amount, currency: e.currency, notes: e.notes, transfer_id: e.transfer_id, source_credit_id: e.source_credit_id, expires_on: e.expires_at })),
            promo_redemptions: promos.map((p) => ({ id: p.id, code: p.code, amount: -p.discount_amount, currency: p.currency, transfer_id: p.transaction_id, created_at: p.created_at })),
        });
    }));

    app.post('/api/wallet/:customerId/apply', wrap(async (req, res) => {
        res.json(await applyBonus(q, req.params.customerId, req.body || {}));
    }));

    app.post('/api/wallet/:customerId/release', wrap(async (req, res) => {
        res.json({ returned: await releaseBonus(q, req.params.customerId, (req.body || {}).transfer_id) });
    }));

    app.get('/api/referral/offer-notifications', wrap(async (req, res) => {
        const cond = [], params = [];
        if (req.query.currency) { cond.push('currency = ?'); params.push(String(req.query.currency).toUpperCase()); }
        if (req.query.receive_currency) { cond.push('(receive_currency IS NULL OR receive_currency = ?)'); params.push(String(req.query.receive_currency).toUpperCase()); }
        if (req.query.since) { cond.push('created_at > ?'); params.push(req.query.since); }
        res.json({ data: await q.all(`SELECT * FROM referral_offer_notifications ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''} ORDER BY id DESC LIMIT 50`, params) });
    }));

    app.post('/api/referral/run-jobs', wrap(async (req, res) => res.json(await runJobs(q))));

    // ---- Admin reporting (US-1.6, US-1.8) ----
    app.get('/api/referral/tracking', wrap(async (req, res) => res.json(await tracking(q, req.query))));
    app.get('/api/referral/tracking.csv', wrap(async (req, res) => {
        const result = await tracking(q, { ...req.query, page: 1, page_size: 500 });
        const csv = toCsv([
            ['Referral ID', 'id'], ['Referrer ID', 'referrer_id'], ['Referrer', (r) => `${r.referrer_first_name || ''} ${r.referrer_last_name || ''}`.trim()],
            ['Referee ID', 'referee_id'], ['Referee', (r) => `${r.referee_first_name || ''} ${r.referee_last_name || ''}`.trim()],
            ['Rule', 'rule_name'], ['Send Currency', 'currency'], ['Receive Currency', 'receive_currency'], ['Registered On', 'registered_at'], ['Qualification Deadline', 'qualification_deadline'],
            ['Qualifying Transfer ID', 'qualifying_transfer_id'], ['Status', 'status'], ['Reason', 'status_reason'],
            ['Referrer Bonus', 'referrer_credited'], ['Referee Bonus', 'referee_credited'], ['Rewarded On', 'rewarded_at'],
        ], result.data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="referral-tracking.csv"');
        res.send(csv);
    }));
    app.get('/api/referral/performance', wrap(async (req, res) => {
        res.json({ data: await performance(q, { from: req.query.from, to: req.query.to, include_archived: req.query.include_archived === '1' }) });
    }));
    app.get('/api/referral/performance.csv', wrap(async (req, res) => {
        const rows = await performance(q, { from: req.query.from, to: req.query.to, include_archived: req.query.include_archived === '1' });
        const csv = toCsv([
            ['Rule', 'name'], ['Send Currency', 'currency'], ['Receive Currency', 'receive_currency'], ['Status', 'status'], ['Link visits', 'link_visits'], ['Registrations', 'registrations'],
            ['Pending', 'pending'], ['Rewarded', 'rewarded'], ['Expired / Not eligible', 'closed'], ['Conversion rate %', 'conversion_rate'],
            ['Bonus issued', 'bonus_issued'], ['Bonus used', 'bonus_used'], ['Bonus unused', 'bonus_unused'], ['Bonus expired', 'bonus_expired'],
            ['Referred volume', 'referred_volume'], ['From', () => req.query.from || ''], ['To', () => req.query.to || ''],
        ], rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="referral-performance.csv"');
        res.send(csv);
    }));
    app.get('/api/referral/performance/:ruleId/top-referrers', wrap(async (req, res) => {
        const rows = await q.all(`SELECT r.referrer_id, c.first_name, c.last_name, COUNT(*) AS registrations,
            SUM(CASE WHEN r.status = 'REWARDED' THEN 1 ELSE 0 END) AS rewarded, SUM(r.referrer_credited) AS bonus_earned
            FROM referrals r LEFT JOIN customers c ON c.id = r.referrer_id WHERE r.rule_id = ?
            GROUP BY r.referrer_id ORDER BY rewarded DESC, registrations DESC LIMIT 10`, [Number(req.params.ruleId)]);
        res.json({ data: rows });
    }));

    return { ready, q };
}

module.exports = {
    registerReferralRoutes, initSchema, clock, ruleStatus, validateRule, offerText, ukDate, addDays, money, maskName, corridorLabel,
};
