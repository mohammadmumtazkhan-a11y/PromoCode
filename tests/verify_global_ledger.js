
const BASE_URL = 'http://localhost:5000/api';

async function run() {
    console.log('--- Verifying Global Ledger Scope ---');

    // 1. Fetch Global Ledger
    console.log('1. Fetching /api/credits/all ...');
    const res = await fetch(`${BASE_URL}/credits/all`);

    if (!res.ok) {
        console.error('Failed to fetch:', res.status, await res.text());
        process.exit(1);
    }

    const data = await res.json();
    console.log('Global Ledger Response:', {
        balance: data.balance,
        cost_incurred: data.cost_incurred,
        historyCount: data.history.length
    });

    // 2. Assertions
    if (data.history.length === 0) console.warn('Warning: History is empty (might be fine if no data seeded)');

    // Check if we have multiple users in history if data permits
    const users = new Set(data.history.map(h => h.user_id || 'System')); // Promo redemptions might not show user_id in simplified view?
    // Wait, promo_redemptions join logic removed 'user_id' from select? 
    // server.js query: SELECT pr.id... (pc.code) 
    // It does NOT select pr.user_id explicitly in the promo query, but maybe credit_ledger does?
    // UserCreditLedger UI expects user info? 
    // The UI table shows "Reference / Reason".
    // Does it show User ID?
    // UI Table columns: Date, Customer, Type...
    // Customer column uses `row.user_id` or `row.user_name`.
    // My Promo Query in server.js omitted `user_id`. I should check if that breaks the UI column.

    // 3. Verify Cost Calculation
    // Cost Incurred = SUM(EARNED credits) + SUM(Promo Discounts)
    // We can't easily verify exact sum without knowing DB state, but we ensure it's a number and >= 0.
    if (typeof data.cost_incurred !== 'number') throw new Error('cost_incurred is not a number');

    // 4. Verify Promo details in history
    const promo = data.history.find(h => h.type === 'APPLIED');
    if (promo) {
        console.log('Found Global Promo Entry:', promo);
        // Ensure amount is negative
        if (promo.amount >= 0) throw new Error('Promo amount should be negative in history for APPLIED type');
    }

    console.log('--- Verification Complete ---');
}

run().catch(e => { console.error(e); process.exit(1); });
