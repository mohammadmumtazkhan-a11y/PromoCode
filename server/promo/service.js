// Service API used by the Rhemito server (spec PROMO-MITO §8.1) plus the deprecated apply alias (§8.3).
const { PromoError, sendError } = require('./errors');
const engine = require('./engine');

// X-Promo-Service-Key must match PROMO_SERVICE_KEY when that env var is set; otherwise open (prototype)
function serviceAuth(req) {
    const key = process.env.PROMO_SERVICE_KEY;
    if (key && req.get('x-promo-service-key') !== key) throw new PromoError(401, 'UNAUTHORIZED', 'Not authorised.');
}

// 30 validations per customer per minute (spec §9)
const attempts = new Map();
function rateLimit(userId) {
    if (!userId) return;
    const now = Date.now();
    const list = (attempts.get(userId) || []).filter((t) => now - t < 60000);
    if (list.length >= 30) throw new PromoError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a minute and try again.');
    list.push(now);
    attempts.set(userId, list);
}

function registerServiceRoutes(app, q, { ready, db }) {
    const wrap = (fn) => async (req, res) => { try { await ready; serviceAuth(req); await fn(req, res); } catch (err) { sendError(res, err); } };

    // API-S1 validate (nothing recorded)
    app.post('/api/promocodes/validate', wrap(async (req, res) => {
        const n = engine.normalise(req.body || {});
        rateLimit(n.userId);
        res.json(await engine.validate(q, req.body || {}));
    }));
    // API-S2 redeem (once per transfer)
    app.post('/api/promocodes/redeem', wrap(async (req, res) => res.json(await engine.redeem(q, req.body || {}))));
    // API-S3 release (idempotent)
    app.post('/api/promocodes/release', wrap(async (req, res) => res.json(await engine.release(q, req.body || {}))));
    // API-S4 transfer status changes
    app.post('/api/promocodes/transfer-events', wrap(async (req, res) => res.json(await engine.handleTransferEvent(q, req.body || {}))));
    // API-S5 customer sync
    app.post('/api/promocodes/customers', wrap(async (req, res) => res.json(await engine.upsertCustomer(q, req.body || {}))));
    // API-S6 what a customer saved with promo codes
    app.get('/api/promocodes/customers/:id/redemptions', wrap(async (req, res) => res.json(await engine.savingsFor(q, req.params.id))));

    // Deprecated: with a transaction id it behaves as redeem; without one it keeps the old counter update (Mito TestCheckout page)
    app.post('/api/promocodes/apply', wrap(async (req, res) => {
        const b = req.body || {};
        console.warn('[promo] POST /api/promocodes/apply is deprecated; use /api/promocodes/redeem');
        if (b.transaction_id || b.transactionId) return res.json(await engine.redeem(q, b));
        await new Promise((resolve, reject) => db.run('UPDATE promo_codes SET usage_count = usage_count + 1, total_discount_utilized = total_discount_utilized + ? WHERE code = ?',
            [b.discount_amount, b.code], (err) => (err ? reject(err) : resolve())));
        res.json({ success: true });
    }));
}

module.exports = { registerServiceRoutes };
