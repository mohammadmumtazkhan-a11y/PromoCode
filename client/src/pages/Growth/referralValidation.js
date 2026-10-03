import { ukTodayIso } from './referralUtils';

const NAME_RE = /^[A-Za-z0-9 &-]{3,50}$/;
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const dpOk = (v, cur) => { const s = String(v); const dp = s.includes('.') ? s.split('.')[1].length : 0; return dp <= (cur === 'JPY' ? 0 : 2); };
const intIn = (v, min, max) => /^\d+$/.test(String(v).trim()) && Number(v) >= min && Number(v) <= max;

// Mirrors the server rules so admins see errors before submitting (US-1.1)
export function validateForm(f, { isNew, rules, editingId }) {
    const e = {};
    const cur = f.base_currency;
    const amountMsg = cur === 'JPY' ? 'Enter a whole amount greater than 0.' : 'Enter an amount greater than 0 with up to 2 decimal places.';
    const name = String(f.name || '').trim();
    if (!name) e.name = 'Enter a rule name.';
    else if (!NAME_RE.test(name)) e.name = "Rule name must be 3–50 characters and use letters, numbers, spaces, '-' or '&' only.";
    else if (rules.some((r) => r.id !== editingId && r.name.trim().toLowerCase() === name.toLowerCase())) e.name = 'A rule with this name already exists.';
    const amt = (k, max) => {
        const v = f[k];
        if (blank(v) || Number.isNaN(Number(v)) || Number(v) <= 0 || Number(v) > max || !dpOk(v, cur)) e[k] = amountMsg;
    };
    if (f.reward_type !== 'REFEREE') amt('referrer_reward', 1000000);
    if (f.reward_type !== 'REFERRER') amt('referee_reward', 1000000);
    const fl = f.min_transaction_threshold;
    if (blank(fl) || Number.isNaN(Number(fl)) || Number(fl) <= 0 || Number(fl) > 10000000 || !dpOk(fl, cur)) e.min_transaction_threshold = 'Enter a minimum transaction amount greater than 0.';
    if (!intIn(f.qualification_window_days, 1, 365)) e.qualification_window_days = 'Enter a whole number of days from 1 to 365.';
    if (!intIn(f.bonus_validity_days, 1, 730)) e.bonus_validity_days = 'Enter a whole number of days from 1 to 730.';
    if (!blank(f.max_referrals_per_referrer) && !intIn(f.max_referrals_per_referrer, 1, 10000)) e.max_referrals_per_referrer = 'Leave blank for unlimited, or enter a whole number from 1 to 10,000.';
    if (!blank(f.min_redeem_amount) && (Number.isNaN(Number(f.min_redeem_amount)) || Number(f.min_redeem_amount) < 0 || !dpOk(f.min_redeem_amount, cur))) e.min_redeem_amount = 'Enter 0 or an amount with up to 2 decimal places.';
    const today = ukTodayIso();
    if (f.start_date && isNew && f.start_date < today) e.start_date = 'Start date cannot be in the past.';
    if (f.end_date && (isNew ? f.end_date <= (f.start_date || today) : f.start_date && f.end_date <= f.start_date)) e.end_date = 'End date must be after the start date.';
    return e;
}

