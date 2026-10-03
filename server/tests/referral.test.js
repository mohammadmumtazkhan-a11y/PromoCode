const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3');
const { registerReferralRoutes, clock } = require('../referral');

// Each test file gets an isolated in-memory database
function makeApp() {
    const db = new sqlite3.Database(':memory:');
    db.serialize(() => {
        db.run(`CREATE TABLE bonus_schemes (id INTEGER PRIMARY KEY, name TEXT, currency TEXT)`);
        db.run(`CREATE TABLE promo_codes (id INTEGER PRIMARY KEY, code TEXT, currency TEXT)`);
        db.run(`CREATE TABLE promo_redemptions (id TEXT, promo_code_id TEXT, transaction_id TEXT, user_id TEXT, discount_amount REAL, status TEXT, created_at TEXT)`);
    });
    const app = express();
    app.use(express.json());
    registerReferralRoutes(app, db);
    return app;
}

const setNow = (iso) => { clock.now = () => new Date(iso); };
const GBP_RULE = {
    name: 'UK Standard Programme', reward_type: 'BOTH', base_currency: 'GBP',
    referrer_reward: 5, referee_reward: 10, min_transaction_threshold: 50,
};

async function seedReferral(app, { rule = GBP_RULE, referee = {} } = {}) {
    await request(app).post('/api/referral-rules').send(rule).expect(201);
    const a = await request(app).post('/api/referral/customers').send({
        id: 'A', first_name: 'Olayinka', last_name: 'Adebayo', email: 'a@x.com', phone: '+441', send_currency: 'GBP', kyc_status: 'PASSED', device_id: 'dev-a',
    });
    const code = a.body.data.referral_code;
    const ref = await request(app).post('/api/referral/referrals').send({
        code, referee: { id: 'B', first_name: 'Sarah', last_name: 'Smith', email: 'b@x.com', phone: '+442', send_currency: 'GBP', kyc_status: 'PASSED', device_id: 'dev-b', ...referee },
    });
    return { code, referral: ref.body.data };
}

const transfer = (app, status, extra = {}) => request(app).post('/api/referral/transfer-events')
    .send({ transfer_id: 'T1', customer_id: 'B', amount: 60, currency: 'GBP', status, ...extra });

describe('Referral rules (US-1.1 – US-1.5)', () => {
    beforeEach(() => setNow('2026-10-01T10:00:00Z'));

    it('creates a rule and returns status ACTIVE with a LIVE offer notification', async () => {
        const app = makeApp();
        const res = await request(app).post('/api/referral-rules').send(GBP_RULE);
        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('ACTIVE');
        expect(res.body.data.qualification_window_days).toBe(30);
        expect(res.body.data.bonus_validity_days).toBe(90);
        expect(res.body.notification.kind).toBe('LIVE');
    });

    it('does not notify when notify is false (AC-6.1.3)', async () => {
        const app = makeApp();
        const res = await request(app).post('/api/referral-rules').send({ ...GBP_RULE, notify: false });
        expect(res.body.notification).toBeNull();
    });

    it('saves 0 for the unrewarded party (AC-1.1.6)', async () => {
        const app = makeApp();
        const res = await request(app).post('/api/referral-rules').send({ ...GBP_RULE, base_currency: 'NGN', reward_type: 'REFEREE', referrer_reward: 2000, referee_reward: 5000, min_transaction_threshold: 20000 });
        expect(res.body.data.referrer_reward).toBe(0);
        expect(res.body.data.referee_reward).toBe(5000);
    });

    it('rejects invalid fields with British English messages', async () => {
        const app = makeApp();
        const res = await request(app).post('/api/referral-rules').send({ ...GBP_RULE, name: 'ab', referrer_reward: 1.234, min_transaction_threshold: 0, qualification_window_days: 366, bonus_validity_days: 0 });
        expect(res.status).toBe(400);
        expect(res.body.fields.name).toMatch(/3–50 characters/);
        expect(res.body.fields.referrer_reward).toMatch(/up to 2 decimal places/);
        expect(res.body.fields.min_transaction_threshold).toMatch(/greater than 0/);
        expect(res.body.fields.qualification_window_days).toMatch(/1 to 365/);
        expect(res.body.fields.bonus_validity_days).toMatch(/1 to 730/);
    });

    it('validates dates (AC-1.1.16)', async () => {
        const app = makeApp();
        const past = await request(app).post('/api/referral-rules').send({ ...GBP_RULE, start_date: '2026-09-01' });
        expect(past.body.fields.start_date).toBe('Start date cannot be in the past.');
        const order = await request(app).post('/api/referral-rules').send({ ...GBP_RULE, start_date: '2026-10-10', end_date: '2026-10-10' });
        expect(order.body.fields.end_date).toBe('End date must be after the start date.');
    });

    it('marks future rules as SCHEDULED (AC-1.1.17)', async () => {
        const app = makeApp();
        const res = await request(app).post('/api/referral-rules').send({ ...GBP_RULE, start_date: '2026-10-02' });
        expect(res.body.data.status).toBe('SCHEDULED');
        const offer = await request(app).get('/api/referral/offer?currency=GBP');
        expect(offer.body.offer).toBeNull();
    });

    it('allows one non-archived rule per currency and unique names', async () => {
        const app = makeApp();
        await request(app).post('/api/referral-rules').send(GBP_RULE).expect(201);
        const dupCur = await request(app).post('/api/referral-rules').send({ ...GBP_RULE, name: 'Another one' });
        expect(dupCur.status).toBe(409);
        expect(dupCur.body.error).toBe('DUPLICATE_CURRENCY');
        expect(dupCur.body.message).toBe("A referral rule for GBP already exists ('UK Standard Programme'). Edit or archive it first.");
        const dupName = await request(app).post('/api/referral-rules').send({ ...GBP_RULE, name: 'uk standard programme', base_currency: 'EUR' });
        expect(dupName.body.error).toBe('DUPLICATE_NAME');
    });

    it('archives instead of deleting and frees the currency (AC-1.5.2, AC-1.5.3)', async () => {
        const app = makeApp();
        const created = await request(app).post('/api/referral-rules').send(GBP_RULE);
        await request(app).delete(`/api/referral-rules/${created.body.id}`).expect(200);
        const list = await request(app).get('/api/referral-rules');
        expect(list.body.data).toHaveLength(0);
        const all = await request(app).get('/api/referral-rules?include_archived=1');
        expect(all.body.data[0].status).toBe('ARCHIVED');
        await request(app).post('/api/referral-rules').send(GBP_RULE).expect(201);
        const edit = await request(app).put(`/api/referral-rules/${created.body.id}`).send(GBP_RULE);
        expect(edit.body.error).toBe('ARCHIVED');
    });

    it('records an audit entry and sends IMPROVED only when the offer gets better', async () => {
        const app = makeApp();
        const created = await request(app).post('/api/referral-rules').send(GBP_RULE);
        const better = await request(app).put(`/api/referral-rules/${created.body.id}`).send({ ...GBP_RULE, referrer_reward: 8 });
        expect(better.body.notification.kind).toBe('IMPROVED');
        const worse = await request(app).put(`/api/referral-rules/${created.body.id}`).send({ ...GBP_RULE, referrer_reward: 6 });
        expect(worse.body.notification).toBeNull();
        const audit = await request(app).get(`/api/referral-rules/${created.body.id}/audit`);
        expect(audit.body.data.some((a) => a.field === 'referrer_reward' && a.old_value === '5' && a.new_value === '8')).toBe(true);
    });

    it('cannot activate an ended rule (AC-1.4.4)', async () => {
        const app = makeApp();
        const created = await request(app).post('/api/referral-rules').send({ ...GBP_RULE, is_enabled: false, end_date: '2026-10-05' });
        setNow('2026-10-07T10:00:00Z');
        const res = await request(app).patch(`/api/referral-rules/${created.body.id}/status`).send({ is_enabled: true });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('RULE_ENDED');
    });
});

describe('Referral lifecycle (US-3.1 – US-4.4)', () => {
    beforeEach(() => setNow('2026-10-01T10:00:00Z'));

    it('builds the offer text from the active rule (AC-2.1.2)', async () => {
        const app = makeApp();
        await request(app).post('/api/referral-rules').send(GBP_RULE);
        await request(app).post('/api/referral/customers').send({ id: 'A', first_name: 'Olayinka', send_currency: 'GBP' });
        const res = await request(app).get('/api/referral/offer?customer_id=A');
        expect(res.body.offer.text).toBe('Invite friends with your link. You get £5.00 and your friend gets £10.00 in bonus credit when they send £50.00 or more within 30 days of joining.');
        expect(res.body.offer.referral_link).toMatch(/^https:\/\/rhemito\.com\/ref\/OLAYINKA\d{4}$/);
    });

    it('hides the offer when no active rule exists (AC-2.1.5)', async () => {
        const app = makeApp();
        const res = await request(app).get('/api/referral/offer?currency=EUR');
        expect(res.body.offer).toBeNull();
    });

    it('validates codes (AC-3.2.3, AC-3.2.4)', async () => {
        const app = makeApp();
        expect((await request(app).get('/api/referral/codes/AB-12')).body.message).toBe('Referral codes are 6–12 letters and numbers.');
        expect((await request(app).get('/api/referral/codes/ABCDEF99')).status).toBe(404);
    });

    it('counts repeat link visits once per 24 hours (AC-3.1.10)', async () => {
        const app = makeApp();
        const { code } = await seedReferral(app);
        expect((await request(app).post('/api/referral/visits').send({ code, visitor_id: 'v1' })).body.counted).toBe(true);
        expect((await request(app).post('/api/referral/visits').send({ code, visitor_id: 'v1' })).body.counted).toBe(false);
        setNow('2026-10-02T11:00:00Z');
        expect((await request(app).post('/api/referral/visits').send({ code, visitor_id: 'v1' })).body.counted).toBe(true);
    });

    it('snapshots the rule at registration and rewards both parties on completion (AC-4.1.2, AC-4.1.9)', async () => {
        const app = makeApp();
        const { referral } = await seedReferral(app);
        expect(referral.status).toBe('REGISTERED');
        expect(referral.qualification_deadline).toBe('2026-10-31');
        const rules = await request(app).get('/api/referral-rules');
        await request(app).put(`/api/referral-rules/${rules.body.data[0].id}`).send({ ...GBP_RULE, referee_reward: 15 });

        expect((await transfer(app, 'PAID')).body.referral.status).toBe('PENDING');
        const done = await transfer(app, 'COMPLETED');
        expect(done.body.referral.status).toBe('REWARDED');
        expect(done.body.referral.referee_credited).toBe(10);

        const a = await request(app).get('/api/wallet/A?currency=GBP');
        const b = await request(app).get('/api/wallet/B?currency=GBP');
        expect(a.body.balances[0].available).toBe(5);
        expect(b.body.balances[0].available).toBe(10);
        expect(b.body.unused[0].expires_on).toBe('2026-12-30');
        expect(a.body.unused[0].source).toBe('Referrer reward – referred Sarah S.');
    });

    it('treats the Floor as inclusive and compares only the send amount (AC-4.1.4 – 4.1.6)', async () => {
        const app = makeApp();
        await seedReferral(app);
        expect((await transfer(app, 'PAID', { transfer_id: 'T0', amount: 49.99 })).body.referral.status).toBe('REGISTERED');
        expect((await transfer(app, 'PAID', { amount: 50 })).body.referral.status).toBe('PENDING');
    });

    it('ignores transfers in another currency (AC-4.1.7)', async () => {
        const app = makeApp();
        await seedReferral(app);
        expect((await transfer(app, 'PAID', { currency: 'EUR' })).body.referral.status).toBe('REGISTERED');
    });

    it('rewards once only and is idempotent (AC-4.1.8, AC-4.1.11)', async () => {
        const app = makeApp();
        await seedReferral(app);
        await transfer(app, 'PAID');
        await transfer(app, 'COMPLETED');
        await transfer(app, 'COMPLETED');
        await transfer(app, 'COMPLETED', { transfer_id: 'T2' });
        const b = await request(app).get('/api/wallet/B');
        expect(b.body.balances[0].earned).toBe(10);
    });

    it('marks self-referrals as not eligible (AC-4.3.1)', async () => {
        const app = makeApp();
        const { referral } = await seedReferral(app, { referee: { device_id: 'dev-a' } });
        expect(referral.status).toBe('NOT_ELIGIBLE');
        expect(referral.status_reason).toBe('Self-referral: same device');
    });

    it('records Not Eligible when the referee currency has no rule (AC-3.1.7)', async () => {
        const app = makeApp();
        const { referral } = await seedReferral(app, { referee: { send_currency: 'EUR' } });
        expect(referral.status).toBe('NOT_ELIGIBLE');
        expect(referral.status_reason).toBe('No active referral programme for EUR');
    });

    it('waits for referrer KYC before awarding (AC-4.3.3)', async () => {
        const app = makeApp();
        await seedReferral(app);
        await request(app).post('/api/referral/customers').send({ id: 'A', kyc_status: 'PENDING' });
        await transfer(app, 'PAID');
        const pending = await transfer(app, 'COMPLETED');
        expect(pending.body.referral.status).toBe('PENDING');
        expect(pending.body.referral.status_reason).toBe('Awaiting referrer KYC');
        await request(app).post('/api/referral/customers').send({ id: 'A', kyc_status: 'PASSED' });
        const track = await request(app).get('/api/referral/tracking');
        expect(track.body.data[0].status).toBe('REWARDED');
    });

    it('still credits the referee when the referrer cap is reached (AC-4.1.12)', async () => {
        const app = makeApp();
        await seedReferral(app, { rule: { ...GBP_RULE, max_referrals_per_referrer: 1 } });
        await transfer(app, 'PAID');
        await transfer(app, 'COMPLETED');
        const code = (await request(app).get('/api/referral/customers/A')).body.data.referral_code;
        await request(app).post('/api/referral/referrals').send({ code, referee: { id: 'C', first_name: 'Mike', last_name: 'Ross', email: 'c@x.com', phone: '+443', send_currency: 'GBP', kyc_status: 'PASSED', device_id: 'dev-c' } });
        await request(app).post('/api/referral/transfer-events').send({ transfer_id: 'T9', customer_id: 'C', amount: 80, currency: 'GBP', status: 'PAID' });
        const res = await request(app).post('/api/referral/transfer-events').send({ transfer_id: 'T9', customer_id: 'C', status: 'COMPLETED' });
        expect(res.body.referral.referrer_credited).toBe(0);
        expect(res.body.referral.referee_credited).toBe(10);
        expect(res.body.referral.status_reason).toBe('Referrer cap reached');
        const offer = await request(app).get('/api/referral/offer?customer_id=A');
        expect(offer.body.offer.cap_reached).toBe(true);
    });

    it('returns to Registered when a pending transfer fails (AC-4.4.1)', async () => {
        const app = makeApp();
        await seedReferral(app);
        await transfer(app, 'PAID');
        expect((await transfer(app, 'CANCELLED')).body.referral.status).toBe('REGISTERED');
    });

    it('voids only the unused part after a reversal (AC-4.4.2, AC-4.4.3)', async () => {
        const app = makeApp();
        await seedReferral(app);
        await transfer(app, 'PAID');
        await transfer(app, 'COMPLETED');
        await request(app).post('/api/wallet/A/apply').send({ amount: 3, currency: 'GBP', transfer_id: 'TA1', send_amount: 100 }).expect(200);
        const rev = await transfer(app, 'REFUNDED');
        expect(rev.body.referral.status).toBe('REVERSED');
        const a = await request(app).get('/api/wallet/A?currency=GBP');
        expect(a.body.balances[0].available).toBe(0);
        expect(a.body.balances[0].used).toBe(3);
        expect(a.body.balances[0].expired).toBe(2);
        expect(a.body.credits[0].status).toBe('REVERSED');
    });

    it('expires referrals after the qualification window (AC-4.2.1, AC-4.2.2)', async () => {
        const app = makeApp();
        await seedReferral(app);
        setNow('2026-10-31T22:50:00Z'); // 23:50 UK time on 31/10 (GMT)
        await transfer(app, 'PAID');
        setNow('2026-11-01T09:00:00Z');
        await request(app).post('/api/referral/run-jobs');
        const done = await transfer(app, 'COMPLETED');
        expect(done.body.referral.status).toBe('REWARDED');

        const app2 = makeApp();
        setNow('2026-10-01T10:00:00Z');
        await seedReferral(app2);
        setNow('2026-11-01T09:00:00Z');
        await request(app2).post('/api/referral/run-jobs');
        const t = await request(app2).get('/api/referral/tracking');
        expect(t.body.data[0].status).toBe('EXPIRED');
        expect(t.body.data[0].status_reason).toBe('Qualification window ended on 31/10/2026');
    });
});

describe('Bonus wallet (US-5.1 – US-5.4)', () => {
    beforeEach(() => setNow('2026-10-01T10:00:00Z'));

    async function rewarded() {
        const app = makeApp();
        await seedReferral(app);
        await transfer(app, 'PAID');
        await transfer(app, 'COMPLETED');
        return app;
    }

    it('applies bonus, rejects over-use and returns it on refund', async () => {
        const app = await rewarded();
        const over = await request(app).post('/api/wallet/B/apply').send({ amount: 20, currency: 'GBP', transfer_id: 'T5', send_amount: 500 });
        expect(over.status).toBe(409);
        expect(over.body.message).toBe('Your bonus balance has changed. Please review your transfer.');
        await request(app).post('/api/wallet/B/apply').send({ amount: 10, currency: 'GBP', transfer_id: 'T5', send_amount: 500 }).expect(200);
        let b = await request(app).get('/api/wallet/B?currency=GBP');
        expect(b.body.balances[0]).toMatchObject({ available: 0, earned: 10, used: 10, expired: 0 });
        await request(app).post('/api/referral/transfer-events').send({ transfer_id: 'T5', customer_id: 'B', amount: 500, currency: 'GBP', status: 'REFUNDED' });
        b = await request(app).get('/api/wallet/B?currency=GBP');
        expect(b.body.balances[0]).toMatchObject({ available: 10, used: 0 });
    });

    it('enforces the minimum send amount to redeem (AC-5.2.6)', async () => {
        const app = makeApp();
        await seedReferral(app, { rule: { ...GBP_RULE, min_redeem_amount: 20 } });
        await transfer(app, 'PAID');
        await transfer(app, 'COMPLETED');
        const res = await request(app).post('/api/wallet/B/apply').send({ amount: 5, currency: 'GBP', transfer_id: 'T6', send_amount: 19.99 });
        expect(res.body.message).toBe('Send £20.00 or more to use your bonus.');
    });

    it('expires unused credit after its validity (AC-5.4.1)', async () => {
        const app = await rewarded();
        setNow('2026-12-31T10:00:00Z');
        const jobs = await request(app).post('/api/referral/run-jobs');
        expect(jobs.body.credits_expired).toBe(2);
        const b = await request(app).get('/api/wallet/B?currency=GBP');
        expect(b.body.balances[0]).toMatchObject({ available: 0, expired: 10 });
        expect(b.body.credits[0].status).toBe('EXPIRED');
    });
});

describe('Admin reporting (US-1.6, US-1.8)', () => {
    beforeEach(() => setNow('2026-10-01T10:00:00Z'));

    it('reports performance per rule', async () => {
        const app = makeApp();
        const { code } = await seedReferral(app);
        await request(app).post('/api/referral/visits').send({ code, visitor_id: 'v1' });
        await transfer(app, 'PAID');
        await transfer(app, 'COMPLETED');
        await request(app).post('/api/wallet/B/apply').send({ amount: 4, currency: 'GBP', transfer_id: 'T7', send_amount: 100 });
        const res = await request(app).get('/api/referral/performance');
        expect(res.body.data[0]).toMatchObject({
            currency: 'GBP', link_visits: 1, registrations: 1, rewarded: 1, pending: 0, conversion_rate: 100,
            bonus_issued: 15, bonus_used: 4, bonus_unused: 11, bonus_expired: 0, referred_volume: 60,
        });
        const csv = await request(app).get('/api/referral/performance.csv');
        expect(csv.text.split('\n')[0]).toMatch(/^Rule,Currency,Status,Link visits/);
    });

    it('filters tracking and summarises', async () => {
        const app = makeApp();
        await seedReferral(app);
        const res = await request(app).get('/api/referral/tracking?q=sarah');
        expect(res.body.total).toBe(1);
        expect(res.body.data[0].referee_first_name).toBe('Sarah');
        expect(res.body.summary).toMatchObject({ total: 1, pending: 1, rewarded: 0, conversion_rate: 0 });
        expect((await request(app).get('/api/referral/tracking?status=REWARDED')).body.total).toBe(0);
    });

    it('lets an admin approve a not-eligible referral with a reason (AC-4.3.5)', async () => {
        const app = makeApp();
        const { referral } = await seedReferral(app, { referee: { device_id: 'dev-a' } });
        const short = await request(app).post(`/api/referral/referrals/${referral.id}/approve`).send({ reason: 'ok' });
        expect(short.status).toBe(400);
        const ok = await request(app).post(`/api/referral/referrals/${referral.id}/approve`).send({ admin_user: 'Jane', reason: 'Shared family device, verified by phone' });
        expect(ok.body.data.status).toBe('REWARDED');
        expect(ok.body.data.referee_credited).toBe(10);
    });
});
