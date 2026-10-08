import { describe, it, expect } from 'vitest';
import { validateScheme, validateSegment, validateAdjustment } from './schemeValidation';
import { summaryLine, displayStatus, rewardCell, formatMoney } from './bonusUtils';

const base = {
    name: 'Summer Saver', bonus_type: 'LOYALTY_CREDIT', currency: 'GBP', commission_type: 'FIXED', credit_amount: 10, is_tiered: false, tiers: [],
    min_transactions: 3, time_period_days: 30, min_transaction_threshold: 0, eligibility_rules: { validityDays: 90, oneTimeOnly: true, segments: ['existing_customers'] },
    start_date: '2026-10-01', end_date: '2026-12-31', status: 'ACTIVE',
};

describe('validateScheme (BONUS-MITO §5.2)', () => {
    it('accepts a valid loyalty scheme', () => expect(validateScheme(base)).toEqual({}));

    it('uses the final copy for each field', () => {
        expect(validateScheme({ ...base, name: '', credit_amount: 0, min_transactions: 0, time_period_days: 4000, eligibility_rules: { validityDays: 0 }, start_date: '2026-12-31' })).toEqual({
            name: 'Enter a bonus name.', credit_amount: 'Enter an amount greater than 0.', min_transactions: 'Enter a whole number from 1 to 1,000.',
            time_period_days: 'Enter a whole number of days from 1 to 3,650.', validityDays: 'Enter a whole number of days from 1 to 730.', end_date: 'Start date must be before end date.',
        });
        expect(validateScheme(base, { names: ['summer saver'] }).name).toBe('A scheme with this name already exists.');
        expect(validateScheme({ ...base, bonus_type: 'TRANSACTION_THRESHOLD_CREDIT', min_transaction_threshold: 0 }).min_transaction_threshold).toBe('Enter a minimum greater than 0.');
        expect(validateScheme({ ...base, commission_type: 'PERCENTAGE', commission_percentage: 101 }).commission_percentage).toBe('Enter a percentage between 0.01 and 100.');
        expect(validateScheme({ ...base, credit_amount: 10.5, currency: 'JPY' }).credit_amount).toBe('Enter an amount greater than 0.');
    });

    it('checks that tiers follow on with no gaps or overlaps', () => {
        const tiered = { ...base, is_tiered: true };
        expect(validateScheme({ ...tiered, tiers: [{ min: 0, max: 100, value: 1 }, { min: 100.01, max: '', value: 2 }] })).toEqual({});
        expect(validateScheme({ ...tiered, tiers: [{ min: 0, max: 100, value: 1 }, { min: 150, max: '', value: 2 }] }).tiers).toBe('Tiers must follow on from each other with no gaps or overlaps.');
        expect(validateScheme({ ...tiered, tiers: [{ min: 50, max: 10, value: 1 }] }).tiers).toBe('Max must be more than Min.');
        expect(validateScheme({ ...tiered, tiers: [{ min: 0, max: '', value: 1 }, { min: 10, max: 20, value: 2 }] }).tiers).toBe('Only the last tier can have no Max.');
    });
});

describe('validateSegment and validateAdjustment', () => {
    it('validates segments', () => {
        expect(validateSegment({ name: 'Hi', criteria: { min: 5, max: 2 } })).toEqual({ name: 'Use 3–60 characters.', max: 'Max must be at least Min.' });
    });
    it('validates manual adjustments', () => {
        expect(validateAdjustment({ user_id: 'U1', type: 'VOIDED', amount: 20, currency: 'GBP', notes: 'Removing an over-grant' }, 10).amount).toBe('You can remove at most 10.');
        expect(validateAdjustment({ user_id: '', type: 'EARNED', amount: '', currency: 'GBP', validity_days: 0, notes: 'short' })).toEqual({
            user_id: 'Enter a customer ID.', amount: 'Enter an amount greater than 0.', validity_days: 'Enter a whole number of days from 1 to 730.', notes: 'Enter notes of 10–500 characters.',
        });
    });
});

describe('display helpers', () => {
    it('writes the live summary sentence', () => {
        expect(summaryLine(base)).toBe('Customers who complete 3 GBP transfers within 30 days earn £10.00 bonus credit, valid for 90 days, once only.');
        expect(summaryLine({ ...base, bonus_type: 'TRANSACTION_THRESHOLD_CREDIT', min_transaction_threshold: 500, commission_type: 'PERCENTAGE', commission_percentage: 5, max_award: 20, eligibility_rules: { validityDays: 30, oneTimeOnly: false } }))
            .toBe('Customers who send £500.00 or more in one transfer earn 5% of the amount (up to £20.00) as bonus credit, valid for 30 days, every time they qualify.');
    });
    it('derives the shown status and formats rewards', () => {
        expect(displayStatus({ status: 'ACTIVE', start_date: '2026-01-01', end_date: '2026-02-01' }, '2026-10-08')).toBe('Ended');
        expect(displayStatus({ status: 'ACTIVE', start_date: '2027-01-01', end_date: '2027-02-01' }, '2026-10-08')).toBe('Scheduled');
        expect(rewardCell({ commission_type: 'PERCENTAGE', commission_percentage: 5, max_award: 20, currency: 'GBP' })).toBe('5% (max £20.00)');
        expect(formatMoney(150, 'JPY')).toBe('¥150');
    });
});
