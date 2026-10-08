// Customer feed for Rhemito notifications (spec §8). Each item has a dedupe key, so repeating an action never sends
// a second notification.
const { nowIso } = require('./time');

async function emit(q, customerId, type, payload, dedupeKey) {
    const r = await q.run('INSERT OR IGNORE INTO bonus_feed (customer_id, type, payload, dedupe_key, created_at) VALUES (?, ?, ?, ?, ?)',
        [customerId, type, JSON.stringify(payload || {}), dedupeKey, nowIso()]);
    return r.changes > 0;
}

async function list(q, { sinceId = 0, limit = 100, customerId } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const params = [Number(sinceId) || 0];
    let where = 'id > ?';
    if (customerId) { where += ' AND customer_id = ?'; params.push(customerId); }
    const rows = await q.all(`SELECT * FROM bonus_feed WHERE ${where} ORDER BY id LIMIT ${lim}`, params);
    const data = rows.map((r) => ({ id: r.id, customer_id: r.customer_id, type: r.type, payload: JSON.parse(r.payload || '{}'), created_at: r.created_at }));
    return { data, last_id: data.length ? data[data.length - 1].id : Number(sinceId) || 0 };
}

module.exports = { emit, list };
