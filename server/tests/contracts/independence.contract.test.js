// INDEPENDENCE contract: Promo, Bonus and Referral are separate modules. They share one customer bonus balance (owned by Bonus)
// and meet only in the host (server/server.js + server/referralHost.js) through ports. Each receives transfer events on its OWN endpoint.
const fs = require('fs');
const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3');
const request = require('supertest');
const { rule, bootApp, waitForSeed } = require('./_contract');

const app = bootApp('independence');
const bonus = require('../../bonus');
const referral = require('../../referral');
const referralHost = require('../../referralHost');
const bonusTime = require('../../bonus/time');

const SERVER_DIR = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(SERVER_DIR, rel), 'utf8');
// Code only: drop comments and string-free noise so a comment that mentions another module is not a dependency
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
const requires = (src) => [...codeOf(src).matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
const jsFiles = (dir) => fs.readdirSync(path.join(SERVER_DIR, dir)).filter((f) => f.endsWith('.js')).map((f) => `${dir}/${f}`);

let seq = 0;
const cust = (p = 'IC') => `${p}-${Date.now().toString(36)}-${seq++}`;
const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    const db = new sqlite3.Database(path.join(process.cwd(), 'database.sqlite'), sqlite3.OPEN_READONLY);
    db.all(sql, params, (err, rows) => { db.close(); return err ? reject(err) : resolve(rows); });
});
const countIn = async (table, transferId) => (await dbAll(`SELECT COUNT(*) AS c FROM ${table} WHERE transfer_id = ?`, [transferId]))[0].c;

beforeAll(async () => { await waitForSeed(app, request); });
beforeEach(async () => {
    const all = (await request(app).get('/api/bonus-schemes')).body.data;
    for (const s of all.filter((x) => x.status === 'ACTIVE')) await request(app).patch(`/api/bonus-schemes/${s.id}/status`).send({ status: 'INACTIVE' });
});
afterEach(() => { bonusTime.clock.now = () => new Date(); referral.clock.now = () => new Date(); });

const walletOf = async (id, currency = 'GBP') => (await request(app).get(`/api/wallet/${id}?currency=${currency}`)).body;
const makeScheme = async (over = {}) => (await request(app).post('/api/bonus-schemes').send({
    name: `Indep ${Date.now()}-${seq++}`, bonus_type: 'TRANSACTION_THRESHOLD_CREDIT', credit_amount: 5, currency: 'GBP', min_transaction_threshold: 0,
    eligibility_rules: { oneTimeOnly: false }, start_date: '2024-01-01', end_date: '2099-12-31', ...over,
})).body.id;
const makePromo = async () => {
    const code = `IND${Date.now().toString(36).toUpperCase()}${seq++}`.slice(0, 20);
    const res = await request(app).post('/api/promocodes').send({ code, type: 'Fixed', value: 1, currency: 'GBP', min_threshold: 0, usage_limit_per_user: -1, start_date: iso(-1), end_date: iso(30) });
    expect(res.status).toBe(200);
    return code;
};
const ev = (id, customer, status, extra = {}) => ({ transfer_id: id, customer_id: customer, amount: 100, currency: 'GBP', receive_currency: 'NGN', status, created_at: new Date().toISOString(), ...extra });

describe('One bonus balance, three tagged sources', () => {
    rule('INDEP-01', 'Scheme, referral and manual credits are ONE balance per currency, and every credit is tagged REFERRAL, SCHEME or MANUAL', {
        why: 'Decision D13: the customer sees and spends one bonus balance, while finance reports cost per source. An untagged credit or a second balance breaks one of those two promises.',
        fix: 'All credits are EARNED rows in credit_ledger written by bonus/wallet.js insertEarned() with credit_source in SOURCES (REFERRAL, SCHEME, MANUAL). Schemes use engine.awardScheme -> issueCredit; manual grants use manualAdjust -> issueCredit; the referral module calls the same issueCredit through its rewardWallet port.',
        where: ['server/bonus/wallet.js', 'server/bonus/engine.js', 'server/referralHost.js'],
    })(async () => {
        await makeScheme({ credit_amount: 10 });
        const c = cust();
        await request(app).post('/api/bonus/transfer-events').send(ev(cust('T'), c, 'COMPLETED')).expect(200);
        await request(app).post('/api/credits/manual').send({ user_id: c, amount: 3, type: 'EARNED', reason_code: 'GOODWILL', notes: 'Sorry about the delayed transfer', currency: 'GBP' }).expect(200);
        await bonus.issueCredit({ customerId: c, amount: 5, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFEREE', referenceId: `${c}:referee`, notes: 'Referee reward – invited by Ada O.' });
        const w = await walletOf(c);
        expect(w.balances).toHaveLength(1);
        expect(w.balances[0].available).toBe(18);
        expect(w.balances[0].by_source.map((g) => g.credit_source).sort()).toEqual(['MANUAL', 'REFERRAL', 'SCHEME']);
        // every credit in the whole ledger carries one of the three tags
        const rows = (await request(app).get('/api/credits/all')).body.history.filter((h) => h.type === 'EARNED' && h.source_type === 'BONUS');
        expect(rows.length).toBeGreaterThan(0);
        for (const r of rows) expect(['REFERRAL', 'SCHEME', 'MANUAL']).toContain(r.credit_source);
        // the referral module has no wallet of its own
        const ledgers = await dbAll(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%credit%'`);
        expect(ledgers.map((l) => l.name)).toEqual(['credit_ledger']);
    });

    rule('INDEP-02', 'A promo discount is never wallet credit, and spending bonus never uses up a promo code', {
        why: 'A promo reduces the fee on one transfer; bonus is stored credit. Mixing them double-counts cost and breaks the promo per-customer limits.',
        fix: 'The promo module writes only promo_* tables and never calls the wallet; wallet.applyBonus() writes only credit_ledger. The wallet lists promo redemptions read-only (promo_redemptions) through the promoRedemptions port.',
        where: ['server/promo/engine.js', 'server/bonus/wallet.js', 'server/server.js'],
    })(async () => {
        const code = await makePromo();
        const c = cust();
        await request(app).post('/api/promocodes/redeem').send({ code, transactionId: cust('TX'), userId: c, amount: 100, fee: 3, currency: 'GBP', sourceCurrency: 'GBP', destCurrency: 'NGN' }).expect(200);
        const w = await walletOf(c);
        expect(w.balances).toEqual([]); // no credit appeared
        expect(w.promo_redemptions).toHaveLength(1); // shown for information only
        await request(app).post('/api/credits/manual').send({ user_id: c, amount: 4, type: 'EARNED', reason_code: 'GOODWILL', notes: 'Goodwill for the delay', currency: 'GBP' }).expect(200);
        await request(app).post(`/api/wallet/${c}/apply`).send({ amount: 4, currency: 'GBP', transfer_id: cust('TX'), send_amount: 100 }).expect(200);
        const promo = (await request(app).get('/api/promocodes')).body.data.find((p) => p.code === code);
        expect(promo.usage_count).toBe(1);
    });
});

describe('Modules meet only through ports in the host', () => {
    rule('INDEP-03', 'Promo and Bonus code never import another module; Referral imports nothing from Bonus or Promo', {
        why: 'Each module must be removable or replaceable without touching the others. A direct require creates a hidden dependency that the ports exist to prevent.',
        fix: 'Keep cross-module calls in the host: server/server.js passes ports to promo.register / bonus.register, and server/referralHost.js is the only file that knows both bonus and referral. If you need data from another module, add a port (promo/ports.js, bonus/ports.js, referral/ports.js) and wire it in the host.',
        where: ['server/promo/', 'server/bonus/', 'server/referral.js', 'server/referral/ports.js', 'server/referralHost.js'],
    })(async () => {
        const offences = [];
        const check = (files, banned) => {
            for (const f of files) {
                for (const spec of requires(read(f))) {
                    const target = path.normalize(path.join(path.dirname(f), spec)).replace(/\\/g, '/');
                    if (banned.some((b) => target === b || target.startsWith(`${b}/`))) offences.push(`${f} requires ${spec}`);
                }
            }
        };
        check(jsFiles('promo'), ['bonus', 'bonusEngine', 'bonusBlocks', 'bonusDebt', 'referral', 'referral.js', 'referralHost', 'referralHost.js', 'support']);
        check(jsFiles('bonus'), ['promo', 'promoEngine', 'referral', 'referral.js', 'referralHost', 'referralHost.js', 'support']);
        check(['referral.js', ...jsFiles('referral')], ['bonus', 'bonusEngine', 'bonusBlocks', 'bonusDebt', 'promo', 'promoEngine', 'referralHost', 'referralHost.js', 'support']);
        expect(offences).toEqual([]);

        // The referral module does not read the wallet's tables either
        const referralCode = codeOf(read('referral.js') + read('referral/ports.js'));
        expect(referralCode).not.toMatch(/credit_ledger|bonus_schemes|bonus_blocks|promo_(codes|redemptions)/);
        // Only the one-off backfills in schema.js may read another module's tables, and never from request handling
        for (const f of [...jsFiles('promo'), ...jsFiles('bonus')].filter((x) => !x.endsWith('schema.js'))) {
            expect([f, codeOf(read(f)).match(/\b(referrals|referral_rules|referral_transfers)\b/g)]).toEqual([f, null]);
        }
    });

    rule('INDEP-04', 'The host wiring is exactly the referral ports: rewardWallet (issueCredit, voidCredit, creditSummary), eligibilityGuard, onSpentCreditReversed', {
        why: 'These ports are the whole contract between Referral and Bonus. Adding a new reach-through (a table read, a deep import) hides a dependency; removing one silently disables rewards or abuse protection.',
        fix: 'server/referralHost.js referralPorts() maps rewardWallet -> bonus.issueCredit/voidCredit/creditSummary, eligibilityGuard -> bonus.isEarningBlocked/recordStrike, onSpentCreditReversed -> bonus.clawbackCredit. server.js passes it to registerReferralRoutes(app, db, { ...referralPorts(), dependsOn }).',
        where: ['server/referralHost.js', 'server/server.js'],
    })(async () => {
        const ports = referralHost.referralPorts();
        expect(Object.keys(ports).sort()).toEqual(['eligibilityGuard', 'onSpentCreditReversed', 'rewardWallet']);
        expect(Object.keys(ports.rewardWallet).sort()).toEqual(['creditSummary', 'issueCredit', 'voidCredit']);
        expect(Object.keys(ports.eligibilityGuard).sort()).toEqual(['isEarningBlocked', 'recordStrike']);
        for (const fn of [...Object.values(ports.rewardWallet), ...Object.values(ports.eligibilityGuard), ports.onSpentCreditReversed]) expect(typeof fn).toBe('function');
        // And server.js really uses them
        const serverCode = codeOf(read('server.js'));
        expect(serverCode).toMatch(/registerReferralRoutes\(app, db, \{[\s\S]*referralHost\.referralPorts\(\)/);
        expect(serverCode).toMatch(/promo\.register\(app, db,/);
        expect(serverCode).toMatch(/bonus\.register\(app, db,/);
    });

    rule('INDEP-05', 'The referral module refuses to start without a rewardWallet port', {
        why: 'Without a wallet every reward would fail at the first real referral. It is better to fail at start-up, loudly, than on a customer\'s first reward.',
        fix: 'registerReferralRoutes() calls resolvePorts(hooks) in referral/ports.js, which throws "the rewardWallet port is required (missing ...)" unless rewardWallet has issueCredit, voidCredit and creditSummary. Every other port has a harmless default.',
        where: ['server/referral/ports.js', 'server/referral.js'],
    })(async () => {
        const db = new sqlite3.Database(':memory:');
        expect(() => referral.registerReferralRoutes(express(), db, {})).toThrow(/rewardWallet port is required/);
        expect(() => referral.registerReferralRoutes(express(), db, { eligibilityGuard: {} })).toThrow(/rewardWallet port is required/);
        expect(() => referral.registerReferralRoutes(express(), db, { rewardWallet: { issueCredit() {} } })).toThrow(/voidCredit, creditSummary/);
        db.close();
    });
});

describe('Each module hears transfer events on its own endpoint', () => {
    rule('INDEP-06', 'POST /api/referral/transfer-events touches only the referral module and returns no bonus results', {
        why: 'Rhemito posts each transfer event three times, once per module. If the referral endpoint also ran bonus or promo logic, every transfer would be processed twice (double bonus, double release).',
        fix: 'The referral handler calls only handleTransferEvent() (referral_transfers + referrals) and responds { referral }. Bonus awards/reversals live on /api/bonus/transfer-events and promo release on /api/promocodes/transfer-events.',
        where: ['server/referral.js', 'server/bonus/service.js', 'server/promo/service.js'],
    })(async () => {
        const s = await makeScheme({ credit_amount: 5 });
        const code = await makePromo();
        const c = cust();
        const t = cust('T');
        await request(app).post('/api/promocodes/redeem').send({ code, transactionId: t, userId: c, amount: 100, fee: 3, currency: 'GBP', sourceCurrency: 'GBP', destCurrency: 'NGN' }).expect(200);

        const done = await request(app).post('/api/referral/transfer-events').send(ev(t, c, 'COMPLETED'));
        expect(done.status).toBe(200);
        expect(done.body).not.toHaveProperty('bonuses');
        expect(done.body).not.toHaveProperty('awards');
        expect(done.body).not.toHaveProperty('reversed');
        expect(await countIn('referral_transfers', t)).toBe(1);
        expect(await countIn('bonus_transfers', t)).toBe(0);
        expect(await countIn('promo_transfers', t)).toBe(0);
        expect(await walletOf(c)).toMatchObject({ balances: [] }); // the active scheme did not pay

        const cancelled = await request(app).post('/api/referral/transfer-events').send(ev(t, c, 'CANCELLED'));
        expect(cancelled.body).not.toHaveProperty('bonuses');
        const promo = (await request(app).get('/api/promocodes')).body.data.find((p) => p.code === code);
        expect(promo.usage_count).toBe(1); // the promo use was NOT released by the referral endpoint
        void s;
    });

    rule('INDEP-07', 'POST /api/bonus/transfer-events touches only the bonus module; POST /api/promocodes/transfer-events only the promo module', {
        why: 'Same reason as INDEP-06 from the other side: one event, one owner per module. Each module keeps its own copy of the customer\'s transfer history (promo_transfers, bonus_transfers, referral_transfers).',
        fix: 'bonus/service.js -> engine.handleTransferEvent (bonus_transfers, awards, returned, reversed). promo/service.js -> engine.handleTransferEvent (promo_transfers, release). Neither calls the other nor the referral module.',
        where: ['server/bonus/service.js', 'server/promo/service.js'],
    })(async () => {
        const s = await makeScheme({ credit_amount: 5 });
        const code = await makePromo();
        const c = cust();
        const t = cust('T');
        await request(app).post('/api/promocodes/redeem').send({ code, transactionId: t, userId: c, amount: 100, fee: 3, currency: 'GBP', sourceCurrency: 'GBP', destCurrency: 'NGN' }).expect(200);

        // the bonus endpoint pays the scheme and does not release the promo
        const bonusRes = await request(app).post('/api/bonus/transfer-events').send(ev(t, c, 'COMPLETED'));
        expect(bonusRes.body.awards.find((a) => a.scheme_id === s)).toMatchObject({ status: 'AWARDED' });
        expect(await countIn('bonus_transfers', t)).toBe(1);
        expect(await countIn('promo_transfers', t)).toBe(0);
        expect(await countIn('referral_transfers', t)).toBe(0);
        const bonusCancel = await request(app).post('/api/bonus/transfer-events').send(ev(t, c, 'CANCELLED'));
        expect(bonusCancel.body.reversed.length).toBe(1);
        expect((await request(app).get('/api/promocodes')).body.data.find((p) => p.code === code).usage_count).toBe(1);

        // the promo endpoint releases the promo use and pays/reverses no bonus
        const t2 = cust('T');
        await request(app).post('/api/promocodes/redeem').send({ code, transactionId: t2, userId: c, amount: 100, fee: 3, currency: 'GBP', sourceCurrency: 'GBP', destCurrency: 'NGN' }).expect(200);
        const promoRes = await request(app).post('/api/promocodes/transfer-events').send(ev(t2, c, 'COMPLETED'));
        expect(promoRes.status).toBe(200);
        expect(promoRes.body).not.toHaveProperty('awards');
        expect((await walletOf(c)).balances[0] || { available: 0 }).toMatchObject({ available: 0 }); // first award was reversed, no new one
        const promoCancel = await request(app).post('/api/promocodes/transfer-events').send(ev(t2, c, 'CANCELLED'));
        expect(promoCancel.body.released).toBe(1);
        expect(await countIn('promo_transfers', t2)).toBe(1);
        expect(await countIn('bonus_transfers', t2)).toBe(0);
        expect(await countIn('referral_transfers', t2)).toBe(0);
    });
});

describe('Credit lifecycle belongs to the bonus module for every source', () => {
    rule('INDEP-08', 'Expiry of ANY credit, including referral rewards, is done by the bonus daily job; the referral job never expires credit', {
        why: 'Two expiry jobs would race on the same ledger. The bonus job is the single expiry owner (BS-65) so a referral credit expires exactly once.',
        fix: 'bonus/jobs.js runJobs -> wallet.expireDue handles every credit_source. referral.js runJobs only expires referrals, retries rewards and sends offer-ending notices, and returns { referrals_expired, rewards_retried, ending_notifications }.',
        where: ['server/bonus/jobs.js', 'server/bonus/wallet.js', 'server/referral.js'],
    })(async () => {
        const t0 = '2033-06-01T10:00:00Z';
        bonusTime.clock.now = () => new Date(t0);
        referral.clock.now = () => new Date(t0);
        const c = cust();
        await bonus.issueCredit({ customerId: c, amount: 5, currency: 'GBP', validityDays: 1, creditSource: 'REFERRAL', creditSourceDetail: 'REFERRER', referenceId: `${c}:referrer`, notes: 'Referrer reward – referred Sam S.' });
        bonusTime.clock.now = () => new Date('2033-06-10T10:00:00Z');
        referral.clock.now = () => new Date('2033-06-10T10:00:00Z');
        const refJobs = await request(app).post('/api/referral/run-jobs');
        expect(Object.keys(refJobs.body).sort()).toEqual(['ending_notifications', 'referrals_expired', 'rewards_retried']);
        const before = (await walletOf(c)).history.filter((h) => h.type === 'EXPIRED');
        expect(before).toEqual([]);
        const jobs = await request(app).post('/api/bonus/run-jobs');
        expect(jobs.body.credits_expired).toBeGreaterThanOrEqual(1);
        const after = (await walletOf(c)).history.filter((h) => h.type === 'EXPIRED');
        expect(after).toHaveLength(1);
        expect(after[0]).toMatchObject({ amount: -5, credit_source: 'REFERRAL' });
    });

    rule('INDEP-09', 'Reversing a referral reward uses the bonus wallet\'s void and debt rules, and the bonus feed stays silent for referral credits', {
        why: 'Referral credit is ordinary wallet credit once issued. The same void/clawback logic applies, and the referral module alone tells the customer (one notification, not two).',
        fix: 'referral voidReferralCredits() -> rewardWallet.voidCredit (bonus/wallet.js voidCredit) and onSpentCreditReversed -> bonus.clawbackCredit; wallet.issueCredit() emits BONUS_EARNED only when creditSource !== "REFERRAL".',
        where: ['server/referral.js', 'server/referralHost.js', 'server/bonus/wallet.js'],
    })(async () => {
        const c = cust();
        const out = await bonus.issueCredit({ customerId: c, amount: 5, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFEREE', referenceId: `${c}:referee`, notes: 'Referee reward – invited by Ada O.' });
        expect((await request(app).get(`/api/bonus/feed?customer_id=${c}`)).body.data).toEqual([]);
        await request(app).post(`/api/wallet/${c}/apply`).send({ amount: 2, currency: 'GBP', transfer_id: cust('TX'), send_amount: 50 }).expect(200);
        const res = await referralHost.referralPorts().rewardWallet.voidCredit(out.creditId, { reason: 'REFERRAL_REVERSAL', eventId: 'EV-1', clawback: false });
        expect(res).toMatchObject({ voided: 3, spent: 2, clawed_back: 0 });
        const owed = await referralHost.referralPorts().onSpentCreditReversed({ creditId: out.creditId, transferId: 'EV-1' });
        expect(owed).toBe(2);
        expect((await walletOf(c)).balances[0]).toMatchObject({ available: 0, outstanding_debt: 2 });
    });
});
