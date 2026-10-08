// REFERRAL contract: the rules the Referral module (server/referral.js, wired by server/referralHost.js) is implemented to.
// Runs against the real app, so the rewardWallet port really is the bonus module's wallet.
const path = require('path');
const sqlite3 = require('sqlite3');
const request = require('supertest');
const { rule, bootApp, waitForSeed } = require('./_contract');

const app = bootApp('referral');
const bonus = require('../../bonus');
const referral = require('../../referral');
const bonusTime = require('../../bonus/time');

const GM = 'Bearer gm-token';
let seq = 0;
const n = () => ++seq;
// Each rule gets its own corridor (send -> receive) so rules never collide; GBP/USD/NGN corridors are the seeded ones
const POOL = ['EUR', 'CAD', 'AUD', 'CNY', 'INR', 'ZAR', 'KES', 'GHS', 'AED'];
const PAIRS = POOL.flatMap((a) => POOL.filter((b) => b !== a).map((b) => [a, b]));
let cseq = 0;
const corridor = () => PAIRS[cseq++ % PAIRS.length];

const setNow = (iso) => { referral.clock.now = () => new Date(iso); bonusTime.clock.now = () => new Date(iso); };
const realNow = () => { referral.clock.now = () => new Date(); bonusTime.clock.now = () => new Date(); };

beforeAll(async () => { await waitForSeed(app, request); });
beforeEach(() => setNow('2030-01-01T10:00:00Z'));
afterEach(() => { realNow(); jest.restoreAllMocks(); });

const mkRule = async (over = {}) => {
    const [send, receive] = over.corridor || corridor();
    const body = {
        name: `Contract Rule ${n()}`, reward_type: 'BOTH', base_currency: send, receive_currency: receive, referrer_reward: 5, referee_reward: 10,
        min_transaction_threshold: 50, qualification_window_days: 30, bonus_validity_days: 90, ...over,
    };
    delete body.corridor;
    const res = await request(app).post('/api/referral-rules').send(body);
    if (res.status !== 201) throw new Error(`test setup: rule refused: ${JSON.stringify(res.body)}`);
    return { id: res.body.id, send: body.base_currency, receive: body.receive_currency, body };
};
const mkCustomer = async (send, over = {}) => {
    const i = n();
    const res = await request(app).post('/api/referral/customers').send({
        id: `RC-${Date.now().toString(36)}-${i}`, first_name: 'Olayinka', last_name: 'Adebayo', email: `rc${i}-${Date.now()}@example.com`, phone: `+44770${String(1000000 + i)}`,
        send_currency: send, kyc_status: 'PASSED', device_id: `dev-${Date.now()}-${i}`, ...over,
    });
    return res.body.data;
};
const register = (code, referee) => request(app).post('/api/referral/referrals').send({ code, referee });
// A full referral: rule, referrer, and a registered referee
const world = async (ruleOver = {}, { referee = {}, referrer = {} } = {}) => {
    const r = await mkRule(ruleOver);
    const a = await mkCustomer(r.send, referrer);
    const bId = `RB-${Date.now().toString(36)}-${n()}`;
    const reg = await register(a.referral_code, {
        id: bId, first_name: 'Sarah', last_name: 'Smith', email: `${bId}@example.com`, phone: `+44771${String(1000000 + seq)}`,
        send_currency: r.send, receive_currency: r.receive, kyc_status: 'PASSED', device_id: `dev-${bId}`, ...referee,
    });
    return { rule: r, referrer: a, refereeId: bId, referral: reg.body.data, code: a.referral_code };
};
let tseq = 0;
const send = (w, status, over = {}) => request(app).post('/api/referral/transfer-events').send({
    transfer_id: `RT-${Date.now().toString(36)}-${tseq}`, customer_id: w.refereeId, amount: w.rule.body.min_transaction_threshold + 10, currency: w.rule.send,
    receive_currency: w.rule.receive, status, created_at: referral.clock.now().toISOString(), ...over,
});
// qualify (PAID) then complete one transfer
const qualifyAndComplete = async (w, over = {}) => {
    const id = over.transfer_id || `RT-${Date.now().toString(36)}-${tseq++}`;
    await send(w, 'PAID', { ...over, transfer_id: id });
    return (await send(w, 'COMPLETED', { ...over, transfer_id: id })).body.referral;
};
const available = async (id, currency) => {
    const b = (await request(app).get(`/api/wallet/${id}?currency=${currency}`)).body.balances[0];
    return b ? b.available : 0;
};
const walletOf = async (id, currency) => (await request(app).get(`/api/wallet/${id}?currency=${currency}`)).body;
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    const db = new sqlite3.Database(path.join(process.cwd(), 'database.sqlite'));
    db.run(sql, params, (err) => { db.close(); return err ? reject(err) : resolve(); });
});
const tracked = async (qs) => (await request(app).get(`/api/referral/tracking?${qs}`)).body;

const FILE = 'server/referral.js';

describe('Rules: which rule applies and who it pays', () => {
    rule('REFERRAL-01', 'The rule is matched by send currency and receive currency; a corridor rule beats an any-destination rule', {
        why: 'Programmes are funded per corridor. A GBP->GHS referral must not be paid by the GBP->NGN budget, and a send-currency-only rule is the fallback for every other destination.',
        fix: 'liveRuleFor() picks the live rule whose receive_currency equals the referee\'s, otherwise the live rule with no receive_currency. One non-archived rule per corridor (DUPLICATE_CORRIDOR, 409).',
        where: [FILE],
    })(async () => {
        const [send, a] = corridor();
        const b = POOL.find((c) => c !== send && c !== a);
        const any = await mkRule({ corridor: [send, ''], name: `Any dest ${n()}`, referrer_reward: 1, referee_reward: 2 });
        const specific = await mkRule({ corridor: [send, a], referrer_reward: 7, referee_reward: 8 });
        const dup = await request(app).post('/api/referral-rules').send({ ...specific.body, name: `Dup ${n()}` });
        expect(dup.status).toBe(409);
        expect(dup.body.error).toBe('DUPLICATE_CORRIDOR');

        const referrer = await mkCustomer(send);
        const regTo = async (receive) => (await register(referrer.referral_code, {
            id: `RM-${n()}-${Date.now()}`, first_name: 'Mo', email: `m${seq}-${Date.now()}@example.com`, phone: `+44772${String(1000000 + seq)}`, send_currency: send, receive_currency: receive, kyc_status: 'PASSED', device_id: `d${seq}-${Date.now()}`,
        })).body.data;
        expect((await regTo(a)).rule_id).toBe(specific.id);
        expect((await regTo(b)).rule_id).toBe(any.id);
    });

    rule('REFERRAL-02', 'A referee whose send currency has no live rule is NOT_ELIGIBLE and never paid', {
        why: 'No programme means no budget. The referral is kept for reporting but nothing may be credited, even after a big completed transfer.',
        fix: 'createReferral() sets status NOT_ELIGIBLE with reason "No active referral programme for <corridor>" when no live rule matches; only REGISTERED referrals can become PENDING.',
        where: [FILE],
    })(async () => {
        const w = await world({}, { referee: { send_currency: 'JPY', receive_currency: 'KES' } });
        expect(w.referral).toMatchObject({ status: 'NOT_ELIGIBLE', rule_id: null });
        expect(w.referral.status_reason).toMatch(/No active referral programme/);
        const after = await qualifyAndComplete({ ...w, rule: { ...w.rule, send: 'JPY', receive: 'KES', body: { min_transaction_threshold: 50 } } });
        expect(after.status).toBe('NOT_ELIGIBLE');
        expect(await available(w.refereeId, 'JPY')).toBe(0);
    });

    rule('REFERRAL-03', 'reward_type decides who is paid: REFERRER pays only the referrer, REFEREE only the referee, BOTH pays both', {
        why: 'Marketing chooses who gets the incentive per corridor. Paying the other party burns budget the rule never allowed (regression: referee was credited on REFERRER rules).',
        fix: 'validateRule() zeroes the unrewarded side; tryAward() sets rewardsReferrer = reward_type !== "REFEREE" and rewardsReferee = reward_type !== "REFERRER" and only calls addCredit for those.',
        where: [FILE],
    })(async () => {
        const cases = [['REFERRER', 5, 0], ['REFEREE', 0, 10], ['BOTH', 5, 10]];
        for (const [type, wantReferrer, wantReferee] of cases) {
            const w = await world({ reward_type: type, referrer_reward: type === 'REFEREE' ? 0 : 5, referee_reward: type === 'REFERRER' ? 0 : 10 });
            const done = await qualifyAndComplete(w);
            expect(done.status).toBe('REWARDED');
            expect(done.referrer_credited).toBe(wantReferrer);
            expect(done.referee_credited).toBe(wantReferee);
            expect(await available(w.referrer.id, w.rule.send)).toBe(wantReferrer);
            expect(await available(w.refereeId, w.rule.send)).toBe(wantReferee);
        }
        // The type itself is checked at award time, not only the amounts: a REFERRER snapshot that somehow carries a referee amount still pays no referee
        const w = await world({ reward_type: 'REFERRER', referee_reward: 0 });
        await dbRun('UPDATE referrals SET referee_reward = 10 WHERE id = ?', [w.referral.id]);
        const done = await qualifyAndComplete(w);
        expect(done).toMatchObject({ status: 'REWARDED', referrer_credited: 5, referee_credited: 0 });
        expect(await available(w.refereeId, w.rule.send)).toBe(0);
        const w2 = await world({ reward_type: 'REFEREE', referrer_reward: 0 });
        await dbRun('UPDATE referrals SET referrer_reward = 5 WHERE id = ?', [w2.referral.id]);
        expect(await qualifyAndComplete(w2)).toMatchObject({ referrer_credited: 0, referee_credited: 10 });
        expect(await available(w2.referrer.id, w2.rule.send)).toBe(0);
    });

    rule('REFERRAL-04', 'A rule form cannot save an inconsistent reward: the paid side needs an amount > 0, the unpaid side is stored as 0', {
        why: 'An unrewarded party must never carry a non-zero amount, and a rewarded party with no amount would create empty promises.',
        fix: 'validateRule(): referrer_reward is required unless reward_type is REFEREE; referee_reward unless REFERRER; clean values zero the unpaid side. Unknown reward_type is refused.',
        where: [FILE],
    })(async () => {
        const [s, r] = corridor();
        const base = { name: `Form ${n()}`, base_currency: s, receive_currency: r, min_transaction_threshold: 50 };
        const noReferee = await request(app).post('/api/referral-rules').send({ ...base, reward_type: 'REFEREE', referee_reward: 0 });
        expect(noReferee.status).toBe(400);
        expect(noReferee.body.fields).toHaveProperty('referee_reward');
        const noReferrer = await request(app).post('/api/referral-rules').send({ ...base, name: `Form ${n()}`, reward_type: 'REFERRER', referrer_reward: '' });
        expect(noReferrer.status).toBe(400);
        expect(noReferrer.body.fields).toHaveProperty('referrer_reward');
        expect((await request(app).post('/api/referral-rules').send({ ...base, name: `Form ${n()}`, reward_type: 'EVERYONE', referrer_reward: 1, referee_reward: 1 })).body.fields).toHaveProperty('reward_type');
        const ok = await request(app).post('/api/referral-rules').send({ ...base, name: `Form ${n()}`, reward_type: 'REFEREE', referrer_reward: 99, referee_reward: 10 });
        expect(ok.status).toBe(201);
        expect(ok.body.data).toMatchObject({ reward_type: 'REFEREE', referrer_reward: 0, referee_reward: 10 });
        const same = await request(app).post('/api/referral-rules').send({ ...base, name: `Form ${n()}`, receive_currency: s, reward_type: 'BOTH', referrer_reward: 1, referee_reward: 1 });
        expect(same.body.fields).toHaveProperty('receive_currency'); // corridor needs two different currencies
    });

    rule('REFERRAL-05', 'Rules are archived, never deleted, and an archived rule is read-only', {
        why: 'Referrals, credits and reports point at rules; deleting one would orphan history (AC-1.5.1).',
        fix: 'DELETE and POST /archive set is_archived = 1, is_enabled = 0 and keep the row; archived rules are hidden from the default list, cannot be edited (ARCHIVED, 400) and free their corridor for a new rule.',
        where: [FILE],
    })(async () => {
        const r = await mkRule();
        await request(app).delete(`/api/referral-rules/${r.id}`).expect(200);
        const all = (await request(app).get('/api/referral-rules?include_archived=1')).body.data;
        expect(all.find((x) => x.id === r.id)).toMatchObject({ is_archived: 1, status: 'ARCHIVED' });
        expect((await request(app).get('/api/referral-rules')).body.data.find((x) => x.id === r.id)).toBeUndefined();
        const edit = await request(app).put(`/api/referral-rules/${r.id}`).send({ ...r.body, referrer_reward: 9 });
        expect(edit.status).toBe(400);
        expect(edit.body.error).toBe('ARCHIVED');
        await mkRule({ corridor: [r.send, r.receive] }); // the corridor is free again
    });
});

describe('Registration, qualification and reward', () => {
    rule('REFERRAL-06', 'A referral is registered when the referee signs up with a code (email verification), once, and a link visit alone registers nothing', {
        why: 'Registration is the moment the referee is bound to the referrer and the rule is chosen. Opening the link is only a visit statistic.',
        fix: 'POST /api/referral/referrals -> createReferral() inserts status REGISTERED, idempotent per referee_id (returns the existing row). POST /api/referral/visits only writes referral_link_visits, once per visitor per 24h.',
        where: [FILE],
    })(async () => {
        const r = await mkRule();
        const a = await mkCustomer(r.send);
        const visit = await request(app).post('/api/referral/visits').send({ code: a.referral_code, visitor_id: 'v-1' });
        expect(visit.body.counted).toBe(true);
        expect((await request(app).post('/api/referral/visits').send({ code: a.referral_code, visitor_id: 'v-1' })).body.counted).toBe(false);
        expect((await tracked(`rule_id=${r.id}`)).total).toBe(0);

        const referee = { id: `RR-${n()}-${Date.now()}`, first_name: 'Ngozi', email: `n${seq}-${Date.now()}@example.com`, phone: `+44773${String(1000000 + seq)}`, send_currency: r.send, receive_currency: r.receive, kyc_status: 'PASSED', device_id: `d-${seq}-${Date.now()}` };
        const first = await register(a.referral_code, referee);
        expect(first.status).toBe(201);
        expect(first.body.data).toMatchObject({ status: 'REGISTERED', referrer_id: a.id, referee_id: referee.id, rule_id: r.id });
        const second = await register(a.referral_code, referee);
        expect(second.body.data.id).toBe(first.body.data.id);
        expect((await tracked(`rule_id=${r.id}`)).total).toBe(1);
        expect((await request(app).get('/api/referral/codes/AB-12')).status).toBe(400);
        expect((await request(app).get('/api/referral/codes/ZZZZZZZZ')).status).toBe(404);
    });

    rule('REFERRAL-07', 'The reward terms are snapshotted on the referral row at registration; later rule edits do not change what this referral pays', {
        why: 'The customer was promised these terms when they joined. Changing the rule must only affect people who join afterwards.',
        fix: 'createReferral() copies reward_type, referrer_reward, referee_reward, floor, qualification_window_days, bonus_validity_days and the deadlines onto the referrals row; tryAward() pays r.referrer_reward / r.referee_reward, not the rule.',
        where: [FILE],
    })(async () => {
        const w = await world({ referrer_reward: 5, referee_reward: 10, min_transaction_threshold: 50 });
        expect(w.referral).toMatchObject({ referrer_reward: 5, referee_reward: 10, floor: 50, qualification_window_days: 30, bonus_validity_days: 90, reward_type: 'BOTH' });
        await request(app).put(`/api/referral-rules/${w.rule.id}`).send({ ...w.rule.body, referrer_reward: 50, referee_reward: 100, min_transaction_threshold: 500 }).expect(200);
        const done = await qualifyAndComplete(w, { amount: 60 }); // would not even meet the new floor
        expect(done).toMatchObject({ status: 'REWARDED', referrer_credited: 5, referee_credited: 10 });
        expect(await available(w.referrer.id, w.rule.send)).toBe(5);
        expect(await available(w.refereeId, w.rule.send)).toBe(10);
    });

    rule('REFERRAL-08', 'Qualification floor: a transfer qualifies only at or above the floor, in the rule\'s send and receive currency', {
        why: 'The floor is the minimum real activity the programme pays for (inclusive). Transfers on other corridors say nothing about this programme.',
        fix: 'handleTransferEvent() requires transfer.currency === referral.currency, matching receive_currency when the rule names one, and amount >= referral.floor before moving REGISTERED -> PENDING.',
        where: [FILE],
    })(async () => {
        const w = await world({ min_transaction_threshold: 50 });
        const other = POOL.find((c) => c !== w.rule.send && c !== w.rule.receive);
        expect((await send(w, 'PAID', { amount: 49.99 })).body.referral.status).toBe('REGISTERED');
        expect((await send(w, 'PAID', { amount: 500, currency: other })).body.referral.status).toBe('REGISTERED');
        expect((await send(w, 'PAID', { amount: 500, receive_currency: other })).body.referral.status).toBe('REGISTERED');
        const ok = await send(w, 'PAID', { amount: 50 });
        expect(ok.body.referral).toMatchObject({ status: 'PENDING', qualifying_amount: 50 });
    });

    rule('REFERRAL-09', 'Qualification window: the referrer is only paid inside the window, the referee until bonus validity ends, and unqualified referrals expire', {
        why: 'The window limits the referrer\'s cost; the longer validity lets a slow referee still earn their bonus. After the overall deadline nobody is paid.',
        fix: 'referrerDeadlineFor() = registration + qualification_window_days; overallDeadlineFor() = + max(window, bonus_validity) (window only for REFERRER rules). tryAward() withholds the referrer reward after the referrer deadline; runJobs() expires REGISTERED referrals past qualification_deadline.',
        where: [FILE],
    })(async () => {
        const both = await world({ qualification_window_days: 10, bonus_validity_days: 60 });
        expect(both.referral.referrer_deadline).toBe('2030-01-11');
        expect(both.referral.qualification_deadline).toBe('2030-03-02');
        setNow('2030-01-21T10:00:00Z'); // day 20: past the referrer's window, inside the referee's validity
        const late = await qualifyAndComplete(both);
        expect(late).toMatchObject({ status: 'REWARDED', referrer_credited: 0, referee_credited: 10, status_reason: 'Referrer qualification window ended' });

        setNow('2030-01-01T10:00:00Z');
        const only = await world({ reward_type: 'REFERRER', referee_reward: 0, qualification_window_days: 10 });
        expect(only.referral.qualification_deadline).toBe('2030-01-11');
        setNow('2030-01-21T10:00:00Z');
        expect((await send(only, 'PAID')).body.referral.status).toBe('REGISTERED'); // too late
        await request(app).post('/api/referral/run-jobs').expect(200);
        const expired = (await tracked(`rule_id=${only.rule.id}`)).data[0];
        expect(expired.status).toBe('EXPIRED');
        expect(expired.status_reason).toMatch(/Qualification window ended on 11\/01\/2030/);

        setNow('2030-01-01T10:00:00Z');
        const beyond = await world({ qualification_window_days: 10, bonus_validity_days: 20 });
        setNow('2030-02-15T10:00:00Z'); // past both
        expect((await send(beyond, 'PAID')).body.referral.status).toBe('REGISTERED');
    });

    rule('REFERRAL-10', 'The reward is credited to the bonus wallet when the first qualifying transfer is COMPLETED, not before, and is not a discount on that transfer', {
        why: 'Referral rewards are bonus credit for the NEXT transfers (one wallet, credit_source REFERRAL). A discount on the qualifying transfer would pay before the money moved and bypass the wallet\'s expiry and reversal rules.',
        fix: 'PAID only makes the referral PENDING. On COMPLETED tryAward() calls ports.rewardWallet.issueCredit({ creditSource: "REFERRAL", creditSourceDetail: REFERRER|REFEREE, referenceId: "<referral>:referrer|referee" }); no promo redemption or APPLIED row is created for the qualifying transfer.',
        where: [FILE, 'server/referralHost.js', 'server/bonus/wallet.js'],
    })(async () => {
        const w = await world();
        const id = `RT-first-${n()}`;
        const paid = await send(w, 'PAID', { transfer_id: id });
        expect(paid.body.referral.status).toBe('PENDING');
        expect(await available(w.referrer.id, w.rule.send)).toBe(0);
        expect(await available(w.refereeId, w.rule.send)).toBe(0);
        const done = (await send(w, 'COMPLETED', { transfer_id: id })).body.referral;
        expect(done).toMatchObject({ status: 'REWARDED', qualifying_transfer_id: id });
        expect(done.referrer_credit_id).toBeTruthy();
        expect(done.referee_credit_id).toBeTruthy();

        const refW = await walletOf(w.refereeId, w.rule.send);
        expect(refW.credits[0]).toMatchObject({ credit_source: 'REFERRAL', credit_source_detail: 'REFEREE', amount: 10, remaining: 10 });
        expect((await walletOf(w.referrer.id, w.rule.send)).credits[0]).toMatchObject({ credit_source: 'REFERRAL', credit_source_detail: 'REFERRER', amount: 5 });
        expect(refW.history.filter((h) => h.type === 'APPLIED')).toEqual([]); // nothing was taken off the qualifying transfer
        const promo = (await request(app).get(`/api/promocodes/customers/${w.refereeId}/redemptions`)).body;
        expect(promo.data).toEqual([]);
    });

    rule('REFERRAL-11', 'Only the first qualifying transfer pays; repeated events and later transfers never pay again', {
        why: 'The programme is a one-off acquisition reward per referral.',
        fix: 'tryAward() only acts on status PENDING and sets REWARDED; addCredit() is idempotent on referenceId "<referral id>:referrer|referee"; later transfers find a REWARDED referral and do nothing.',
        where: [FILE],
    })(async () => {
        const w = await world();
        const id = `RT-one-${n()}`;
        await send(w, 'PAID', { transfer_id: id });
        await send(w, 'COMPLETED', { transfer_id: id });
        await send(w, 'COMPLETED', { transfer_id: id }); // Rhemito repeats the event
        const second = await qualifyAndComplete(w, { amount: 500 });
        expect(second.status).toBe('REWARDED');
        expect(await available(w.referrer.id, w.rule.send)).toBe(5);
        expect(await available(w.refereeId, w.rule.send)).toBe(10);
        expect(second.qualifying_transfer_id).toBe(id);
    });

    rule('REFERRAL-12', 'A failing transfer before the reward returns the referral to REGISTERED so a later transfer can still qualify', {
        why: 'A cancelled payment is not a qualifying transfer; the referee should get another chance within the window.',
        fix: 'handleTransferEvent(): CANCELLED/FAILED on the qualifying transfer of a PENDING referral clears qualifying_transfer_id and sets status back to REGISTERED.',
        where: [FILE],
    })(async () => {
        const w = await world();
        const id = `RT-fail-${n()}`;
        expect((await send(w, 'PAID', { transfer_id: id })).body.referral.status).toBe('PENDING');
        const back = (await send(w, 'CANCELLED', { transfer_id: id })).body.referral;
        expect(back).toMatchObject({ status: 'REGISTERED', qualifying_transfer_id: null });
        expect((await qualifyAndComplete(w)).status).toBe('REWARDED');
    });

    rule('REFERRAL-13', 'Rewards wait for KYC: the referee (and the referrer, if paid) must have passed KYC; passing KYC releases them', {
        why: 'No credit may be paid to a customer who has not passed KYC (compliance).',
        fix: 'tryAward() leaves the referral PENDING with status_reason "Awaiting referee KYC" / "Awaiting referrer KYC"; upsertCustomer() with kyc_status PASSED re-runs tryAward for waiting referrals.',
        where: [FILE],
    })(async () => {
        const w = await world({}, { referee: { kyc_status: 'PENDING' } });
        const waiting = await qualifyAndComplete(w);
        expect(waiting).toMatchObject({ status: 'PENDING', status_reason: 'Awaiting referee KYC' });
        expect(await available(w.refereeId, w.rule.send)).toBe(0);
        await request(app).post('/api/referral/customers').send({ id: w.refereeId, kyc_status: 'PASSED' }).expect(200);
        const t = (await tracked(`rule_id=${w.rule.id}`)).data[0];
        expect(t.status).toBe('REWARDED');
        expect(await available(w.refereeId, w.rule.send)).toBe(10);
    });

    rule('REFERRAL-14', 'The referrer cap stops further referrer rewards but the referee is still paid', {
        why: 'The cap protects budget per referrer; it must not punish the new customer who did nothing wrong.',
        fix: 'tryAward() counts rewarded referrals for (referrer, rule) against rule.max_referrals_per_referrer; at the cap it only adds the note "Referrer cap reached" and still credits the referee. GET /api/referral/offer reports cap_reached.',
        where: [FILE],
    })(async () => {
        const w = await world({ max_referrals_per_referrer: 1 });
        await qualifyAndComplete(w);
        const c = `RC2-${n()}-${Date.now()}`;
        await register(w.code, { id: c, first_name: 'Mike', email: `${c}@example.com`, phone: `+44774${String(1000000 + seq)}`, send_currency: w.rule.send, receive_currency: w.rule.receive, kyc_status: 'PASSED', device_id: `d-${c}` });
        const second = await qualifyAndComplete({ ...w, refereeId: c });
        expect(second).toMatchObject({ status: 'REWARDED', referrer_credited: 0, referee_credited: 10, status_reason: 'Referrer cap reached' });
        expect(await available(w.referrer.id, w.rule.send)).toBe(5);
        const offer = (await request(app).get(`/api/referral/offer?customer_id=${w.referrer.id}&currency=${w.rule.send}&receive_currency=${w.rule.receive}`)).body.offer;
        expect(offer.cap_reached).toBe(true);
    });
});

describe('NOT_ELIGIBLE referrals', () => {
    rule('REFERRAL-15', 'Self-referral is NOT_ELIGIBLE by same phone number, device, email, or a code that belongs to the referee', {
        why: 'The classic abuse: sign up a second account and refer yourself. Identity signals are compared across the two accounts, not just the account id.',
        fix: 'sameIdentity() compares email (case-insensitive), phone digits only, device_id and payment fingerprints; createReferral() records NOT_ELIGIBLE with "Self-referral: same <signal>". Using one\'s own code is a 400 OWN_LINK.',
        where: [FILE],
    })(async () => {
        const phoneW = await world({}, { referrer: { phone: '+44 7700 900-111' }, referee: { phone: '+447700900111' } });
        expect(phoneW.referral).toMatchObject({ status: 'NOT_ELIGIBLE', status_reason: 'Self-referral: same phone number' });
        const deviceW = await world({}, { referrer: { device_id: 'shared-device-1' }, referee: { device_id: 'shared-device-1' } });
        expect(deviceW.referral).toMatchObject({ status: 'NOT_ELIGIBLE', status_reason: 'Self-referral: same device' });
        const emailW = await world({}, { referrer: { email: 'Same.Person@Example.com' }, referee: { email: 'same.person@example.com' } });
        expect(emailW.referral).toMatchObject({ status: 'NOT_ELIGIBLE', status_reason: 'Self-referral: same email' });

        // not eligible means not paid, however the referee behaves afterwards
        const after = await qualifyAndComplete(phoneW);
        expect(after.status).toBe('NOT_ELIGIBLE');
        expect(await available(phoneW.referrer.id, phoneW.rule.send)).toBe(0);
        expect(await available(phoneW.refereeId, phoneW.rule.send)).toBe(0);

        const r = await mkRule();
        const me = await mkCustomer(r.send);
        const own = await register(me.referral_code, { id: me.id, send_currency: r.send });
        expect(own.status).toBe(400);
        expect(own.body.error).toBe('OWN_LINK');
    });

    rule('REFERRAL-16', 'A returning customer (same email or phone as a closed account) is NOT_ELIGIBLE', {
        why: 'The programme rewards new customers only; closing an account and re-registering must not earn a welcome reward.',
        fix: 'createReferral() looks for a CLOSED customer with the same email or phone and records NOT_ELIGIBLE with reason "Returning customer".',
        where: [FILE],
    })(async () => {
        const r = await mkRule();
        const closed = await mkCustomer(r.send, { account_status: 'CLOSED', email: `returning-${Date.now()}@example.com` });
        const a = await mkCustomer(r.send);
        const reg = await register(a.referral_code, {
            id: `RRET-${n()}-${Date.now()}`, first_name: 'Back', email: closed.email, phone: `+44775${String(1000000 + seq)}`, send_currency: r.send, receive_currency: r.receive, kyc_status: 'PASSED', device_id: `d-${seq}-${Date.now()}`,
        });
        expect(reg.body.data).toMatchObject({ status: 'NOT_ELIGIBLE', status_reason: 'Returning customer' });
    });

    rule('REFERRAL-17', 'Only a Growth Manager can approve a NOT_ELIGIBLE referral; approval pays through the wallet according to the snapshot', {
        why: 'Overriding the abuse checks is a money decision. It needs an accountable named approver and a written reason.',
        fix: 'POST /api/referral/referrals/:id/approve uses requireRole(GROWTH_MANAGER) (name from the token), needs a 10-250 char reason, only accepts NOT_ELIGIBLE, and issues credits via addCredit with the approver in the note.',
        where: [FILE, 'server/auth.js'],
    })(async () => {
        const w = await world({ reward_type: 'REFERRER', referee_reward: 0 }, { referrer: { phone: '+44 7700 900-222' }, referee: { phone: '+447700900222' } });
        expect(w.referral.status).toBe('NOT_ELIGIBLE');
        const url = `/api/referral/referrals/${w.referral.id}/approve`;
        expect((await request(app).post(url).send({ reason: 'Verified by phone with the customer' })).status).toBe(401);
        expect((await request(app).post(url).set('Authorization', GM).send({ reason: 'short' })).status).toBe(400);
        const ok = await request(app).post(url).set('Authorization', GM).send({ reason: 'Verified by phone with the customer' });
        expect(ok.status).toBe(200);
        expect(ok.body.data).toMatchObject({ status: 'REWARDED', approved_by: 'Grace Growth', referrer_credited: 5, referee_credited: 0 });
        expect(await available(w.referrer.id, w.rule.send)).toBe(5);
        expect(await available(w.refereeId, w.rule.send)).toBe(0); // REFERRER rule: the referee is not paid on approval either
        expect((await request(app).post(url).set('Authorization', GM).send({ reason: 'Verified by phone with the customer' })).status).toBe(400); // already rewarded
    });

    rule('REFERRAL-18', 'A customer blocked from earning bonus is not paid; the referral becomes NOT_ELIGIBLE with the reason', {
        why: 'The abuse guard (Bonus Blocks) covers referral rewards too, otherwise referrals are a way around the block.',
        fix: 'tryAward() asks ports.eligibilityGuard.isEarningBlocked (host: bonus.isEarningBlocked) for each paid party and records "Bonus blocked for ..." as NOT_ELIGIBLE; a Growth Manager can then approve.',
        where: [FILE, 'server/referralHost.js', 'server/bonus/blocks.js'],
    })(async () => {
        const w = await world();
        for (const k of [1, 2, 3]) await bonus.recordStrike({ customerId: w.refereeId, eventId: `BLK-${w.refereeId}-${k}`, kind: 'SCHEME', outcome: 'REFUNDED', amountLost: 1, currency: w.rule.send });
        const done = await qualifyAndComplete(w);
        expect(done.status).toBe('NOT_ELIGIBLE');
        expect(done.status_reason).toMatch(/Bonus blocked for .*referee/);
        expect(await available(w.refereeId, w.rule.send)).toBe(0);
        expect(await available(w.referrer.id, w.rule.send)).toBe(0);
    });
});

describe('Idempotent issue, retry and reversal', () => {
    rule('REFERRAL-19', 'If the wallet cannot issue a reward the referral stays PENDING, the daily job retries it, and nobody is paid twice', {
        why: 'A wallet outage must never lose a promised reward or double it when the retry runs (BR-51).',
        fix: 'tryAward() catches issueCredit errors, keeps status PENDING with reason "Reward could not be issued – will retry"; runJobs() calls tryAward() again for those rows. issueCredit is idempotent on referenceId, so the referrer credit issued before the failure is not repeated.',
        where: [FILE, 'server/referralHost.js'],
    })(async () => {
        const w = await world();
        const real = bonus.issueCredit;
        let failing = true;
        jest.spyOn(bonus, 'issueCredit').mockImplementation((input) => {
            if (failing && input.customerId === w.refereeId) return Promise.reject(new Error('wallet down'));
            return real(input);
        });
        const first = await qualifyAndComplete(w);
        expect(first).toMatchObject({ status: 'PENDING', status_reason: 'Reward could not be issued – will retry' });
        failing = false;
        const jobs = await request(app).post('/api/referral/run-jobs');
        expect(jobs.body.rewards_retried).toBeGreaterThanOrEqual(1);
        expect((await tracked(`rule_id=${w.rule.id}`)).data[0].status).toBe('REWARDED');
        expect(await available(w.referrer.id, w.rule.send)).toBe(5);
        expect(await available(w.refereeId, w.rule.send)).toBe(10);
        await request(app).post('/api/referral/run-jobs').expect(200);
        expect(await available(w.referrer.id, w.rule.send)).toBe(5);
    });

    rule('REFERRAL-20', 'A refunded qualifying transfer reverses the reward: unused credit is voided, spent credit becomes debt, the referee takes the strike', {
        why: 'The reward was for a transfer that did not stand. Mito cannot recover what was spent, so it is owed against future bonus; the abuse strike goes to the customer who made the transfer, not the referrer.',
        fix: 'handleTransferEvent() -> voidReferralCredits(): rewardWallet.voidCredit for both credits, onSpentCreditReversed -> bonus.clawbackCredit for the spent part, then eligibilityGuard.recordStrike for the referee. Referral status REVERSED.',
        where: [FILE, 'server/referralHost.js'],
    })(async () => {
        const w = await world();
        const id = `RT-rev-${n()}`;
        await qualifyAndComplete(w, { transfer_id: id });
        await request(app).post(`/api/wallet/${w.referrer.id}/apply`).send({ amount: 3, currency: w.rule.send, transfer_id: `SPEND-${id}`, send_amount: 100 }).expect(200);
        const rev = await send(w, 'REFUNDED', { transfer_id: id });
        expect(rev.body.referral.status).toBe('REVERSED');
        const b = (await walletOf(w.referrer.id, w.rule.send)).balances[0];
        expect(b).toMatchObject({ available: 0, outstanding_debt: 3 });
        expect(await available(w.refereeId, w.rule.send)).toBe(0);
        const strikes = (await request(app).get(`/api/bonus-blocks/${w.refereeId}`)).body.strikes;
        expect(strikes).toHaveLength(1); // 3 of the referrer's 5 was spent, so the loss counts against the referee
        expect(strikes[0]).toMatchObject({ kind: 'REFERRAL', event_id: id });
        expect((await request(app).get(`/api/bonus-blocks/${w.referrer.id}`)).body.strikes).toHaveLength(0); // never the referrer
    });
});

describe('Tracking, offers and performance endpoints', () => {
    rule('REFERRAL-21', 'Tracking filters by status, currency, receive currency and rule, summarises, and exports CSV', {
        why: 'Growth reconciles referral cost per corridor from this endpoint; filters must be exact and the summary must match the rows.',
        fix: 'tracking() builds WHERE from status, currency, receive_currency, rule_id, status_group, from/to and q; summary counts total/pending/rewarded and bonus_issued per currency. /tracking.csv exports the same rows.',
        where: [FILE],
    })(async () => {
        const w = await world();
        const other = await world({}, {});
        await qualifyAndComplete(w);
        const rows = await tracked(`rule_id=${w.rule.id}`);
        expect(rows.total).toBe(1);
        expect(rows.data[0]).toMatchObject({ rule_name: w.rule.body.name, status: 'REWARDED', currency: w.rule.send, receive_currency: w.rule.receive });
        expect(rows.summary).toMatchObject({ total: 1, rewarded: 1, pending: 0, conversion_rate: 100 });
        expect(rows.summary.bonus_issued[w.rule.send]).toBe(15);
        expect((await tracked(`rule_id=${other.rule.id}&status=REWARDED`)).total).toBe(0);
        expect((await tracked(`rule_id=${other.rule.id}&status=REGISTERED`)).total).toBe(1);
        expect((await tracked(`rule_id=${w.rule.id}&receive_currency=${other.rule.receive === w.rule.receive ? 'XXX' : other.rule.receive}`)).total).toBe(0);
        const csv = await request(app).get(`/api/referral/tracking.csv?rule_id=${w.rule.id}`);
        expect(csv.headers['content-type']).toMatch(/text\/csv/);
        expect(csv.text.split('\n')[0]).toMatch(/^Referral ID,Referrer ID,Referrer,Referee ID,Referee,Rule/);
        expect(csv.text.split('\n')).toHaveLength(2);
    });

    rule('REFERRAL-22', 'My referrals masks the friend\'s name and needs a referrer_id; the offer is built from the live rule and hidden when none exists', {
        why: 'Customers must not see each other\'s full names, and an offer without a live rule would promise money that is not funded.',
        fix: 'GET /api/referral/referrals returns maskName() ("Sarah S."), 400 without referrer_id; GET /api/referral/offer returns offer/offers from live rules, reason NO_ACTIVE_RULE otherwise, referral_link from the customer\'s code.',
        where: [FILE],
    })(async () => {
        const w = await world();
        await qualifyAndComplete(w);
        const mine = (await request(app).get(`/api/referral/referrals?referrer_id=${w.referrer.id}`)).body;
        expect(mine.data[0]).toMatchObject({ friend: 'Sarah S.', status: 'REWARDED', status_label: 'Earned', credited: 5 });
        expect(JSON.stringify(mine)).not.toMatch(/Smith/);
        expect(mine.summary.total_earned[w.rule.send]).toBe(5);
        expect((await request(app).get('/api/referral/referrals')).status).toBe(400);

        const offer = (await request(app).get(`/api/referral/offer?customer_id=${w.referrer.id}&currency=${w.rule.send}&receive_currency=${w.rule.receive}`)).body;
        expect(offer.offer).toMatchObject({ rule_id: w.rule.id, reward_type: 'BOTH', referrer_reward: 5, referee_reward: 10, floor: 50 });
        expect(offer.offer.referral_link).toBe(`https://rhemito.com/ref/${w.referrer.referral_code}`);
        await request(app).delete(`/api/referral-rules/${w.rule.id}`).expect(200);
        const gone = (await request(app).get(`/api/referral/offer?customer_id=${w.referrer.id}&currency=${w.rule.send}&receive_currency=${w.rule.receive}`)).body;
        expect(gone).toMatchObject({ offer: null, reason: 'NO_ACTIVE_RULE' });
    });

    rule('REFERRAL-23', 'Performance reports bonus figures from the wallet and counts registrations, rewards and conversion per rule', {
        why: 'Cost reporting must reflect what the wallet really issued (BR-53); the referral module keeps no private copy of balances.',
        fix: 'performance() calls ports.rewardWallet.creditSummary({ referralIds }) for issued/used/returned/expired/voided and counts referrals by status per rule.',
        where: [FILE, 'server/referralHost.js'],
    })(async () => {
        const w = await world();
        await qualifyAndComplete(w);
        const perf = (await request(app).get('/api/referral/performance')).body.data.find((p) => p.rule_id === w.rule.id);
        expect(perf).toMatchObject({ registrations: 1, rewarded: 1, conversion_rate: 100, bonus_issued: 15, bonus_unused: 15 });
        const csv = await request(app).get('/api/referral/performance.csv');
        expect(csv.headers['content-type']).toMatch(/text\/csv/);
    });
});
