// Bonus module (BONUS_MODULE_SPEC_MITO_ADMIN.md v1.1) against an isolated in-memory database.
const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3');
const bonus = require('../../bonus');
const { clock } = require('../../bonus/time');
const { tagSources } = require('../../bonus/schema');

delete process.env.ADMIN_USERS; // prototype mode: no sign-in

function makeApp(ports = {}) {
    const db = new sqlite3.Database(':memory:');
    const app = express();
    app.use(express.json());
    const { q, ready } = bonus.register(app, db, ports, { seed: false });
    app.locals.q = q;
    app.locals.ready = ready;
    return app;
}

const setNow = (iso) => { clock.now = () => new Date(iso); };
const FAR = '2099-12-31';
const scheme = (app, over = {}) => request(app).post('/api/bonus-schemes').send({
    name: `Scheme ${Math.random().toString(36).slice(2, 7)}`, bonus_type: 'TRANSACTION_THRESHOLD_CREDIT', credit_amount: 5, currency: 'GBP',
    min_transaction_threshold: 50, eligibility_rules: { oneTimeOnly: false }, start_date: '2026-01-01', end_date: FAR, ...over,
});
const transfer = (app, id, customer, amount, over = {}) => request(app).post('/api/bonus/transfer-events').send({
    transfer_id: id, customer_id: customer, amount, currency: 'GBP', receive_currency: 'NGN', status: 'COMPLETED', created_at: clock.now().toISOString(), ...over,
});
const grant = (app, user, amount, over = {}) => request(app).post('/api/credits/manual').send({
    user_id: user, amount, type: 'EARNED', reason_code: 'GOODWILL', notes: 'Sorry about the delay on your transfer', currency: 'GBP', ...over,
});
const walletOf = async (app, id, qs = '') => (await request(app).get(`/api/wallet/${id}${qs}`)).body;

beforeEach(() => setNow('2026-10-08T10:00:00Z'));

describe('BS-80 – BS-85 one balance, trackable by source', () => {
    it('BS-80: tags scheme, manual and referral credits with how they were earned', async () => {
        const app = makeApp();
        const s = (await scheme(app, { name: 'Big Sender', credit_amount: 10 })).body.id;
        expect((await transfer(app, 'T1', 'U1', 100)).body.awards.find((a) => a.scheme_id === s)).toMatchObject({ status: 'AWARDED', amount: 10 });
        await grant(app, 'U1', 3);
        await bonus.issueCredit({ customerId: 'U1', amount: 5, currency: 'GBP', validityDays: 90, creditSource: 'REFERRAL', creditSourceDetail: 'REFERRER', referralId: 'R1', ruleId: 1, referenceId: 'R1:referrer', notes: 'Referrer reward – referred Sarah S.' });

        const w = await walletOf(app, 'U1');
        const bySource = Object.fromEntries(w.credits.map((c) => [c.credit_source, c]));
        expect(bySource.SCHEME).toMatchObject({ credit_source_detail: 'TRANSACTION_THRESHOLD_CREDIT', credit_source_label: 'Transfer bonus – Big Sender' });
        expect(bySource.MANUAL).toMatchObject({ credit_source_detail: 'GOODWILL', credit_source_label: 'Goodwill credit from Rhemito' });
        expect(bySource.REFERRAL).toMatchObject({ credit_source_detail: 'REFERRER', credit_source_label: 'Referral bonus – Sarah S.' });
        expect(w.balances[0].available).toBe(18);
    });

    it('D9/D13: spends one balance soonest-expiry first whatever the source, and returns it to the same sources (BS-81)', async () => {
        const app = makeApp();
        await grant(app, 'U2', 4, { validity_days: 10 });
        await bonus.issueCredit({ customerId: 'U2', amount: 6, currency: 'GBP', validityDays: 30, creditSource: 'REFERRAL', creditSourceDetail: 'REFEREE', referenceId: 'R2:referee', notes: 'Referee reward – invited by Olayinka A.' });
        const apply = await request(app).post('/api/wallet/U2/apply').send({ amount: 7, currency: 'GBP', transfer_id: 'P1', send_amount: 100 });
        expect(apply.body).toEqual({ applied: 7, available: 3 });

        let w = await walletOf(app, 'U2');
        const used = Object.fromEntries(w.balances[0].by_source.map((g) => [g.credit_source, g.used]));
        expect(used).toEqual({ REFERRAL: 3, MANUAL: 4 }); // manual expired sooner, so it went first

        const release = await request(app).post('/api/wallet/U2/release').send({ transfer_id: 'P1' });
        expect(release.body.returned).toBe(7);
        expect((await request(app).post('/api/wallet/U2/release').send({ transfer_id: 'P1' })).body.returned).toBe(0); // idempotent
        w = await walletOf(app, 'U2');
        const returned = w.credits.filter((c) => c.reason_code === 'BONUS_RETURNED');
        expect(returned.map((c) => [c.credit_source, c.amount]).sort()).toEqual([['MANUAL', 4], ['REFERRAL', 3]]);
        expect(w.balances[0]).toMatchObject({ available: 10, used: 0 });
    });

    it('BS-84: the breakdown per source adds up to the currency totals', async () => {
        const app = makeApp();
        const s = (await scheme(app, { credit_amount: 8 })).body.id;
        await transfer(app, 'T3', 'U3', 100);
        await grant(app, 'U3', 5);
        await request(app).post('/api/wallet/U3/apply').send({ amount: 9, currency: 'GBP', transfer_id: 'P3', send_amount: 100 }).expect(200);
        await request(app).post('/api/credits/manual').send({ user_id: 'U3', amount: 2, type: 'VOIDED', reason_code: 'CORRECTION', notes: 'Duplicate goodwill credit removed', currency: 'GBP' }).expect(200);
        const b = (await walletOf(app, 'U3')).balances[0];
        const sum = (k) => b.by_source.reduce((n, g) => n + g[k], 0);
        expect(sum('earned')).toBe(b.earned);
        expect(sum('used')).toBe(b.used);
        expect(sum('available')).toBe(b.available);
        expect(sum('expired') + sum('removed')).toBe(b.expired); // `expired` on the balance has always included removed credit
        expect(b.by_source.find((g) => g.credit_source === 'SCHEME').label).toBe('Bonus offers');
        void s;
    });

    it('API-S3: ?credit_source filters the lists but never the balance totals', async () => {
        const app = makeApp();
        await grant(app, 'U4', 3);
        await bonus.issueCredit({ customerId: 'U4', amount: 5, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFEREE', referenceId: 'R4:referee' });
        const w = await walletOf(app, 'U4', '?credit_source=REFERRAL');
        expect(w.credits.map((c) => c.credit_source)).toEqual(['REFERRAL']);
        expect(w.history.every((h) => h.credit_source === 'REFERRAL')).toBe(true);
        expect(w.balances[0].available).toBe(8);
    });

    it('issueCredit is idempotent on referenceId and settles clawback debt; voidCredit voids the remainder', async () => {
        const app = makeApp();
        await app.locals.ready;
        const first = await bonus.issueCredit({ customerId: 'U5', amount: 5, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFERRER', referenceId: 'R5:referrer' });
        const again = await bonus.issueCredit({ customerId: 'U5', amount: 5, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFERRER', referenceId: 'R5:referrer' });
        expect(again).toMatchObject({ creditId: first.creditId, duplicate: true });
        await request(app).post('/api/wallet/U5/apply').send({ amount: 2, currency: 'GBP', transfer_id: 'P5', send_amount: 10 }).expect(200);
        expect(await bonus.voidCredit(first.creditId, { reason: 'REFERRAL_REVERSAL', eventId: 'X', clawback: false })).toMatchObject({ voided: 3, spent: 2, clawed_back: 0 });
        const w = await walletOf(app, 'U5');
        expect(w.credits[0].status).toBe('REVERSED');
        expect(w.balances[0]).toMatchObject({ available: 0, outstanding_debt: 0 });
        expect((await bonus.creditSummary({ referralIds: [] })).GBP).toMatchObject({ issued: 5, used: 2, voided: 3 });
    });
});

describe('BS-20 – BS-24 amounts', () => {
    it('BS-23 caps a percentage award, BS-24 rounds per currency and skips an award of 0', async () => {
        const app = makeApp();
        const pct = (await scheme(app, { commission_type: 'PERCENTAGE', commission_percentage: 10, credit_amount: 0, max_award: 4, min_transaction_threshold: 0 })).body.id;
        expect((await transfer(app, 'A1', 'U6', 100)).body.awards.find((a) => a.scheme_id === pct)).toMatchObject({ amount: 4 });
        const jpy = (await scheme(app, { currency: 'JPY', commission_type: 'PERCENTAGE', commission_percentage: 1.5, credit_amount: 0, min_transaction_threshold: 0 })).body.id;
        expect((await transfer(app, 'A2', 'U6', 1001, { currency: 'JPY' })).body.awards.find((a) => a.scheme_id === jpy)).toMatchObject({ amount: 15 });
        expect((await transfer(app, 'A3', 'U6', 10, { currency: 'JPY' })).body.awards.find((a) => a.scheme_id === jpy)).toMatchObject({ status: 'SKIPPED', reason: 'ZERO_AMOUNT' });
    });
});

describe('BS-1 – BS-6 scheme configuration', () => {
    it('validates fields with the final copy and refuses legacy referral schemes (BS-2)', async () => {
        const app = makeApp();
        const bad = await request(app).post('/api/bonus-schemes').send({ name: 'ab', bonus_type: 'LOYALTY_CREDIT', currency: 'GBP', credit_amount: 0, start_date: '2026-02-01', end_date: '2026-01-01' });
        expect(bad.status).toBe(400);
        expect(bad.body.fields).toMatchObject({
            name: 'Use 3–60 characters.', credit_amount: 'Enter an amount greater than 0.',
            min_transactions: 'Number of Transactions is required for Loyalty Credit', end_date: 'Start date must be before end date.',
        });
        const legacy = await request(app).post('/api/bonus-schemes').send({ name: 'Old ref', bonus_type: 'REFERRAL_CREDIT' });
        expect(legacy.body).toEqual({ error: 'Referral rewards are managed in Growth > Referral Settings.' });
        await scheme(app, { name: 'Unique One' }).expect(200);
        expect((await scheme(app, { name: 'unique one' })).body.fields.name).toBe('A scheme with this name already exists.'); // BS-6
        const tiers = await scheme(app, { is_tiered: true, tiers: [{ min: 0, max: 100, value: 1 }, { min: 150, max: '', value: 2 }] });
        expect(tiers.body.fields.tiers).toBe('Tiers must follow on from each other with no gaps or overlaps.');
    });

    it('BS-3 honours the submitted status; status change, archive and audit (BS-5, D11)', async () => {
        const app = makeApp();
        const id = (await scheme(app, { name: 'Paused Offer', status: 'INACTIVE' })).body.id;
        let row = (await request(app).get('/api/bonus-schemes')).body.data.find((s) => s.id === id);
        expect(row).toMatchObject({ status: 'INACTIVE', display_status: 'Inactive', awards_count: 0 });
        expect(row.summary).toBe('Customers who send £50.00 or more in one transfer earn £5.00 bonus credit, valid for 90 days, every time they qualify.');
        await request(app).patch(`/api/bonus-schemes/${id}/status`).send({ status: 'ACTIVE' }).expect(200);
        await transfer(app, 'S1', 'U7', 60);
        row = (await request(app).get('/api/bonus-schemes')).body.data.find((s) => s.id === id);
        expect(row).toMatchObject({ display_status: 'Active', awards_count: 1, issued_by_currency: { GBP: 5 } });
        await request(app).delete(`/api/bonus-schemes/${id}`).expect(200);
        row = (await request(app).get('/api/bonus-schemes')).body.data.find((s) => s.id === id);
        expect(row.display_status).toBe('Archived');
        const audit = (await request(app).get(`/api/bonus-schemes/${id}/audit`)).body.data.map((a) => `${a.field}:${a.new_value}`);
        expect(audit).toEqual(expect.arrayContaining(['created:Paused Offer', 'status:ACTIVE', 'status:ARCHIVED']));
    });

    it('§2.2 derives Scheduled and Ended, and API-S8 lists only live offers with a plain sentence', async () => {
        const app = makeApp();
        await scheme(app, { name: 'Later', start_date: '2027-01-01' });
        await scheme(app, { name: 'Gone', start_date: '2025-01-01', end_date: '2025-12-31' });
        await scheme(app, { name: 'Loyal Three', bonus_type: 'LOYALTY_CREDIT', min_transactions: 3, time_period_days: 30, credit_amount: 10 });
        const list = (await request(app).get('/api/bonus-schemes')).body.data;
        expect(list.find((s) => s.name === 'Later').display_status).toBe('Scheduled');
        expect(list.find((s) => s.name === 'Gone').display_status).toBe('Ended');
        const offers = (await request(app).get('/api/bonus/offers?currency=GBP')).body.data;
        expect(offers.map((o) => o.name)).toEqual(['Loyal Three']);
        expect(offers[0].summary).toBe('Complete 3 transfers within 30 days and get £10.00 bonus credit.');
    });
});

describe('§5.4 user segments', () => {
    it('validates, previews, and will not delete a segment a scheme uses', async () => {
        const app = makeApp();
        expect((await request(app).post('/api/user-segments').send({ name: 'Busy', criteria: { type: 'TRANSACTION_COUNT', min: 5, max: 2 } })).body.fields.max).toBe('Max must be at least Min.');
        const seg = (await request(app).post('/api/user-segments').send({ name: 'Two plus', criteria: { type: 'TRANSACTION_COUNT', min: 2 } })).body.id;
        expect((await request(app).post('/api/user-segments').send({ name: 'two PLUS', criteria: {} })).body.fields.name).toBe('A segment with this name already exists.');
        await transfer(app, 'G1', 'U8', 10); await transfer(app, 'G2', 'U8', 10); await transfer(app, 'G3', 'U9', 10);
        expect((await request(app).get(`/api/user-segments/${seg}/preview`)).body).toEqual({ count: 1, message: '1 customers match today.' });
        await scheme(app, { name: 'Segmented', eligibility_rules: { segments: [String(seg)] } });
        const del = await request(app).delete(`/api/user-segments/${seg}`);
        expect(del.status).toBe(409);
        expect(del.body.error).toBe('This segment is used by 1 scheme(s). Remove it from them first.');
    });
});

describe('API-S1 transfer events, BS-41 – BS-45', () => {
    it('returns applied bonus and reverses earned bonus when a transfer is cancelled', async () => {
        const app = makeApp();
        const s = (await scheme(app, { credit_amount: 6 })).body.id;
        await transfer(app, 'E1', 'U10', 100);
        await request(app).post('/api/wallet/U10/apply').send({ amount: 6, currency: 'GBP', transfer_id: 'E2', send_amount: 100 }).expect(200);
        await transfer(app, 'E2', 'U10', 100, { status: 'PAID' });
        const cancelled = await transfer(app, 'E2', 'U10', 100, { status: 'CANCELLED' });
        expect(cancelled.body).toMatchObject({ awards: [], returned: 6, reversed: [] });
        const refunded = await transfer(app, 'E1', 'U10', 100, { status: 'REFUNDED' });
        // The original credit was spent (then given back as a returned credit), so the reversal claws back 6, which the
        // returned credit repays at once: nothing is left and nothing is owed
        expect(refunded.body.reversed).toEqual([expect.objectContaining({ scheme_id: s, voided: 0, clawed_back: 6, strikes: 1 })]);
        expect((await walletOf(app, 'U10')).balances[0]).toMatchObject({ available: 0, outstanding_debt: 0 });
    });

    it('refuses an event without its ids, and asks for the service key when one is set', async () => {
        const app = makeApp();
        expect((await request(app).post('/api/bonus/transfer-events').send({ customer_id: 'U' })).status).toBe(400);
        process.env.BONUS_SERVICE_KEY = 'k1';
        try {
            expect((await request(app).get('/api/wallet/U')).status).toBe(401);
            expect((await request(app).get('/api/wallet/U').set('X-Bonus-Service-Key', 'k1')).status).toBe(200);
        } finally { delete process.env.BONUS_SERVICE_KEY; }
    });
});

describe('BS-62 apply rules', () => {
    it('keeps the existing errors', async () => {
        const app = makeApp();
        await grant(app, 'U11', 5);
        const over = await request(app).post('/api/wallet/U11/apply').send({ amount: 6, currency: 'GBP', transfer_id: 'X1', send_amount: 100 });
        expect(over.status).toBe(409);
        expect(over.body).toEqual({ error: 'BALANCE_CHANGED', message: 'Your bonus balance has changed. Please review your transfer.', available: 5 });
        expect((await request(app).post('/api/wallet/U11/apply').send({ amount: 5, currency: 'GBP', transfer_id: 'X1', send_amount: 4 })).body.message).toBe('Bonus cannot be more than the send amount.');
        await request(app).post('/api/wallet/U11/apply').send({ amount: 2, currency: 'GBP', transfer_id: 'X1', send_amount: 100 }).expect(200);
        expect((await request(app).post('/api/bonus/wallet/U11/apply').send({ amount: 1, currency: 'GBP', transfer_id: 'X1', send_amount: 100 })).body.error).toBe('ALREADY_APPLIED');
    });
});

describe('BS-70 – BS-73 manual adjustments', () => {
    it('grants with validity, removes from credits (linked), refuses removing more than available, and is idempotent', async () => {
        const app = makeApp();
        const g = await grant(app, 'U12', 10, { validity_days: 30, idempotency_key: 'g-1' });
        expect(g.body).toMatchObject({ success: true, new_balance_impact: 10, message: 'Credit of £10.00 granted to U12.' });
        expect((await grant(app, 'U12', 10, { idempotency_key: 'g-1' })).body).toMatchObject({ idempotent: true });
        expect((await grant(app, 'U12', 1, { notes: 'too short' })).body.error).toBe('Enter notes of 10–500 characters.');
        const tooMuch = await request(app).post('/api/credits/manual').send({ user_id: 'U12', amount: -50, type: 'VOIDED', reason_code: 'CORRECTION', notes: 'Removing an over-grant' });
        expect(tooMuch.body.error).toBe('You can remove at most £10.00.');
        const rm = await request(app).post('/api/credits/manual').send({ user_id: 'U12', amount: -4, type: 'VOIDED', reason_code: 'CORRECTION', notes: 'Removing an over-grant' });
        expect(rm.body).toMatchObject({ success: true, new_balance_impact: -4, message: '£4.00 removed from U12.' });
        const w = await walletOf(app, 'U12');
        expect(w.balances[0].available).toBe(6);
        const voided = w.history.find((h) => h.type === 'VOIDED');
        expect(voided.source_credit_id).toBeTruthy(); // the old manual void had no source credit (bug fixed)
        expect(w.credits[0].expires_on).toBe('2026-11-07');
    });
});

describe('BS-65 daily jobs and §8 feed', () => {
    it('expires credit, reminds 7 days ahead once, and feeds every event without duplicates', async () => {
        const app = makeApp();
        await grant(app, 'U13', 5, { validity_days: 7 });
        await grant(app, 'U13', 3, { validity_days: 1 });
        setNow('2026-10-08T12:00:00Z');
        let jobs = (await request(app).post('/api/bonus/run-jobs')).body;
        expect(jobs).toMatchObject({ credits_expired: 0, expiring_reminders: 1 });
        setNow('2026-10-10T09:00:00Z');
        jobs = (await request(app).post('/api/bonus/run-jobs')).body;
        expect(jobs).toMatchObject({ credits_expired: 1 });
        expect((await request(app).post('/api/bonus/run-jobs')).body).toMatchObject({ credits_expired: 0 }); // nothing twice
        const feed = (await request(app).get('/api/bonus/feed?since_id=0')).body;
        expect(feed.data.map((f) => f.type)).toEqual(['BONUS_EARNED', 'BONUS_EARNED', 'BONUS_EXPIRING', 'BONUS_EXPIRED']);
        expect(feed.data[3].payload).toMatchObject({ amount: 3, currency: 'GBP', by_source: [{ credit_source: 'MANUAL', amount: 3 }] });
        expect((await request(app).get(`/api/bonus/feed?since_id=${feed.last_id}`)).body.data).toEqual([]);
    });

    it('does not announce referral credits (the referral feed does), and announces a lifted block (BS-57)', async () => {
        const app = makeApp();
        await bonus.issueCredit({ customerId: 'U14', amount: 5, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFEREE', referenceId: 'R14:referee' });
        for (const n of [1, 2, 3]) {
            await bonus.recordStrike({ customerId: 'U14', eventId: `K${n}`, kind: 'SCHEME', outcome: 'REFUNDED', amountLost: 1, currency: 'GBP' });
        }
        expect(await bonus.isEarningBlocked('U14')).toMatchObject({ blocked: true });
        await request(app).post('/api/bonus-blocks/U14/lift').send({ reason: 'Checked with the customer by phone' }).expect(200);
        const types = (await request(app).get('/api/bonus/feed?customer_id=U14')).body.data.map((f) => f.type);
        expect(types).toEqual(['BONUS_BLOCK_LIFTED']);
    });
});

describe('API-A8 admin ledger', () => {
    it('adds the credit source to every row, filters by it, and reports outstanding bonus and debt', async () => {
        const app = makeApp({ customerDirectory: { names: async () => ({ U15: 'Ada Obi' }) } });
        await scheme(app, { name: 'Ledger Scheme', credit_amount: 7 });
        await transfer(app, 'L1', 'U15', 100);
        await grant(app, 'U15', 2);
        await request(app).post('/api/wallet/U15/apply').send({ amount: 8, currency: 'GBP', transfer_id: 'L2', send_amount: 100 }).expect(200);
        const all = (await request(app).get('/api/credits/all')).body;
        const applied = all.history.filter((h) => h.type === 'APPLIED');
        expect(applied.map((a) => a.credit_source_label).sort()).toEqual(['Bonus offers · Large transfer', 'From Rhemito · Goodwill']);
        expect(all.history[0]).toMatchObject({ source_type: 'BONUS', customer_name: 'Ada Obi' });
        expect(all.outstanding_by_currency.GBP).toEqual({ total: 1, by_source: { MANUAL: 1 } });
        const onlyScheme = (await request(app).get('/api/credits/all?creditSource=SCHEME')).body.history;
        expect(onlyScheme.every((h) => h.credit_source === 'SCHEME')).toBe(true);
        const one = (await request(app).get('/api/credits/U15')).body;
        expect(one.customer.balances[0].by_source.map((g) => g.credit_source)).toEqual(['SCHEME', 'MANUAL']);
        expect(one.history.find((h) => h.type === 'EARNED' && h.credit_source === 'SCHEME').credit_status).toBe('USED');
        const csv = await request(app).get('/api/credits/all.csv');
        expect(csv.headers['content-disposition']).toMatch(/bonus-ledger\.csv/);
        expect(csv.text.split('\n')[0]).toMatch(/^Date,Customer ID,Customer,Type,Source/);
    });
});

describe('§4 backfill tags existing credits', () => {
    it('tags referral, manual, scheme and returned credits; unknown ones become MANUAL/CORRECTION', async () => {
        const app = makeApp();
        const q = app.locals.q;
        await app.locals.ready;
        await q.run(`INSERT INTO bonus_schemes (id, name, bonus_type, credit_amount, start_date, end_date) VALUES (90, 'Old Loyalty', 'LOYALTY_CREDIT', 5, '2025-01-01', '2025-12-31')`);
        const rows = [
            ['c1', 'EARNED', 5, 'REFERRAL_REWARD', 'R9:referrer', null, null, null],
            ['c2', 'EARNED', 5, 'REFERRAL_REWARD', 'R9:referee', null, null, null],
            ['c3', 'EARNED', 5, 'SCHEME_BONUS', 'evt:90:T', 90, null, null],
            ['c4', 'EARNED', 5, 'GOODWILL', 'manual_1', null, null, null],
            ['a1', 'APPLIED', -2, 'BONUS_REDEMPTION', 'TX', null, 'c3', 'TX'],
            ['r1', 'EARNED', 2, 'BONUS_RETURNED', 'return:TX', null, null, 'TX'],
            ['c5', 'EARNED', 1, 'SOMETHING_ELSE', 'x', null, null, null],
        ];
        for (const [id, type, amount, reason, ref, schemeId, src, transfer] of rows) {
            await q.run('INSERT INTO credit_ledger (id, user_id, type, amount, reason_code, reference_id, scheme_id, source_credit_id, transfer_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'U16', type, amount, reason, ref, schemeId, src, transfer, 'GBP']);
        }
        const counts = await tagSources(q, () => {});
        expect(counts).toEqual({ REFERRAL: 2, MANUAL: 2, SCHEME: 2 });
        const tagged = Object.fromEntries((await q.all(`SELECT id, credit_source, credit_source_detail, returned_from_credit_id FROM credit_ledger WHERE type = 'EARNED'`))
            .map((r) => [r.id, `${r.credit_source}/${r.credit_source_detail}${r.returned_from_credit_id ? `<-${r.returned_from_credit_id}` : ''}`]));
        expect(tagged).toEqual({
            c1: 'REFERRAL/REFERRER', c2: 'REFERRAL/REFEREE', c3: 'SCHEME/LOYALTY_CREDIT', c4: 'MANUAL/GOODWILL', r1: 'SCHEME/LOYALTY_CREDIT<-c3', c5: 'MANUAL/CORRECTION',
        });
        expect(await tagSources(q, () => {})).toEqual({}); // safe to run again
    });
});
