// Contract-test helpers for the Promo Code, Bonus Scheme and Referral modules.
//
// Every contract test is registered with rule(id, title, { why, fix, where })(fn). When the test fails, the error is
// prefixed with a block that tells an engineer (or an AI agent) which rule broke, why the rule exists, what the
// implemented behaviour is and where the code lives:
//
//   CONTRACT PROMO-04 BROKEN: A failed or released redemption frees the use
//   WHY: ...
//   HOW IT IS IMPLEMENTED / FIX: ...
//   CODE: server/promo/engine.js
//
// followed by the original assertion error. The jest test name is "[PROMO-04] A failed or released ...".
const os = require('os');
const fs = require('fs');
const path = require('path');

function contractBlock(id, title, { why, fix, where }) {
    const code = Array.isArray(where) ? where.join(', ') : where;
    return `CONTRACT ${id} BROKEN: ${title}\nWHY: ${why}\nHOW IT IS IMPLEMENTED / FIX: ${fix}\nCODE: ${code}\n`;
}

// rule('PROMO-01', 'Title', { why, fix, where })(async () => { ...assertions... }, timeoutMs?)
function rule(id, title, meta = {}) {
    for (const k of ['why', 'fix', 'where']) {
        if (!meta[k]) throw new Error(`rule ${id}: "${k}" is required so a failure can explain itself`);
    }
    const block = contractBlock(id, title, meta);
    return (fn, timeout) => {
        const wrapped = async () => {
            try {
                await fn();
            } catch (err) {
                const original = err && err.message !== undefined ? err : new Error(String(err));
                const wrappedError = new Error(`\n${block}\n${original.message}`);
                // Keep the original stack frames (they point at the failing assertion) under the contract block
                const frames = String(original.stack || '').split('\n').filter((l) => /^\s+at /.test(l)).join('\n');
                wrappedError.stack = `${wrappedError.message}\n${frames}`;
                wrappedError.matcherResult = original.matcherResult;
                throw wrappedError;
            }
        };
        // `it` is a jest global; the caller's file has it
        global.it(`[${id}] ${title}`, wrapped, timeout);
    };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Boots the real Express app (server/server.js) against a throw-away database, the same way engines.test.js does:
// ADMIN_USERS set before the require, a temp cwd because the app opens ./database.sqlite, then wait for the seed.
function bootApp(prefix) {
    process.env.ADMIN_USERS = JSON.stringify([{ name: 'Grace Growth', role: 'GROWTH_MANAGER', token: 'gm-token' }]);
    process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), `mito-contract-${prefix}-`)));
    // Required lazily so each test file gets its own app and database
    // eslint-disable-next-line global-require
    return require('../../server');
}

async function waitForSeed(app, request) {
    for (let i = 0; i < 40; i++) {
        const r = await request(app).get('/api/bonus-schemes');
        if (r.status === 200 && r.body.data.length) break;
        await wait(250);
    }
    await wait(500);
}

module.exports = { rule, wait, bootApp, waitForSeed, contractBlock };
