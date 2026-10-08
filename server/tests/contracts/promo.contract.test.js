// PROMO contract: the rules the Promo Code module (server/promo/*) is implemented to. Each rule explains itself when it fails.
const request = require('supertest');
const { rule, bootApp, waitForSeed } = require('./_contract');

const app = bootApp('promo');
const promoModule = require('../../promo');

const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();
let seq = 0;
const uniq = () => `PC${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`.slice(0, 20);

beforeAll(async () => { await waitForSeed(app, request); });

const create = async (over = {}) => {
    const code = over.code || uniq();
    const res = await request(app).post('/api/promocodes').send({
        code, type: 'Fixed', value: 5, currency: 'GBP', min_threshold: 0, usage_limit_per_user: 1, start_date: iso(-1), end_date: iso(30), ...over,
    });
    if (res.status !== 200) throw new Error(`test setup: could not create promo ${code}: ${JSON.stringify(res.body)}`);
    return { code, id: res.body.id };
};
const validate = (code, over = {}) => request(app).post('/api/promocodes/validate').send({
    code, amount: 100, fee: 3, currency: 'GBP', userId: 'CUST', sourceCurrency: 'GBP', destCurrency: 'NGN', paymentMethod: 'bank_deposit', ...over,
});
const redeem = (code, txn, over = {}) => request(app).post('/api/promocodes/redeem').send({
    code, transactionId: txn, amount: 100, fee: 3, currency: 'GBP', userId: 'CUST', sourceCurrency: 'GBP', destCurrency: 'NGN', ...over,
});
const promoEvent = (id, customer, status, over = {}) => request(app).post('/api/promocodes/transfer-events').send({
    transfer_id: id, customer_id: customer, amount: 100, currency: 'GBP', receive_currency: 'NGN', status, created_at: new Date().toISOString(), ...over,
});
const row = async (code) => (await request(app).get('/api/promocodes')).body.data.find((p) => p.code === code);
const setStatus = (id, status) => request(app).put(`/api/promocodes/${id}/status`).send({ status });
// Move a code's dates after creation (a code cannot be created already ended, but an unused code can be edited)
const redate = (id, code, start, end) => request(app).put(`/api/promocodes/${id}`).send({
    code, type: 'Fixed', value: 5, min_threshold: 0, currency: 'GBP', usage_limit_per_user: 1, start_date: start, end_date: end,
});

const FILE = 'server/promo/engine.js';

describe('Promo code validation: every rejection has its own reason', () => {
    rule('PROMO-01', 'An unknown code is refused as INVALID_CODE (404) and a disabled code as INACTIVE', {
        why: 'Rhemito reads body.error as the customer text and body.code as the machine reason. A mixed-up reason shows the customer the wrong message.',
        fix: 'check() in promo/engine.js looks the code up first (404 INVALID_CODE), then requires promo.status === "Active" (400 INACTIVE).',
        where: [FILE, 'server/promo/errors.js'],
    })(async () => {
        const unknown = await validate('NOSUCHCODE1');
        expect(unknown.status).toBe(404);
        expect(unknown.body.code).toBe('INVALID_CODE');
        const { code, id } = await create();
        await setStatus(id, 'Disabled').expect(200);
        const off = await validate(code);
        expect(off.status).toBe(400);
        expect(off.body.code).toBe('INACTIVE');
        await setStatus(id, 'Active').expect(200);
        expect((await validate(code)).status).toBe(200);
    });

    rule('PROMO-02', 'A code that has not started is NOT_STARTED, and an ended code is EXPIRED (two different reasons)', {
        why: 'Customers who try a code early must be told to wait, not that it is dead. Support relies on the difference.',
        fix: 'check() compares start_date > now (NOT_STARTED, "not valid yet") before end_date < now (EXPIRED). Admin status shows "Scheduled" for the first.',
        where: [FILE],
    })(async () => {
        const future = await create({ start_date: iso(2), end_date: iso(10) });
        const early = await validate(future.code);
        expect(early.status).toBe(400);
        expect(early.body.code).toBe('NOT_STARTED');
        expect((await row(future.code)).display_status).toBe('Scheduled');

        const old = await create();
        await redate(old.id, old.code, '2020-01-01T00:00:00Z', '2020-02-01T00:00:00Z').expect(200);
        const late = await validate(old.code);
        expect(late.status).toBe(400);
        expect(late.body.code).toBe('EXPIRED');
    });

    rule('PROMO-03', 'A transfer below the minimum threshold is BELOW_MIN and the minimum itself is allowed', {
        why: 'The threshold is the lowest send amount the code was funded for; exactly the threshold must still qualify (inclusive).',
        fix: 'check() rejects only when amount < min_threshold (strict less-than). The check is skipped when no amount is sent.',
        where: [FILE],
    })(async () => {
        const { code } = await create({ min_threshold: 50 });
        const below = await validate(code, { amount: 49.99 });
        expect(below.status).toBe(400);
        expect(below.body.code).toBe('BELOW_MIN');
        expect((await validate(code, { amount: 50 })).status).toBe(200);
        expect((await validate(code, { amount: undefined })).status).toBe(200);
    });

    rule('PROMO-04', 'A code only works on the currency it was created for (CURRENCY)', {
        why: 'Discounts are money in one currency. Applying a GBP value to a USD fee would give away the wrong amount.',
        fix: 'check() compares the request currency (or sourceCurrency) with promo.currency and returns CURRENCY.',
        where: [FILE],
    })(async () => {
        const { code } = await create({ currency: 'GBP' });
        const wrong = await validate(code, { currency: 'USD', sourceCurrency: 'USD' });
        expect(wrong.status).toBe(400);
        expect(wrong.body.code).toBe('CURRENCY');
        expect((await validate(code, { currency: 'GBP' })).status).toBe(200);
    });

    rule('PROMO-05', 'Corridor restrictions reject other destinations (CORRIDOR); no restriction means every corridor', {
        why: 'Marketing funds specific corridors. A code for GBP-GHS must not discount GBP-NGN transfers.',
        fix: 'restrictions.corridors holds "SRC-DEST" pairs; check() compares `${source}-${dest}` and returns CORRIDOR. An empty list means all corridors.',
        where: [FILE],
    })(async () => {
        const gated = await create({ restrictions: { corridors: ['GBP-GHS'] } });
        const miss = await validate(gated.code, { destCurrency: 'NGN' });
        expect(miss.status).toBe(400);
        expect(miss.body.code).toBe('CORRIDOR');
        expect((await validate(gated.code, { destCurrency: 'GHS' })).status).toBe(200);
        const open = await create();
        expect((await validate(open.code, { destCurrency: 'KES' })).status).toBe(200);
    });

    rule('PROMO-06', 'Payment method restrictions match Mito names and Rhemito ids alike, and wait until a method is chosen', {
        why: 'Mito Admin lists "Bank Transfer"; Rhemito sends "bank_deposit" / "instant_bank". Treating them as different would block valid customers or let restricted methods through.',
        fix: 'paymentMethodKey() in promo/engine.js maps aliases to one key; the check only runs when n.paymentMethod is present (customer has not picked one yet).',
        where: [FILE],
    })(async () => {
        const card = await create({ restrictions: { payment_methods: ['Card'] } });
        const bank = await validate(card.code, { paymentMethod: 'bank_deposit' });
        expect(bank.status).toBe(400);
        expect(bank.body.code).toBe('PAYMENT_METHOD');
        expect((await validate(card.code, { paymentMethod: 'card' })).status).toBe(200);
        expect((await validate(card.code, { paymentMethod: undefined })).status).toBe(200);
        const transfer = await create({ restrictions: { payment_methods: ['Bank Transfer'] } });
        for (const id of ['bank_deposit', 'instant_bank', 'manual_transfer']) expect((await validate(transfer.code, { paymentMethod: id })).status).toBe(200);
    });

    rule('PROMO-07', 'Audience: a personal code is only for its customer, new/existing follow completed transfers', {
        why: 'Personal codes are issued as compensation or gifts; if another customer can use one, the budget leaks.',
        fix: 'audienceOf() reads user_segment; targeted / specific_customers return NOT_YOUR_CODE (403); new_customers / existing_customers use COMPLETED rows in promo_transfers and return SEGMENT (403).',
        where: [FILE],
    })(async () => {
        const mine = await create({ user_segment: { type: 'targeted', user_id: 'OWNER-1' } });
        const other = await validate(mine.code, { userId: 'SOMEONE' });
        expect(other.status).toBe(403);
        expect(other.body.code).toBe('NOT_YOUR_CODE');
        expect((await validate(mine.code, { userId: 'OWNER-1' })).status).toBe(200);

        const fresh = await create({ user_segment: { type: 'new_customers' } });
        const loyal = await create({ user_segment: { type: 'existing_customers' } });
        expect((await validate(fresh.code, { userId: 'AUD-X' })).status).toBe(200);
        expect((await validate(loyal.code, { userId: 'AUD-X' })).body.code).toBe('SEGMENT');
        await promoEvent('AUD-X-T1', 'AUD-X', 'COMPLETED').expect(200);
        expect((await validate(fresh.code, { userId: 'AUD-X' })).body.code).toBe('SEGMENT');
        expect((await validate(loyal.code, { userId: 'AUD-X' })).status).toBe(200);
    });
});

describe('Usage limits: what counts as a use', () => {
    rule('PROMO-08', 'First use is never reported as "already used"; validate records nothing', {
        why: 'Regression: a validated-only code (customer still building the transfer) was counted as used, so the customer saw "You have already used this promo code" on their first real attempt.',
        fix: 'validate() only reads. Only redeem() inserts a promo_redemptions row with status Redeemed and bumps usage_count; userRedemptions() counts Redeemed rows only.',
        where: [FILE, 'server/promo/service.js'],
    })(async () => {
        const { code } = await create({ usage_limit_per_user: 1 });
        for (let i = 0; i < 3; i++) {
            const res = await validate(code, { userId: 'FIRST-USER' });
            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(true);
        }
        expect((await row(code)).usage_count).toBe(0);
        const rows = (await request(app).get(`/api/promocodes/${(await row(code)).id}/redemptions`)).body.data;
        expect(rows).toEqual([]);
    });

    rule('PROMO-09', 'The per-customer limit counts only Redeemed rows, and the limit is exact', {
        why: 'A customer with limit N may use the code N times, not N-1 and not N+1. Released rows must not count.',
        fix: 'userRedemptions() counts promo_redemptions WHERE COALESCE(status,"Redeemed") = "Redeemed"; check() throws ALREADY_USED when count >= usage_limit_per_user (-1 = unlimited).',
        where: [FILE],
    })(async () => {
        const two = await create({ usage_limit_per_user: 2 });
        expect((await redeem(two.code, 'LIM-1', { userId: 'LIM' })).status).toBe(200);
        expect((await validate(two.code, { userId: 'LIM' })).status).toBe(200);
        expect((await redeem(two.code, 'LIM-2', { userId: 'LIM' })).status).toBe(200);
        const third = await validate(two.code, { userId: 'LIM' });
        expect(third.status).toBe(400);
        expect(third.body.code).toBe('ALREADY_USED');
        expect((await validate(two.code, { userId: 'OTHER-LIM' })).status).toBe(200);

        const unlimited = await create({ usage_limit_per_user: -1 });
        for (const n of [1, 2, 3]) expect((await redeem(unlimited.code, `UNL-${n}`, { userId: 'UNL' })).status).toBe(200);
    });

    rule('PROMO-10', 'A failed, cancelled or refunded transfer releases the use and frees the customer\'s limit', {
        why: 'The customer got nothing, so the use must come back; otherwise a failed payment burns their one-time promo.',
        fix: 'handleTransferEvent() calls release() for CANCELLED/FAILED/REFUNDED/RECALLED/CHARGEBACK: redemption row -> Released, usage_count and total_discount_utilized go down (never below 0).',
        where: [FILE],
    })(async () => {
        for (const status of ['CANCELLED', 'FAILED', 'REFUNDED', 'RECALLED', 'CHARGEBACK']) {
            const { code } = await create({ usage_limit_per_user: 1, usage_limit_global: 5 });
            const user = `REL-${status}`;
            await redeem(code, `${user}-T`, { userId: user }).expect(200);
            expect((await validate(code, { userId: user })).body.code).toBe('ALREADY_USED');
            const ev = await promoEvent(`${user}-T`, user, status);
            expect(ev.body.released).toBe(1);
            expect((await validate(code, { userId: user })).status).toBe(200);
            const after = await row(code);
            expect(after.usage_count).toBe(0);
            expect(after.total_discount_utilized).toBe(0);
        }
    });

    rule('PROMO-11', 'The global usage limit stops further redemptions (FULLY_REDEEMED) and cannot be beaten by two simultaneous payments', {
        why: 'The limit is the marketing budget in uses. Two customers paying at the same moment must not both get the last use.',
        fix: 'check() throws FULLY_REDEEMED when usage_count >= usage_limit_global; redeem() runs inside exclusive() so checks and counter updates are serialised.',
        where: [FILE],
    })(async () => {
        const { code } = await create({ usage_limit_global: 1, usage_limit_per_user: -1 });
        const results = await Promise.all([redeem(code, 'RACE-A', { userId: 'RA' }), redeem(code, 'RACE-B', { userId: 'RB' })]);
        expect(results.filter((r) => r.status === 200)).toHaveLength(1);
        expect((await row(code)).usage_count).toBe(1);
        const next = await validate(code, { userId: 'RC' });
        expect(next.status).toBe(400);
        expect(next.body.code).toBe('FULLY_REDEEMED');
    });

    rule('PROMO-12', 'The budget limit reduces the last discount to what is left, then refuses (BUDGET_SPENT)', {
        why: 'A budget is money. The last customer gets the remainder, never more than was funded.',
        fix: 'redeem() computes left = budget_limit - total_discount_utilized and caps the discount to it; at 0 it throws BUDGET_SPENT.',
        where: [FILE],
    })(async () => {
        const { code } = await create({ value: 3, budget_limit: 4, usage_limit_per_user: -1 });
        expect((await redeem(code, 'BUD-1', { userId: 'B1' })).body.discount).toBe(3);
        expect((await redeem(code, 'BUD-2', { userId: 'B2' })).body.discount).toBe(1);
        const spent = await redeem(code, 'BUD-3', { userId: 'B3' });
        expect(spent.status).toBe(400);
        expect(spent.body.code).toBe('BUDGET_SPENT');
    });
});

describe('Discount amounts', () => {
    rule('PROMO-13', 'A Fixed discount is the stated value but never more than the fee', {
        why: 'The promo discounts the fee (appliesTo: "fee"). It must never pay the customer more than the fee they would be charged.',
        fix: 'computeDiscount() in promo/engine.js: Fixed -> value, then min(discount, fee). validate returns appliesTo "fee".',
        where: [FILE],
    })(async () => {
        const { code } = await create({ type: 'Fixed', value: 5 });
        const small = await validate(code, { fee: 1 });
        expect(small.body).toMatchObject({ valid: true, appliedDiscount: 1, appliesTo: 'fee' });
        expect((await validate(code, { fee: 8 })).body.appliedDiscount).toBe(5);
    });

    rule('PROMO-14', 'A Percentage discount is a percentage of the FEE, capped by max_discount and by the fee', {
        why: 'Percentage codes are fee promotions, not send-amount promotions. Taking the percentage of the amount would be a much larger giveaway.',
        fix: 'computeDiscount(): Percentage -> fee * value / 100, then max_discount cap, then fee cap, rounded per currency.',
        where: [FILE],
    })(async () => {
        const { code } = await create({ type: 'Percentage', value: 50, max_discount: 2 });
        expect((await validate(code, { fee: 10, amount: 1000 })).body.appliedDiscount).toBe(2); // 5 capped at 2, not 500
        expect((await validate(code, { fee: 2, amount: 1000 })).body.appliedDiscount).toBe(1); // under the cap
        const uncapped = await create({ type: 'Percentage', value: 100 });
        expect((await validate(uncapped.code, { fee: 4.5 })).body.appliedDiscount).toBe(4.5);
    });

    rule('PROMO-15', 'A Waiver discounts exactly the fee', {
        why: 'Fee waiver means the customer pays no fee: not a fixed amount, not a percentage.',
        fix: 'computeDiscount(): Waiver -> fee (0 if no fee is sent), still subject to max_discount.',
        where: [FILE],
    })(async () => {
        const { code } = await create({ type: 'Waiver', value: 100 });
        expect((await validate(code, { fee: 3.5 })).body.appliedDiscount).toBe(3.5);
        expect((await validate(code, { fee: 12 })).body).toMatchObject({ appliedDiscount: 12, displayText: 'Fees waived' });
    });

    rule('PROMO-16', 'The discount is recomputed at redeem time and never taken from the caller', {
        why: 'Rhemito must not be able to inflate a discount by posting a bigger number. The module is the source of truth.',
        fix: 'redeem() calls check() again and stores computeDiscount() output; a discount_amount in the request body is ignored.',
        where: [FILE],
    })(async () => {
        const { code } = await create({ type: 'Fixed', value: 5 });
        const res = await redeem(code, 'TRUST-1', { userId: 'TR', fee: 2, discount: 999, discount_amount: 999 });
        expect(res.body).toMatchObject({ success: true, discount: 2 });
    });
});

describe('Redeem, release and transfer events', () => {
    rule('PROMO-17', 'Redeem is idempotent per transfer: a retry returns the same result and counts one use', {
        why: 'Rhemito retries on timeouts. A retry must not burn a second use or a second discount.',
        fix: 'redeem() looks up (promo_code_id, transaction_id) first and returns { success: true, idempotent: true }. transaction_id is mandatory.',
        where: [FILE],
    })(async () => {
        const { code } = await create({ value: 1, usage_limit_per_user: 1 });
        const first = await redeem(code, 'IDEM-1', { userId: 'ID1', fee: 3 });
        expect(first.body).toMatchObject({ success: true, discount: 1 });
        const retry = await redeem(code, 'IDEM-1', { userId: 'ID1', fee: 3 });
        expect(retry.body).toMatchObject({ success: true, idempotent: true, discount: 1 });
        const after = await row(code);
        expect(after.usage_count).toBe(1);
        expect(after.total_discount_utilized).toBe(1);
        const noTxn = await request(app).post('/api/promocodes/redeem').send({ code, userId: 'ID2', amount: 100, fee: 3, currency: 'GBP' });
        expect(noTxn.status).toBe(400);
        expect(noTxn.body.code).toBe('VALIDATION');
    });

    rule('PROMO-18', 'Release is idempotent and a released transfer can never redeem again (RELEASED, 409)', {
        why: 'A cancelled transfer must not be able to take the use back later, and repeated cancel events must not hand back uses twice.',
        fix: 'release() only touches rows still Redeemed. redeem() returns 409 RELEASED when the transfer\'s row is Released. Counters use MAX(0, ...).',
        where: [FILE],
    })(async () => {
        const { code } = await create({ value: 1, usage_limit_per_user: -1 });
        await redeem(code, 'REL-1', { userId: 'RL1' }).expect(200);
        await redeem(code, 'REL-2', { userId: 'RL2' }).expect(200);
        const first = await request(app).post('/api/promocodes/release').send({ transaction_id: 'REL-1', code });
        expect(first.body.released).toBe(1);
        const again = await request(app).post('/api/promocodes/release').send({ transaction_id: 'REL-1', code });
        expect(again.body.released).toBe(0);
        expect((await row(code)).usage_count).toBe(1); // REL-2 still counts
        const reuse = await redeem(code, 'REL-1', { userId: 'RL1' });
        expect(reuse.status).toBe(409);
        expect(reuse.body.code).toBe('RELEASED');
    });

    rule('PROMO-19', 'Promo transfer events validate their input and keep the customer\'s history for audience rules', {
        why: 'The promo module owns its own record of transfers (promo_transfers); audience rules read it, not the bonus or referral tables.',
        fix: 'handleTransferEvent() requires transfer_id, customer_id and a known status (PAID, COMPLETED or a failure status) and upserts promo_transfers.',
        where: [FILE, 'server/promo/service.js'],
    })(async () => {
        expect((await request(app).post('/api/promocodes/transfer-events').send({ customer_id: 'X', status: 'COMPLETED' })).status).toBe(400);
        const unknown = await promoEvent('EV-U', 'EVC', 'WHATEVER');
        expect(unknown.status).toBe(400);
        expect(unknown.body.code).toBe('VALIDATION');
        expect((await promoEvent('EV-OK', 'EVC', 'PAID')).status).toBe(200);
    });

    rule('PROMO-20', 'A released or never-redeemed transfer is not shown as savings; redeemed ones are', {
        why: 'The customer\'s "you saved" total must match money actually discounted.',
        fix: 'savingsFor() sums only rows whose status is Redeemed, per currency; module read function: promo.savingsFor / listRedemptions.',
        where: [FILE, 'server/promo/index.js'],
    })(async () => {
        const { code } = await create({ value: 2, usage_limit_per_user: -1 });
        await redeem(code, 'SV-1', { userId: 'SAVER' }).expect(200);
        await redeem(code, 'SV-2', { userId: 'SAVER' }).expect(200);
        await promoEvent('SV-2', 'SAVER', 'CANCELLED').expect(200);
        const s = (await request(app).get('/api/promocodes/customers/SAVER/redemptions')).body;
        expect(s.summary.saved.GBP).toBe(2);
        expect(s.data.map((d) => d.status).sort()).toEqual(['Redeemed', 'Released']);
        expect((await promoModule.savingsFor('SAVER')).summary.saved.GBP).toBe(2);
    });

    rule('PROMO-21', 'A code that has been redeemed cannot be edited', {
        why: 'Changing the value of a code after customers used it would rewrite history in reports and audit.',
        fix: 'PUT /api/promocodes/:id returns 409 once the code has any redemption; create a new code instead.',
        where: ['server/promo/admin.js'],
    })(async () => {
        const { code, id } = await create();
        await redeem(code, 'ED-1', { userId: 'ED' }).expect(200);
        const edit = await request(app).put(`/api/promocodes/${id}`).send({ code, type: 'Fixed', value: 1, currency: 'GBP', start_date: iso(-1), end_date: iso(30) });
        expect(edit.status).toBe(409);
    });

    rule('PROMO-22', 'Validation order: a deactivated code is reported before limits or audience', {
        why: 'Error precedence decides what the customer reads. Status/dates come first, then limits, then currency/threshold/restrictions, then audience, then per-customer use.',
        fix: 'See the numbered PR-1..PR-13 order in check() of promo/engine.js; do not reorder without a spec change.',
        where: [FILE],
    })(async () => {
        const { code, id } = await create({ min_threshold: 500, user_segment: { type: 'targeted', user_id: 'ONLY' }, usage_limit_global: 1 });
        await setStatus(id, 'Disabled').expect(200);
        expect((await validate(code, { amount: 1, userId: 'NOT-ONLY' })).body.code).toBe('INACTIVE');
        await setStatus(id, 'Active').expect(200);
        expect((await validate(code, { amount: 1, userId: 'NOT-ONLY' })).body.code).toBe('BELOW_MIN'); // before audience
        expect((await validate(code, { amount: 600, userId: 'NOT-ONLY' })).body.code).toBe('NOT_YOUR_CODE');
    });
});
