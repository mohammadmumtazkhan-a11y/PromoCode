// Promo module (PROMO_MODULE_SPEC_MITO_ADMIN.md) end to end against the real Express app.
const os = require('os');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'mito-promo-')));
const app = require('../../server');
const promo = require('../../promo');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();
let n = 0;
const uniq = (p = 'PM') => `${p}${Date.now().toString(36).toUpperCase()}${(n++).toString(36).toUpperCase()}`.slice(0, 20);

beforeAll(async () => {
    for (let i = 0; i < 40; i++) {
        const r = await request(app).get('/api/promocodes');
        if (r.status === 200) break;
        await wait(250);
    }
    await wait(300);
});

const create = (over = {}) => {
    const code = over.code || uniq();
    return request(app).post('/api/promocodes').send({
        code, type: 'Fixed', value: 2, currency: 'GBP', min_threshold: 0, usage_limit_per_user: 1, start_date: iso(-1), end_date: iso(30), ...over,
    }).then((res) => ({ res, code }));
};
const validate = (code, over = {}) => request(app).post('/api/promocodes/validate').send({
    code, amount: 100, fee: 3, currency: 'GBP', userId: 'CUST', sourceCurrency: 'GBP', destCurrency: 'NGN', ...over,
});
const redeem = (code, txn, over = {}) => request(app).post('/api/promocodes/redeem').send({
    code, transactionId: txn, amount: 100, fee: 3, currency: 'GBP', userId: 'CUST', sourceCurrency: 'GBP', destCurrency: 'NGN', ...over,
});
const event = (id, customer, status, over = {}) => request(app).post('/api/promocodes/transfer-events').send({
    transfer_id: id, customer_id: customer, amount: 100, currency: 'GBP', receive_currency: 'NGN', status, created_at: new Date().toISOString(), ...over,
});
const codeRow = async (code) => (await request(app).get('/api/promocodes')).body.data.find((p) => p.code === code);

describe('PR-40 admin validation (§5.2)', () => {
    it('rejects bad fields with field messages', async () => {
        const r = await request(app).post('/api/promocodes').send({ code: 'x', type: 'Fixed', value: 0, currency: 'XXX', start_date: iso(2), end_date: iso(1) });
        expect(r.status).toBe(400);
        expect(r.body.code).toBe('VALIDATION');
        expect(r.body.fields).toMatchObject({
            code: 'Use 3–20 letters, numbers or hyphens.', value: 'Enter an amount greater than 0.', currency: 'Choose a currency.',
            end_date: 'End date must be after the start date.',
        });
    });
    it('checks percentage range, per-customer range and corridor/payment choices', async () => {
        const r = await request(app).post('/api/promocodes').send({
            code: uniq(), type: 'Percentage', value: 120, currency: 'GBP', usage_limit_per_user: 5000, start_date: iso(-1), end_date: iso(5),
            all_corridors: false, all_payment_methods: false, restrictions: { corridors: [], payment_methods: [] },
        });
        expect(r.body.fields).toMatchObject({
            value: 'Enter a percentage between 0.01 and 100.', usage_limit_per_user: 'Enter a whole number from 1 to 1,000.',
            corridors: 'Add at least one corridor, or tick All corridors.', payment_methods: 'Choose at least one payment method, or tick All payment methods.',
        });
    });
    it('refuses duplicates case-insensitively and legacy types (D6)', async () => {
        const { code } = await create();
        const dup = await create({ code: code.toLowerCase() });
        expect(dup.res.status).toBe(409);
        expect(dup.res.body.fields.code).toBe('This promo code already exists.');
        expect((await create({ type: 'FX_BOOST', value: 5 })).res.status).toBe(400);
    });
    it('keeps blank limits unlimited and stores Unlimited uses per customer as -1 (D9)', async () => {
        const { code } = await create({ usage_limit_per_user: -1, usage_limit_global: '', budget_limit: '' });
        const row = await codeRow(code);
        expect(row).toMatchObject({ usage_limit_per_user: -1, usage_limit_global: -1, budget_limit: -1, display_status: 'Active', is_legacy: false });
    });
});

describe('PR-1…PR-13 validation order and messages (§6.4)', () => {
    it('reports not started separately from expired', async () => {
        const { code } = await create({ start_date: iso(2), end_date: iso(10) });
        expect((await validate(code)).body).toMatchObject({ code: 'NOT_STARTED', error: 'This promo code is not valid yet.' });
        expect((await codeRow(code)).display_status).toBe('Scheduled');
    });
    it('gives corridor and payment-method messages', async () => {
        const { code } = await create({ restrictions: { corridors: ['GBP-GHS'], payment_methods: ['Card'] } });
        expect((await validate(code)).body).toMatchObject({ code: 'CORRIDOR', error: "This code can't be used for this destination." });
        expect((await validate(code, { destCurrency: 'GHS', paymentMethod: 'instant_bank' })).body.code).toBe('PAYMENT_METHOD');
        expect((await validate(code, { destCurrency: 'GHS' })).status).toBe(200); // method not chosen yet
    });
    it('returns the same success fields as before plus currency', async () => {
        const { code } = await create({ type: 'Percentage', value: 50, max_discount: 1 });
        const r = await validate(code);
        expect(r.body).toMatchObject({ valid: true, appliedDiscount: 1, appliesTo: 'fee', displayText: '50% off fees (GBP 1.00 saved)', currency: 'GBP' });
    });
    it('reads an audience saved only inside restrictions (C8)', async () => {
        const { res, code } = await create({ restrictions: { user_segment: { type: 'targeted', user_id: 'ONLYME' } } });
        expect(res.status).toBe(200);
        expect((await validate(code, { userId: 'SOMEONE' })).body.code).toBe('NOT_YOUR_CODE');
        expect((await validate(code, { userId: 'ONLYME' })).status).toBe(200);
    });
});

describe('Audience (§3.3) uses the module’s own customer activity', () => {
    it('new / existing customers follow completed transfers reported to the promo module', async () => {
        const fresh = await create({ user_segment: { type: 'new_customers' } });
        const loyal = await create({ user_segment: { type: 'existing_customers' } });
        expect((await validate(fresh.code, { userId: 'AUD1' })).status).toBe(200);
        expect((await validate(loyal.code, { userId: 'AUD1' })).body.code).toBe('SEGMENT');
        await event('AUD-T1', 'AUD1', 'COMPLETED');
        expect((await validate(fresh.code, { userId: 'AUD1' })).body.code).toBe('SEGMENT');
        expect((await validate(loyal.code, { userId: 'AUD1' })).status).toBe(200);
    });
    it('specific customers', async () => {
        const { code } = await create({ user_segment: { type: 'specific_customers', user_ids: 'A1, A2\nA3' } });
        expect((await validate(code, { userId: 'A2' })).status).toBe(200);
        expect((await validate(code, { userId: 'A9' })).body.code).toBe('NOT_YOUR_CODE');
    });
    it('saved segments are read through the segment provider (user_segments, read-only)', async () => {
        const seg = await request(app).post('/api/user-segments').send({ name: `Two plus ${uniq()}`, criteria: { type: 'TRANSACTION_COUNT', min: 2, max: null } });
        const { code } = await create({ user_segment: { type: String(seg.body.id) } });
        expect((await validate(code, { userId: 'SEG1' })).body.code).toBe('SEGMENT');
        await event('SEG-1', 'SEG1', 'COMPLETED');
        await event('SEG-2', 'SEG1', 'COMPLETED');
        expect((await validate(code, { userId: 'SEG1' })).status).toBe(200);
        const list = (await request(app).get('/api/promocodes/segments')).body.data;
        expect(list.some((s) => s.id === seg.body.id)).toBe(true);
    });
});

describe('Redeem, release, transfer events (§3.4, §6.2)', () => {
    it('PR-14 reduces the discount to the budget that is left', async () => {
        const { code } = await create({ value: 3, budget_limit: 4, usage_limit_per_user: -1 });
        expect((await redeem(code, 'BUD-1', { userId: 'B1' })).body.discount).toBe(3);
        expect((await redeem(code, 'BUD-2', { userId: 'B2' })).body.discount).toBe(1);
        expect((await redeem(code, 'BUD-3', { userId: 'B3' })).body.code).toBe('BUDGET_SPENT');
        expect((await codeRow(code)).display_status).toBe('Budget spent');
    });
    it('cannot exceed the global limit when two transfers are paid at the same moment', async () => {
        const { code } = await create({ usage_limit_global: 1, usage_limit_per_user: -1 });
        const results = await Promise.all([redeem(code, 'RACE-1', { userId: 'R1' }), redeem(code, 'RACE-2', { userId: 'R2' })]);
        expect(results.filter((r) => r.status === 200).length).toBe(1);
        expect((await codeRow(code)).usage_count).toBe(1);
    });
    it('records redemption details, and a failed transfer event releases the use with its reason', async () => {
        const { code } = await create();
        await redeem(code, 'EV-1', { userId: 'E1', paymentMethod: 'card' });
        let rows = (await request(app).get(`/api/promocodes/${(await codeRow(code)).id}/redemptions`)).body.data;
        expect(rows[0]).toMatchObject({ transaction_id: 'EV-1', status: 'Redeemed', source_currency: 'GBP', dest_currency: 'NGN', payment_method: 'card', currency: 'GBP' });
        expect((await event('EV-1', 'E1', 'FAILED')).body.released).toBe(1);
        rows = (await request(app).get(`/api/promocodes/${(await codeRow(code)).id}/redemptions`)).body.data;
        expect(rows[0]).toMatchObject({ status: 'Released', release_reason: 'FAILED' });
        expect((await event('EV-1', 'E1', 'FAILED')).body.released).toBe(0); // repeat is a no-op
        expect((await event('EV-X', 'E1', 'NOPE')).status).toBe(400);
    });
    it('customer sync and savings (API-S5, API-S6)', async () => {
        expect((await request(app).post('/api/promocodes/customers').send({ id: 'SAV1', created_at: '2025-01-01T00:00:00Z', country: 'GB', send_currency: 'gbp', first_name: 'Sam', last_name: 'Ade' })).body.success).toBe(true);
        const { code } = await create({ value: 2 });
        await redeem(code, 'SAV-1', { userId: 'SAV1' });
        const s = (await request(app).get('/api/promocodes/customers/SAV1/redemptions')).body;
        expect(s.summary.saved.GBP).toBe(2);
        expect(s.data[0]).toMatchObject({ code, transaction_id: 'SAV-1', status: 'Redeemed' });
        const rows = await promo.listRedemptions({ userId: 'SAV1' });
        expect(rows[0].customer_name).toBe('Sam Ade');
    });
    it('a cancelled transfer reported on the promo endpoint releases the promo use', async () => {
        const { code } = await create();
        await redeem(code, 'OLD-1', { userId: 'O1' });
        await request(app).post('/api/promocodes/transfer-events').send({ transfer_id: 'OLD-1', customer_id: 'O1', amount: 100, currency: 'GBP', status: 'CANCELLED' }).expect(200);
        expect((await codeRow(code)).usage_count).toBe(0);
    });
});

describe('Admin extras', () => {
    it('blocks editing a used code and writes an audit trail', async () => {
        const { res, code } = await create();
        const id = res.body.id;
        await request(app).put(`/api/promocodes/${id}`).send({ code, type: 'Fixed', value: 4, currency: 'GBP', start_date: iso(-1), end_date: iso(30) }).expect(200);
        await request(app).put(`/api/promocodes/${id}/status`).send({ status: 'Disabled' }).expect(200);
        expect((await request(app).put(`/api/promocodes/${id}/status`).send({ status: 'Paused' })).status).toBe(400);
        const audit = (await request(app).get(`/api/promocodes/${id}/audit`)).body.data.map((a) => a.field);
        expect(audit).toEqual(expect.arrayContaining(['created', 'value', 'status']));
        await request(app).put(`/api/promocodes/${id}/status`).send({ status: 'Active' }).expect(200);
        await redeem(code, 'AUD-USE', { userId: 'AU1' });
        const edit = await request(app).put(`/api/promocodes/${id}`).send({ code, type: 'Fixed', value: 1, currency: 'GBP', start_date: iso(-1), end_date: iso(30) });
        expect(edit.status).toBe(409);
        expect(edit.body.error).toBe('This code has already been used, so it cannot be edited. Create a new code instead.');
    });
    it('summary, filters and CSV', async () => {
        const s = (await request(app).get('/api/promocodes/summary')).body;
        expect(s).toHaveProperty('active_codes');
        expect(s.cost_incurred).toHaveProperty('GBP');
        const disabled = (await request(app).get('/api/promocodes?status=Disabled')).body.data;
        expect(disabled.every((p) => p.display_status === 'Disabled')).toBe(true);
        const csv = await request(app).get('/api/promocodes.csv');
        expect(csv.headers['content-type']).toMatch(/text\/csv/);
        expect(csv.text.split('\n')[0]).toMatch(/^Code,Note,Type/);
    });
    it('bulk and personal codes (API-A8) and the fixed /generate response', async () => {
        const config = { type: 'Fixed', value: 1, currency: 'GBP', start_date: iso(-1), end_date: iso(30) };
        const bulk = await request(app).post('/api/promocodes/bulk').send({ config, prefix: 'WIN', count: 3 });
        expect(bulk.body.created).toHaveLength(3);
        expect(bulk.body.created[0].code).toMatch(/^WIN-[A-Z0-9]{8}$/);
        const personal = await request(app).post('/api/promocodes/bulk').send({ config, customer_ids: ['P1', 'P2'] });
        const p1 = personal.body.created.find((c) => c.customer_id === 'P1').code;
        expect((await validate(p1, { userId: 'P2' })).body.code).toBe('NOT_YOUR_CODE');
        expect((await validate(p1, { userId: 'P1' })).status).toBe(200);
        const gen = await request(app).post('/api/promocodes/generate').send({ batch_size: 2, prefix: 'GEN', config });
        expect(gen.body).toMatchObject({ success: true, created: 2 });
        expect(gen.body.codes).toHaveLength(2);
    });
    it('service key is enforced only when PROMO_SERVICE_KEY is set', async () => {
        process.env.PROMO_SERVICE_KEY = 'secret';
        try {
            expect((await validate('ANY')).status).toBe(401);
            expect((await validate('ANY').set('X-Promo-Service-Key', 'secret')).status).toBe(404);
        } finally { delete process.env.PROMO_SERVICE_KEY; }
    });
    it('rate limits validation per customer (30 a minute)', async () => {
        let last;
        for (let i = 0; i < 31; i++) last = await validate('NOPE', { userId: 'RATE' });
        expect(last.status).toBe(429);
    });
});
