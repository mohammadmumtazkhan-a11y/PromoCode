// User segments: saved audiences for bonus schemes (and, read-only, promo codes). Spec §3.2 and §5.4.
// Customer stats come from the module's own record of transfers (bonus_transfers), with today's fallback to the
// legacy merchant transactions table for customers the module has never seen.
const { clock, nowIso } = require('./time');
const { Reject } = require('./errors');

let directory = { signupDate: async () => null };
const configure = (customerDirectory) => { if (customerDirectory) directory = customerDirectory; };

// ---------- customer facts ----------
async function customerStats(q, userId, { currency, periodDays, excludeTransferId } = {}) {
    const known = !!(await q.get('SELECT 1 AS x FROM bonus_transfers WHERE customer_id = ? LIMIT 1', [userId]).catch(() => null));
    const cutoff = periodDays ? new Date(clock.now().getTime() - periodDays * 86400000).toISOString() : null;
    if (known) {
        const where = ['customer_id = ?', `status = 'COMPLETED'`]; const params = [userId];
        if (currency) { where.push('currency = ?'); params.push(String(currency).toUpperCase()); }
        if (cutoff) { where.push('created_at >= ?'); params.push(cutoff); }
        if (excludeTransferId) { where.push('transfer_id <> ?'); params.push(excludeTransferId); }
        const row = await q.get(`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS volume FROM bonus_transfers WHERE ${where.join(' AND ')}`, params);
        return { count: row.count || 0, volume: row.volume || 0 };
    }
    try {
        const row = await q.get(`SELECT COUNT(*) AS count, COALESCE(SUM(amount_debit_ngn), 0) AS volume FROM transactions WHERE merchant_id = ? ${cutoff ? 'AND debit_date >= ?' : ''}`,
            cutoff ? [userId, cutoff] : [userId]);
        return { count: row.count || 0, volume: row.volume || 0 };
    } catch { return { count: 0, volume: 0 }; }
}

async function signupDate(q, userId) {
    try {
        const fromHost = await directory.signupDate(userId);
        if (fromHost) return new Date(fromHost);
    } catch { /* host directory unavailable */ }
    const r = await q.get('SELECT created_at FROM bonus_customers WHERE id = ?', [userId]).catch(() => null);
    return r && r.created_at ? new Date(r.created_at) : null;
}

const inRange = (n, min, max) => n >= (Number(min) || 0) && (max === null || max === undefined || max === '' || n <= Number(max));
const parseCriteria = (s) => { try { return typeof s === 'string' ? JSON.parse(s || '{}') : (s || {}); } catch { return {}; } };

// One saved segment, or a built-in name ('all', 'existing_customers')
async function segmentMatches(q, segId, userId, ctx = {}) {
    if (segId === 'all') return true;
    if (segId === 'existing_customers') {
        const prior = await customerStats(q, userId, { excludeTransferId: ctx.transferId });
        return prior.count >= 1;
    }
    const seg = await q.get('SELECT * FROM user_segments WHERE id = ?', [segId]);
    if (!seg) return false;
    const c = parseCriteria(seg.criteria);
    if (c.signup_start_date || c.signup_end_date) {
        const joined = await signupDate(q, userId);
        if (!joined) return false;
        if (c.signup_start_date && joined < new Date(c.signup_start_date)) return false;
        if (c.signup_end_date && joined > new Date(c.signup_end_date)) return false;
    }
    const stats = await customerStats(q, userId, { periodDays: c.period_days || null, currency: c.type === 'TRANSACTION_VOLUME' ? c.currency : null });
    if (c.type === 'TRANSACTION_COUNT') return inRange(stats.count, c.min, c.max);
    if (c.type === 'TRANSACTION_VOLUME') return inRange(stats.volume, c.min, c.max);
    if (c.type === 'NEW_USER') return (c.min || c.max) ? inRange(stats.count, c.min, c.max) : true;
    return false;
}

const listSegments = (q) => q.all('SELECT * FROM user_segments ORDER BY created_at DESC, id DESC');
const getSegment = (q, id) => q.get('SELECT * FROM user_segments WHERE id = ?', [id]);

// ---------- validation (§5.4) ----------
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
async function validateSegment(q, body, { id } = {}) {
    const fields = {};
    const name = String(body.name || '').trim();
    if (!name) fields.name = 'Name is required';
    else if (name.length < 3 || name.length > 60) fields.name = 'Use 3–60 characters.';
    else {
        const dup = await q.get('SELECT id FROM user_segments WHERE LOWER(name) = LOWER(?) AND id <> ?', [name, id || -1]);
        if (dup) fields.name = 'A segment with this name already exists.';
    }
    const c = parseCriteria(body.criteria);
    if (!blank(c.min) && (Number.isNaN(Number(c.min)) || Number(c.min) < 0)) fields.min = 'Enter 0 or more.';
    if (!blank(c.max) && (Number.isNaN(Number(c.max)) || Number(c.max) < (Number(c.min) || 0))) fields.max = 'Max must be at least Min.';
    if (!blank(c.period_days) && !(Number.isInteger(Number(c.period_days)) && Number(c.period_days) >= 1 && Number(c.period_days) <= 3650)) {
        fields.period_days = 'Enter a whole number of days from 1 to 3,650.';
    }
    if (c.signup_start_date && c.signup_end_date && c.signup_end_date < c.signup_start_date) fields.signup_end_date = 'Signed Up Until must be on or after Signed Up From.';
    if (Object.keys(fields).length) {
        const first = fields[Object.keys(fields)[0]];
        throw new Reject(400, 'VALIDATION', first, { plain: true, fields });
    }
    return { name, description: body.description || null, criteria: c };
}

// How many non-archived schemes (and, through the host, promo codes) use a segment
async function usage(q, id, promoUsage) {
    const schemes = await q.all(`SELECT id, eligibility_rules FROM bonus_schemes WHERE status <> 'ARCHIVED'`);
    const n = schemes.filter((s) => {
        const segs = (parseCriteria(s.eligibility_rules).segments || []).map(String);
        return segs.includes(String(id));
    }).length;
    let promos = 0;
    if (promoUsage) { try { promos = Number(await promoUsage(id)) || 0; } catch { promos = 0; } }
    return { schemes: n, promos };
}

// Customers who match today (preview)
async function preview(q, id) {
    const ids = await q.all(`SELECT id FROM bonus_customers UNION SELECT DISTINCT customer_id AS id FROM bonus_transfers WHERE customer_id IS NOT NULL`);
    let count = 0;
    for (const r of ids) if (await segmentMatches(q, String(id), r.id, {})) count++;
    return count;
}

function registerSegmentRoutes(app, q, { ready, ports, wrap }) {
    app.get('/api/user-segments', wrap(async (req, res) => {
        const rows = await listSegments(q);
        res.json({ data: rows.map((seg) => ({ ...seg, criteria: parseCriteria(seg.criteria) })) });
    }));

    app.post('/api/user-segments', wrap(async (req, res) => {
        const v = await validateSegment(q, req.body || {});
        const r = await q.run('INSERT INTO user_segments (name, description, criteria, updated_at) VALUES (?, ?, ?, ?)', [v.name, v.description, JSON.stringify(v.criteria), nowIso()]);
        res.json({ success: true, id: r.lastID });
    }));

    app.put('/api/user-segments/:id', wrap(async (req, res) => {
        const v = await validateSegment(q, req.body || {}, { id: Number(req.params.id) });
        const r = await q.run('UPDATE user_segments SET name = ?, description = ?, criteria = ?, updated_at = ? WHERE id = ?',
            [v.name, v.description, JSON.stringify(v.criteria), nowIso(), req.params.id]);
        res.json({ success: true, changes: r.changes });
    }));

    app.get('/api/user-segments/:id/usage', wrap(async (req, res) => res.json(await usage(q, req.params.id, ports.segmentUsage))));

    app.delete('/api/user-segments/:id', wrap(async (req, res) => {
        const u = await usage(q, req.params.id, ports.segmentUsage);
        if (u.schemes || u.promos) {
            const parts = [];
            if (u.schemes) parts.push(`${u.schemes} scheme(s)`);
            if (u.promos) parts.push(`${u.promos} promo code(s)`);
            return res.status(409).json({ error: `This segment is used by ${parts.join(' and ')}. Remove it from them first.`, code: 'IN_USE', ...u });
        }
        const r = await q.run('DELETE FROM user_segments WHERE id = ?', [req.params.id]);
        res.json({ success: true, changes: r.changes });
    }));

    app.get('/api/user-segments/:id/preview', wrap(async (req, res) => {
        const seg = await getSegment(q, req.params.id);
        if (!seg) return res.status(404).json({ error: 'NOT_FOUND', message: 'Segment not found.' });
        const count = await preview(q, req.params.id);
        res.json({ count, message: `${count} customers match today.` });
    }));
    return ready;
}

module.exports = { configure, customerStats, signupDate, segmentMatches, listSegments, getSegment, validateSegment, usage, preview, registerSegmentRoutes, parseCriteria };
