// Promo validation/redemption and non-referral bonus schemes, end to end against the real Express app.
const os = require('os');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

process.env.ADMIN_USERS = JSON.stringify([{ name: 'Grace Growth', role: 'GROWTH_MANAGER', token: 'gm-token' }]);
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'mito-engines-'))); // the app opens ./database.sqlite
const app = require('../server');

const FAR = '2099-12-31';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();

beforeAll(async () => {
    for (let i = 0; i < 40; i++) { // wait for the first-run schema + seed
        const r = await request(app).get('/api/bonus-schemes');
        if (r.status === 200 && r.body.data.length) break;
        await wait(250);
    }
    await wait(500);
});

const makePromo = (over = {}) => request(app).post('/api/promocodes').send({
    code: `T${Math.random().toString(36).slice(2, 8)}`.toUpperCase(), type: 'Fixed', value: 5, min_threshold: 50, currency: 'GBP',
    usage_limit_per_user: 1, start_date: iso(-1), end_date: iso(30), ...over,
});
const validate = (code, over = {}) => request(app).post('/api/promocodes/validate').send({
    code, amount: 100, fee: 1, currency: 'GBP', userId: 'U1', sourceCurrency: 'GBP', destCurrency: 'NGN', paymentMethod: 'bank_deposit', ...over,
});
const scheme = (over = {}) => request(app).post('/api/bonus-schemes').send({
    name: `S-${Math.random().toString(36).slice(2, 7)}`, bonus_type: 'TRANSACTION_THRESHOLD_CREDIT', credit_amount: 5, currency: 'GBP',
    min_transaction_threshold: 100, eligibility_rules: { oneTimeOnly: false }, start_date: '2024-01-01', end_date: FAR, ...over,
});
const transferEvent = (id, customer, amount, over = {}) => request(app).post('/api/referral/transfer-events').send({
    transfer_id: id, customer_id: customer, amount, currency: 'GBP', receive_currency: 'NGN', status: 'COMPLETED', created_at: new Date().toISOString(), ...over,
});
const awardedBy = (res, schemeId) => (res.body.bonuses || []).find((b) => b.scheme_id === schemeId);

describe('Promo codes: Mito Admin is the source of truth', () => {
    it('validates a code, caps the discount at the fee and accepts Rhemito camelCase fields', async () => {
        const created = await makePromo({ value: 5 });
        expect(created.status).toBe(200);
        const code = (await request(app).get('/api/promocodes')).body.data.find((p) => p.id === created.body.id).code;
        const ok = await validate(code);
        expect(ok.status).toBe(200);
        expect(ok.body).toMatchObject({ valid: true, appliedDiscount: 1, appliesTo: 'fee' }); // £5 off, but the fee is only £1
        expect((await validate(code, { amount: 10 })).body.error).toMatch(/too low/);
        expect((await validate(code, { currency: 'USD' })).body.error).toMatch(/only valid for GBP/);
    });

    it('rejects unknown, expired and disabled codes', async () => {
        expect((await validate('NOSUCHCODE')).status).toBe(404);
        const old = await makePromo({ start_date: '2020-01-01T00:00:00Z', end_date: '2020-02-01T00:00:00Z' });
        const code = (await request(app).get('/api/promocodes')).body.data.find((p) => p.id === old.body.id).code;
        expect((await validate(code)).body.error).toMatch(/has expired/);
    });

    it('matches payment methods whether written as Mito names or Rhemito ids', async () => {
        const all = await makePromo({ restrictions: { payment_methods: ['Bank Transfer', 'Card', 'Mobile Money', 'USSD'] } });
        const code = (await request(app).get('/api/promocodes')).body.data.find((p) => p.id === all.body.id).code;
        for (const m of ['bank_deposit', 'instant_bank', 'manual_transfer', 'card', 'mobile_money']) {
            expect((await validate(code, { paymentMethod: m })).status).toBe(200);
        }
        expect((await validate(code, { paymentMethod: 'wallet' })).body.error).toMatch(/payment method/);
        expect((await validate(code, { paymentMethod: undefined })).status).toBe(200); // not chosen yet
        const cardOnly = await makePromo({ restrictions: { payment_methods: ['Card'] } });
        const c2 = (await request(app).get('/api/promocodes')).body.data.find((p) => p.id === cardOnly.body.id).code;
        expect((await validate(c2, { paymentMethod: 'bank_deposit' })).body.error).toMatch(/payment method/);
        expect((await validate(c2, { paymentMethod: 'card' })).status).toBe(200);
    });

    it('computes a percentage discount off the fee with a cap, and a fee waiver', async () => {
        const pct = await makePromo({ type: 'Percentage', value: 50, max_discount: 2 });
        const waiver = await makePromo({ type: 'Waiver', value: 100 });
        const codes = (await request(app).get('/api/promocodes')).body.data;
        const pctCode = codes.find((p) => p.id === pct.body.id).code;
        const waiverCode = codes.find((p) => p.id === waiver.body.id).code;
        expect((await validate(pctCode, { fee: 10 })).body.appliedDiscount).toBe(2); // 50% of 10 = 5, capped at 2
        expect((await validate(waiverCode, { fee: 3.5 })).body.appliedDiscount).toBe(3.5);
    });

    it('redeems once per transfer, counts the use, and enforces the per-customer limit', async () => {
        const created = await makePromo({ value: 1, usage_limit_per_user: 1 });
        const code = (await request(app).get('/api/promocodes')).body.data.find((p) => p.id === created.body.id).code;
        const redeem = (txn) => request(app).post('/api/promocodes/redeem').send({ code, userId: 'U9', transactionId: txn, amount: 100, fee: 1, currency: 'GBP', sourceCurrency: 'GBP', destCurrency: 'NGN' });
        const first = await redeem('TXN-1');
        expect(first.body).toMatchObject({ success: true, discount: 1 });
        const retry = await redeem('TXN-1'); // a retried call for the same transfer
        expect(retry.body).toMatchObject({ success: true, idempotent: true });
        const promo = (await request(app).get('/api/promocodes')).body.data.find((p) => p.code === code);
        expect(promo.usage_count).toBe(1);
        expect(promo.total_discount_utilized).toBe(1);
        expect((await validate(code, { userId: 'U9' })).body.error).toMatch(/already used/);
        expect((await validate(code, { userId: 'U10' })).status).toBe(200); // other customers still can
    });

    it('keeps a personal (targeted) code for the customer it was issued to', async () => {
        const created = await makePromo({ user_segment: { type: 'targeted', user_id: 'OWNER' } });
        const code = (await request(app).get('/api/promocodes')).body.data.find((p) => p.id === created.body.id).code;
        expect((await validate(code, { userId: 'OTHER' })).status).toBe(403);
        expect((await validate(code, { userId: 'OWNER' })).status).toBe(200);
    });
});

describe('Non-referral bonus schemes are triggered by Rhemito events', () => {
    it('awards a threshold bonus when a completed transfer meets the minimum, once per transfer', async () => {
        const s = (await scheme({ min_transaction_threshold: 100, credit_amount: 5 })).body.id;
        const small = await transferEvent('TH-1', 'C1', 60);
        expect(awardedBy(small, s)).toMatchObject({ status: 'SKIPPED', reason: 'BELOW_THRESHOLD' });
        const big = await transferEvent('TH-2', 'C1', 150);
        expect(awardedBy(big, s)).toMatchObject({ status: 'AWARDED', amount: 5, currency: 'GBP' });
        const replay = await transferEvent('TH-2', 'C1', 150); // Rhemito retries the same event
        expect(awardedBy(replay, s)).toMatchObject({ status: 'SKIPPED', reason: 'DUPLICATE_EVENT' });
        const wallet = await request(app).get('/api/wallet/C1?currency=GBP');
        expect(wallet.body.balances[0].available).toBe(5); // usable on the next transfer
    });

    it('ignores a transfer in another currency and a transfer that is not completed yet', async () => {
        const s = (await scheme({ min_transaction_threshold: 0, credit_amount: 7 })).body.id;
        expect(awardedBy(await transferEvent('CUR-1', 'C2', 500, { currency: 'NGN' }), s)).toMatchObject({ reason: 'CURRENCY_MISMATCH' });
        const paid = await transferEvent('CUR-2', 'C2', 500, { status: 'PAID' });
        expect(paid.body.bonuses || []).toEqual([]);
    });

    it('awards a loyalty bonus only once the customer has enough completed transfers in the period', async () => {
        const s = (await scheme({ bonus_type: 'LOYALTY_CREDIT', min_transaction_threshold: 0, min_transactions: 3, time_period_days: 30, credit_amount: 10, eligibility_rules: { oneTimeOnly: true, segments: ['existing_customers'] } })).body.id;
        expect(awardedBy(await transferEvent('LY-1', 'C3', 20), s)).toMatchObject({ reason: 'LOYALTY_NOT_MET' });
        expect(awardedBy(await transferEvent('LY-2', 'C3', 20), s)).toMatchObject({ reason: 'LOYALTY_NOT_MET' });
        expect(awardedBy(await transferEvent('LY-3', 'C3', 20), s)).toMatchObject({ status: 'AWARDED', amount: 10 });
        expect(awardedBy(await transferEvent('LY-4', 'C3', 20), s)).toMatchObject({ reason: 'ALREADY_EARNED' }); // one-time
    });

    it('awards a request-money bonus when a money request is paid and meets the minimum', async () => {
        const s = (await scheme({ bonus_type: 'REQUEST_MONEY', min_transaction_threshold: 10, credit_amount: 2 })).body.id;
        const ev = (id, amount) => request(app).post('/api/bonus/events').send({ type: 'MONEY_REQUEST_PAID', customer_id: 'C4', event_id: id, amount, currency: 'GBP' });
        expect((await ev('RQ-1', 5)).body.awards.find((a) => a.scheme_id === s)).toMatchObject({ reason: 'BELOW_THRESHOLD' });
        expect((await ev('RQ-2', 25)).body.awards.find((a) => a.scheme_id === s)).toMatchObject({ status: 'AWARDED', amount: 2 });
        expect((await request(app).post('/api/bonus/events').send({ type: 'NOPE', customer_id: 'C4', event_id: 'x' })).status).toBe(400);
    });

    it('computes tiered amounts from the reported transfer amount', async () => {
        const s = (await scheme({ is_tiered: true, min_transaction_threshold: 0, tiers: [{ min: 0, max: 99.99, value: 1 }, { min: 100, max: null, value: 4 }] })).body.id;
        expect(awardedBy(await transferEvent('TI-1', 'C5', 50), s)).toMatchObject({ amount: 1 });
        expect(awardedBy(await transferEvent('TI-2', 'C5', 500), s)).toMatchObject({ amount: 4 });
    });

    it('does not let an inactive or expired scheme pay out', async () => {
        const expired = (await scheme({ start_date: '2020-01-01', end_date: '2020-12-31', min_transaction_threshold: 0 })).body.id;
        expect(awardedBy(await transferEvent('EX-1', 'C6', 100), expired)).toMatchObject({ reason: 'SCHEME_EXPIRED' });
    });
});

describe('Manual award enforces the same eligibility rules', () => {
    it('applies user-segment criteria server-side', async () => {
        const seg = await request(app).post('/api/user-segments').send({ name: 'Busy senders', criteria: { type: 'TRANSACTION_COUNT', min: 2, max: null, period_days: 30 } });
        const s = (await scheme({ bonus_type: 'REQUEST_MONEY', min_transaction_threshold: 0, eligibility_rules: { oneTimeOnly: true, segments: [String(seg.body.id)] } })).body.id;
        await transferEvent('SG-1', 'C7', 10);
        const none = await request(app).post('/api/credits/award-bonus').send({ user_id: 'C7', scheme_id: s });
        expect(none.status).toBe(403);
        expect(none.body.error).toBe('USER_INELIGIBLE');
        await transferEvent('SG-2', 'C7', 10);
        const ok = await request(app).post('/api/credits/award-bonus').send({ user_id: 'C7', scheme_id: s, admin_user: 'Admin' });
        expect(ok.status).toBe(200);
        expect((await request(app).post('/api/credits/award-bonus').send({ user_id: 'C7', scheme_id: s })).status).toBe(409);
    });

    it('rejects a loyalty award when the customer has not met the transaction count', async () => {
        const s = (await scheme({ bonus_type: 'LOYALTY_CREDIT', min_transaction_threshold: 0, min_transactions: 2, time_period_days: 30, eligibility_rules: { segments: ['existing_customers'] } })).body.id;
        await transferEvent('LM-1', 'C8', 10);
        const res = await request(app).post('/api/credits/award-bonus').send({ user_id: 'C8', scheme_id: s });
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('LOYALTY_NOT_MET');
    });
});

describe('Growth Manager role', () => {
    it('is required to approve a referral reward', async () => {
        const url = '/api/referral/referrals/NO-SUCH/approve';
        const body = { reason: 'Verified by phone with the customer' };
        expect((await request(app).post(url).send(body)).status).toBe(401);
        expect((await request(app).post(url).set('Authorization', 'Bearer gm-token').send(body)).status).toBe(404); // got past auth
    });
});

describe('Cancelled and refunded transfers give things back', () => {
    it('takes back a request-money bonus when the paid request is refunded', async () => {
        const s = (await scheme({ bonus_type: 'REQUEST_MONEY', min_transaction_threshold: 0, credit_amount: 3, currency: 'CAD' })).body.id;
        const ev = (type, extra = {}) => request(app).post('/api/bonus/events').send({ type, customer_id: 'C30', event_id: 'REQ-9', amount: 50, currency: 'CAD', ...extra });
        expect((await ev('MONEY_REQUEST_PAID')).body.awards.find((a) => a.scheme_id === s)).toMatchObject({ status: 'AWARDED', amount: 3 });
        expect((await request(app).get('/api/wallet/C30?currency=CAD')).body.balances[0].available).toBe(3);
        const refund = await ev('MONEY_REQUEST_REFUNDED');
        expect(refund.body.awards).toEqual([expect.objectContaining({ scheme_id: s, status: 'REVERSED', voided: 3 })]);
        expect((await request(app).get('/api/wallet/C30?currency=CAD')).body.balances[0].available).toBe(0);
        expect((await ev('MONEY_REQUEST_REFUNDED')).body.awards).toEqual([]);
    });

    it('removes the unused scheme bonus a refunded transfer earned, once', async () => {
        const s = (await scheme({ min_transaction_threshold: 0, credit_amount: 6, currency: 'EUR' })).body.id;
        expect(awardedBy(await transferEvent('RF-1', 'C20', 40, { currency: 'EUR' }), s)).toMatchObject({ status: 'AWARDED' });
        expect((await request(app).get('/api/wallet/C20?currency=EUR')).body.balances[0].available).toBe(6);
        const refund = await transferEvent('RF-1', 'C20', 40, { currency: 'EUR', status: 'REFUNDED' });
        expect(refund.body.bonuses).toEqual([expect.objectContaining({ scheme_id: s, status: 'REVERSED', voided: 6 })]);
        expect((await request(app).get('/api/wallet/C20?currency=EUR')).body.balances[0].available).toBe(0);
        expect((await transferEvent('RF-1', 'C20', 40, { currency: 'EUR', status: 'REFUNDED' })).body.bonuses).toEqual([]); // repeat is a no-op
    });

    it('only takes back what is still unused', async () => {
        process.env.BONUS_CLAWBACK = 'off'; // this case checks the unused-only rule on its own; clawback has its own tests below
        const s = (await scheme({ min_transaction_threshold: 0, credit_amount: 10, currency: 'EUR' })).body.id;
        await transferEvent('RF-2', 'C21', 40, { currency: 'EUR' });
        await request(app).post('/api/wallet/C21/apply').send({ amount: 4, currency: 'EUR', transfer_id: 'OTHER-1', send_amount: 100 }).expect(200);
        const refund = await transferEvent('RF-2', 'C21', 40, { currency: 'EUR', status: 'REFUNDED' });
        // the 4 spent came off the earlier-expiring credit (the first EUR scheme, 6), so 2 of it and all 10 of this scheme go
        expect(refund.body.bonuses.reduce((n, b) => n + b.voided, 0)).toBe(12);
        expect(refund.body.bonuses.find((b) => b.scheme_id === s).voided).toBe(10);
        expect((await request(app).get('/api/wallet/C21?currency=EUR')).body.balances[0].available).toBe(0);
        delete process.env.BONUS_CLAWBACK;
    });

    it('claws back bonus that was already spent and repays it from the next bonus', async () => {
        const mk = (credit) => scheme({ min_transaction_threshold: 0, credit_amount: credit, currency: 'AUD', eligibility_rules: { oneTimeOnly: false } });
        const first = (await mk(10)).body.id;
        const ev = (id, status = 'COMPLETED') => transferEvent(id, 'C40', 40, { currency: 'AUD', status });
        expect(awardedBy(await ev('CB-1'), first)).toMatchObject({ amount: 10 });
        await request(app).post('/api/wallet/C40/apply').send({ amount: 7, currency: 'AUD', transfer_id: 'SPEND-1', send_amount: 100 }).expect(200);
        const refund = await ev('CB-1', 'REFUNDED');
        expect(refund.body.bonuses[0]).toMatchObject({ voided: 3, clawed_back: 7 }); // 3 unused removed, 7 spent becomes a debt
        let w = (await request(app).get('/api/wallet/C40?currency=AUD')).body.balances[0];
        expect(w).toMatchObject({ available: 0, outstanding_debt: 7 });
        expect((await ev('CB-1', 'REFUNDED')).body.bonuses).toEqual([]); // repeat changes nothing
        // the next bonus (a different scheme, 10) first repays the debt
        await request(app).post('/api/bonus-schemes').send({ name: 'Next AUD', bonus_type: 'TRANSACTION_THRESHOLD_CREDIT', credit_amount: 10, currency: 'AUD', min_transaction_threshold: 0, eligibility_rules: { oneTimeOnly: false }, start_date: '2024-01-01', end_date: FAR });
        await ev('CB-2');
        w = (await request(app).get('/api/wallet/C40?currency=AUD')).body.balances[0];
        expect(w).toMatchObject({ outstanding_debt: 0 });
        expect(w.available).toBe(10 + 10 - 7); // CB-2 paid the first scheme again (10) and the new scheme (10); 7 repaid
    });

    it('does not claw back when BONUS_CLAWBACK is off', async () => {
        process.env.BONUS_CLAWBACK = 'off';
        try {
            await scheme({ min_transaction_threshold: 0, credit_amount: 5, currency: 'NZD' });
            await transferEvent('CO-1', 'C41', 40, { currency: 'NZD' });
            await request(app).post('/api/wallet/C41/apply').send({ amount: 5, currency: 'NZD', transfer_id: 'SPEND-2', send_amount: 100 }).expect(200);
            await transferEvent('CO-1', 'C41', 40, { currency: 'NZD', status: 'REFUNDED' });
            const w = (await request(app).get('/api/wallet/C41?currency=NZD')).body.balances[0];
            expect(w.outstanding_debt).toBe(0);
        } finally { delete process.env.BONUS_CLAWBACK; }
    });

    it('releases a promo code use when its transfer is cancelled', async () => {
        const created = await makePromo({ value: 1, usage_limit_per_user: 1 });
        const code = (await request(app).get('/api/promocodes')).body.data.find((p) => p.id === created.body.id).code;
        const redeem = (txn) => request(app).post('/api/promocodes/redeem').send({ code, userId: 'C22', transactionId: txn, amount: 100, fee: 1, currency: 'GBP', sourceCurrency: 'GBP', destCurrency: 'NGN' });
        await redeem('PR-1');
        expect((await validate(code, { userId: 'C22' })).body.error).toMatch(/already used/);
        await transferEvent('PR-1', 'C22', 100, { status: 'CANCELLED' });
        expect((await validate(code, { userId: 'C22' })).status).toBe(200); // can use it again
        const promo = (await request(app).get('/api/promocodes')).body.data.find((p) => p.code === code);
        expect(promo.usage_count).toBe(0);
        expect((await redeem('PR-1')).status).toBe(409); // the cancelled transfer itself cannot redeem again
        expect((await request(app).post('/api/promocodes/release').send({ transaction_id: 'PR-1' })).body.released).toBe(0); // repeat is a no-op
    });
});

describe('Customers who keep cancelling or refunding bonus-earning transfers are blocked', () => {
    const GM = (r) => r.set('Authorization', 'Bearer gm-token');
    const cycle = async (n, schemeId, status = 'REFUNDED') => {
        await transferEvent(`BL-${n}`, 'C50', 40, { currency: 'CHF' });
        return transferEvent(`BL-${n}`, 'C50', 40, { currency: 'CHF', status });
    };

    it('blocks bonus after three strikes, shows why, and a Growth Manager can lift it', async () => {
        const s = (await scheme({ min_transaction_threshold: 0, credit_amount: 4, currency: 'CHF', eligibility_rules: { oneTimeOnly: false } })).body.id;
        expect((await cycle(1, s)).body.bonuses[0]).toMatchObject({ strikes: 1, blocked: false });
        expect((await cycle(2, s, 'CANCELLED')).body.bonuses[0]).toMatchObject({ strikes: 2, blocked: false });
        expect((await request(app).get('/api/bonus-blocks')).body.data.filter((b) => b.customer_id === 'C50')).toEqual([]);
        expect((await cycle(3, s)).body.bonuses[0]).toMatchObject({ strikes: 3, blocked: true });

        const list = (await request(app).get('/api/bonus-blocks')).body.data.find((b) => b.customer_id === 'C50');
        expect(list).toMatchObject({ status: 'ACTIVE', strikes: 3 });
        expect(list.reason).toMatch(/BL-1.*BL-2.*BL-3/); // every transfer behind the block is named
        expect(list.reason).toMatch(/cancelled|refunded/);
        const detail = (await request(app).get('/api/bonus-blocks/C50')).body;
        expect(detail.strikes).toHaveLength(3);
        const wallet = (await request(app).get('/api/wallet/C50')).body;
        expect(wallet.bonus_blocked).toBe(true);
        expect(JSON.stringify(wallet)).not.toMatch(/strike|Growth Manager|cancelled or refunded:/i); // the customer never sees the reason

        // no bonus while blocked
        const next = await transferEvent('BL-4', 'C50', 40, { currency: 'CHF' });
        expect(next.body.bonuses.find((b) => b.scheme_id === s)).toMatchObject({ status: 'SKIPPED', reason: 'BONUS_BLOCKED' });
        expect((await request(app).post('/api/credits/award-bonus').send({ user_id: 'C50', scheme_id: s })).body.error).toBe('BONUS_BLOCKED');

        // only a Growth Manager, with a reason, can lift it
        const url = '/api/bonus-blocks/C50/lift';
        expect((await request(app).post(url).send({ reason: 'Spoke to the customer, fine' })).status).toBe(401);
        expect((await GM(request(app).post(url)).send({ reason: 'short' })).status).toBe(400);
        const lifted = await GM(request(app).post(url)).send({ reason: 'Spoke to the customer, genuine mistakes' });
        expect(lifted.body.data).toMatchObject({ status: 'LIFTED', lifted_by: 'Grace Growth' });
        expect((await request(app).get('/api/bonus-blocks')).body.data.filter((b) => b.customer_id === 'C50')).toEqual([]);
        expect((await request(app).get('/api/bonus-blocks?status=LIFTED')).body.data.find((b) => b.customer_id === 'C50').lift_reason).toMatch(/genuine mistakes/);

        // earning works again and the strike count starts from zero
        const again = await transferEvent('BL-5', 'C50', 40, { currency: 'CHF' });
        expect(again.body.bonuses.find((b) => b.scheme_id === s)).toMatchObject({ status: 'AWARDED' });
        expect((await request(app).get('/api/bonus-blocks/C50')).body.strikes).toHaveLength(0);
        expect((await request(app).get('/api/wallet/C50')).body.bonus_blocked).toBe(false);
    });

    it('does not count a failed transfer, or a transfer that earned nothing', async () => {
        const s = (await scheme({ min_transaction_threshold: 0, credit_amount: 2, currency: 'JPY', eligibility_rules: { oneTimeOnly: false } })).body.id;
        await transferEvent('NS-1', 'C51', 40, { currency: 'JPY' });
        const failed = await transferEvent('NS-1', 'C51', 40, { currency: 'JPY', status: 'FAILED' });
        expect(failed.body.bonuses[0].strikes).toBeUndefined();
        const cancelledUnpaid = await transferEvent('NS-2', 'C51', 40, { currency: 'JPY', status: 'CANCELLED' }); // never completed, no bonus
        expect(cancelledUnpaid.body.bonuses).toEqual([]);
        expect((await request(app).get('/api/bonus-blocks/C51')).body.strikes).toHaveLength(0);
        void s;
    });
});
