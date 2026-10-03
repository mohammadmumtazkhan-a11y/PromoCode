import { describe, it, expect } from 'vitest';
import { validateForm } from './referralValidation';
import { formatMoney, formatUkDate } from './referralUtils';

const base = {
    name: 'UK Standard Programme', reward_type: 'BOTH', base_currency: 'GBP', referrer_reward: '5', referee_reward: '10',
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
    it('formats UK dates', () => {
        expect(formatUkDate('2026-10-31')).toBe('31/10/2026');
        expect(formatUkDate(null)).toBe('—');
    });
});
