// Bonus scheme module (spec BONUS_MODULE_SPEC_MITO_ADMIN.md v1.1). Registered from server.js with one call:
//   const bonus = require('./bonus'); bonus.register(app, db, ports, { dbFile });
// It owns bonus_schemes, user_segments, credit_ledger (the customer's one bonus wallet, all sources), bonus_strikes,
// bonus_blocks, bonus_customers, bonus_transfers, bonus_scheme_audit, bonus_feed and bonus_job_state. It requires no
// referral or promo code; the host connects them through ports (ports.js) and the public functions below.
const { promisify, write } = require('./db');
const { initSchema, backfill } = require('./schema');
const { defaultPorts } = require('./ports');
const { sendError } = require('./errors');
const engine = require('./engine');
const wallet = require('./wallet');
const blocks = require('./blocks');
const debt = require('./debt');
const feed = require('./feed');
const segments = require('./segments');
const schemes = require('./schemes');
const jobs = require('./jobs');
const { registerServiceRoutes } = require('./service');
const time = require('./time');

let current = null; // { q, ready, ports } of the registered app

function register(app, db, customPorts = {}, { dbFile, seed = true } = {}) {
    const q = promisify(db);
    const base = defaultPorts();
    const ports = {
        ...base,
        ...customPorts,
        customerDirectory: { ...base.customerDirectory, ...(customPorts.customerDirectory || {}) },
        historySources: customPorts.historySources || base.historySources,
    };
    segments.configure(ports.customerDirectory);
    const ready = initSchema(q, { seed })
        .then(() => backfill(q, { dbFile }))
        .catch((e) => console.error('[bonus] schema init failed', e));
    const wrap = (fn) => async (req, res) => {
        try { await ready; await fn(req, res); } catch (err) { sendError(res, err); }
    };

    segments.registerSegmentRoutes(app, q, { ready, ports, wrap });
    schemes.registerSchemeRoutes(app, q, { ready, ports, wrap });
    registerServiceRoutes(app, q, { ready, ports, wrap });
    blocks.registerBonusBlockRoutes(app, q, { ready, customerDirectory: ports.customerDirectory });

    current = { q, ready, ports, dbFile };
    return { q, ready };
}

const need = async () => {
    if (!current) throw new Error('Bonus module is not registered');
    await current.ready;
    return current.q;
};

// What the old referral transfer-event hook returned in `bonuses` (C1): awards for a completed transfer,
// reversals (status REVERSED) for a cancelled / failed / refunded one, [] otherwise. Never throws (BS-43).
async function transferEventForHook(ev) {
    try {
        const q = await need();
        const status = String((ev && ev.status) || '').toUpperCase();
        if (!ev || !ev.transfer_id || !ev.customer_id || !status) return [];
        const result = await write(q, () => engine.handleTransferEvent(q, ev));
        if (status === 'COMPLETED') return result.awards;
        return result.reversed.map((r) => ({ ...r, status: 'REVERSED' }));
    } catch (err) {
        console.error('[bonus] transfer event not processed', ev && ev.transfer_id, err.message);
        return [];
    }
}

module.exports = {
    register,
    // ---- public functions for other modules (spec §1.3); they never call back into those modules ----
    isEarningBlocked: async (customerId) => {
        const b = await blocks.activeBlock(await need(), customerId);
        return { blocked: !!b, reason: b ? b.reason : null };
    },
    recordStrike: async (input) => blocks.recordStrike(await need(), input),
    listSegments: async () => segments.listSegments(await need()),
    getSegment: async (id) => segments.getSegment(await need(), id),
    segmentMatches: async (segId, customerId, ctx) => segments.segmentMatches(await need(), segId, customerId, ctx || {}),
    issueCredit: async (input) => { const q = await need(); return write(q, () => wallet.issueCredit(q, input)); },
    voidCredit: async (creditId, opts) => { const q = await need(); return write(q, () => wallet.voidCredit(q, creditId, opts)); },
    creditSummary: async (filters) => wallet.creditSummary(await need(), filters),
    // A credit that was already spent when its earning event was reversed: record what is owed, repaid from the next bonus (BS-50)
    clawbackCredit: async (creditId, opts) => {
        const q = await need();
        return write(q, async () => {
            const credit = await q.get(`SELECT * FROM credit_ledger WHERE id = ? AND type = 'EARNED'`, [creditId]);
            return credit ? debt.clawback(q, credit, opts || {}) : 0;
        });
    },
    // ---- host wiring ----
    transferEventForHook,
    handleTransferEvent: async (ev) => { const q = await need(); return write(q, () => engine.handleTransferEvent(q, ev)); },
    runBackfill: async () => backfill(await need(), { dbFile: current && current.dbFile }),
    runJobs: async (opts) => jobs.runJobs(await need(), opts),
    startJobs: () => (current ? jobs.startTimer(current.q, current.ready) : null),
    // ---- internals, for the shims and tests ----
    engine, wallet, blocks, debt, feed, segments, schemes, jobs, time, write,
};
