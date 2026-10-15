import { describe, it, expect } from 'vitest';
import { validatePromoForm, toPayload } from './promoValidation';
import { previewSentence, whoLabel, valueLabel, formatMoney } from './promoUtils';

const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 16);
const past = new Date(Date.now() - 86400000).toISOString().slice(0, 16);
const base = {
    code: 'SAVE5', description: '', type: 'Fixed', value: '5', currency: 'GBP', max_discount: '', min_threshold: '',
    usage_limit_global: '', budget_limit: '', usage_limit_per_user: '1', perUserUnlimited: false,
    start_date: past, end_date: future, allCorridors: true, corridors: [], allMethods: true, payment_methods: [],
    audience: 'all', customer_ids: '', segment_id: '',
};

describe('validatePromoForm (PROMO-MITO §5.2)', () => {
    it('accepts a valid code', () => {
        expect(validatePromoForm(base)).toEqual({});
    });
    it('checks the code format and duplicates', () => {
        expect(validatePromoForm({ ...base, code: '' }).code).toBe('Enter a promo code.');
        expect(validatePromoForm({ ...base, code: 'a b' }).code).toBe('Use 3–20 letters, numbers or hyphens.');
        expect(validatePromoForm(base, { existingCodes: ['save5'] }).code).toBe('This promo code already exists.');
    });
    it('checks values per type', () => {
        expect(validatePromoForm({ ...base, value: '0' }).value).toBe('Enter an amount greater than 0.');
        expect(validatePromoForm({ ...base, currency: 'JPY', value: '5.5' }).value).toBe('Enter an amount greater than 0.');
        expect(validatePromoForm({ ...base, type: 'Percentage', value: '150' }).value).toBe('Enter a percentage between 0.01 and 100.');
        expect(validatePromoForm({ ...base, type: 'Percentage', value: '10', max_discount: '-1' }).max_discount).toBe('Enter a cap greater than 0, or leave it blank.');
        expect(validatePromoForm({ ...base, type: 'Waiver', value: '' })).toEqual({});
    });
    it('checks limits, dates, corridors, methods and audience', () => {
        const e = validatePromoForm({
            ...base, usage_limit_global: '1.5', budget_limit: '0', usage_limit_per_user: '0', start_date: future, end_date: past,
            allCorridors: false, allMethods: false, audience: 'specific_customers', customer_ids: '',
        });
        expect(e).toMatchObject({
            usage_limit_global: 'Enter a whole number, or leave it blank for unlimited.',
            budget_limit: 'Enter an amount greater than 0, or leave it blank for unlimited.',
            usage_limit_per_user: 'Enter a whole number from 1 to 1,000.',
            end_date: 'End date must be after the start date.',
            corridors: 'Add at least one receive currency, or tick All receive currencies.',
            payment_methods: 'Choose at least one payment method, or tick All payment methods.',
            customer_ids: 'Enter up to 500 customer IDs or email addresses.',
        });
        expect(validatePromoForm({ ...base, start_date: '2020-01-01T00:00', end_date: '2020-02-01T00:00' }).end_date).toBe('End date must be in the future.');
        expect(validatePromoForm({ ...base, start_date: '2020-01-01T00:00', end_date: '2020-02-01T00:00' }, { isNew: false }).end_date).toBeUndefined();
    });
});

describe('toPayload', () => {
    it('maps the form to the API body', () => {
        const p = toPayload({ ...base, perUserUnlimited: true, audience: 'specific_customers', customer_ids: 'A1, A2\nA3', allCorridors: false, corridors: ['GBP-NGN'] }, (x) => x);
        expect(p).toMatchObject({ code: 'SAVE5', usage_limit_per_user: -1, user_segment: { type: 'specific_customers', user_ids: ['A1', 'A2', 'A3'] }, restrictions: { corridors: ['GBP-NGN'], payment_methods: [] } });
        expect(toPayload({ ...base, audience: 'segment', segment_id: 7 }, (x) => x).user_segment).toEqual({ type: '7' });
    });
});

describe('labels', () => {
    it('formats money, value, who and the preview line', () => {
        expect(formatMoney(5, 'GBP')).toBe('£5.00');
        expect(formatMoney(150, 'JPY')).toBe('¥150');
        expect(valueLabel({ type: 'Percentage', value: 20, max_discount: 5, currency: 'GBP' })).toBe('20% (max £5.00)');
        expect(whoLabel({ type: 'specific_customers', user_ids: ['a', 'b'] })).toBe('2 customers');
        expect(whoLabel({ type: '3' }, [{ id: 3, name: 'VIP' }])).toBe('VIP');
        const s = previewSentence({ ...base, type: 'Percentage', value: '20', max_discount: '5', min_threshold: '100', allCorridors: false, corridors: ['GBP-NGN'], allMethods: false, payment_methods: ['Bank Transfer'], end_date: '' });
        expect(s).toBe('Customers sending GBP → NGN by Bank Transfer get 20% off the fee (max £5.00) on transfers of £100.00 or more, once each.');
        const sAll = previewSentence({ ...base, type: 'Fixed', value: '5', allCorridors: true, corridors: [], allMethods: true, payment_methods: [], end_date: '' });
        expect(sAll).toBe('Customers sending GBP → All receive currencies get £5.00 off the fee, once each.');
    });
});

describe('FixedAmount and flow rules', () => {
    it('accepts FixedAmount within the minimum send, and refuses it above', () => {
        expect(validatePromoForm({ ...base, type: 'FixedAmount', value: '10', min_threshold: '50' })).toEqual({});
        expect(validatePromoForm({ ...base, type: 'FixedAmount', value: '60', min_threshold: '50' }).value)
            .toBe('Fixed amount discount cannot be greater than the minimum send amount.');
    });
    it('refuses one code for both flows', () => {
        expect(validatePromoForm({ ...base, applies_to_flow: 'both' }).applies_to_flow)
            .toBe('Choose Send Money or Receive Money. One code cannot cover both.');
    });
});

describe('Receive Money bonus codes', () => {
    const recv = { ...base, applies_to_flow: 'receive' };
    it('only allows Fixed or Percentage bonuses, with receive wording', () => {
        expect(validatePromoForm(recv)).toEqual({});
        expect(validatePromoForm({ ...recv, type: 'Percentage', value: '10' })).toEqual({});
        expect(validatePromoForm({ ...recv, type: 'Waiver' }).type).toBe('Choose Fixed bonus or Percentage bonus.');
        expect(validatePromoForm({ ...recv, type: 'FixedAmount' }).type).toBe('Choose Fixed bonus or Percentage bonus.');
        expect(validatePromoForm({ ...recv, currency: 'XXX' }).currency).toBe("Choose the requester's receiving currency.");
    });
    it('does not need send corridors, and sends none', () => {
        expect(validatePromoForm({ ...recv, allCorridors: false, corridors: [] }).corridors).toBeUndefined();
        const p = toPayload({ ...recv, allCorridors: false, corridors: ['GBP-NGN'] }, (x) => x);
        expect(p.all_corridors).toBe(true);
        expect(p.restrictions).toMatchObject({ corridors: [], applies_to_flow: 'receive' });
    });
    it('labels the value as a bonus', () => {
        expect(valueLabel({ type: 'Fixed', value: 5, currency: 'GBP', restrictions: { applies_to_flow: 'receive' } })).toBe('£5.00 bonus');
        expect(valueLabel({ type: 'Percentage', value: 10, max_discount: 15, currency: 'GBP', restrictions: { applies_to_flow: 'receive' } })).toBe('10% bonus (max £15.00)');
        expect(valueLabel({ type: 'FixedAmount', value: 10, currency: 'GBP' })).toBe('£10.00 (send amount)');
    });
    it('describes the bonus in the preview line', () => {
        expect(previewSentence({ ...recv, value: '5', end_date: '' }))
            .toBe('Customers requesting money in GBP earn a bonus of £5.00, paid into their bank on top once the request is paid out, once each.');
        expect(previewSentence({ ...recv, type: 'Percentage', value: '10', max_discount: '15', min_threshold: '50', perUserUnlimited: true, end_date: '' }))
            .toBe('Customers requesting money in GBP earn a bonus of 10% of the requested amount (max £15.00), paid into their bank on top once the request is paid out on requests of £50.00 or more, any number of times.');
    });
    it('describes FixedAmount in the send preview line', () => {
        expect(previewSentence({ ...base, type: 'FixedAmount', value: '10', end_date: '' }))
            .toBe('Customers sending GBP → All receive currencies get £10.00 off the send amount (Mito sends full amount), once each.');
    });
});
