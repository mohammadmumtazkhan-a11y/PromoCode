// The referral module's only required dependency is the rewardWallet port (REFERRAL spec v1.1, BR-36, BR-41, BR-50 – BR-53).
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3');
const { registerReferralRoutes, clock } = require('../referral');
const bonus = require('../bonus');
const referralHost = require('../referralHost');
const { clock: bonusClock } = require('../bonus/time');

process.env.ADMIN_USERS = JSON.stringify([{ name: 'Grace Growth', role: 'GROWTH_MANAGER', token: 'gm-token' }]);

const setNow = (iso) => { clock.now = () => new Date(iso); bonusClock.now = () => new Date(iso); };
const RULE = { name: 'UK Standard Programme', reward_type: 'BOTH', base_currency: 'GBP', receive_currency: 'NGN', referrer_reward: 5, referee_reward: 10, min_transaction_threshold: 50 };

// An app whose rewardWallet is the real bonus wallet, wrapped so each test can watch or break it
function makeApp(overrides = {}) {
    const db = new sqlite3.Database(':memory:');
    const app = express();
    app.use(express.json());
    const { ready } = bonus.register(app, db, {}, { seed: false });
    const real = referralHost.referralPorts();
    const calls = { issue: [], void: [], summary: [], spent: [], strikes: [], issued: [] };
    const ports = {
        rewardWallet: {
            issueCredit: (input) => { calls.issue.push(input); return (overrides.issueCredit || real.rewardWallet.issueCredit)(input); },
            voidCredit: (id, opts) => { calls.void.push({ id, opts }); return real.rewardWallet.voidCredit(id, opts); },
            creditSummary: (f) => { calls.summary.push(f); return real.rewardWallet.creditSummary(f); },
        },
        eligibilityGuard: {
            isEarningBlocked: real.eligibilityGuard.isEarningBlocked,
            recordStrike: (i) => { calls.strikes.push(i); return real.eligibilityGuard.recordStrike(i); },
        },
        onSpentCreditReversed: (ev) => { calls.spent.push(ev); return real.onSpentCreditReversed(ev); },
        onRewardIssued: (ev) => { calls.issued.push(ev); },
    };
    registerReferralRoutes(app, db, { dependsOn: ready, ...ports });
    app.locals.db = db;
    app.locals.calls = calls;
    return app;
}

async function seed(app) {
    await request(app).post('/api/referral-rules').send(RULE).expect(201);
    const a = await request(app).post('/api/referral/customers').send({ id: 'A', first_name: 'Olayinka', last_name: 'Adebayo', email: 'a@x.com', phone: '+441', send_currency: 'GBP', kyc_status: 'PASSED', device_id: 'dev-a' });
    const ref = await request(app).post('/api/referral/referrals').send({
        code: a.body.data.referral_code,
        referee: { id: 'B', first_name: 'Sarah', last_name: 'Smith', email: 'b@x.com', phone: '+442', send_currency: 'GBP', receive_currency: 'NGN', kyc_status: 'PASSED', device_id: 'dev-b' },
    });
    return ref.body.data;
}
const transfer = (app, status) => request(app).post('/api/referral/transfer-events').send({ transfer_id: 'T1', customer_id: 'B', amount: 60, currency: 'GBP', receive_currency: 'NGN', status });

beforeEach(() => setNow('2026-10-01T10:00:00Z'));

describe('rewardWallet is required', () => {
    it('fails at start-up with a clear message when it is not wired', () => {
        const db = new sqlite3.Database(':memory:');
        expect(() => registerReferralRoutes(express(), db, {})).toThrow(/rewardWallet port is required/);
        expect(() => registerReferralRoutes(express(), db, { rewardWallet: { issueCredit() {} } })).toThrow(/voidCredit, creditSummary/);
    });

    it('the module reads no wallet tables and imports nothing from the bonus module (BR-50)', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'referral.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'referral', 'ports.js'), 'utf8');
        const code = src.replace(/\/\/.*$/gm, '');
        expect(code).not.toMatch(/credit_ledger/);
        expect(code).not.toMatch(/require\(['"]\.\/bonus/);
        expect(code).not.toMatch(/require\(['"]\.\/(promo|support)/);
    });
});

describe('issuing (BR-36, BR-50)', () => {
    it('issues each reward through the port with its source, links and idempotency key, and keeps the credit ids', async () => {
        const app = makeApp();
        const ref = await seed(app);
        await transfer(app, 'PAID');
        const done = await transfer(app, 'COMPLETED');
        expect(done.body.referral.status).toBe('REWARDED');
        const { issue, issued } = app.locals.calls;
        expect(issue).toHaveLength(2);
        expect(issue[0]).toMatchObject({ customerId: 'A', amount: 5, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFERRER', referralId: ref.id, referenceId: `${ref.id}:referrer`, validityDays: 90 });
        expect(issue[1]).toMatchObject({ customerId: 'B', amount: 10, creditSource: 'REFERRAL', creditSourceDetail: 'REFEREE', referenceId: `${ref.id}:referee` });
        expect(issue[0].notes).toBe('Referrer reward – referred Sarah S.');
        expect(done.body.referral.referrer_credit_id).toBeTruthy();
        expect(done.body.referral.referee_credit_id).toBeTruthy();
        expect(issued).toHaveLength(1);
        // The credit is in the one balance, tagged with how it was earned
        const w = await request(app).get('/api/wallet/A?currency=GBP');
        expect(w.body.unused[0]).toMatchObject({ credit_source: 'REFERRAL', credit_source_detail: 'REFERRER' });
    });

    it('a reward the wallet cannot issue leaves the referral Pending, and the daily job retries it without paying twice (BR-51)', async () => {
        let fail = true;
        const real = referralHost.referralPorts().rewardWallet;
        const app = makeApp({ issueCredit: async (i) => { if (fail && i.customerId === 'B') throw new Error('wallet down'); return real.issueCredit(i); } });
        const ref = await seed(app);
        await transfer(app, 'PAID');
        const first = await transfer(app, 'COMPLETED');
        expect(first.body.referral).toMatchObject({ status: 'PENDING', status_reason: 'Reward could not be issued – will retry' });
        expect(first.body.referral.referrer_credited).toBe(0);

        fail = false;
        const jobs = await request(app).post('/api/referral/run-jobs');
        expect(jobs.body).toMatchObject({ rewards_retried: 1 });
        const track = await request(app).get('/api/referral/referrals?referrer_id=A');
        expect(track.body.data[0].status).toBe('REWARDED');
        // The referrer's credit was issued on the first try and is not duplicated
        const a = await request(app).get('/api/wallet/A?currency=GBP');
        expect(a.body.balances[0].available).toBe(5);
        const b = await request(app).get('/api/wallet/B?currency=GBP');
        expect(b.body.balances[0].available).toBe(10);
        expect(ref.id).toBeTruthy();
    });
});

describe('reversal (BR-41, BR-42)', () => {
    it('voids the referral credits with clawback off and tells the host about the spent part', async () => {
        const app = makeApp();
        const ref = await seed(app);
        await transfer(app, 'PAID');
        await transfer(app, 'COMPLETED');
        await request(app).post('/api/wallet/A/apply').send({ amount: 3, currency: 'GBP', transfer_id: 'TA1', send_amount: 100 }).expect(200);
        const rev = await transfer(app, 'REFUNDED');
        expect(rev.body.referral.status).toBe('REVERSED');
        const { void: voids, spent, strikes } = app.locals.calls;
        expect(voids).toHaveLength(2);
        expect(voids[0].opts).toMatchObject({ reason: 'REFERRAL_REVERSAL', clawback: false, eventId: 'T1' });
        expect(spent).toEqual([expect.objectContaining({ customerId: 'A', currency: 'GBP', amount: 3, referralId: ref.id, transferId: 'T1' })]);
        // The host recorded the debt, and the strike counts what was lost (2 unused + 3 spent from A, 10 unused from B)
        const a = await request(app).get('/api/wallet/A?currency=GBP');
        expect(a.body.balances[0].outstanding_debt).toBe(3);
        expect(strikes[0]).toMatchObject({ customerId: 'B', kind: 'REFERRAL', amountLost: 15, currency: 'GBP' });
    });

    it('does nothing for a spent part when the host plugs in no debt handling', async () => {
        const db = new sqlite3.Database(':memory:');
        const app = express();
        app.use(express.json());
        const { ready } = bonus.register(app, db, {}, { seed: false });
        const { rewardWallet } = referralHost.referralPorts();
        registerReferralRoutes(app, db, { dependsOn: ready, rewardWallet });
        await seed(app);
        await transfer(app, 'PAID');
        await transfer(app, 'COMPLETED');
        await request(app).post('/api/wallet/A/apply').send({ amount: 3, currency: 'GBP', transfer_id: 'TA1', send_amount: 100 }).expect(200);
        expect((await transfer(app, 'REFUNDED')).body.referral.status).toBe('REVERSED');
        expect((await request(app).get('/api/wallet/A?currency=GBP')).body.balances[0].outstanding_debt).toBe(0);
    });
});

describe('report (BR-53)', () => {
    it('takes issued, used and unused bonus from rewardWallet.creditSummary', async () => {
        const app = makeApp();
        const ref = await seed(app);
        await transfer(app, 'PAID');
        await transfer(app, 'COMPLETED');
        await request(app).post('/api/wallet/B/apply').send({ amount: 4, currency: 'GBP', transfer_id: 'TB1', send_amount: 100 }).expect(200);
        const perf = await request(app).get('/api/referral/performance');
        const row = perf.body.data[0];
        expect(row).toMatchObject({ bonus_issued: 15, bonus_used: 4, bonus_expired: 0, bonus_unused: 11 });
        expect(app.locals.calls.summary.at(-1)).toEqual({ referralIds: [ref.id] });
    });
});

describe('Referral transfer-events no longer drives other modules', () => {
    it('answers with the referral result only (no bonuses field)', async () => {
        const app = makeApp();
        const res = await request(app).post('/api/referral/transfer-events').send({ transfer_id: 'NOHOOK-1', customer_id: 'NOBODY', amount: 100, currency: 'GBP', status: 'COMPLETED' });
        expect(res.status).toBe(200);
        expect(res.body.bonuses).toBeUndefined();
    });
});
