// Database helpers for the bonus module: promise wrapper, safe column adds, a write lock and transactions.
//
// Every change to the customer's bonus wallet (award, apply, release, reversal, manual adjustment, expiry) runs
// inside `locked()`, so two requests can never spend or award the same credit at the same time, and inside `tx()`,
// so a failure half-way leaves the ledger unchanged (NFR-1).

function promisify(db) {
    return {
        run: (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (err) { err ? rej(err) : res(this); })),
        get: (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => (err ? rej(err) : res(row)))),
        all: (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows || [])))),
    };
}

// Add a column unless it is already there. Another module may add the same column at the same moment on the shared
// connection, so a "duplicate column" error is treated as success.
async function addColumnIfMissing(q, table, column, ddl) {
    const cols = await q.all(`PRAGMA table_info(${table})`);
    if (cols.some((c) => c.name === column)) return;
    try {
        await q.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    } catch (err) {
        if (!/duplicate column/i.test(String(err.message))) throw err;
    }
}

// One wallet change at a time (per process). Not re-entrant: never call a locked function from inside another.
let lock = Promise.resolve();
function locked(fn) {
    const run = lock.then(fn, fn);
    lock = run.catch(() => {});
    return run;
}

// Run fn inside BEGIN IMMEDIATE … COMMIT; roll back on any error. Nested calls join the outer transaction.
const inTx = new WeakSet();
async function tx(q, fn) {
    if (inTx.has(q)) return fn();
    await q.run('BEGIN IMMEDIATE');
    inTx.add(q);
    try {
        const out = await fn();
        inTx.delete(q);
        await q.run('COMMIT');
        return out;
    } catch (err) {
        inTx.delete(q);
        await q.run('ROLLBACK').catch(() => {});
        throw err;
    }
}

// Locked + transactional: the normal way to change the wallet
const write = (q, fn) => locked(() => tx(q, fn));

module.exports = { promisify, addColumnIfMissing, locked, tx, write };
