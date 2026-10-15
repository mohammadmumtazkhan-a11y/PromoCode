import { toLocalInput } from './promoUtils';

const EMPTY = {
    code: '', description: '', type: 'Fixed', value: '', currency: 'GBP', max_discount: '', min_threshold: '',
    usage_limit_global: '', budget_limit: '', usage_limit_per_user: '1', perUserUnlimited: false,
    start_date: '', end_date: '', allCorridors: true, corridors: [], allMethods: true, payment_methods: [],
    applies_to_flow: 'send', audience: 'all', customer_ids: '', segment_id: '', targeted_user_id: '',
    min_transactions: '', min_volume: '', registered_from: '', registered_to: '',
};

// Promo code (or its form state) → form state
// Promo code → form state for PromoCodeForm
export function formFromPromo(p) {
    if (!p) return { ...EMPTY };
    const r = p.restrictions || {};
    const seg = p.user_segment || { type: 'all' };
    let audience = 'all';
    if (['new_customers', 'existing_customers', 'specific_customers', 'targeted'].includes(seg.type)) audience = seg.type;
    else if (seg.type && seg.type !== 'all') audience = 'segment';
    const allCorridors = !(r.corridors && r.corridors.length);
    const corridors = r.corridors || [];
    const firstCorridorSend = corridors.length ? String(corridors[0]).split('-')[0] : '';
    const resolvedCurrency = (p.currency && p.currency !== 'ALL')
        ? p.currency
        : (firstCorridorSend && firstCorridorSend !== 'ALL' ? firstCorridorSend : 'GBP');
    return {
        ...EMPTY,
        code: p.code || '', description: p.description || '', type: p.type, value: p.type === 'Waiver' ? '' : String(p.value ?? ''),
        currency: resolvedCurrency,
        max_discount: p.max_discount ? String(p.max_discount) : '',
        min_threshold: p.min_threshold ? String(p.min_threshold) : '',
        usage_limit_global: p.usage_limit_global === -1 || p.usage_limit_global == null ? '' : String(p.usage_limit_global),
        budget_limit: p.budget_limit === -1 || p.budget_limit == null ? '' : String(p.budget_limit),
        usage_limit_per_user: p.usage_limit_per_user === -1 ? '1' : String(p.usage_limit_per_user ?? 1),
        perUserUnlimited: p.usage_limit_per_user === -1,
        start_date: toLocalInput(p.start_date), end_date: toLocalInput(p.end_date),
        allCorridors, corridors,
        allMethods: !(r.payment_methods && r.payment_methods.length), payment_methods: r.payment_methods || [],
        applies_to_flow: r.applies_to_flow || 'send',
        audience, customer_ids: (seg.user_ids || []).join(', '), segment_id: audience === 'segment' ? String(seg.type) : '',
        targeted_user_id: seg.user_id || '',
        min_transactions: seg.min_transactions ? String(seg.min_transactions) : '',
        min_volume: seg.min_volume ? String(seg.min_volume) : '',
        registered_from: seg.registered_from || '',
        registered_to: seg.registered_to || '',
    };
}

