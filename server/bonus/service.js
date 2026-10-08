// Routes: service API for Rhemito (spec §9.1) and the admin ledger / adjustments (§9.2 A8 – A10, A12, A13).
const { Reject, sendError } = require('./errors');
const { write } = require('./db');
const engine = require('./engine');
const wallet = require('./wallet');
const feed = require('./feed');
const blocks = require('./blocks');
const ledger = require('./ledger');
const { runJobs } = require('./jobs');

// X-Bonus-Service-Key = BONUS_SERVICE_KEY when it is set; open otherwise (prototype)
function serviceKey(req, res, next) {
    const key = process.env.BONUS_SERVICE_KEY;
    if (key && req.get('x-bonus-service-key') !== key) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Invalid service key.' });
    return next();
}

function registerServiceRoutes(app, q, { ready, ports, wrap }) {
    // The wallet routes keep the error shape they always had: { error: <code | 'SERVER_ERROR'>, message, available? }
    const legacy = (fn) => async (req, res) => {
        try { await ready; await fn(req, res); } catch (err) {
            if (err instanceof Reject) return res.status(err.status).json(err.body());
            res.status(err.status || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message, ...(err.available !== undefined ? { available: err.available } : {}) });
        }
    };

    // API-S1: a transfer changed status
    app.post('/api/bonus/transfer-events', serviceKey, wrap(async (req, res) => {
        const ev = req.body || {};
        if (!ev.transfer_id || !ev.customer_id || !ev.status) throw new Reject(400, 'VALIDATION', 'transfer_id, customer_id and status are required.');
        try {
            res.json(await write(q, () => engine.handleTransferEvent(q, ev)));
        } catch (err) {
            if (err instanceof Reject && err.status === 400) throw err;
            console.error('[bonus] transfer event failed', ev.transfer_id, err.message); // BS-43: never fail the caller
            res.json({ awards: [], returned: 0, reversed: [], error: 'Bonus could not be evaluated for this transfer.' });
        }
    }));

    // API-S2: money request paid / refunded (unchanged request and response)
    app.post('/api/bonus/events', serviceKey, wrap(async (req, res) => {
        const b = req.body || {};
        if (b.type === 'MONEY_REQUEST_REFUNDED') {
            if (!b.event_id) return res.status(400).json({ error: 'VALIDATION', message: 'event_id is required.' });
            const reversed = await write(q, () => engine.reverseEvent(q, b.event_id, 'REFUNDED'));
            return res.json({ awards: reversed.map((r) => ({ ...r, status: 'REVERSED' })) });
        }
        const awards = await write(q, () => engine.triggerEvent(q, { type: b.type, customer_id: b.customer_id, event_id: b.event_id, amount: b.amount, currency: b.currency }));
        res.json({ awards });
    }));

    // API-S3 – S5: the one bonus wallet (aliases under /api/bonus/wallet)
    const walletRoute = legacy(async (req, res) => {
        const id = req.params.customerId;
        res.json(await wallet.walletView(q, id, {
            currency: req.query.currency, creditSource: req.query.credit_source,
            promoRedemptions: ports.promoRedemptions, blocked: !!(await blocks.activeBlock(q, id)),
        }));
    });
    const applyRoute = legacy(async (req, res) => res.json(await write(q, () => wallet.applyBonus(q, req.params.customerId, req.body || {}))));
    const releaseRoute = legacy(async (req, res) => res.json({ returned: await write(q, () => wallet.releaseBonus(q, req.params.customerId, (req.body || {}).transfer_id)) }));
    for (const base of ['/api/wallet', '/api/bonus/wallet']) {
        app.get(`${base}/:customerId`, serviceKey, walletRoute);
        app.post(`${base}/:customerId/apply`, serviceKey, applyRoute);
        app.post(`${base}/:customerId/release`, serviceKey, releaseRoute);
    }

    // API-S6: customer profile
    app.post('/api/bonus/customers', serviceKey, wrap(async (req, res) => {
        await engine.upsertCustomer(q, req.body || {});
        res.json({ success: true });
    }));

    // API-S7: notification feed
    app.get('/api/bonus/feed', serviceKey, wrap(async (req, res) => {
        res.json(await feed.list(q, { sinceId: req.query.since_id, limit: req.query.limit, customerId: req.query.customer_id }));
    }));

    // API-A12: run the daily jobs now
    app.post('/api/bonus/run-jobs', wrap(async (req, res) => res.json(await runJobs(q, { force: true }))));

    // API-A13: ledger export (registered before /api/credits/:userId)
    app.get('/api/credits/all.csv', wrap(async (req, res) => {
        const body = await ledger.history(q, 'all', req.query, ports);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="bonus-ledger.csv"');
        res.send(ledger.toCsv(body.history));
    }));

    // API-A8: ledger history ('all' = everyone)
    app.get('/api/credits/:userId', wrap(async (req, res) => res.json(await ledger.history(q, req.params.userId, req.query, ports))));

    // API-A9: manual grant / remove
    app.post('/api/credits/manual', wrap(async (req, res) => {
        const body = req.body || {};
        // Admin name from identity; the body's admin_user is only used in prototype mode (BS-73)
        const identity = ports.adminIdentity(req);
        const name = process.env.ADMIN_USERS ? identity.name : (body.admin_user || identity.name || 'Admin');
        res.json(await write(q, () => wallet.manualAdjust(q, body, name)));
    }));

    // API-A10: admin award for one scheme and customer
    app.post('/api/credits/award-bonus', wrap(async (req, res) => res.json(await write(q, () => engine.awardScheme(q, req.body || {})))));
}

module.exports = { registerServiceRoutes, serviceKey, sendError };
