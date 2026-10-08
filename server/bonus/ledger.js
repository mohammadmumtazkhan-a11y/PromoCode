// Admin Bonus Wallet / Ledger (spec §5.5, API-A8 – A10, A13). Same response fields as before, plus the credit source
// of every row (the existing `source_type` — BONUS / PROMO row kind — is unchanged; do not confuse the two).
const { round2, cur } = require('./money');
const wallet = require('./wallet');
const { namesFor } = require('./blocks');
const { activeBlock } = require('./blocks');

function filtersFrom(query, userId) {
    const isGlobal = userId === 'all';
    const schemeId = query.schemeId ? String(query.schemeId) : '';
    return {
        isGlobal, userId,
        startDate: query.startDate || null, endDate: query.endDate || null,
        eventType: query.eventType || null, customerId: query.customerId || null,
        schemeId, isReferralRule: schemeId.startsWith('rr_'),
        creditSource: query.creditSource && wallet.SOURCES.includes(String(query.creditSource).toUpperCase()) ? String(query.creditSource).toUpperCase() : null,
        referralId: query.referralId || null,
    };
}

async function bonusRows(q, f) {
    const cond = []; const params = [];
    if (!f.isGlobal) { cond.push('cl.user_id = ?'); params.push(f.userId); }
    if (f.startDate) { cond.push('date(cl.created_at) >= date(?)'); params.push(f.startDate); }
    if (f.endDate) { cond.push('date(cl.created_at) <= date(?)'); params.push(f.endDate); }
    if (f.eventType) { cond.push('cl.type = ?'); params.push(f.eventType); }
    if (f.customerId) { cond.push('cl.user_id = ?'); params.push(f.customerId); }
    if (f.isReferralRule) { cond.push('cl.referral_rule_id = ?'); params.push(parseInt(f.schemeId.slice(3), 10)); }
    else if (f.schemeId) { cond.push('cl.scheme_id = ?'); params.push(parseInt(f.schemeId, 10)); }
    if (f.creditSource) { cond.push('COALESCE(cl.credit_source, src.credit_source) = ?'); params.push(f.creditSource); }
    if (f.referralId) { cond.push('cl.referral_id = ?'); params.push(f.referralId); }
    const rows = await q.all(`SELECT cl.*, COALESCE(cl.currency, 'GBP') AS currency, 'BONUS' AS source_type,
            COALESCE(bs.name, CASE WHEN cl.referral_rule_id IS NULL AND COALESCE(src.reason_code, cl.reason_code) = 'LOYALTY' THEN 'Manual loyalty credit' END) AS scheme_name,
            COALESCE(cl.credit_source, src.credit_source) AS eff_source, COALESCE(cl.credit_source_detail, src.credit_source_detail) AS eff_detail
        FROM credit_ledger cl
        LEFT JOIN bonus_schemes bs ON cl.scheme_id = bs.id
        LEFT JOIN credit_ledger src ON src.id = cl.source_credit_id
        ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''}
        ORDER BY cl.created_at DESC, cl.rowid DESC`, params);
    for (const r of rows) {
        r.credit_source = r.eff_source || null;
        r.credit_source_detail = r.eff_detail || null;
        r.credit_source_label = wallet.adminSourceLabel(r.credit_source, r.credit_source_detail);
        delete r.eff_source; delete r.eff_detail;
    }
    return rows;
}

async function history(q, userId, query, ports) {
    const f = filtersFrom(query, userId);
    const balanceRow = f.isGlobal
        ? await q.get('SELECT SUM(amount) AS balance FROM credit_ledger')
        : await q.get('SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id = ?', [userId]);
    const balance = balanceRow && balanceRow.balance ? balanceRow.balance : 0;

    let ledgerRows = await bonusRows(q, f);
    try { ledgerRows = await ports.ledgerDecorator(ledgerRows); } catch (e) { console.error('[bonus] ledger decorator failed', e.message); }

    // Other read-only rows (promo redemptions …) — not wallet credit, so never shown under a credit-source filter
    let extra = [];
    if (!f.creditSource && !f.referralId) {
        for (const source of ports.historySources || []) {
            try { extra = extra.concat(await source(f)); } catch (e) { console.error('[bonus] history source failed', e.message); }
        }
    }

    // Customer names: the host directory first, then the module's own records
    const ids = [...new Set([...ledgerRows, ...extra].filter((r) => !r.customer_name && r.user_id).map((r) => r.user_id))];
    const names = ids.length ? await namesFor(q, ids, ports.customerDirectory) : {};
    for (const r of [...ledgerRows, ...extra]) if (!r.customer_name) r.customer_name = names[r.user_id] || null;

    const allHistory = [...ledgerRows, ...extra].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const dynamicCost = allHistory.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    // Never add different currencies together (AC-1.9.3)
    const costByCurrency = {};
    for (const e of allHistory) {
        const c = e.currency || 'GBP';
        costByCurrency[c] = round2((costByCurrency[c] || 0) + Math.abs(e.amount));
    }
    // Running balance per customer (oldest first), shown when one customer is selected (AC-1.9.4)
    const running = {};
    [...allHistory].reverse().forEach((e) => {
        if (e.source_type !== 'BONUS') return; // promo discounts are not wallet money
        const key = `${e.user_id}|${e.currency || 'GBP'}`;
        running[key] = round2((running[key] || 0) + e.amount);
        e.running_balance = running[key];
    });
    // Credit status for EARNED rows
    const one = !f.isGlobal ? userId : f.customerId;
    const statusById = {};
    const owners = one ? [one] : [...new Set(ledgerRows.filter((r) => r.type === 'EARNED').map((r) => r.user_id))];
    for (const u of owners) for (const c of await wallet.creditsWithRemaining(q, u)) statusById[c.id] = { status: c.status, remaining: c.remaining };
    for (const r of ledgerRows) if (r.type === 'EARNED' && statusById[r.id]) { r.credit_status = statusById[r.id].status; r.remaining = statusById[r.id].remaining; }

    // KPIs: outstanding bonus (per currency, per source) and outstanding clawback debt
    const outstanding = await wallet.outstandingBySource(q, one ? { userId: one } : {});
    const debtRows = await q.all(`SELECT currency, -SUM(amount) AS d FROM credit_ledger WHERE type IN ('CLAWBACK', 'CLAWBACK_SETTLED') ${one ? 'AND user_id = ?' : ''} GROUP BY currency`, one ? [one] : []);
    const debtByCurrency = {};
    for (const d of debtRows) if (d.d > 0.004) debtByCurrency[d.currency || 'GBP'] = round2(d.d);

    const body = {
        balance, cost_incurred: dynamicCost, cost_by_currency: costByCurrency, currency: 'GBP', history: allHistory,
        outstanding_by_currency: outstanding, debt_by_currency: debtByCurrency,
    };
    if (one) {
        const view = await wallet.walletView(q, one, {});
        body.customer = { id: one, balances: view.balances, bonus_blocked: !!(await activeBlock(q, one)) };
    }
    return body;
}

const csvEscape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsv(rows) {
    const cols = [
        ['Date', 'created_at'], ['Customer ID', 'user_id'], ['Customer', 'customer_name'], ['Type', 'type'], ['Source', 'credit_source_label'],
        ['Scheme / code', 'scheme_name'], ['Reason', 'reason_code'], ['Amount', 'amount'], ['Currency', 'currency'], ['Expires', 'expires_at'],
        ['Transfer', 'transfer_id'], ['Reference', 'reference_id'], ['Notes', 'notes'], ['Admin', 'admin_user'], ['Row kind', 'source_type'],
    ];
    return [cols.map((c) => c[0]).join(','), ...rows.map((r) => cols.map((c) => csvEscape(r[c[1]])).join(','))].join('\n');
}

module.exports = { history, toCsv, filtersFrom, cur };
