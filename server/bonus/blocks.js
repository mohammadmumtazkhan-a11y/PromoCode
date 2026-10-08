// Bonus abuse guard (spec §3.8).
//
// A "strike" is recorded when a transfer that earned a customer a bonus is cancelled, refunded, recalled or charged back
// (the bonus is then a loss for Mito). After BONUS_BLOCK_STRIKES strikes (default 3) the customer is blocked from earning
// any more bonus (scheme bonuses and referral rewards) until a Growth Manager lifts the block. The block stores the reason,
// and every strike behind it, so the admin can see exactly why. After a block is lifted the count starts again from zero.
const crypto = require('crypto');
const { requireRole, ROLES } = require('../auth');
const { plainMoney } = require('./money');
const { nowIso } = require('./time');
const feed = require('./feed');

const LIMIT = () => Math.max(1, Number(process.env.BONUS_BLOCK_STRIKES) || 3);

// Kept for older callers (referral module, tests) that call it before the bonus module registered
const ready = new WeakMap();
function ensureSchema(q) {
    if (!ready.has(q)) {
        ready.set(q, (async () => {
            await q.run(`CREATE TABLE IF NOT EXISTS bonus_strikes (
                id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, event_id TEXT NOT NULL, kind TEXT, outcome TEXT,
                amount_lost REAL DEFAULT 0, currency TEXT, detail TEXT, created_at TEXT, UNIQUE (customer_id, event_id))`);
            await q.run(`CREATE TABLE IF NOT EXISTS bonus_blocks (
                id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, status TEXT NOT NULL, strikes INTEGER, reason TEXT,
                blocked_at TEXT, lifted_at TEXT, lifted_by TEXT, lift_reason TEXT)`);
            await q.run('CREATE INDEX IF NOT EXISTS ix_bonus_blocks_customer ON bonus_blocks(customer_id, status)');
        })().catch((e) => { ready.delete(q); throw e; }));
    }
    return ready.get(q);
}

// The current block on a customer, or null
async function activeBlock(q, customerId) {
    await ensureSchema(q);
    return (await q.get(`SELECT * FROM bonus_blocks WHERE customer_id = ? AND status = 'ACTIVE'`, [customerId])) || null;
}

async function strikesSinceLastLift(q, customerId) {
    const last = await q.get(`SELECT MAX(lifted_at) AS t FROM bonus_blocks WHERE customer_id = ? AND status = 'LIFTED'`, [customerId]);
    return q.all(`SELECT * FROM bonus_strikes WHERE customer_id = ? ${last && last.t ? 'AND created_at > ?' : ''} ORDER BY created_at`, last && last.t ? [customerId, last.t] : [customerId]);
}

// outcome: CANCELLED | REFUNDED | RECALLED | CHARGEBACK. Safe to repeat for the same event (BS-55).
async function recordStrike(q, { customerId, eventId, kind, outcome, amountLost, currency }) {
    await ensureSchema(q);
    const dup = await q.get('SELECT id FROM bonus_strikes WHERE customer_id = ? AND event_id = ?', [customerId, eventId]);
    if (dup) return { strikes: (await strikesSinceLastLift(q, customerId)).length, blocked: !!(await activeBlock(q, customerId)), duplicate: true };
    await q.run('INSERT INTO bonus_strikes (id, customer_id, event_id, kind, outcome, amount_lost, currency, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`bs_${crypto.randomBytes(8).toString('hex')}`, customerId, eventId, kind, outcome, amountLost || 0, currency || null,
            `${kind === 'REFERRAL' ? 'Referral reward' : 'Bonus'} of ${plainMoney(amountLost, currency)} lost when ${eventId} was ${String(outcome).toLowerCase()}`, nowIso()]);
    const strikes = await strikesSinceLastLift(q, customerId);
    let blocked = !!(await activeBlock(q, customerId));
    if (!blocked && strikes.length >= LIMIT()) {
        const reason = `${strikes.length} transfers that earned bonus were cancelled or refunded: ` +
            strikes.map((s) => `${s.event_id} (${String(s.outcome).toLowerCase()} ${String(s.created_at).slice(0, 10)}, ${plainMoney(s.amount_lost, s.currency)} lost)`).join('; ') +
            '. Bonus is blocked until a Growth Manager approves the customer.';
        await q.run(`INSERT INTO bonus_blocks (id, customer_id, status, strikes, reason, blocked_at) VALUES (?, ?, 'ACTIVE', ?, ?, ?)`,
            [`bb_${crypto.randomBytes(8).toString('hex')}`, customerId, strikes.length, reason, nowIso()]);
        blocked = true;
    }
    return { strikes: strikes.length, blocked };
}

// Customer names: the host's directory first, then the module's own customer records
async function namesFor(q, ids, directory) {
    const out = {};
    if (directory && directory.names) {
        try { Object.assign(out, await directory.names(ids)); } catch { /* host directory unavailable */ }
    }
    for (const id of ids.filter((i) => !out[i])) {
        const c = await q.get('SELECT first_name, last_name, email FROM bonus_customers WHERE id = ?', [id]).catch(() => null);
        const n = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';
        if (n) out[id] = n;
    }
    return out;
}

function registerBonusBlockRoutes(app, q, { ready: moduleReady, customerDirectory } = {}) {
    const wrap = (fn) => async (req, res) => {
        try { await moduleReady; await ensureSchema(q); await fn(req, res); } catch (err) { res.status(err.status || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message }); }
    };

    // Admin list: ?status=ACTIVE (default) | LIFTED | ALL
    app.get('/api/bonus-blocks', wrap(async (req, res) => {
        const status = String(req.query.status || 'ACTIVE').toUpperCase();
        const rows = await q.all(`SELECT * FROM bonus_blocks ${status === 'ALL' ? '' : 'WHERE status = ?'} ORDER BY blocked_at DESC`, status === 'ALL' ? [] : [status]);
        const names = await namesFor(q, [...new Set(rows.map((b) => b.customer_id))], customerDirectory);
        const emails = {};
        for (const b of rows) {
            if (emails[b.customer_id] !== undefined) continue;
            const c = await q.get('SELECT email FROM bonus_customers WHERE id = ?', [b.customer_id]).catch(() => null);
            emails[b.customer_id] = c ? c.email : null;
        }
        res.json({ data: rows.map((b) => ({ ...b, customer_name: names[b.customer_id] || null, customer_email: emails[b.customer_id] || null })), limit: LIMIT() });
    }));

    // One customer: current block (if any), strikes counted toward the next block, and past blocks
    app.get('/api/bonus-blocks/:customerId', wrap(async (req, res) => {
        const id = req.params.customerId;
        res.json({
            customer_id: id, limit: LIMIT(), block: await activeBlock(q, id),
            strikes: await strikesSinceLastLift(q, id),
            history: await q.all(`SELECT * FROM bonus_blocks WHERE customer_id = ? AND status = 'LIFTED' ORDER BY blocked_at DESC`, [id]),
        });
    }));

    // Growth Manager approves the customer: bonus can be earned again and the strike count restarts (BS-56, BS-57)
    app.post('/api/bonus-blocks/:customerId/lift', requireRole(ROLES.GROWTH_MANAGER), wrap(async (req, res) => {
        const reason = String((req.body || {}).reason || '').trim();
        if (reason.length < 10 || reason.length > 250) return res.status(400).json({ error: 'VALIDATION', message: 'Enter a reason of 10–250 characters.' });
        const block = await activeBlock(q, req.params.customerId);
        if (!block) return res.status(404).json({ error: 'NOT_FOUND', message: 'This customer has no active bonus block.' });
        await q.run(`UPDATE bonus_blocks SET status = 'LIFTED', lifted_at = ?, lifted_by = ?, lift_reason = ? WHERE id = ?`, [nowIso(), req.admin.name, reason, block.id]);
        await feed.emit(q, block.customer_id, 'BONUS_BLOCK_LIFTED', {}, `bl:${block.id}`).catch(() => {});
        res.json({ data: await q.get('SELECT * FROM bonus_blocks WHERE id = ?', [block.id]) });
    }));
}

module.exports = { ensureSchema, activeBlock, recordStrike, strikesSinceLastLift, registerBonusBlockRoutes, LIMIT, namesFor };
