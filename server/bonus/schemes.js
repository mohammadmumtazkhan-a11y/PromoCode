// Bonus scheme configuration (spec §3.1, §5.2, §5.3): validation, CRUD, derived status, audit, award counts, offers.
const { Reject } = require('./errors');
const { decimalsOk, formatMoney, round2, cur } = require('./money');
const { ukToday, nowIso, fmtUk } = require('./time');
const { parseCriteria } = require('./segments');

const TYPES = ['LOYALTY_CREDIT', 'TRANSACTION_THRESHOLD_CREDIT', 'REQUEST_MONEY'];
const LEGACY_MSG = 'Referral rewards are managed in Growth > Referral Settings.';
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const isInt = (v, min, max) => !blank(v) && Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max;
const pos = (v) => !blank(v) && Number(v) > 0;

// Shown status, first match (§2.2): Archived → Inactive → Ended → Scheduled → Active
function displayStatus(s, today = ukToday()) {
    if (s.status === 'ARCHIVED') return 'Archived';
    if (s.status === 'INACTIVE') return 'Inactive';
    if (s.status === 'EXPIRED' || (s.end_date && s.end_date < today)) return 'Ended';
    if (s.start_date && s.start_date > today) return 'Scheduled';
    return 'Active';
}

// "Customers who complete 3 GBP transfers within 30 days earn £10.00 bonus credit, valid for 90 days, once only."
function rewardText(s) {
    const tiers = Array.isArray(s.tiers) ? s.tiers : parseCriteria(s.tiers);
    if (s.is_tiered && Array.isArray(tiers) && tiers.length) return 'a bonus that depends on the amount';
    if (s.commission_type === 'PERCENTAGE') return `${Number(s.commission_percentage)}% of the amount${Number(s.max_award) > 0 ? ` (up to ${formatMoney(s.max_award, s.currency)})` : ''} as bonus credit`;
    return `${formatMoney(s.credit_amount, s.currency)} bonus credit`;
}

function summaryLine(s) {
    const rules = typeof s.eligibility_rules === 'string' ? parseCriteria(s.eligibility_rules) : (s.eligibility_rules || {});
    const validity = Number(rules.validityDays) > 0 ? Number(rules.validityDays) : 90;
    const once = rules.oneTimeOnly !== false ? 'once only' : 'every time they qualify';
    const c = cur(s.currency);
    let who;
    if (s.bonus_type === 'LOYALTY_CREDIT') who = `Customers who complete ${Number(s.min_transactions) || 0} ${c} transfers within ${Number(s.time_period_days) || 0} days earn`;
    else if (s.bonus_type === 'REQUEST_MONEY') who = Number(s.min_transaction_threshold) > 0 ? `Customers whose money request of ${formatMoney(s.min_transaction_threshold, c)} or more is paid earn` : 'Customers whose money request is paid earn';
    else who = Number(s.min_transaction_threshold) > 0 ? `Customers who send ${formatMoney(s.min_transaction_threshold, c)} or more in one transfer earn` : `Customers who complete a ${c} transfer earn`;
    return `${who} ${rewardText(s)}, valid for ${validity} days, ${once}.`;
}

// The customer-facing sentence for API-S8, e.g. "Complete 3 transfers within 30 days and get £10.00 bonus credit."
function offerSentence(s) {
    const reward = rewardText(s).replace(/^a bonus/, 'a bonus');
    if (s.bonus_type === 'LOYALTY_CREDIT') return `Complete ${Number(s.min_transactions) || 0} transfers within ${Number(s.time_period_days) || 0} days and get ${reward}.`;
    if (s.bonus_type === 'REQUEST_MONEY') return Number(s.min_transaction_threshold) > 0
        ? `Get ${reward} when a money request of ${formatMoney(s.min_transaction_threshold, s.currency)} or more is paid.`
        : `Get ${reward} when a money request is paid.`;
    return Number(s.min_transaction_threshold) > 0
        ? `Send ${formatMoney(s.min_transaction_threshold, s.currency)} or more in one transfer and get ${reward}.`
        : `Complete a transfer and get ${reward}.`;
}

// ---------- validation (BS-1, §5.2) ----------
async function validateScheme(q, body, { id, existing } = {}) {
    const fields = {};
    const name = String(body.name || '').trim();
    if (!name) fields.name = 'Enter a bonus name.';
    else if (name.length < 3 || name.length > 60) fields.name = 'Use 3–60 characters.';
    else {
        const dup = await q.get(`SELECT id FROM bonus_schemes WHERE LOWER(name) = LOWER(?) AND status <> 'ARCHIVED' AND id <> ?`, [name, id || -1]);
        if (dup) fields.name = 'A scheme with this name already exists.';
    }
    if (body.description && String(body.description).length > 200) fields.description = 'Keep the note under 200 characters.';

    const type = String(body.bonus_type || '').toUpperCase();
    if (!type) fields.bonus_type = 'Bonus Type is required';
    else if (!TYPES.includes(type)) fields.bonus_type = 'Choose Loyalty Credit, Transaction Threshold Credit or Request Money Credit.';

    const currency = cur(body.currency || 'GBP');
    if (!/^[A-Z]{3}$/.test(currency)) fields.currency = 'Choose a currency.';

    const method = String(body.commission_type || 'FIXED').toUpperCase();
    if (!['FIXED', 'PERCENTAGE'].includes(method)) fields.commission_type = 'Choose Fixed amount or Percentage of the amount.';
    const tiered = !!body.is_tiered;
    if (!tiered && method === 'FIXED') {
        if (!pos(body.credit_amount) || !decimalsOk(body.credit_amount, currency)) fields.credit_amount = 'Enter an amount greater than 0.';
    }
    if (!tiered && method === 'PERCENTAGE') {
        const p = Number(body.commission_percentage);
        if (blank(body.commission_percentage) || !(p >= 0.01 && p <= 100)) fields.commission_percentage = 'Enter a percentage between 0.01 and 100.';
    }
    if (!blank(body.max_award) && !(Number(body.max_award) > 0)) fields.max_award = 'Enter an amount greater than 0, or leave it blank.';

    let tiers = [];
    if (tiered) {
        tiers = (Array.isArray(body.tiers) ? body.tiers : parseCriteria(body.tiers)) || [];
        if (!Array.isArray(tiers) || !tiers.length) fields.tiers = 'Add at least one tier.';
        else {
            const norm = tiers.map((t) => ({ min: Number(t.min), max: blank(t.max) ? null : Number(t.max), value: Number(t.value) }));
            for (let i = 0; i < norm.length && !fields.tiers; i++) {
                const t = norm[i];
                if (Number.isNaN(t.min) || t.min < 0) fields.tiers = 'Min must be 0 or more.';
                else if (t.max === null && i < norm.length - 1) fields.tiers = 'Only the last tier can have no Max.';
                else if (t.max !== null && !(t.max > t.min)) fields.tiers = 'Max must be more than Min.';
                else if (!(t.value > 0) || (method === 'PERCENTAGE' && t.value > 100)) fields.tiers = method === 'PERCENTAGE' ? 'Enter a percentage between 0.01 and 100.' : 'Enter an amount greater than 0.';
                else if (i > 0) {
                    const prev = norm[i - 1];
                    // follow on: start at the previous Max, or at most 1 above it for whole-number bands (e.g. 0–1000, 1001–5000)
                    if (prev.max === null || t.min < prev.max || t.min - prev.max > 1) fields.tiers = 'Tiers must follow on from each other with no gaps or overlaps.';
                }
            }
            tiers = norm;
        }
    }

    // A threshold of 0 (or blank) means "no minimum"; the admin form asks for more than 0 (§5.2)
    if (!blank(body.min_transaction_threshold) && !(Number(body.min_transaction_threshold) >= 0)) {
        fields.min_transaction_threshold = type === 'REQUEST_MONEY' ? 'Enter 0 or more.' : 'Enter a minimum greater than 0.';
    }
    if (type === 'LOYALTY_CREDIT') {
        if (blank(body.min_transactions) || Number(body.min_transactions) <= 0) fields.min_transactions = 'Number of Transactions is required for Loyalty Credit';
        else if (!isInt(body.min_transactions, 1, 1000)) fields.min_transactions = 'Enter a whole number from 1 to 1,000.';
        if (blank(body.time_period_days) || Number(body.time_period_days) <= 0) fields.time_period_days = 'Time Period (Days) is required for Loyalty Credit';
        else if (!isInt(body.time_period_days, 1, 3650)) fields.time_period_days = 'Enter a whole number of days from 1 to 3,650.';
    }

    const rules = typeof body.eligibility_rules === 'string' ? parseCriteria(body.eligibility_rules) : { ...(body.eligibility_rules || {}) };
    if (blank(rules.validityDays)) rules.validityDays = 90;
    else if (!isInt(rules.validityDays, 1, 730)) fields.validityDays = 'Enter a whole number of days from 1 to 730.';
    else rules.validityDays = Number(rules.validityDays);
    if (rules.oneTimeOnly === undefined) rules.oneTimeOnly = true;
    if (!Array.isArray(rules.segments) || !rules.segments.length) rules.segments = [type === 'LOYALTY_CREDIT' ? 'existing_customers' : 'all'];
    if (type === 'LOYALTY_CREDIT') rules.segments = ['existing_customers']; // D2: always existing customers

    let dateError = null;
    if (!body.start_date) fields.start_date = 'Choose a start date.';
    if (!body.end_date) fields.end_date = 'Choose an end date.';
    if (body.start_date && body.end_date && String(body.start_date) >= String(body.end_date)) {
        fields.end_date = 'Start date must be before end date.';
        dateError = 'Please select a valid date range. Start date must be before end date.';
    }

    const status = String(body.status || (existing ? existing.status : 'ACTIVE')).toUpperCase();
    const keepsStoredEnded = existing && existing.status === 'EXPIRED' && status === 'EXPIRED'; // editing an ended scheme keeps its stored status
    if (!keepsStoredEnded && !['ACTIVE', 'INACTIVE'].includes(status)) fields.status = 'Choose Active or Inactive.';

    if (Object.keys(fields).length) {
        const first = Object.keys(fields)[0];
        // The date-range refusal keeps its existing wording as the top-level message
        const message = first === 'end_date' && dateError ? dateError : fields[first];
        throw new Reject(400, 'VALIDATION', message, { plain: true, fields });
    }

    return {
        name, description: body.description ? String(body.description).trim() : null, bonus_type: type, currency, commission_type: method,
        credit_amount: tiered || method === 'PERCENTAGE' ? Number(body.credit_amount) || 0 : Number(body.credit_amount),
        commission_percentage: method === 'PERCENTAGE' && !tiered ? Number(body.commission_percentage) : Number(body.commission_percentage) || 0,
        max_award: blank(body.max_award) ? null : Number(body.max_award),
        is_tiered: tiered ? 1 : 0, tiers: JSON.stringify(tiers),
        min_transaction_threshold: Number(body.min_transaction_threshold) || 0,
        min_transactions: type === 'LOYALTY_CREDIT' ? Number(body.min_transactions) : Number(body.min_transactions) || 0,
        time_period_days: type === 'LOYALTY_CREDIT' ? Number(body.time_period_days) : Number(body.time_period_days) || 0,
        eligibility_rules: JSON.stringify(rules), start_date: String(body.start_date), end_date: String(body.end_date), status,
    };
}

const COLUMNS = ['name', 'description', 'bonus_type', 'currency', 'commission_type', 'credit_amount', 'commission_percentage', 'max_award',
    'is_tiered', 'tiers', 'min_transaction_threshold', 'min_transactions', 'time_period_days', 'eligibility_rules', 'start_date', 'end_date', 'status'];

async function audit(q, schemeId, field, oldValue, newValue, admin) {
    await q.run('INSERT INTO bonus_scheme_audit (scheme_id, field, old_value, new_value, admin_name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [schemeId, field, oldValue === undefined || oldValue === null ? null : String(oldValue), newValue === undefined || newValue === null ? null : String(newValue), admin, nowIso()]);
}

// Awards per scheme: count and bonus issued per currency (from the ledger)
async function awardStats(q) {
    const rows = await q.all(`SELECT scheme_id, currency, COUNT(*) AS n, SUM(amount) AS s FROM credit_ledger
        WHERE type = 'EARNED' AND reason_code = 'SCHEME_BONUS' AND scheme_id IS NOT NULL GROUP BY scheme_id, currency`);
    const out = {};
    for (const r of rows) {
        const o = (out[r.scheme_id] = out[r.scheme_id] || { awards_count: 0, issued_by_currency: {} });
        o.awards_count += r.n;
        o.issued_by_currency[r.currency || 'GBP'] = round2((o.issued_by_currency[r.currency || 'GBP'] || 0) + r.s);
    }
    return out;
}

const present = (s, stats = {}) => ({
    ...s,
    eligibility_rules: parseCriteria(s.eligibility_rules),
    tiers: parseCriteria(s.tiers || '[]'),
    is_tiered: !!s.is_tiered,
    display_status: displayStatus(s),
    is_legacy: s.bonus_type === 'REFERRAL_CREDIT',
    awards_count: (stats[s.id] && stats[s.id].awards_count) || 0,
    issued_by_currency: (stats[s.id] && stats[s.id].issued_by_currency) || {},
    summary: s.bonus_type === 'REFERRAL_CREDIT' ? null : summaryLine(s),
});

function registerSchemeRoutes(app, q, { wrap, ports }) {
    const actor = (req) => ports.adminIdentity(req).name;

    app.get('/api/bonus-schemes', wrap(async (req, res) => {
        const rows = await q.all('SELECT * FROM bonus_schemes ORDER BY created_at DESC, id DESC');
        const stats = await awardStats(q);
        res.json({ data: rows.map((s) => present(s, stats)) });
    }));

    app.post('/api/bonus-schemes', wrap(async (req, res) => {
        const body = req.body || {};
        if (String(body.bonus_type || '').toUpperCase() === 'REFERRAL_CREDIT') return res.status(400).json({ error: LEGACY_MSG });
        const v = await validateScheme(q, body);
        const cols = [...COLUMNS, 'created_by', 'created_at', 'updated_at'];
        const vals = [...COLUMNS.map((c) => v[c]), actor(req), nowIso(), nowIso()];
        const r = await q.run(`INSERT INTO bonus_schemes (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
        await audit(q, r.lastID, 'created', null, v.name, actor(req));
        res.json({ success: true, id: r.lastID });
    }));

    app.put('/api/bonus-schemes/:id', wrap(async (req, res) => {
        const existing = await q.get('SELECT * FROM bonus_schemes WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Bonus scheme not found' });
        const body = req.body || {};
        if (existing.bonus_type === 'REFERRAL_CREDIT' || String(body.bonus_type || '').toUpperCase() === 'REFERRAL_CREDIT') return res.status(400).json({ error: LEGACY_MSG });
        if (existing.status === 'ARCHIVED') return res.status(400).json({ error: 'Archived schemes cannot be changed.' });
        const v = await validateScheme(q, body, { id: existing.id, existing });
        await q.run(`UPDATE bonus_schemes SET ${COLUMNS.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, [...COLUMNS.map((c) => v[c]), nowIso(), existing.id]);
        for (const c of COLUMNS) {
            if (String(existing[c] ?? '') !== String(v[c] ?? '')) await audit(q, existing.id, c, existing[c], v[c], actor(req));
        }
        res.json({ success: true });
    }));

    app.patch('/api/bonus-schemes/:id/status', wrap(async (req, res) => {
        const status = String((req.body || {}).status || '').toUpperCase();
        if (!['ACTIVE', 'INACTIVE'].includes(status)) return res.status(400).json({ error: 'VALIDATION', message: 'Choose Active or Inactive.' });
        const existing = await q.get('SELECT * FROM bonus_schemes WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'NOT_FOUND', message: 'Bonus scheme not found.' });
        if (existing.bonus_type === 'REFERRAL_CREDIT') return res.status(400).json({ error: LEGACY_MSG });
        if (existing.status === 'ARCHIVED') return res.status(400).json({ error: 'VALIDATION', message: 'Archived schemes cannot be changed.' });
        if (existing.status !== status) {
            await q.run('UPDATE bonus_schemes SET status = ?, updated_at = ? WHERE id = ?', [status, nowIso(), existing.id]);
            await audit(q, existing.id, 'status', existing.status, status, actor(req));
        }
        const stats = await awardStats(q);
        res.json({ success: true, data: present(await q.get('SELECT * FROM bonus_schemes WHERE id = ?', [existing.id]), stats) });
    }));

    // Schemes are archived, never deleted (D11)
    app.delete('/api/bonus-schemes/:id', wrap(async (req, res) => {
        const existing = await q.get('SELECT * FROM bonus_schemes WHERE id = ?', [req.params.id]);
        if (existing && existing.status !== 'ARCHIVED') {
            await q.run(`UPDATE bonus_schemes SET status = 'ARCHIVED', archived_at = ?, updated_at = ? WHERE id = ?`, [nowIso(), nowIso(), existing.id]);
            await audit(q, existing.id, 'status', existing.status, 'ARCHIVED', actor(req));
        }
        res.json({ success: true, message: 'Scheme archived' });
    }));

    app.get('/api/bonus-schemes/:id/audit', wrap(async (req, res) => {
        res.json({ data: await q.all('SELECT * FROM bonus_scheme_audit WHERE scheme_id = ? ORDER BY id DESC', [req.params.id]) });
    }));

    // Live schemes customers can see (API-S8)
    app.get('/api/bonus/offers', wrap(async (req, res) => {
        const currency = req.query.currency ? cur(req.query.currency) : null;
        const rows = await q.all(`SELECT * FROM bonus_schemes WHERE status = 'ACTIVE' AND bonus_type IN (${TYPES.map(() => '?').join(',')}) ${currency ? 'AND currency = ?' : ''} ORDER BY end_date, id`,
            currency ? [...TYPES, currency] : TYPES);
        res.json({
            data: rows.filter((s) => displayStatus(s) === 'Active').map((s) => ({
                id: s.id, name: s.name, type: s.bonus_type, currency: cur(s.currency), summary: offerSentence(s), end_date: s.end_date, end_date_display: fmtUk(s.end_date),
            })),
        });
    }));
}

module.exports = { TYPES, displayStatus, summaryLine, offerSentence, validateScheme, awardStats, registerSchemeRoutes, LEGACY_MSG };
