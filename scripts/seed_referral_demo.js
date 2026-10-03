// Seeds a SMALL set of demo referrals - one per state - so Referral Tracking, Performance and the
// Credit Ledger can be reviewed. Usage (server running on :5000, run from the PromoCode folder):
//     node scripts/seed_referral_demo.js
// Safe to re-run: earlier demo_* data is cleared first, then recreated. Real customers are never touched.
const path = require('path');
const API = process.env.API_URL || 'http://localhost:5000';
const DB_FILE = process.env.DB_PATH || path.join(__dirname, '..', 'server', 'database.sqlite');

const call = async (method, p, body) => {
    const res = await fetch(`${API}${p}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 409) throw new Error(`${method} ${p} -> ${res.status} ${data.message || ''}`);
    return data;
};

// Direct database access is only used to clear old demo rows and to back-date the "Expired" case
const withDb = (fn) => new Promise((resolve, reject) => {
    const sqlite3 = require('../server/node_modules/sqlite3');
    const db = new sqlite3.Database(DB_FILE, async (err) => {
        if (err) return reject(err);
        const run = (sql, params = []) => new Promise((ok, no) => db.run(sql, params, function (e) { return e ? no(e) : ok(this.changes); }));
        try { resolve(await fn(run)); } catch (e) { reject(e); } finally { db.close(); }
    });
});

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
const day = (daysAgo) => iso(daysAgo).slice(0, 10);

async function main() {
    const rules = (await call('GET', '/api/referral-rules')).data;
    const rule = rules.find((r) => r.base_currency === 'GBP' && r.status === 'ACTIVE' && r.receive_currency) || rules.find((r) => r.base_currency === 'GBP' && r.status === 'ACTIVE');
    if (!rule) { console.log('No active GBP rule found - create one in Referral Settings first.'); return; }
    const RECEIVE = rule.receive_currency || 'NGN';
    const hasWildcard = rules.some((r) => r.base_currency === 'GBP' && r.status === 'ACTIVE' && !r.receive_currency);
    console.log(`Using corridor GBP -> ${RECEIVE}`);

    await withDb(async (run) => {
        const demoRefs = `SELECT id FROM referrals WHERE referee_id LIKE 'demo\\_%' ESCAPE '\\'`;
        await run(`DELETE FROM credit_ledger WHERE referral_id IN (${demoRefs})`).catch(() => 0);
        await run(`DELETE FROM credit_ledger WHERE user_id LIKE 'demo\\_%' ESCAPE '\\'`).catch(() => 0);
        await run(`DELETE FROM referral_transfers WHERE customer_id LIKE 'demo\\_%' ESCAPE '\\'`);
        await run(`DELETE FROM referrals WHERE referee_id LIKE 'demo\\_%' ESCAPE '\\'`);
        await run(`DELETE FROM referral_link_visits WHERE visitor_id LIKE 'demo-visitor-%'`);
        await run(`DELETE FROM customers WHERE id LIKE 'demo\\_%' ESCAPE '\\'`);
    });

    const referrer = (await call('POST', '/api/referral/customers', {
        id: 'user_101', first_name: 'Olayinka', last_name: 'Adebayo', email: 'olayinka@example.com', phone: '+447700900101',
        send_currency: 'GBP', kyc_status: 'PASSED', device_id: 'demo-dev-101',
    })).data;
    const code = referrer.referral_code;
    for (let i = 0; i < 6; i++) await call('POST', '/api/referral/visits', { code, visitor_id: `demo-visitor-${i}` });

    const above = Number(rule.min_transaction_threshold || 50) + 50;
    // One referral per state. `steps` are transfer events sent in order; `receive` overrides the corridor.
    const cases = [
        { id: 'demo_201', first_name: 'Chidi', last_name: 'Okeke', note: 'Rewarded', amount: above, steps: ['PAID', 'COMPLETED'] },
        { id: 'demo_202', first_name: 'Grace', last_name: 'Bello', note: 'Reversed (qualifying transfer refunded)', amount: above, steps: ['PAID', 'COMPLETED', 'REFUNDED'] },
        { id: 'demo_203', first_name: 'Kemi', last_name: 'Lawal', note: 'Pending (transfer in progress)', amount: above, steps: ['PAID'] },
        { id: 'demo_204', first_name: 'Musa', last_name: 'Ibrahim', note: 'Registered (no transfer yet)', amount: 0, steps: [] },
        { id: 'demo_205', first_name: 'Ola', last_name: 'Adebayo', note: 'Not eligible (self-referral)', amount: 0, steps: [], device: 'demo-dev-101' },
        { id: 'demo_206', first_name: 'Tunde', last_name: 'Ade', note: 'Expired (window ended)', amount: 0, steps: [], expire: true },
    ];
    if (!hasWildcard) cases.push({ id: 'demo_207', first_name: 'Ama', last_name: 'Mensah', note: 'Not eligible (no rule for corridor)', amount: 0, steps: [], receive: 'GHS' });

    for (const f of cases) {
        await call('POST', '/api/referral/referrals', {
            code,
            referee: { id: f.id, first_name: f.first_name, last_name: f.last_name, email: `${f.id}@example.com`, phone: `+4477009${f.id.slice(-3)}0`,
                send_currency: 'GBP', receive_currency: f.receive || RECEIVE, kyc_status: 'PASSED', device_id: f.device || `demo-dev-${f.id}` },
        });
        for (const status of f.steps) {
            await call('POST', '/api/referral/transfer-events', { transfer_id: `demo_tx_${f.id}`, customer_id: f.id, amount: f.amount, currency: 'GBP', receive_currency: RECEIVE, status });
        }
    }

    // Expired: back-date the registration so the qualification window has already ended, then run the daily expiry job
    await withDb((run) => run(`UPDATE referrals SET registered_at = ?, qualification_deadline = ?, referrer_deadline = ? WHERE referee_id = 'demo_206'`, [iso(45), day(15), day(15)]));
    await call('POST', '/api/referral/run-jobs');

    console.log('Demo referral data ready:');
    cases.forEach((c) => console.log(`  ${c.id}  ${c.first_name} ${c.last_name} - ${c.note}`));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
