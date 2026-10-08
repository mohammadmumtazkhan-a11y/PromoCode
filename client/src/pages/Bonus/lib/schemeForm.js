// Bonus scheme form values ⇄ API body (BONUS-MITO §5.2)

export const EMPTY_SCHEME = {
    name: '', description: '', bonus_type: 'LOYALTY_CREDIT', currency: 'GBP', commission_type: 'FIXED', is_tiered: false,
    credit_amount: '10', commission_percentage: '', max_award: '', tiers: [{ min: '0', max: '', value: '' }],
    min_transaction_threshold: '50', min_transactions: '3', time_period_days: '30',
    eligibility_rules: { validityDays: '90', oneTimeOnly: true, segments: ['all'] },
    start_date: '', end_date: '', status: 'ACTIVE',
};

// A scheme from the API → form values (strings, so inputs stay controlled)
export function formFromScheme(s) {
    const rules = s.eligibility_rules || {};
    const str = (v) => (v === null || v === undefined ? '' : String(v));
    return {
        name: s.name || '', description: s.description || '', bonus_type: s.bonus_type, currency: s.currency || 'GBP',
        commission_type: s.commission_type || 'FIXED', is_tiered: !!s.is_tiered,
        credit_amount: str(s.credit_amount), commission_percentage: str(s.commission_percentage || ''), max_award: str(s.max_award),
        tiers: (s.tiers && s.tiers.length ? s.tiers : [{ min: 0, max: '', value: '' }]).map((t) => ({ min: str(t.min), max: t.max === null || t.max === Infinity ? '' : str(t.max), value: str(t.value) })),
        min_transaction_threshold: str(s.min_transaction_threshold), min_transactions: str(s.min_transactions), time_period_days: str(s.time_period_days),
        eligibility_rules: { ...rules, validityDays: str(rules.validityDays || 90), oneTimeOnly: rules.oneTimeOnly !== false, segments: rules.segments && rules.segments.length ? rules.segments.map(String) : ['all'] },
        start_date: s.start_date || '', end_date: s.end_date || '', status: s.status === 'INACTIVE' ? 'INACTIVE' : s.status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE',
    };
}

// Form values → API body
export function bodyFrom(f) {
    const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
    const loyalty = f.bonus_type === 'LOYALTY_CREDIT';
    return {
        name: f.name.trim(), description: f.description.trim() || null, bonus_type: f.bonus_type, currency: f.currency,
        commission_type: f.commission_type, is_tiered: f.is_tiered,
        credit_amount: f.is_tiered || f.commission_type === 'PERCENTAGE' ? 0 : num(f.credit_amount),
        commission_percentage: f.commission_type === 'PERCENTAGE' && !f.is_tiered ? num(f.commission_percentage) : 0,
        max_award: f.commission_type === 'PERCENTAGE' || f.is_tiered ? num(f.max_award) : null,
        tiers: f.is_tiered ? f.tiers.map((t) => ({ min: num(t.min), max: num(t.max), value: num(t.value) })) : [],
        min_transaction_threshold: loyalty ? 0 : num(f.min_transaction_threshold) || 0,
        min_transactions: loyalty ? num(f.min_transactions) : 0, time_period_days: loyalty ? num(f.time_period_days) : 0,
        eligibility_rules: { ...f.eligibility_rules, validityDays: num(f.eligibility_rules.validityDays), segments: loyalty ? ['existing_customers'] : f.eligibility_rules.segments },
        start_date: f.start_date, end_date: f.end_date, status: f.status,
    };
}

