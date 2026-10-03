import { describe, it, expect } from 'vitest';
import { validateForm } from './referralValidation';
import { corridorLabel, formatMoney, formatUkDate } from './referralUtils';

const base = {
    name: 'UK Standard Programme', reward_type: 'BOTH', base_currency: 'GBP', receive_currency: 'NGN', referrer_reward: '5', referee_reward: '10',
    min_transaction_threshold: '50', qualification_window_days: '30', bonus_validity_days: '90',
    max_referrals_per_referrer: '', min_redeem_amount: '', start_date: '', end_date: '',
};
const ctx = { isNew: true, rules: [], editingId: null };

describe('validateForm (US-1.1)', () => {
    it('accepts a valid rule', () => {
        expect(validateForm(base, ctx)).toEqual({});
    });

    it('requires a name and checks length and characters', () => {
        expect(validateForm({ ...base, name: '' }, ctx).name).toBe('Enter a rule name.');
        expect(validateForm({ ...base, name: 'UK' }, ctx).name).toMatch(/3–50 characters/);
        expect(validateForm({ ...base, name: 'UK £ Programme' }, ctx).name).toMatch(/letters, numbers/);
    });

    it('rejects duplicate names case-insensitively', () => {
        const errs = validateForm({ ...base, name: 'uk default' }, { ...ctx, rules: [{ id: 1, name: 'UK Default' }] });
        expect(errs.name).toBe('A rule with this name already exists.');
    });

    it('treats the receive currency as optional but never equal to the send currency', () => {
        expect(validateForm({ ...base, receive_currency: '' }, ctx)).toEqual({});
        expect(validateForm({ ...base, receive_currency: 'GBP' }, ctx).receive_currency).toBe('Receive currency must be different from the send currency.');
    });

    it('allows several rules per send currency but only one per corridor', () => {
        const rules = [{ id: 1, name: 'UK to Nigeria', base_currency: 'GBP', receive_currency: 'NGN' }];
        expect(validateForm({ ...base, name: 'UK to India', receive_currency: 'INR' }, { ...ctx, rules })).toEqual({});
        expect(validateForm({ ...base, name: 'Another Nigeria' }, { ...ctx, rules }).receive_currency)
            .toBe("A referral rule for GBP → NGN already exists ('UK to Nigeria'). Edit or archive it first.");
        // one send-currency-only rule per send currency
        const withAll = [{ id: 2, name: 'UK All', base_currency: 'GBP', receive_currency: null }];
        expect(validateForm({ ...base, name: 'Another All', receive_currency: '' }, { ...ctx, rules: withAll }).receive_currency)
            .toBe("A referral rule for GBP (all destinations) already exists ('UK All'). Edit or archive it first.");
        expect(validateForm({ ...base, name: 'Corridor Too' }, { ...ctx, rules: withAll })).toEqual({});
        // editing the rule itself is not a clash
        expect(validateForm({ ...base, name: 'UK to Nigeria' }, { isNew: false, rules, editingId: 1 })).toEqual({});
    });

    it('ignores the disabled bonus field', () => {
        expect(validateForm({ ...base, reward_type: 'REFERRER', referee_reward: '0' }, ctx)).toEqual({});
        expect(validateForm({ ...base, reward_type: 'REFEREE', referrer_reward: '0' }, ctx)).toEqual({});
    });

    it('validates amounts, decimals and JPY whole numbers', () => {
        expect(validateForm({ ...base, referrer_reward: '0' }, ctx).referrer_reward).toBeTruthy();
        expect(validateForm({ ...base, referrer_reward: '1.234' }, ctx).referrer_reward).toBeTruthy();
        expect(validateForm({ ...base, base_currency: 'JPY', referrer_reward: '5.5' }, ctx).referrer_reward).toBe('Enter a whole amount greater than 0.');
        expect(validateForm({ ...base, min_transaction_threshold: '-1' }, ctx).min_transaction_threshold).toBe('Enter a minimum transaction amount greater than 0.');
    });

    it('checks day ranges and optional limits', () => {
        expect(validateForm({ ...base, qualification_window_days: '0' }, ctx).qualification_window_days).toBeTruthy();
        expect(validateForm({ ...base, qualification_window_days: '365' }, ctx).qualification_window_days).toBeUndefined();
        expect(validateForm({ ...base, bonus_validity_days: '731' }, ctx).bonus_validity_days).toBeTruthy();
        expect(validateForm({ ...base, max_referrals_per_referrer: '0' }, ctx).max_referrals_per_referrer).toBeTruthy();
    });

    it('checks dates', () => {
        expect(validateForm({ ...base, start_date: '2000-01-01' }, ctx).start_date).toBe('Start date cannot be in the past.');
        expect(validateForm({ ...base, start_date: '2999-01-02', end_date: '2999-01-01' }, ctx).end_date).toBe('End date must be after the start date.');
    });
});

describe('formatting helpers', () => {
    it('formats money with the currency symbol', () => {
        expect(formatMoney(5, 'GBP')).toBe('£5.00');
        expect(formatMoney(20000, 'NGN')).toBe('₦20,000.00');
        expect(formatMoney(500, 'JPY')).toBe('¥500');
    });
    it('labels corridors, with a fallback for rules from before corridors', () => {
        expect(corridorLabel('GBP', 'NGN')).toBe('GBP → NGN');
        expect(corridorLabel('GBP', null)).toBe('GBP → All');
        expect(corridorLabel('GBP', null, '?')).toBe('GBP → ?');
    });
    it('formats UK dates', () => {
        expect(formatUkDate('2026-10-31')).toBe('31/10/2026');
        expect(formatUkDate(null)).toBe('—');
    });
});
