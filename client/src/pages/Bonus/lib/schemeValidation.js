// Client mirror of the server's scheme rules (BONUS-MITO §5.2). The server stays authoritative.
import { decimalsFor } from './bonusUtils';

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const isInt = (v, min, max) => !blank(v) && Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max;
const decimalsOk = (v, currency) => {
    const s = String(v);
    return (s.includes('.') ? s.split('.')[1].length : 0) <= decimalsFor(currency);
};

export function validateScheme(f, { names = [] } = {}) {
    const e = {};
    const name = String(f.name || '').trim();
    if (!name) e.name = 'Enter a bonus name.';
    else if (name.length < 3 || name.length > 60) e.name = 'Use 3–60 characters.';
    else if (names.some((n) => n.toLowerCase() === name.toLowerCase())) e.name = 'A scheme with this name already exists.';
    if (f.description && String(f.description).length > 200) e.description = 'Keep the note under 200 characters.';

    const pct = f.commission_type === 'PERCENTAGE';
    if (!f.is_tiered && !pct && (blank(f.credit_amount) || !(Number(f.credit_amount) > 0) || !decimalsOk(f.credit_amount, f.currency))) e.credit_amount = 'Enter an amount greater than 0.';
    if (!f.is_tiered && pct && !(Number(f.commission_percentage) >= 0.01 && Number(f.commission_percentage) <= 100)) e.commission_percentage = 'Enter a percentage between 0.01 and 100.';
    if ((pct || f.is_tiered) && !blank(f.max_award) && !(Number(f.max_award) > 0)) e.max_award = 'Enter an amount greater than 0, or leave it blank.';

    if (f.is_tiered) {
        const tiers = f.tiers || [];
        if (!tiers.length) e.tiers = 'Add at least one tier.';
        tiers.forEach((t, i) => {
            if (e.tiers) return;
            const min = Number(t.min); const max = blank(t.max) ? null : Number(t.max); const value = Number(t.value);
            if (blank(t.min) || Number.isNaN(min) || min < 0) e.tiers = 'Min must be 0 or more.';
            else if (max === null && i < tiers.length - 1) e.tiers = 'Only the last tier can have no Max.';
            else if (max !== null && !(max > min)) e.tiers = 'Max must be more than Min.';
            else if (!(value > 0) || (pct && value > 100)) e.tiers = pct ? 'Enter a percentage between 0.01 and 100.' : 'Enter an amount greater than 0.';
            else if (i > 0) {
                const prevMax = blank(tiers[i - 1].max) ? null : Number(tiers[i - 1].max);
                if (prevMax === null || min < prevMax || min - prevMax > 1) e.tiers = 'Tiers must follow on from each other with no gaps or overlaps.';
            }
        });
    }

    if (f.bonus_type === 'TRANSACTION_THRESHOLD_CREDIT' && !(Number(f.min_transaction_threshold) > 0)) e.min_transaction_threshold = 'Enter a minimum greater than 0.';
    if (f.bonus_type === 'REQUEST_MONEY' && (blank(f.min_transaction_threshold) || Number(f.min_transaction_threshold) < 0)) e.min_transaction_threshold = 'Enter 0 or more.';
    if (f.bonus_type === 'LOYALTY_CREDIT') {
        if (!isInt(f.min_transactions, 1, 1000)) e.min_transactions = 'Enter a whole number from 1 to 1,000.';
        if (!isInt(f.time_period_days, 1, 3650)) e.time_period_days = 'Enter a whole number of days from 1 to 3,650.';
    }
    const rules = f.eligibility_rules || {};
    if (!isInt(rules.validityDays, 1, 730)) e.validityDays = 'Enter a whole number of days from 1 to 730.';

    if (!f.start_date) e.start_date = 'Choose a start date.';
    if (!f.end_date) e.end_date = 'Choose an end date.';
    if (f.start_date && f.end_date && f.start_date >= f.end_date) e.end_date = 'Start date must be before end date.';
    return e;
}

export function validateSegment(f, { names = [] } = {}) {
    const e = {};
    const name = String(f.name || '').trim();
    const c = f.criteria || {};
    if (!name) e.name = 'Enter a segment name.';
    else if (name.length < 3 || name.length > 60) e.name = 'Use 3–60 characters.';
    else if (names.some((n) => n.toLowerCase() === name.toLowerCase())) e.name = 'A segment with this name already exists.';
    if (!blank(c.min) && (Number.isNaN(Number(c.min)) || Number(c.min) < 0)) e.min = 'Enter 0 or more.';
    if (!blank(c.max) && Number(c.max) < (Number(c.min) || 0)) e.max = 'Max must be at least Min.';
    if (c.period_days !== null && c.period_days !== undefined && !isInt(c.period_days, 1, 3650)) e.period_days = 'Enter a whole number of days from 1 to 3,650.';
    if (c.signup_start_date && c.signup_end_date && c.signup_end_date < c.signup_start_date) e.signup_end_date = 'Signed Up Until must be on or after Signed Up From.';
    return e;
}

// Manual adjustment (§5.5): notes 10–500, amount > 0 and, for a removal, at most the available balance
export function validateAdjustment(f, available) {
    const e = {};
    if (!String(f.user_id || '').trim()) e.user_id = 'Enter a customer ID.';
    const amount = Number(f.amount);
    if (blank(f.amount) || !(amount > 0)) e.amount = 'Enter an amount greater than 0.';
    else if (!decimalsOk(f.amount, f.currency)) e.amount = `Use up to ${decimalsFor(f.currency)} decimal places.`;
    else if (f.type === 'VOIDED' && available !== null && available !== undefined && amount > available) e.amount = `You can remove at most ${available}.`;
    if (f.type === 'EARNED' && !isInt(f.validity_days, 1, 730)) e.validity_days = 'Enter a whole number of days from 1 to 730.';
    const notes = String(f.notes || '').trim();
    if (notes.length < 10 || notes.length > 500) e.notes = 'Enter notes of 10–500 characters.';
    return e;
}
