// Promo code module (spec PROMO_MODULE_SPEC_MITO_ADMIN.md). Registered from server.js with one call:
//   const promo = require('./promo'); promo.register(app, db, ports);
// It owns promo_codes, promo_redemptions, promo_customers, promo_transfers and promo_audit, and depends on no bonus,
// referral or ledger code. Other modules read promo data only through listRedemptions / savingsFor below.
const { initSchema, backfill } = require('./schema');
const { defaultPorts } = require('./ports');
const engine = require('./engine');
const { registerAdminRoutes } = require('./admin');
const { registerServiceRoutes } = require('./service');
const { registerLegacyDistribute } = require('./legacyDistribute');

function promisify(db) {
    return {
        run: (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (err) { err ? rej(err) : res(this); })),
        get: (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => (err ? rej(err) : res(row)))),
        all: (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows || [])))),
    };
}

let current = null; // { q, ready } of the registered app, for the read functions

function register(app, db, customPorts = {}) {
    const q = promisify(db);
    const base = defaultPorts(q);
    const ports = {
        ...base,
        ...customPorts,
        segmentProvider: { ...base.segmentProvider, ...(customPorts.segmentProvider || {}) },
        customerDirectory: { ...base.customerDirectory, ...(customPorts.customerDirectory || {}) },
    };
    engine.configure(ports);
    const ready = initSchema(q).catch((e) => console.error('[promo] schema init failed', e));
    registerServiceRoutes(app, q, { ready, db });
    registerAdminRoutes(app, q, { ready, ports });
    registerLegacyDistribute(app, db);
    current = { q, ready };
    return { q, ready };
}

const need = async () => { if (!current) throw new Error('Promo module is not registered'); await current.ready; return current.q; };

module.exports = {
    register,
    // Read functions for other Mito modules (spec §8.4)
    listRedemptions: async (filters) => engine.listRedemptions(await need(), filters),
    savingsFor: async (userId) => engine.savingsFor(await need(), userId),
    // Copy customer activity/profiles from tables other modules create at startup (idempotent; spec §4.4)
    runBackfill: async () => backfill(await need()),
    engine,
};
