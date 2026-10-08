// Admin API for Financials > Promo Codes (spec PROMO-MITO §5, §8.2, §8.3).
const crypto = require('crypto');
const { PromoError, sendError } = require('./errors');
const { validatePromo } = require('./validation');
const engine = require('./engine');
const { roundFor } = require('./money');

const parseJson = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
const nowIso = () => engine.clock.now().toISOString();

// Shown status (spec §2.2), first match wins
function displayStatus(p, now = engine.clock.now()) {
    if (p.status === 'Disabled') return 'Disabled';
    if (p.end_date && new Date(p.end_date) < now) return 'Expired';
    if (p.start_date && new Date(p.start_date) > now) return 'Scheduled';
    if (p.usage_limit_global !== -1 && p.usage_limit_global !== null && p.usage_count >= p.usage_limit_global) return 'Fully redeemed';
    if (p.budget_limit !== -1 && p.budget_limit !== null && p.total_discount_utilized >= p.budget_limit) return 'Budget spent';
    return p.status === 'Active' ? 'Active' : p.status;
}

function present(p, redeemedCount = 0) {
    const now = engine.clock.now();
    return {
        ...p,
        // `status` keeps today's meaning: Active, Disabled, or Expired when an Active code has ended
        status: p.status === 'Active' && p.end_date && new Date(p.end_date) < now ? 'Expired' : p.status,
        display_status: displayStatus(p, now),
        is_legacy: engine.LEGACY_TYPES.includes(p.type),
        redeemed_count: redeemedCount,
        restrictions: parseJson(p.restrictions, {}),
        user_segment: engine.audienceOf(p),
        user_segment_criteria: parseJson(p.user_segment_criteria, {}),
    };
}

const csvEscape = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (headers, rows) => [headers.map((h) => csvEscape(h[0])).join(','), ...rows.map((r) => headers.map((h) => csvEscape(typeof h[1] === 'function' ? h[1](r) : r[h[1]])).join(','))].join('\n');
const sendCsv = (res, name, csv) => { res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="${name}"`); res.send(csv); };

const AUDITED = ['code', 'description', 'type', 'value', 'min_threshold', 'max_discount', 'currency', 'usage_limit_global', 'usage_limit_per_user', 'budget_limit', 'start_date', 'end_date', 'restrictions', 'user_segment', 'status'];

function registerAdminRoutes(app, q, { ready, ports }) {
    const wrap = (fn) => async (req, res) => { try { await ready; await fn(req, res); } catch (err) { sendError(res, err); } };
    const who = (req) => ports.adminIdentity(req).name;
    const audit = (id, field, oldV, newV, admin) => q.run(`INSERT INTO promo_audit (promo_code_id, field, old_value, new_value, admin_name, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [String(id), field, oldV === null || oldV === undefined ? null : String(oldV), newV === null || newV === undefined ? null : String(newV), admin, nowIso()]);
    const redeemedCounts = async () => {
        const rows = await q.all(`SELECT promo_code_id AS k, COUNT(*) AS c FROM promo_redemptions WHERE COALESCE(status, 'Redeemed') = 'Redeemed' GROUP BY promo_code_id`);
        return Object.fromEntries(rows.map((r) => [String(r.k), r.c]));
    };

    const listCodes = async (f = {}) => {
        const rows = await q.all('SELECT * FROM promo_codes ORDER BY start_date DESC');
        const counts = await redeemedCounts();
        let data = rows.map((r) => present(r, (counts[r.code] || 0) + (counts[String(r.id)] || 0)));
        if (f.status) data = data.filter((p) => p.display_status === f.status);
        if (f.type) data = data.filter((p) => p.type === f.type);
        if (f.currency) data = data.filter((p) => (p.currency || '') === String(f.currency).toUpperCase());
        if (f.q) data = data.filter((p) => String(p.code).includes(String(f.q).trim().toUpperCase()));
        return data;
    };

    // API-A1 list
    app.get('/api/promocodes', wrap(async (req, res) => res.json({ data: await listCodes(req.query) })));
    app.get('/api/promocodes.csv', wrap(async (req, res) => {
        const data = await listCodes(req.query);
        sendCsv(res, 'promo-codes.csv', toCsv([
            ['Code', 'code'], ['Note', 'description'], ['Type', 'type'], ['Value', 'value'], ['Currency', 'currency'], ['Max discount', 'max_discount'],
            ['Minimum send amount', 'min_threshold'], ['Total uses limit', (r) => (r.usage_limit_global === -1 ? 'Unlimited' : r.usage_limit_global)],
            ['Uses per customer', (r) => (r.usage_limit_per_user === -1 ? 'Unlimited' : r.usage_limit_per_user)],
            ['Budget', (r) => (r.budget_limit === -1 ? 'Unlimited' : r.budget_limit)], ['Uses', 'usage_count'], ['Cost incurred', 'total_discount_utilized'],
            ['Start', 'start_date'], ['End', 'end_date'], ['Status', 'display_status'],
            ['Corridors', (r) => (r.restrictions.corridors || []).join(' ')], ['Payment methods', (r) => (r.restrictions.payment_methods || []).join(' ')],
            ['Who', (r) => r.user_segment.type],
        ], data));
    }));

    // API-A7 KPI tiles
    app.get('/api/promocodes/summary', wrap(async (req, res) => {
        const codes = await listCodes();
        const to = req.query.to || nowIso().slice(0, 10);
        const from = req.query.from || new Date(engine.clock.now().getTime() - 30 * 86400000).toISOString().slice(0, 10);
        const uses = (await engine.listRedemptions(q, { from, to, status: 'Redeemed' })).length;
        const all = await engine.listRedemptions(q, { status: 'Redeemed' });
        const cost = {};
        for (const r of all) { const c = r.currency || 'GBP'; cost[c] = roundFor((cost[c] || 0) + Number(r.discount_amount || 0), c); }
        res.json({ active_codes: codes.filter((p) => p.display_status === 'Active').length, uses, from, to, cost_incurred: cost });
    }));

    // API-A9 saved segments (read-only)
    app.get('/api/promocodes/segments', wrap(async (req, res) => {
        const rows = await ports.segmentProvider.listSegments();
        res.json({ data: rows.map((s) => ({ id: s.id, name: s.name, description: s.description })) });
    }));

    const checkDuplicate = async (code, id) => {
        const clash = await q.get(`SELECT id FROM promo_codes WHERE upper(code) = ? ${id ? 'AND CAST(id AS TEXT) != ?' : ''}`, id ? [code, String(id)] : [code]);
        if (clash) throw new PromoError(409, 'DUPLICATE', 'Promo code already exists', { fields: { code: 'This promo code already exists.' } });
    };
    const validationError = (errors) => new PromoError(400, 'VALIDATION', errors.code && !errors.type && Object.keys(errors).length === 1 ? errors.code : 'Please correct the highlighted fields.', { fields: errors });

    // API-A2 create
    app.post('/api/promocodes', wrap(async (req, res) => {
        const body = req.body || {};
        if (engine.LEGACY_TYPES.includes(body.type)) throw new PromoError(400, 'VALIDATION', 'This type can no longer be created.', { fields: { type: 'Choose Fixed, Percentage or Fee waiver.' } });
        const { errors, clean } = validatePromo(body, { isNew: true, now: engine.clock.now() });
        if (Object.keys(errors).length) throw validationError(errors);
        await checkDuplicate(clean.code);
        const admin = who(req);
        const r = await q.run(`INSERT INTO promo_codes (code, description, type, value, min_threshold, max_discount, currency, usage_limit_global, usage_limit_per_user,
            budget_limit, start_date, end_date, status, restrictions, user_segment, user_segment_criteria, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?)`,
        [clean.code, clean.description, clean.type, clean.value, clean.min_threshold, clean.max_discount, clean.currency, clean.usage_limit_global, clean.usage_limit_per_user,
            clean.budget_limit, clean.start_date, clean.end_date, JSON.stringify(clean.restrictions), JSON.stringify(clean.user_segment),
            JSON.stringify(body.user_segment_criteria || {}), admin, nowIso(), nowIso()]);
        await audit(r.lastID, 'created', null, clean.code, admin);
        res.json({ success: true, id: r.lastID });
    }));

    const getCode = async (id) => {
        const row = await q.get('SELECT * FROM promo_codes WHERE CAST(id AS TEXT) = ?', [String(id)]);
        if (!row) throw new PromoError(404, 'NOT_FOUND', 'Promo code not found');
        return row;
    };

    // API-A3 edit (only a code that has never been used)
    app.put('/api/promocodes/:id', wrap(async (req, res) => {
        const row = await getCode(req.params.id);
        const used = await q.get(`SELECT COUNT(*) AS n FROM promo_redemptions WHERE (promo_code_id = ? OR promo_code_id = ?) AND COALESCE(status, 'Redeemed') = 'Redeemed'`, [String(row.id), row.code]);
        if ((row.usage_count || 0) > 0 || (used && used.n > 0)) {
            throw new PromoError(409, 'IN_USE', 'This code has already been used, so it cannot be edited. Create a new code instead.');
        }
        if (engine.LEGACY_TYPES.includes(row.type)) throw new PromoError(400, 'LEGACY', 'Legacy codes cannot be edited. Disable it and create a new code.');
        const body = req.body || {};
        const { errors, clean } = validatePromo(body, { isNew: false, now: engine.clock.now() });
        if (Object.keys(errors).length) throw validationError(errors);
        await checkDuplicate(clean.code, row.id);
        const admin = who(req);
        await q.run(`UPDATE promo_codes SET code = ?, description = ?, type = ?, value = ?, min_threshold = ?, max_discount = ?, currency = ?, usage_limit_global = ?,
            usage_limit_per_user = ?, budget_limit = ?, start_date = ?, end_date = ?, restrictions = ?, user_segment = ?, user_segment_criteria = ?, updated_at = ? WHERE id = ?`,
        [clean.code, clean.description, clean.type, clean.value, clean.min_threshold, clean.max_discount, clean.currency, clean.usage_limit_global, clean.usage_limit_per_user,
            clean.budget_limit, clean.start_date, clean.end_date, JSON.stringify(clean.restrictions), JSON.stringify(clean.user_segment),
            JSON.stringify(body.user_segment_criteria || {}), nowIso(), row.id]);
        const after = { ...clean, restrictions: JSON.stringify(clean.restrictions), user_segment: JSON.stringify(clean.user_segment) };
        for (const f of AUDITED) {
            if (f === 'status') continue;
            const before = row[f] === undefined ? null : row[f];
            if (String(before ?? '') !== String(after[f] ?? '')) await audit(row.id, f, before, after[f], admin);
        }
        res.json({ success: true, id: row.id });
    }));

    // API-A4 status (kill switch)
    app.put('/api/promocodes/:id/status', wrap(async (req, res) => {
        const status = (req.body || {}).status;
        if (!['Active', 'Disabled'].includes(status)) throw new PromoError(400, 'VALIDATION', 'Status must be Active or Disabled.');
        const row = await getCode(req.params.id);
        await q.run('UPDATE promo_codes SET status = ?, disabled_at = ?, updated_at = ? WHERE id = ?', [status, status === 'Disabled' ? nowIso() : null, nowIso(), row.id]);
        if (row.status !== status) await audit(row.id, 'status', row.status, status, who(req));
        res.json({ success: true });
    }));

    // API-A5 usage (existing path, richer rows)
    const usageRows = async (id) => {
        const row = await getCode(id);
        const rows = await engine.listRedemptions(q, { codeId: row.id });
        const names = await ports.customerDirectory.names(rows.map((r) => r.user_id).filter(Boolean));
        return {
            row,
            data: rows.map((r) => ({
                id: r.id, transaction_id: r.transaction_id, user_id: r.user_id, customer_name: r.customer_name || names[r.user_id] || null,
                discount_amount: r.discount_amount, status: r.status, created_at: r.created_at, currency: r.currency || row.currency,
                send_amount: r.send_amount, source_currency: r.source_currency, dest_currency: r.dest_currency, payment_method: r.payment_method,
                released_at: r.released_at, release_reason: r.release_reason,
            })),
        };
    };
    app.get('/api/promocodes/:id/redemptions', wrap(async (req, res) => res.json({ data: (await usageRows(req.params.id)).data })));
    app.get('/api/promocodes/:id/redemptions.csv', wrap(async (req, res) => {
        const { row, data } = await usageRows(req.params.id);
        sendCsv(res, `promo-${row.code}-usage.csv`, toCsv([
            ['Transfer', 'transaction_id'], ['Customer ID', 'user_id'], ['Customer', 'customer_name'],
            ['Corridor', (r) => (r.source_currency && r.dest_currency ? `${r.source_currency}-${r.dest_currency}` : '')], ['Payment method', 'payment_method'],
            ['Discount', 'discount_amount'], ['Currency', 'currency'], ['Status', 'status'], ['Date', 'created_at'],
        ], data));
    }));

    // API-A6 history
    app.get('/api/promocodes/:id/audit', wrap(async (req, res) => {
        const row = await getCode(req.params.id);
        res.json({ data: await q.all('SELECT * FROM promo_audit WHERE promo_code_id = ? ORDER BY id DESC', [String(row.id)]) });
    }));

    // API-A8 bulk and personal codes (Phase 3)
    const newCode = async (prefix) => {
        for (let i = 0; i < 50; i++) {
            const body = Array.from(crypto.randomBytes(8)).map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
            const code = prefix ? `${prefix}-${body}` : body;
            if (!(await q.get('SELECT id FROM promo_codes WHERE code = ?', [code]))) return code;
        }
        throw new PromoError(500, 'SERVER_ERROR', 'Could not create a unique code. Please try again.');
    };
    const createMany = async ({ config = {}, prefix, count, customerIds }, admin) => {
        const p = String(prefix || '').trim().toUpperCase();
        if (p && !/^[A-Z0-9]{2,10}$/.test(p)) throw new PromoError(400, 'VALIDATION', 'Use 2–10 letters or numbers for the prefix.', { fields: { prefix: 'Use 2–10 letters or numbers for the prefix.' } });
        const ids = Array.isArray(customerIds) ? [...new Set(customerIds.map((x) => String(x).trim()).filter(Boolean))] : [];
        const n = ids.length || Number(count);
        if (ids.length > 1000 || (!ids.length && (!Number.isInteger(n) || n < 1 || n > 1000))) {
            throw new PromoError(400, 'VALIDATION', 'Create between 1 and 1,000 codes.', { fields: { count: 'Create between 1 and 1,000 codes.' } });
        }
        const { errors, clean } = validatePromo({ ...config, code: 'BULK-CHECK' }, { isNew: true, now: engine.clock.now() });
        if (Object.keys(errors).length) throw validationError(errors);
        const created = [];
        for (let i = 0; i < n; i++) {
            const code = await newCode(p);
            const audience = ids.length ? { type: 'targeted', user_id: ids[i] } : clean.user_segment;
            const perUser = ids.length ? 1 : clean.usage_limit_per_user;
            const r = await q.run(`INSERT INTO promo_codes (code, description, type, value, min_threshold, max_discount, currency, usage_limit_global, usage_limit_per_user,
                budget_limit, start_date, end_date, status, restrictions, user_segment, user_segment_criteria, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, '{}', ?, ?, ?)`,
            [code, clean.description, clean.type, clean.value, clean.min_threshold, clean.max_discount, clean.currency, clean.usage_limit_global, perUser,
                clean.budget_limit, clean.start_date, clean.end_date, JSON.stringify(clean.restrictions), JSON.stringify(audience), admin, nowIso(), nowIso()]);
            await audit(r.lastID, 'created', null, code, admin);
            created.push({ code, customer_id: ids.length ? ids[i] : null });
        }
        return created;
    };
    app.post('/api/promocodes/bulk', wrap(async (req, res) => {
        const b = req.body || {};
        const created = await createMany({ config: b.config, prefix: b.prefix, count: b.count, customerIds: b.customer_ids }, who(req));
        res.json({ success: true, created });
    }));

    // Kept (§8.3): old bulk generator, response fixed to report what was created
    app.post('/api/promocodes/generate', wrap(async (req, res) => {
        const { batch_size, prefix, config = {} } = req.body || {};
        const created = await createMany({ config: { ...config, type: config.type || 'Fixed' }, prefix: prefix ? String(prefix).replace(/[^A-Za-z0-9]/g, '').slice(0, 10) : undefined, count: Number(batch_size) }, who(req));
        res.json({ success: true, created: created.length, codes: created.map((c) => c.code), message: `Batch generation created ${created.length} codes.` });
    }));
}

module.exports = { registerAdminRoutes, displayStatus, present };
