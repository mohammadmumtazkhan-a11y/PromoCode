// Seeds demo referral activity through the public API so the Referral Performance,
// Referral Tracking and User Credit Ledger pages have realistic data.
// Usage (server running on :5000):  node scripts/seed_referral_demo.js
// Safe to run more than once: customers are upserted and referrals are idempotent per referee.
const API = process.env.API_URL || 'http://localhost:5000';

const call = async (method, path, body) => {
    const res = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 409) throw new Error(`${method} ${path} → ${res.status} ${data.message || ''}`);
    return data;
};

async function main() {
    const rules = (await call('GET', '/api/referral-rules')).data;
    if (!rules.some((r) => r.base_currency === 'GBP' && r.status === 'ACTIVE')) {
        console.log('No active GBP rule found – create one in Referral Settings first.');
        return;
    }
    const referrer = (await call('POST', '/api/referral/customers', {
        id: 'user_101', first_name: 'Olayinka', last_name: 'Adebayo', email: 'olayinka@example.com', phone: '+447700900101',
        send_currency: 'GBP', kyc_status: 'PASSED', device_id: 'demo-dev-101',
    })).data;
    const code = referrer.referral_code;
    console.log(`Referrer user_101 has code ${code}`);

    const friends = [
        { id: 'demo_201', first_name: 'Chidi', last_name: 'Okeke', amount: 120, steps: ['PAID', 'COMPLETED'] },
        { id: 'demo_202', first_name: 'Grace', last_name: 'Bello', amount: 75, steps: ['PAID', 'COMPLETED'] },
        { id: 'demo_203', first_name: 'Tunde', last_name: 'Ade', amount: 30, steps: ['PAID', 'COMPLETED'] }, // below the floor
        { id: 'demo_204', first_name: 'Kemi', last_name: 'Lawal', amount: 60, steps: ['PAID'] }, // still in progress
        { id: 'demo_205', first_name: 'Musa', last_name: 'Ibrahim', amount: 0, steps: [] }, // joined only
        { id: 'demo_206', first_name: 'Ola', last_name: 'Adebayo', amount: 0, steps: [], device: 'demo-dev-101' }, // self-referral
    ];
    for (let i = 0; i < 9; i++) await call('POST', '/api/referral/visits', { code, visitor_id: `demo-visitor-${i}` });

    for (const f of friends) {
        await call('POST', '/api/referral/referrals', {
            code,
            referee: { id: f.id, first_name: f.first_name, last_name: f.last_name, email: `${f.id}@example.com`, phone: `+4477009${f.id.slice(-3)}0`, send_currency: 'GBP', kyc_status: 'PASSED', device_id: f.device || `demo-dev-${f.id}` },
        });
        for (const status of f.steps) {
            await call('POST', '/api/referral/transfer-events', { transfer_id: `demo_tx_${f.id}`, customer_id: f.id, amount: f.amount, currency: 'GBP', status });
        }
    }
    // One referee uses part of their bonus
    await call('POST', '/api/wallet/demo_201/apply', { amount: 4, currency: 'GBP', transfer_id: 'demo_tx_201_b', send_amount: 200 }).catch(() => {});
    console.log('Demo referral data ready.');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
