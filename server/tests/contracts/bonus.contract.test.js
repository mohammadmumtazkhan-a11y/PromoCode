// BONUS contract: the rules the Bonus Scheme module (server/bonus/*) is implemented to. Each rule explains itself when it fails.
const request = require('supertest');
const { rule, bootApp, waitForSeed } = require('./_contract');

const app = bootApp('bonus');
const bonus = require('../../bonus');
const { clock } = require('../../bonus/time');

const FAR = '2099-12-31';
let seq = 0;
const cust = (p = 'BC') => `${p}-${Date.now().toString(36)}-${seq++}`;
const setNow = (iso) => { clock.now = () => new Date(iso); };

beforeAll(async () => { await waitForSeed(app, request); });
// Seeded and earlier schemes would also react to a transfer event; each rule starts with every scheme switched off
beforeEach(async () => {
    const all = (await request(app).get('/api/bonus-schemes')).body.data;
    for (const s of all.filter((x) => x.status === 'ACTIVE')) await request(app).patch(`/api/bonus-schemes/${s.id}/status`).send({ status: 'INACTIVE' });
});
afterEach(() => { clock.now = () => new Date(); delete process.env.BONUS_CLAWBACK; delete process.env.BONUS_SERVICE_KEY; });

const scheme = async (over = {}) => {
    const res = await request(app).post('/api/bonus-schemes').send({
        name: `Contract ${Math.random().toString(36).slice(2, 8)}`, bonus_type: 'TRANSACTION_THRESHOLD_CREDIT', credit_amount: 5, currency: 'GBP',
        min_transaction_threshold: 100, eligibility_rules: { oneTimeOnly: false }, start_date: '2024-01-01', end_date: FAR, ...over,
    });
    if (res.status !== 200) throw new Error(`test setup: scheme refused: ${JSON.stringify(res.body)}`);
    return res.body.id;
};
const event = (id, customer, amount, over = {}) => request(app).post('/api/bonus/transfer-events').send({
    transfer_id: id, customer_id: customer, amount, currency: 'GBP', receive_currency: 'NGN', status: 'COMPLETED', created_at: new Date(clock.now()).toISOString(), ...over,
});
const outcome = (res, schemeId) => (res.body.awards || []).find((a) => a.scheme_id === schemeId);
const walletOf = async (id, currency = 'GBP', qs = '') => (await request(app).get(`/api/wallet/${id}?currency=${currency}${qs}`)).body;
const balance = async (id, currency = 'GBP') => ((await walletOf(id, currency)).balances[0]) || { available: 0, earned: 0, used: 0, expired: 0, outstanding_debt: 0, by_source: [] };
const grant = (user, amount, over = {}) => request(app).post('/api/credits/manual').send({
    user_id: user, amount, type: 'EARNED', reason_code: 'GOODWILL', notes: 'Goodwill after a delayed transfer', currency: 'GBP', ...over,
});
const apply = (user, amount, transfer, over = {}) => request(app).post(`/api/wallet/${user}/apply`).send({ amount, currency: 'GBP', transfer_id: transfer, send_amount: 100, ...over });

describe('Scheme types decide whether a completed transfer earns a bonus', () => {
    rule('BONUS-01', 'Threshold credit: the minimum is inclusive, below it earns nothing (BELOW_THRESHOLD)', {
        why: 'The threshold is the "large transfer" the scheme rewards. A transfer exactly at the threshold qualifies; one penny under does not.',
        fix: 'checkEligibility() in bonus/engine.js rejects only when amount < min_transaction_threshold for THRESHOLD_TYPES (TRANSACTION_THRESHOLD_CREDIT, REQUEST_MONEY).',
        where: ['server/bonus/engine.js'],
    })(async () => {
        const s = await scheme({ min_transaction_threshold: 100, credit_amount: 5 });
        const c = cust();
        expect(outcome(await event(cust('T'), c, 99.99), s)).toMatchObject({ status: 'SKIPPED', reason: 'BELOW_THRESHOLD' });
        expect(outcome(await event(cust('T'), c, 100), s)).toMatchObject({ status: 'AWARDED', amount: 5, currency: 'GBP' });
        expect((await balance(c)).available).toBe(5);
    });

    rule('BONUS-02', 'Only a COMPLETED transfer in the scheme\'s own currency earns bonus', {
        why: 'Bonus is paid in the scheme\'s currency (decision D1) and only for money that actually moved. PAID is not yet completed.',
        fix: 'handleTransferEvent() triggers TRANSFER_COMPLETED only for status COMPLETED; checkEligibility() returns CURRENCY_MISMATCH when the transfer currency differs from scheme.currency.',
        where: ['server/bonus/engine.js'],
    })(async () => {
        const s = await scheme({ min_transaction_threshold: 0, credit_amount: 7 });
        const c = cust();
        const paid = await event(cust('T'), c, 500, { status: 'PAID' });
        expect(paid.body.awards).toEqual([]);
        expect(outcome(await event(cust('T'), c, 500, { currency: 'NGN' }), s)).toMatchObject({ status: 'SKIPPED', reason: 'CURRENCY_MISMATCH' });
        expect((await balance(c)).available).toBe(0);
    });

    rule('BONUS-03', 'Tiered scheme: the amount comes from the tier the transfer falls in, no tier means no bonus', {
        why: 'Tiers let marketing pay more for bigger transfers. The tier is chosen from the reported transfer amount (inclusive bounds), never from a stored total.',
        fix: 'computeAmount() finds the tier with min <= amount <= max (max null = open ended); TIER_MISMATCH when none. Percentage tiers use value as a percent of the amount. Tiers must be contiguous (validateScheme).',
        where: ['server/bonus/engine.js', 'server/bonus/schemes.js'],
    })(async () => {
        const s = await scheme({ is_tiered: true, min_transaction_threshold: 0, tiers: [{ min: 0, max: 99.99, value: 1 }, { min: 100, max: null, value: 4 }] });
        const c = cust();
        expect(outcome(await event(cust('T'), c, 50), s)).toMatchObject({ status: 'AWARDED', amount: 1 });
        expect(outcome(await event(cust('T'), c, 100), s)).toMatchObject({ status: 'AWARDED', amount: 4 });
        expect(outcome(await event(cust('T'), c, 9999), s)).toMatchObject({ status: 'AWARDED', amount: 4 });
        const gap = await request(app).post('/api/bonus-schemes').send({
            name: `Gap ${seq++}`, bonus_type: 'TRANSACTION_THRESHOLD_CREDIT', is_tiered: true, currency: 'GBP', min_transaction_threshold: 0,
            tiers: [{ min: 0, max: 50, value: 1 }, { min: 80, max: null, value: 3 }], start_date: '2024-01-01', end_date: FAR,
        });
        expect(gap.status).toBe(400);
        expect(gap.body.fields.tiers).toMatch(/no gaps or overlaps/);
        const narrow = await scheme({ is_tiered: true, min_transaction_threshold: 0, tiers: [{ min: 500, max: 1000, value: 9 }] });
        expect(outcome(await event(cust('T'), c, 10), narrow)).toMatchObject({ status: 'SKIPPED', reason: 'TIER_MISMATCH' });
        const pct = await scheme({ is_tiered: true, commission_type: 'PERCENTAGE', min_transaction_threshold: 0, tiers: [{ min: 0, max: null, value: 2 }] });
        expect(outcome(await event(cust('T'), c, 250), pct)).toMatchObject({ status: 'AWARDED', amount: 5 });
    });

    rule('BONUS-04', 'Percentage awards are capped by max_award, rounded per currency, and an award of 0 is skipped (ZERO_AMOUNT)', {
        why: 'A percentage bonus must have a ceiling so a huge transfer cannot drain the budget; JPY has no decimals; paying 0 is meaningless.',
        fix: 'computeAmount() applies max_award, then roundFor(currency) (JPY 0 dp, others 2 dp); awardScheme() throws ZERO_AMOUNT when the result is not > 0.',
        where: ['server/bonus/engine.js', 'server/bonus/money.js'],
    })(async () => {
        const pct = await scheme({ commission_type: 'PERCENTAGE', commission_percentage: 10, credit_amount: 0, max_award: 4, min_transaction_threshold: 0 });
        expect(outcome(await event(cust('T'), cust(), 100), pct)).toMatchObject({ amount: 4 }); // 10 capped at 4
        expect(outcome(await event(cust('T'), cust(), 20), pct)).toMatchObject({ amount: 2 });
        const jpy = await scheme({ currency: 'JPY', commission_type: 'PERCENTAGE', commission_percentage: 1.5, credit_amount: 0, min_transaction_threshold: 0 });
        expect(outcome(await event(cust('T'), cust(), 1001, { currency: 'JPY' }), jpy)).toMatchObject({ amount: 15 });
        expect(outcome(await event(cust('T'), cust(), 10, { currency: 'JPY' }), jpy)).toMatchObject({ status: 'SKIPPED', reason: 'ZERO_AMOUNT' });
    });

    rule('BONUS-05', 'One-time-only is the default: a customer earns a scheme once (ALREADY_EARNED) unless it is set to repeat', {
        why: 'Most schemes are welcome/loyalty offers meant once per customer. Paying every transfer would multiply the cost by orders of magnitude.',
        fix: 'validateScheme() defaults eligibility_rules.oneTimeOnly to true; checkEligibility() looks for an existing EARNED row (excluding BONUS_RETURNED) for this user and scheme. oneTimeOnly:false repeats.',
        where: ['server/bonus/engine.js', 'server/bonus/schemes.js'],
    })(async () => {
        const once = await scheme({ min_transaction_threshold: 0, eligibility_rules: {} });
        const stored = (await request(app).get('/api/bonus-schemes')).body.data.find((x) => x.id === once);
        expect(stored.eligibility_rules.oneTimeOnly).toBe(true);
        const c = cust();
        expect(outcome(await event(cust('T'), c, 10), once)).toMatchObject({ status: 'AWARDED' });
        expect(outcome(await event(cust('T'), c, 10), once)).toMatchObject({ status: 'SKIPPED', reason: 'ALREADY_EARNED' });
        const repeat = await scheme({ min_transaction_threshold: 0, eligibility_rules: { oneTimeOnly: false } });
        expect(outcome(await event(cust('T'), c, 10), repeat)).toMatchObject({ status: 'AWARDED' });
        expect(outcome(await event(cust('T'), c, 10), repeat)).toMatchObject({ status: 'AWARDED' });
    });

    rule('BONUS-06', 'Eligibility segments gate the scheme: saved criteria and "existing customers" are checked server-side (USER_INELIGIBLE)', {
        why: 'A segment is the audience the scheme was funded for. The UI hiding a scheme is not enough; the server must refuse both events and manual awards.',
        fix: 'checkEligibility() runs segmentMatches() for every segment in eligibility_rules.segments (any match passes). existing_customers = at least one earlier COMPLETED transfer, excluding the current one. POST /api/credits/award-bonus uses the same checks.',
        where: ['server/bonus/engine.js', 'server/bonus/segments.js'],
    })(async () => {
        const existing = await scheme({ min_transaction_threshold: 0, eligibility_rules: { oneTimeOnly: false, segments: ['existing_customers'] } });
        const c = cust();
        expect(outcome(await event(cust('T'), c, 10), existing)).toMatchObject({ status: 'SKIPPED', reason: 'USER_INELIGIBLE' }); // the first transfer does not make them "existing"
        expect(outcome(await event(cust('T'), c, 10), existing)).toMatchObject({ status: 'AWARDED' });

        const seg = await request(app).post('/api/user-segments').send({ name: `Busy ${seq++}`, criteria: { type: 'TRANSACTION_COUNT', min: 2, max: null, period_days: 30 } });
        const busy = await scheme({ bonus_type: 'REQUEST_MONEY', min_transaction_threshold: 0, eligibility_rules: { oneTimeOnly: true, segments: [String(seg.body.id)] } });
        const d = cust();
        await event(cust('T'), d, 10);
        const refused = await request(app).post('/api/credits/award-bonus').send({ user_id: d, scheme_id: busy });
        expect(refused.status).toBe(403);
        expect(refused.body.error).toBe('USER_INELIGIBLE');
        await event(cust('T'), d, 10);
        expect((await request(app).post('/api/credits/award-bonus').send({ user_id: d, scheme_id: busy })).status).toBe(200);
    });

    rule('BONUS-07', 'Loyalty credit needs the configured number of completed transfers in the period, and is always for existing customers', {
        why: 'Loyalty rewards repeat behaviour (decision D2); a stored rule that forgot the existing-customers segment must not turn it into a sign-up bonus.',
        fix: 'checkEligibility(): LOYALTY_CREDIT counts COMPLETED transfers in scheme.currency within time_period_days (LOYALTY_NOT_MET) and always adds the existing_customers segment; validateScheme forces segments to ["existing_customers"].',
        where: ['server/bonus/engine.js', 'server/bonus/schemes.js'],
    })(async () => {
        const s = await scheme({ bonus_type: 'LOYALTY_CREDIT', min_transaction_threshold: 0, min_transactions: 3, time_period_days: 30, credit_amount: 10, eligibility_rules: { oneTimeOnly: true, segments: ['all'] } });
        const stored = (await request(app).get('/api/bonus-schemes')).body.data.find((x) => x.id === s);
        expect(stored.eligibility_rules.segments).toEqual(['existing_customers']);
        const c = cust();
        expect(outcome(await event(cust('T'), c, 20), s)).toMatchObject({ reason: 'LOYALTY_NOT_MET' });
        expect(outcome(await event(cust('T'), c, 20), s)).toMatchObject({ reason: 'LOYALTY_NOT_MET' });
        expect(outcome(await event(cust('T'), c, 20), s)).toMatchObject({ status: 'AWARDED', amount: 10 });
        expect(outcome(await event(cust('T'), c, 20), s)).toMatchObject({ reason: 'ALREADY_EARNED' });
    });

    rule('BONUS-08', 'Request-money bonus reacts only to a paid money request, never to a transfer', {
        why: 'Each scheme type has its own trigger (BS-40). A transfer must not pay a request-money scheme and vice versa.',
        fix: 'EVENT_SCHEME_TYPES maps TRANSFER_COMPLETED -> LOYALTY/THRESHOLD and MONEY_REQUEST_PAID -> REQUEST_MONEY. POST /api/bonus/events refuses unknown event types.',
        where: ['server/bonus/engine.js', 'server/bonus/service.js'],
    })(async () => {
        const s = await scheme({ bonus_type: 'REQUEST_MONEY', min_transaction_threshold: 10, credit_amount: 2 });
        const c = cust();
        expect(outcome(await event(cust('T'), c, 500), s)).toBeUndefined();
        const paid = (id, amount) => request(app).post('/api/bonus/events').send({ type: 'MONEY_REQUEST_PAID', customer_id: c, event_id: id, amount, currency: 'GBP' });
        expect((await paid(cust('R'), 5)).body.awards.find((a) => a.scheme_id === s)).toMatchObject({ reason: 'BELOW_THRESHOLD' });
        expect((await paid(cust('R'), 25)).body.awards.find((a) => a.scheme_id === s)).toMatchObject({ status: 'AWARDED', amount: 2 });
        expect((await request(app).post('/api/bonus/events').send({ type: 'NOPE', customer_id: c, event_id: 'x' })).status).toBe(400);
    });

    rule('BONUS-09', 'Scheme lifecycle: inactive, not started and ended schemes pay nothing, each with its own reason', {
        why: 'Admins schedule and switch off schemes. A scheme outside its dates or switched off must stop paying immediately.',
        fix: 'triggerEvent() only evaluates ACTIVE schemes; checkEligibility() returns SCHEME_NOT_STARTED / SCHEME_EXPIRED by UK date, SCHEME_INACTIVE for manual awards of inactive schemes. DELETE archives (never deletes).',
        where: ['server/bonus/engine.js', 'server/bonus/schemes.js'],
    })(async () => {
        const c = cust();
        const ended = await scheme({ start_date: '2020-01-01', end_date: '2020-12-31', min_transaction_threshold: 0 });
        expect(outcome(await event(cust('T'), c, 100), ended)).toMatchObject({ status: 'SKIPPED', reason: 'SCHEME_EXPIRED' });
        const future = await scheme({ start_date: '2098-01-01', end_date: FAR, min_transaction_threshold: 0 });
        expect(outcome(await event(cust('T'), c, 100), future)).toMatchObject({ status: 'SKIPPED', reason: 'SCHEME_NOT_STARTED' });
        const off = await scheme({ min_transaction_threshold: 0 });
        await request(app).patch(`/api/bonus-schemes/${off}/status`).send({ status: 'INACTIVE' }).expect(200);
        expect(outcome(await event(cust('T'), c, 100), off)).toBeUndefined();
        const manual = await request(app).post('/api/credits/award-bonus').send({ user_id: c, scheme_id: off });
        expect(manual.body.error).toBe('SCHEME_INACTIVE');
        await request(app).delete(`/api/bonus-schemes/${off}`).expect(200);
        const archived = (await request(app).get('/api/bonus-schemes')).body.data.find((x) => x.id === off);
        expect(archived.status).toBe('ARCHIVED');
    });

    rule('BONUS-10', 'Referral rewards are not a bonus scheme: REFERRAL_CREDIT schemes are legacy and cannot be created or paid', {
        why: 'Referral rewards are managed in Growth > Referral Settings and paid by the referral module. A second path would double-pay.',
        fix: 'POST /api/bonus-schemes returns 400 with LEGACY_MSG for REFERRAL_CREDIT; checkEligibility() rejects it as SCHEME_INACTIVE. Only LOYALTY_CREDIT, TRANSACTION_THRESHOLD_CREDIT and REQUEST_MONEY are valid types.',
        where: ['server/bonus/schemes.js', 'server/bonus/engine.js'],
    })(async () => {
        const res = await request(app).post('/api/bonus-schemes').send({ name: `Legacy ${seq++}`, bonus_type: 'REFERRAL_CREDIT', credit_amount: 5, currency: 'GBP', start_date: '2024-01-01', end_date: FAR });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Referral Settings/);
        expect((await request(app).post('/api/bonus-schemes').send({ name: `Odd ${seq++}`, bonus_type: 'SOMETHING', credit_amount: 5, currency: 'GBP', start_date: '2024-01-01', end_date: FAR })).status).toBe(400);
    });
});

describe('The one bonus wallet', () => {
    rule('BONUS-11', 'Every credit is tagged with its source (SCHEME, REFERRAL, MANUAL) and all sources are one balance', {
        why: 'Decision D13: one balance per customer and currency, but finance must still report per source. An untagged credit disappears from those reports.',
        fix: 'wallet.issueCredit() requires creditSource in SOURCES and stores credit_source + credit_source_detail on the EARNED row. Scheme awards use SCHEME/<bonus_type>, manual grants MANUAL/<reason>, the referral module REFERRAL/REFERRER|REFEREE.',
        where: ['server/bonus/wallet.js'],
    })(async () => {
        const s = await scheme({ name: `Tagged ${seq++}`, min_transaction_threshold: 0, credit_amount: 10 });
        const c = cust();
        await event(cust('T'), c, 100);
        await grant(c, 3);
        await bonus.issueCredit({ customerId: c, amount: 5, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFERRER', referenceId: `${c}:referrer`, notes: 'Referrer reward – referred Sam S.' });
        const w = await walletOf(c);
        const sources = Object.fromEntries(w.credits.map((x) => [x.credit_source, x.credit_source_detail]));
        expect(sources).toEqual({ SCHEME: 'TRANSACTION_THRESHOLD_CREDIT', MANUAL: 'GOODWILL', REFERRAL: 'REFERRER' });
        expect(w.balances).toHaveLength(1);
        expect(w.balances[0].available).toBe(18);
        await expect(bonus.issueCredit({ customerId: c, amount: 1, currency: 'GBP', creditSource: 'WHATEVER', referenceId: `${c}:x` })).rejects.toMatchObject({ code: 'VALIDATION' });
        void s;
    });

    rule('BONUS-12', 'The by-source split always adds up to the currency totals, and a source filter never changes the totals', {
        why: 'Finance reconciles the per-source table to the balance. If they disagree, a credit was counted twice or lost.',
        fix: 'walletView() builds balances[].by_source from the same entries as the totals; ?credit_source= only filters credits/unused/history lists.',
        where: ['server/bonus/wallet.js'],
    })(async () => {
        await scheme({ min_transaction_threshold: 0, credit_amount: 8 });
        const c = cust();
        await event(cust('T'), c, 100);
        await grant(c, 5);
        await apply(c, 9, cust('P')).expect(200);
        await request(app).post('/api/credits/manual').send({ user_id: c, amount: 2, type: 'VOIDED', reason_code: 'CORRECTION', notes: 'Duplicate goodwill credit removed', currency: 'GBP' }).expect(200);
        const b = await balance(c);
        const sum = (k) => Math.round(b.by_source.reduce((n, g) => n + g[k], 0) * 100) / 100;
        expect(sum('earned')).toBe(b.earned);
        expect(sum('used')).toBe(b.used);
        expect(sum('available')).toBe(b.available);
        expect(sum('expired') + sum('removed')).toBe(b.expired);
        const filtered = await walletOf(c, 'GBP', '&credit_source=MANUAL');
        expect(filtered.credits.every((x) => x.credit_source === 'MANUAL')).toBe(true);
        expect(filtered.balances[0].available).toBe(b.available);
    });

    rule('BONUS-13', 'Spending takes the credit that expires first, whatever its source', {
        why: 'Soonest-expiry-first (D9/D13) stops customers losing credit to expiry while a later one sits unused.',
        fix: 'applyBonus() walks creditsWithRemaining() ordered by expires_at then created_at and writes one APPLIED row per credit it draws on.',
        where: ['server/bonus/wallet.js'],
    })(async () => {
        const c = cust();
        await grant(c, 4, { validity_days: 10 });
        await bonus.issueCredit({ customerId: c, amount: 6, currency: 'GBP', validityDays: 30, creditSource: 'REFERRAL', creditSourceDetail: 'REFEREE', referenceId: `${c}:referee`, notes: 'Referee reward – invited by Ada O.' });
        expect((await apply(c, 7, cust('P'))).body).toEqual({ applied: 7, available: 3 });
        const used = Object.fromEntries((await balance(c)).by_source.map((g) => [g.credit_source, g.used]));
        expect(used).toEqual({ MANUAL: 4, REFERRAL: 3 });
    });

    rule('BONUS-14', 'Applying bonus: never more than the balance, never more than the send amount, once per transfer, no minimum send', {
        why: 'The balance can change between quote and pay. The customer must never pay less than zero, use phantom credit, or use bonus twice on one transfer.',
        fix: 'applyBonus() returns 409 BALANCE_CHANGED (with `available`) when amount > usable balance, 400 when amount > send_amount, 409 ALREADY_APPLIED when the transfer already has an APPLIED row; there is deliberately no minimum send amount (D9).',
        where: ['server/bonus/wallet.js'],
    })(async () => {
        const c = cust();
        await grant(c, 5);
        const over = await apply(c, 6, cust('P'));
        expect(over.status).toBe(409);
        expect(over.body).toMatchObject({ error: 'BALANCE_CHANGED', available: 5 });
        const tooBig = await apply(c, 5, cust('P'), { send_amount: 4 });
        expect(tooBig.status).toBe(400);
        expect(tooBig.body.message).toBe('Bonus cannot be more than the send amount.');
        const t = cust('P');
        expect((await apply(c, 2, t, { send_amount: 2.5 })).status).toBe(200); // tiny send amounts are fine
        const twice = await apply(c, 1, t);
        expect(twice.status).toBe(409);
        expect(twice.body.error).toBe('ALREADY_APPLIED');
        expect((await apply(c, 0, cust('P'))).status).toBe(400);
        expect((await apply(c, 3, cust('P'))).body.available).toBe(0);
        expect((await apply(c, 0.01, cust('P'))).status).toBe(409); // balance floors at 0
        expect((await balance(c)).available).toBe(0);
    });

    rule('BONUS-15', 'Bonus used on a transfer that is cancelled, failed or refunded comes back to the same sources, once', {
        why: 'The customer did not get the transfer, so they get the bonus back (D10). Doing it twice would print money.',
        fix: 'handleTransferEvent() calls wallet.releaseBonus() for failing statuses: new EARNED rows (BONUS_RETURNED) with the original credit_source, guarded by reference_id "return:<transfer>". POST /api/wallet/:id/release does the same.',
        where: ['server/bonus/wallet.js', 'server/bonus/engine.js'],
    })(async () => {
        const c = cust();
        await grant(c, 4);
        await bonus.issueCredit({ customerId: c, amount: 6, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFEREE', referenceId: `${c}:referee`, notes: 'Referee reward – invited by Ada O.' });
        const t = cust('P');
        await apply(c, 7, t).expect(200);
        const cancelled = await event(t, c, 100, { status: 'CANCELLED' });
        expect(cancelled.body.returned).toBe(7);
        expect((await event(t, c, 100, { status: 'CANCELLED' })).body.returned).toBe(0);
        expect((await request(app).post(`/api/wallet/${c}/release`).send({ transfer_id: t })).body.returned).toBe(0);
        const w = await walletOf(c);
        expect(w.balances[0].available).toBe(10);
        const returned = w.credits.filter((x) => x.reason_code === 'BONUS_RETURNED').map((x) => [x.credit_source, x.amount]).sort();
        expect(returned).toEqual([['MANUAL', 4], ['REFERRAL', 3]]);
    });

    rule('BONUS-16', 'A returned credit keeps its original expiry, or gets a 14-day grace if that has passed', {
        why: 'Returning bonus must not resurrect long-dead credit, but a customer who cancels the day after expiry should still have time to use it.',
        fix: 'releaseBonus(): expiresOn = source.expires_at if still in the future, otherwise today + RETURN_GRACE_DAYS (14).',
        where: ['server/bonus/wallet.js'],
    })(async () => {
        setNow('2030-03-01T09:00:00Z');
        const c = cust();
        await grant(c, 5, { validity_days: 10 }); // expires 2030-03-11
        const t = cust('P');
        await apply(c, 5, t).expect(200);
        setNow('2030-03-20T09:00:00Z'); // the credit's date has passed
        await event(t, c, 100, { status: 'REFUNDED' });
        const w = await walletOf(c);
        const back = w.credits.find((x) => x.reason_code === 'BONUS_RETURNED');
        expect(back.expires_on).toBe('2030-04-03'); // 20 March + 14 days
        expect(w.balances[0].available).toBe(5);
    });
});

describe('Expiry, reversal, debt and blocks', () => {
    rule('BONUS-17', 'The daily job expires only what is left of overdue credit, once, and warns 7 days ahead once', {
        why: 'Customers are promised an expiry date. Expiring too early costs trust; expiring twice corrupts the ledger.',
        fix: 'jobs.runJobs() -> wallet.expireDue() writes an EXPIRED row for the remaining part of credits with expires_at < today (skipping already expired/reversed) and expiringReminders() emits one BONUS_EXPIRING per credit at exactly 7 days. It is the only expiry job for every source.',
        where: ['server/bonus/wallet.js', 'server/bonus/jobs.js'],
    })(async () => {
        setNow('2031-05-01T10:00:00Z');
        const c = cust();
        await grant(c, 5, { validity_days: 7 });
        await grant(c, 3, { validity_days: 1 });
        const first = (await request(app).post('/api/bonus/run-jobs')).body;
        expect(first.expiring_reminders).toBeGreaterThanOrEqual(1);
        const again = (await request(app).post('/api/bonus/run-jobs')).body;
        expect(again.expiring_reminders).toBe(0); // one reminder per credit
        expect((await balance(c)).available).toBe(8);
        setNow('2031-05-04T10:00:00Z'); // the 1-day credit is overdue, the 7-day one is not
        const expired = (await request(app).post('/api/bonus/run-jobs')).body;
        expect(expired.credits_expired).toBeGreaterThanOrEqual(1);
        const b = await balance(c);
        expect(b).toMatchObject({ available: 5, expired: 3 });
        expect((await request(app).post('/api/bonus/run-jobs')).body.credits_expired).toBe(0);
        // expired credit can no longer be spent
        expect((await apply(c, 6, cust('P'))).status).toBe(409);
    });

    rule('BONUS-18', 'A refunded or cancelled transfer takes back the scheme bonus it earned, once; FAILED takes it back without a strike', {
        why: 'The bonus was a reward for a transfer that did not stand. A FAILED transfer is not the customer\'s doing, so it is not counted against them.',
        fix: 'handleTransferEvent() -> reverseEvent(): writes a VOIDED/SCHEME_REVERSAL row for what is unused (guarded by source_credit_id), then blocks.recordStrike() unless the outcome is FAILED.',
        where: ['server/bonus/engine.js'],
    })(async () => {
        await scheme({ min_transaction_threshold: 0, credit_amount: 6 });
        const c = cust();
        const t = cust('T');
        await event(t, c, 40);
        expect((await balance(c)).available).toBe(6);
        const refund = await event(t, c, 40, { status: 'REFUNDED' });
        expect(refund.body.reversed).toEqual([expect.objectContaining({ voided: 6, clawed_back: 0, strikes: 1 })]);
        expect((await balance(c)).available).toBe(0);
        expect((await event(t, c, 40, { status: 'REFUNDED' })).body.reversed).toEqual([]);

        const f = cust();
        const t2 = cust('T');
        await event(t2, f, 40);
        const failed = await event(t2, f, 40, { status: 'FAILED' });
        expect(failed.body.reversed[0].voided).toBe(6);
        expect(failed.body.reversed[0].strikes).toBeUndefined();
        expect((await request(app).get(`/api/bonus-blocks/${f}`)).body.strikes).toHaveLength(0);
    });

    rule('BONUS-19', 'Reversing bonus that was already spent creates a debt, the balance never goes below zero, and the next bonus repays it', {
        why: 'Mito cannot take back money the customer already used, but it must not give it away: the spent part is owed and repaid from future bonus (BS-50, BS-51).',
        fix: 'debt.clawback() writes a negative CLAWBACK row without touching the credit\'s remaining; debt.settle() runs on every new credit and offsets it (VOIDED CLAWBACK_OFFSET + CLAWBACK_SETTLED). BONUS_CLAWBACK=off disables clawback.',
        where: ['server/bonus/debt.js', 'server/bonus/engine.js'],
    })(async () => {
        await scheme({ min_transaction_threshold: 0, credit_amount: 10, currency: 'EUR' });
        const c = cust();
        const t = cust('T');
        await event(t, c, 40, { currency: 'EUR' });
        await apply(c, 7, cust('P'), { currency: 'EUR' }).expect(200);
        const refund = await event(t, c, 40, { currency: 'EUR', status: 'REFUNDED' });
        expect(refund.body.reversed[0]).toMatchObject({ voided: 3, clawed_back: 7 });
        let b = await balance(c, 'EUR');
        expect(b).toMatchObject({ available: 0, outstanding_debt: 7 });
        expect((await event(t, c, 40, { currency: 'EUR', status: 'REFUNDED' })).body.reversed).toEqual([]);
        await event(cust('T'), c, 40, { currency: 'EUR' }); // pays 10 again: 7 repays the debt
        b = await balance(c, 'EUR');
        expect(b).toMatchObject({ outstanding_debt: 0, available: 3 });
    });

    rule('BONUS-20', 'With BONUS_CLAWBACK=off only unused bonus is taken back and no debt is recorded', {
        why: 'Finance can switch off clawback by configuration; the code must honour it without a deploy.',
        fix: 'debt.enabled() reads process.env.BONUS_CLAWBACK on every call ("off" disables).',
        where: ['server/bonus/debt.js'],
    })(async () => {
        process.env.BONUS_CLAWBACK = 'off';
        await scheme({ min_transaction_threshold: 0, credit_amount: 5, currency: 'ZAR' });
        const c = cust();
        const t = cust('T');
        await event(t, c, 40, { currency: 'ZAR' });
        await apply(c, 5, cust('P'), { currency: 'ZAR' }).expect(200);
        await event(t, c, 40, { currency: 'ZAR', status: 'REFUNDED' });
        expect((await balance(c, 'ZAR')).outstanding_debt).toBe(0);
    });

    rule('BONUS-21', 'Three cancelled/refunded bonus-earning transfers block the customer from earning until a Growth Manager lifts it', {
        why: 'Abuse guard: repeatedly earning then cancelling is a loss for Mito. The block covers scheme bonuses and referral rewards, and the customer is never told the reason.',
        fix: 'blocks.recordStrike() blocks at BONUS_BLOCK_STRIKES (default 3); checkEligibility() returns BONUS_BLOCKED (also for manual awards); POST /api/bonus-blocks/:id/lift needs the GROWTH_MANAGER token and a 10-250 char reason, and restarts the strike count. wallet.bonus_blocked exposes only the fact.',
        where: ['server/bonus/blocks.js', 'server/bonus/engine.js'],
    })(async () => {
        const s = await scheme({ min_transaction_threshold: 0, credit_amount: 4 });
        const c = cust();
        for (let n = 1; n <= 3; n++) {
            const t = cust('T');
            await event(t, c, 40);
            const res = await event(t, c, 40, { status: n === 2 ? 'CANCELLED' : 'REFUNDED' });
            expect(res.body.reversed[0]).toMatchObject({ strikes: n, blocked: n === 3 });
        }
        const blockedEarn = await event(cust('T'), c, 40);
        expect(outcome(blockedEarn, s)).toMatchObject({ status: 'SKIPPED', reason: 'BONUS_BLOCKED' });
        expect((await request(app).post('/api/credits/award-bonus').send({ user_id: c, scheme_id: s })).body.error).toBe('BONUS_BLOCKED');
        const w = await walletOf(c);
        expect(w.bonus_blocked).toBe(true);
        expect(JSON.stringify(w)).not.toMatch(/strike|Growth Manager/i);
        const url = `/api/bonus-blocks/${c}/lift`;
        expect((await request(app).post(url).send({ reason: 'Spoke to the customer, fine' })).status).toBe(401);
        expect((await request(app).post(url).set('Authorization', 'Bearer gm-token').send({ reason: 'short' })).status).toBe(400);
        await request(app).post(url).set('Authorization', 'Bearer gm-token').send({ reason: 'Spoke to the customer, genuine mistakes' }).expect(200);
        expect(outcome(await event(cust('T'), c, 40), s)).toMatchObject({ status: 'AWARDED' });
        expect((await request(app).get(`/api/bonus-blocks/${c}`)).body.strikes).toHaveLength(0);
    });
});

describe('Idempotency, manual credits, feed and admin ledger', () => {
    rule('BONUS-22', 'Repeating an event, an idempotency key or a referenceId never pays twice', {
        why: 'Rhemito retries events and admins double-click. Money must move once.',
        fix: 'triggerEvent() skips DUPLICATE_EVENT (reference evt:<scheme>:<event>); manualAdjust() and awardScheme() honour idempotency_key (reference idem_<key>); wallet.issueCredit() returns { duplicate: true } for an existing (user, referenceId).',
        where: ['server/bonus/engine.js', 'server/bonus/wallet.js'],
    })(async () => {
        const s = await scheme({ min_transaction_threshold: 0, credit_amount: 5 });
        const c = cust();
        const t = cust('T');
        expect(outcome(await event(t, c, 10), s)).toMatchObject({ status: 'AWARDED' });
        expect(outcome(await event(t, c, 10), s)).toMatchObject({ status: 'SKIPPED', reason: 'DUPLICATE_EVENT' });
        expect((await balance(c)).available).toBe(5);

        const key = cust('K');
        expect((await grant(c, 10, { idempotency_key: key })).body.success).toBe(true);
        expect((await grant(c, 10, { idempotency_key: key })).body.idempotent).toBe(true);
        expect((await balance(c)).available).toBe(15);

        const a = await bonus.issueCredit({ customerId: c, amount: 2, currency: 'GBP', creditSource: 'MANUAL', creditSourceDetail: 'GOODWILL', referenceId: `${c}:once` });
        const b = await bonus.issueCredit({ customerId: c, amount: 2, currency: 'GBP', creditSource: 'MANUAL', creditSourceDetail: 'GOODWILL', referenceId: `${c}:once` });
        expect(b).toMatchObject({ creditId: a.creditId, duplicate: true });
        expect((await balance(c)).available).toBe(17);
    });

    rule('BONUS-23', 'Manual grants are tagged MANUAL with their reason, need a note, and removal cannot exceed the available balance', {
        why: 'Manual adjustments move real money; they need a reason code, an explanation, and must not drive the balance negative.',
        fix: 'manualAdjust() requires reason_code in MANUAL_REASONS and notes of 10-500 chars; EARNED -> issueCredit(MANUAL/<reason>); VOIDED walks usable credits (each void row linked by source_credit_id) and rejects amount > available.',
        where: ['server/bonus/wallet.js'],
    })(async () => {
        const c = cust();
        const g = await grant(c, 10, { reason_code: 'CORRECTION' });
        expect(g.body).toMatchObject({ success: true, new_balance_impact: 10 });
        expect((await walletOf(c)).credits[0]).toMatchObject({ credit_source: 'MANUAL', credit_source_detail: 'CORRECTION' });
        expect((await grant(c, 1, { notes: 'too short' })).body.error).toBe('Enter notes of 10–500 characters.');
        expect((await grant(c, 1, { reason_code: 'BECAUSE' })).status).toBe(400);
        const tooMuch = await request(app).post('/api/credits/manual').send({ user_id: c, amount: 50, type: 'VOIDED', reason_code: 'CORRECTION', notes: 'Removing an over-grant', currency: 'GBP' });
        expect(tooMuch.status).toBe(400);
        expect(tooMuch.body.error).toBe('You can remove at most £10.00.');
        await request(app).post('/api/credits/manual').send({ user_id: c, amount: 4, type: 'VOIDED', reason_code: 'CORRECTION', notes: 'Removing an over-grant', currency: 'GBP' }).expect(200);
        const w = await walletOf(c);
        expect(w.balances[0].available).toBe(6);
        expect(w.history.find((h) => h.type === 'VOIDED').source_credit_id).toBeTruthy();
    });

    rule('BONUS-24', 'The notification feed announces each bonus event once, in order, and pages by id', {
        why: 'Rhemito turns the feed into push/bell notifications. Duplicates spam the customer; gaps hide money moving.',
        fix: 'feed.emit() inserts with a dedupe_key (INSERT OR IGNORE): be:<credit>, bu:<customer>:<transfer>, br:<customer>:<transfer>, bv:<customer>:<event>, bx:<credit>. GET /api/bonus/feed supports since_id, limit and customer_id.',
        where: ['server/bonus/feed.js', 'server/bonus/wallet.js'],
    })(async () => {
        const c = cust();
        await grant(c, 6);
        const t = cust('P');
        await apply(c, 2, t).expect(200);
        await request(app).post(`/api/wallet/${c}/release`).send({ transfer_id: t }).expect(200);
        await request(app).post(`/api/wallet/${c}/release`).send({ transfer_id: t }).expect(200); // repeat
        const feed = (await request(app).get(`/api/bonus/feed?customer_id=${c}`)).body;
        expect(feed.data.map((f) => f.type)).toEqual(['BONUS_EARNED', 'BONUS_USED', 'BONUS_RETURNED']);
        expect(feed.data[2].payload).toMatchObject({ amount: 2, currency: 'GBP', by_source: [{ credit_source: 'MANUAL', amount: 2 }] });
        const later = (await request(app).get(`/api/bonus/feed?customer_id=${c}&since_id=${feed.data[0].id}`)).body;
        expect(later.data.map((f) => f.type)).toEqual(['BONUS_USED', 'BONUS_RETURNED']);
        expect((await request(app).get(`/api/bonus/feed?customer_id=${c}&since_id=${feed.last_id}`)).body.data).toEqual([]);

        // expiry is announced too, once however often the job runs
        setNow('2032-02-01T10:00:00Z');
        const d = cust();
        await grant(d, 3, { validity_days: 1 });
        setNow('2032-02-05T10:00:00Z');
        await request(app).post('/api/bonus/run-jobs').expect(200);
        await request(app).post('/api/bonus/run-jobs').expect(200);
        const types = (await request(app).get(`/api/bonus/feed?customer_id=${d}`)).body.data.map((f) => f.type);
        expect(types).toEqual(['BONUS_EARNED', 'BONUS_EXPIRED']);
    });

    rule('BONUS-25', 'The bonus feed does not announce referral credits (the referral module tells the customer itself)', {
        why: 'Otherwise a referral reward produces two notifications.',
        fix: 'wallet.issueCredit() only emits BONUS_EARNED when creditSource !== "REFERRAL".',
        where: ['server/bonus/wallet.js'],
    })(async () => {
        const c = cust();
        await bonus.issueCredit({ customerId: c, amount: 5, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFEREE', referenceId: `${c}:referee`, notes: 'Referee reward – invited by Ada O.' });
        expect((await request(app).get(`/api/bonus/feed?customer_id=${c}`)).body.data).toEqual([]);
        expect((await balance(c)).available).toBe(5);
    });

    rule('BONUS-26', 'The admin ledger labels every row with its source and can filter by creditSource', {
        why: 'Growth analyses referral vs scheme vs goodwill cost from this screen; unlabeled rows are unaccounted cost.',
        fix: 'ledger.bonusRows() adds credit_source/credit_source_detail/credit_source_label (negative rows inherit the source of the credit they came from). Query param: creditSource=SCHEME|REFERRAL|MANUAL on /api/credits/all.',
        where: ['server/bonus/ledger.js', 'server/bonus/wallet.js'],
    })(async () => {
        await scheme({ name: `Ledger ${seq++}`, min_transaction_threshold: 0, credit_amount: 7 });
        const c = cust();
        await event(cust('T'), c, 100);
        await grant(c, 2);
        await bonus.issueCredit({ customerId: c, amount: 4, currency: 'GBP', creditSource: 'REFERRAL', creditSourceDetail: 'REFERRER', referenceId: `${c}:referrer`, notes: 'Referrer reward – referred Sam S.' });
        await apply(c, 8, cust('P')).expect(200);
        const rows = (await request(app).get(`/api/credits/all?customerId=${c}`)).body.history;
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((r) => r.credit_source && r.credit_source_label)).toBe(true);
        const labels = rows.filter((r) => r.type === 'EARNED').map((r) => r.credit_source_label).sort();
        expect(labels).toEqual(['Bonus offers · Large transfer', 'From Rhemito · Goodwill', 'Referrals · Referrer']);
        for (const src of ['SCHEME', 'MANUAL', 'REFERRAL']) {
            const only = (await request(app).get(`/api/credits/all?customerId=${c}&creditSource=${src}`)).body.history;
            expect(only.length).toBeGreaterThan(0);
            expect(only.every((r) => r.credit_source === src)).toBe(true);
        }
    });

    rule('BONUS-27', 'Offers lists only live ACTIVE schemes; an event without its ids is refused; the service key is enforced when set', {
        why: 'Customers see offers from this list, so it must never show ended/switched-off schemes; events without ids cannot be made idempotent; the key protects the service API in production.',
        fix: 'GET /api/bonus/offers filters displayStatus === "Active"; POST /api/bonus/transfer-events returns 400 VALIDATION without transfer_id/customer_id/status; serviceKey() checks X-Bonus-Service-Key when BONUS_SERVICE_KEY is set.',
        where: ['server/bonus/schemes.js', 'server/bonus/service.js'],
    })(async () => {
        const live = await scheme({ currency: 'KES', min_transaction_threshold: 0 });
        const ended = await scheme({ currency: 'KES', start_date: '2020-01-01', end_date: '2020-12-31', min_transaction_threshold: 0 });
        const offers = (await request(app).get('/api/bonus/offers?currency=KES')).body.data.map((o) => o.id);
        expect(offers).toContain(live);
        expect(offers).not.toContain(ended);
        expect((await request(app).post('/api/bonus/transfer-events').send({ customer_id: 'U' })).status).toBe(400);
        process.env.BONUS_SERVICE_KEY = 'contract-key';
        expect((await request(app).get('/api/wallet/anyone')).status).toBe(401);
        expect((await request(app).get('/api/wallet/anyone').set('X-Bonus-Service-Key', 'contract-key')).status).toBe(200);
    });
});
