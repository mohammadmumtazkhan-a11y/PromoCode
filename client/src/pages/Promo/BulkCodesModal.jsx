import React, { useEffect, useState } from 'react';
import { CURRENCIES, TYPE_OPTIONS, toUtcIso } from './lib/promoUtils';

// Phase 3 (PROMO-MITO §5.4): many codes with the same rules, or one personal code per customer.
export default function BulkCodesModal({ onClose, onDone, push }) {
    const [mode, setMode] = useState('count');
    const [f, setF] = useState({ prefix: '', count: '10', customer_ids: '', type: 'Fixed', value: '', currency: 'GBP', min_threshold: '', start_date: '', end_date: '', usage_limit_per_user: '1' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [created, setCreated] = useState(null);
    const set = (patch) => { setF((x) => ({ ...x, ...patch })); setErrors({}); };

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (f.prefix && !/^[A-Za-z0-9]{2,10}$/.test(f.prefix)) errs.prefix = 'Use 2–10 letters or numbers for the prefix.';
        const ids = f.customer_ids.split(/[\s,]+/).filter(Boolean);
        if (mode === 'count' && (!/^\d+$/.test(f.count) || Number(f.count) < 1 || Number(f.count) > 1000)) errs.count = 'Create between 1 and 1,000 codes.';
        if (mode === 'customers' && (ids.length < 1 || ids.length > 1000)) errs.customer_ids = 'Enter between 1 and 1,000 customer IDs.';
        if (Object.keys(errs).length) { setErrors(errs); push('Please correct the highlighted fields.', 'error'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/promocodes/bulk', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prefix: f.prefix || undefined, count: mode === 'count' ? Number(f.count) : undefined, customer_ids: mode === 'customers' ? ids : undefined,
                    config: { type: f.type, value: f.type === 'Waiver' ? 0 : f.value, currency: f.currency, min_threshold: f.min_threshold, usage_limit_per_user: f.usage_limit_per_user, start_date: toUtcIso(f.start_date), end_date: toUtcIso(f.end_date) },
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setErrors(data.fields || {}); push(data.fields ? 'Please correct the highlighted fields.' : (data.error || "We couldn't create the codes. Please try again."), 'error'); return; }
            setCreated(data.created);
            push(`${data.created.length} promo codes created.`);
            onDone();
        } catch {
            push("We couldn't create the codes. Please try again.", 'error');
        } finally { setSaving(false); }
    };

    const download = () => {
        const csv = ['Code,Customer ID', ...created.map((c) => `${c.code},${c.customer_id || ''}`)].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = 'promo-codes-bulk.csv'; document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    };

    const err = (k) => errors[k] && <div className="rf-error">{errors[k]}</div>;
    return (
        <div className="rf-dialog-backdrop" onClick={onClose}>
            <div className="rf-dialog promo-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-title" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="rf-dialog-close" aria-label="Close" onClick={onClose}>×</button>
                <h3 id="bulk-title">Bulk create</h3>
                {created ? (
                    <>
                        <p>{created.length} codes were created.</p>
                        <div className="promo-bulk-list">{created.slice(0, 50).map((c) => <div key={c.code} className="promo-mono">{c.code}{c.customer_id ? ` → ${c.customer_id}` : ''}</div>)}</div>
                        <div className="rf-dialog-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
                            <button type="button" className="btn-primary" onClick={download}>Download CSV</button>
                        </div>
                    </>
                ) : (
                    <form onSubmit={submit} noValidate>
                        <div className="promo-audience" role="radiogroup" aria-label="What to create">
                            <label className="rf-check"><input type="radio" checked={mode === 'count'} onChange={() => setMode('count')} /> A number of codes</label>
                            <label className="rf-check"><input type="radio" checked={mode === 'customers'} onChange={() => setMode('customers')} /> One code per customer</label>
                        </div>
                        <div className="rf-grid rf-grid-2">
                            <div className="rf-field"><label htmlFor="bk-prefix">Prefix (optional)</label>
                                <input id="bk-prefix" className="rf-input" value={f.prefix} maxLength={10} onChange={(e) => set({ prefix: e.target.value.toUpperCase() })} />{err('prefix')}</div>
                            {mode === 'count' ? (
                                <div className="rf-field"><label htmlFor="bk-count">How many<span className="rf-req">*</span></label>
                                    <input id="bk-count" className="rf-input" inputMode="numeric" value={f.count} onChange={(e) => set({ count: e.target.value })} />{err('count')}</div>
                            ) : (
                                <div className="rf-field"><label htmlFor="bk-ids">Customer IDs<span className="rf-req">*</span></label>
                                    <textarea id="bk-ids" className="rf-input" rows={3} value={f.customer_ids} onChange={(e) => set({ customer_ids: e.target.value })} />{err('customer_ids')}</div>
                            )}
                        </div>
                        <div className="rf-grid rf-grid-3">
                            <div className="rf-field"><label htmlFor="bk-type">Type</label>
                                <select id="bk-type" className="rf-select" value={f.type} onChange={(e) => set({ type: e.target.value })}>{TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                            {f.type !== 'Waiver' && <div className="rf-field"><label htmlFor="bk-value">Value<span className="rf-req">*</span></label>
                                <input id="bk-value" className="rf-input" inputMode="decimal" value={f.value} onChange={(e) => set({ value: e.target.value })} />{err('value')}</div>}
                            <div className="rf-field"><label htmlFor="bk-cur">Currency</label>
                                <select id="bk-cur" className="rf-select" value={f.currency} onChange={(e) => set({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
                        </div>
                        <div className="rf-grid rf-grid-3">
                            <div className="rf-field"><label htmlFor="bk-min">Minimum send amount</label>
                                <input id="bk-min" className="rf-input" inputMode="decimal" value={f.min_threshold} onChange={(e) => set({ min_threshold: e.target.value })} />{err('min_threshold')}</div>
                            <div className="rf-field"><label htmlFor="bk-start">Start<span className="rf-req">*</span></label>
                                <input id="bk-start" type="datetime-local" className="rf-input" value={f.start_date} onChange={(e) => set({ start_date: e.target.value })} />{err('start_date')}</div>
                            <div className="rf-field"><label htmlFor="bk-end">End<span className="rf-req">*</span></label>
                                <input id="bk-end" type="datetime-local" className="rf-input" value={f.end_date} onChange={(e) => set({ end_date: e.target.value })} />{err('end_date')}</div>
                        </div>
                        <div className="rf-dialog-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create codes'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
