
const BASE_URL = 'http://localhost:5000/api';

async function run() {
    console.log('--- Verifying Scheme Creation with Segment ---');

    console.log('1. Creating Segment...');
    const segRes = await fetch(`${BASE_URL}/user-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: `NodeTest Seg ${Date.now()}`,
            description: 'Test',
            criteria: { type: 'TRANSACTION_VOLUME', min: 100, max: null, currency: 'GBP' }
        })
    });
    const segData = await segRes.json();
    console.log('Segment Created:', segData);
    if (!segData.id) throw new Error('Segment creation failed');

    const segId = segData.id;

    console.log(`2. Creating Bonus Scheme with Segment ID ${segId}...`);
    const schemePayload = {
        name: `NodeTest Scheme ${Date.now()}`,
        bonus_type: 'TRANSACTION_THRESHOLD_CREDIT',
        credit_amount: 10,
        currency: 'GBP',
        min_transaction_threshold: 50, // Required for Threshold Credit
        commission_type: 'FIXED',
        commission_percentage: 0,
        is_tiered: false,
        tiers: [],
        eligibility_rules: { segments: [String(segId)] }, // Must be array of strings?
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'ACTIVE'
    };

    const schemeRes = await fetch(`${BASE_URL}/bonus-schemes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemePayload)
    });

    // Check Status first
    if (!schemeRes.ok) {
        const txt = await schemeRes.text();
        console.error('Scheme Creation Failed:', schemeRes.status, txt);
        process.exit(1);
    }

    const schemeData = await schemeRes.json();
    console.log('Scheme Created:', schemeData);

    if (schemeData.success || schemeData.id) {
        console.log('PASS: Scheme created successfully.');
    } else {
        console.log('FAIL: Response did not indicate success.');
        process.exit(1);
    }
}

run().catch(e => { console.error(e); process.exit(1); });
