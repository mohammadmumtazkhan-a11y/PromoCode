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
            corridors: 'Add at least one corridor, or tick All corridors.',
            payment_methods: 'Choose at least one payment method, or tick All payment methods.',
            customer_ids: 'Enter up to 500 customer IDs.',
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
    });
});
