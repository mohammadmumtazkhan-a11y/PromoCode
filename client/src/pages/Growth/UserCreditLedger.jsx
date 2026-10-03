import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatMoney } from './referralUtils';

const UserCreditLedger = () => {
    const [searchParams] = useSearchParams();
    const [userId, setUserId] = useState('all'); // Enforce Global View
    const [userData, setUserData] = useState({ balance: 0, cost_by_currency: {}, history: [] });
    const [referralRules, setReferralRules] = useState([]);
    const [promoOptions, setPromoOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [bonusSchemes, setBonusSchemes] = useState([]);

    // Phase 2: FRD Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        eventType: '',
        schemeId: searchParams.get('schemeId') || '',
        customerId: searchParams.get('customerId') || ''
    });
    const [customerInput, setCustomerInput] = useState(searchParams.get('customerId') || '');

    // Phase 3: FRD Adjustment Form
    const [adjAmount, setAdjAmount] = useState('');
    const [adjType, setAdjType] = useState('EARNED');
    const [adjReasonCode, setAdjReasonCode] = useState('LOYALTY');
    const [adjNotes, setAdjNotes] = useState('');
    const [adjSchemeId, setAdjSchemeId] = useState('');

    useEffect(() => {
        // Load bonus schemes and promo codes for filter dropdown
        Promise.all([
            fetch('/api/bonus-schemes').then(res => res.json()),
            fetch('/api/promocodes').then(res => res.json()),
            fetch('/api/referral-rules?include_archived=1').then(res => res.json())
        ]).then(([schemeData, promoData, ruleData]) => {
            // Legacy "Referral Credit" schemes are managed in Referral Settings now (US-1.7)
            setBonusSchemes((schemeData.data || []).filter(s => s.bonus_type !== 'REFERRAL_CREDIT'));
            setPromoOptions((promoData.data || []).map(p => ({ id: p.id, name: `Promo: ${p.code}` })));
            setReferralRules(ruleData.data || []);
        }).catch(err => console.error(err));
    }, []);

    // Auto-fetch Global Ledger on mount and filter change
    const fetchLedger = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ ...filters });
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`/api/credits/all${queryString}`);
            const data = await res.json();
            setUserData(data);
        } catch (err) {
            console.error(err);
            // alert('Error fetching ledger data'); // scold user less, just log
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = fetchLedger;

    useEffect(() => {
        fetchLedger();
    }, [filters]); // Re-fetch when filters change

    useEffect(() => {
        const t = setTimeout(() => {
            if (customerInput.trim() !== filters.customerId) setFilters(f => ({ ...f, customerId: customerInput.trim() }));
        }, 400);
        return () => clearTimeout(t);
    }, [customerInput]);

    const handleGlobalView = () => {
        setUserId('all');
        // We need to trigger search, but state update is async. 
        // Better to call a search function with specific ID or wait. 
        // Simplest: set ID then let user click search or auto-trigger? 
        // React batching might fail auto-trigger if simply calling handleSearch().
        // Let's modify handleSearch to accept an override or use a useEffect? 
        // Or just set it and call fetch directly.
        // Actually, setting state 'all' and calling fetch with 'all' matches handleSearch logic.

        // Hack: Call it directly passing 'all' if we refactor handleSearch to take arg? 
        // Or just duplicate logic slightly for reliable immediate action.
        setLoading(true);
        const params = new URLSearchParams({ ...filters });
        const queryString = params.toString() ? `?${params.toString()}` : '';
        fetch(`/api/credits/all${queryString}`)
            .then(res => res.json())
            .then(data => {
                setUserData(data);
                setUserId('all');
            })
            .catch(err => {
                console.error(err);
                alert('Error fetching global data');
            })
            .finally(() => setLoading(false));
    };


    const handleAdjustment = async () => {
        // Phase 3: FRD Validations (Section 3.3)
        if (!adjAmount) return alert('Please enter an amount');
        if (!adjReasonCode) return alert('Please select a reason code');
        if (!adjNotes || adjNotes.trim().length === 0) {
            return alert('Notes are required for manual adjustments');
        }

        if (!confirm(`Are you sure you want to apply this adjustment?\n\nAmount: ${adjAmount}\nReason: ${adjReasonCode}\nNotes: ${adjNotes}`)) {
            return;
        }

        try {
            const res = await fetch('/api/credits/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    amount: parseFloat(adjAmount),
                    type: adjType,
                    reason_code: adjReasonCode,
                    notes: adjNotes,
                    scheme_id: adjSchemeId || null,
                    admin_user: 'Admin' // Should come from auth context
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`Error: ${data.error}`);
                return;
            }

            alert('Adjustment applied successfully');
            setShowAdjustModal(false);
            setAdjAmount('');
            setAdjNotes('');
            handleSearch(); // Reload data
        } catch (err) {
            alert('Failed to apply adjustment');
        }
    };

    // Auto-scroll to audit history when modal opens
    useEffect(() => {
        if (selectedTransaction) {
            setTimeout(() => {
                const element = document.getElementById('audit-history-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }, [selectedTransaction]);

    // Filter logic for immediate UI updates (works for both dummy and real data)
    const filteredHistory = userData.history.filter(item => {
        const itemDate = new Date(item.created_at).setHours(0, 0, 0, 0); // Normalize time
        const start = filters.startDate ? new Date(filters.startDate).setHours(0, 0, 0, 0) : null;
        const end = filters.endDate ? new Date(filters.endDate).setHours(0, 0, 0, 0) : null;

        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        if (filters.eventType && item.type !== filters.eventType) return false;
        // Scheme and customer filters are applied by the server
        return true;
    });

    return (
        <div style={{ padding: 32, maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 8 }}>User Credit Ledger</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>View balances and audit history for user bonus wallets</p>

            {/* Global ONLY View - No Search Bar */}

            {/* Phase 2: FRD Filters */}
            <div className="glass-panel" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>📊 Advanced Filters</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer' }}
                            onClick={() => {
                                const end = new Date();
                                const start = new Date();
                                start.setDate(start.getDate() - 7);
                                setFilters({ ...filters, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] });
                                // Trigger search immediately or let user click search? 
                                // Let's rely on Search button for consistency, but maybe auto-trigger in React is better.
                                // For now, just setting state.
                            }}
                        >
                            Last 7 Days
                        </button>
                        <button
                            type="button"
                            style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer' }}
                            onClick={() => {
                                const end = new Date();
                                const start = new Date();
                                start.setDate(start.getDate() - 30);
                                setFilters({ ...filters, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] });
                            }}
                        >
                            Last 30 Days
                        </button>
                        <button
                            type="button"
                            style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer' }}
                            onClick={() => {
                                setFilters({ ...filters, startDate: '', endDate: '' });
                            }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', boxSizing: 'border-box', minWidth: 0 }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', boxSizing: 'border-box', minWidth: 0 }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Event Type</label>
                        <select
                            value={filters.eventType}
                            onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', boxSizing: 'border-box', minWidth: 0 }}
                        >
                            <option value="">All Types</option>
                            <option value="EARNED">Earned</option>
                            <option value="APPLIED">Applied</option>
                            <option value="EXPIRED">Expired</option>
                            <option value="VOIDED">Voided</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Bonus Scheme</label>
                        <select
                            value={filters.schemeId}
                            onChange={(e) => setFilters({ ...filters, schemeId: e.target.value })}
                            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', boxSizing: 'border-box', minWidth: 0 }}
                        >
                            <option value="">All Schemes</option>
                            <optgroup label="Bonus schemes">
                                {bonusSchemes.map(scheme => (
                                    <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
                                ))}
                            </optgroup>
                            {referralRules.length > 0 && (
                                <optgroup label="Referral rules">
                                    {referralRules.map(rule => (
                                        <option key={`rr_${rule.id}`} value={`rr_${rule.id}`}>{rule.name} ({rule.base_currency}){rule.status === 'ARCHIVED' ? ' – archived' : ''}</option>
                                    ))}
                                </optgroup>
                            )}
                            {promoOptions.length > 0 && (
                                <optgroup label="Promo codes">
                                    {promoOptions.map(p => (
                                        <option key={`promo_${p.id}`} value={p.id}>{p.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="ledger-customer" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Customer ID</label>
                        <input
                            id="ledger-customer"
                            type="text"
                            placeholder="e.g. user_101"
                            maxLength={64}
                            value={customerInput}
                            onChange={(e) => setCustomerInput(e.target.value)}
                            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>
            </div>

            <div className="fade-in">
                {/* Balance Card */}
                <div className="glass-panel" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 4 }}>Cost Incurred</div>
                        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                            {Object.keys(userData.cost_by_currency || {}).length === 0 ? (
                                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>0.00</div>
                            ) : Object.entries(userData.cost_by_currency).map(([cur, value]) => (
                                <div key={cur} data-testid={`cost-${cur}`} style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    {cur} {Number(value).toFixed(2)}
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Totals are shown per currency and never added together.</div>

                    </div>

                </div>

                {/* History Table */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>Ledger History ({filteredHistory.length} entries)</h3>
                <div className="table-wrapper" style={{ borderRadius: 12, overflowX: 'auto', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid var(--border-subtle)' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Date</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Customer</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Type</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Scheme</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Reference / Reason</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Notes</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Amount</th>
                                {filters.customerId && <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Running balance</th>}

                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.length === 0 ? (
                                <tr><td colSpan={filters.customerId ? 8 : 7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No history found for these filters</td></tr>
                            ) : (
                                filteredHistory.map(entry => (
                                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: '#374151' }}>{new Date(entry.created_at).toLocaleString('en-GB')}</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{entry.customer_name || 'Unknown customer'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>ID: {entry.user_id || '—'}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span className={`status-badge ${entry.amount >= 0 ? 'success' : 'failure'}`} style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                                                {entry.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: '#6b7280' }}>{entry.scheme_name || '-'}</td>
                                        <td style={{ padding: '16px 24px', fontSize: '0.85rem' }}>
                                            {entry.source_type && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>{entry.source_type}</span>}
                                            {entry.reason_code && <span style={{ fontWeight: 600, color: '#ea580c', background: '#fff7ed', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>{entry.reason_code}</span>}
                                            <span style={{ color: '#374151' }}>{entry.reference_id || '-'}</span>
                                        </td>
                                        <td
                                            style={{ padding: '16px 24px', fontSize: '0.8rem', color: '#6b7280', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => {
                                                // Audit trail from the ledger entry itself (no sample data)
                                                const auditData = {
                                                    ...entry,
                                                    audit_trail: [
                                                        { date: entry.created_at, action: `Bonus ${entry.type}`, user: entry.admin_user || 'System', notes: entry.notes },
                                                        entry.type === 'EARNED' && entry.expires_at ? { date: entry.expires_at, action: 'Expires', user: 'System', notes: 'Unused credit expires at the end of this day (UK time)' } : null
                                                    ].filter(Boolean)
                                                };
                                                setSelectedTransaction(auditData);
                                            }}
                                            title="Click to view audit details"
                                        >
                                            {entry.notes || '-'}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: entry.amount >= 0 ? '#16a34a' : '#ef4444', fontSize: '0.9rem' }}>
                                            {entry.currency || 'GBP'} {entry.amount >= 0 ? '+' : ''}{entry.amount.toFixed(2)}
                                        </td>
                                        {filters.customerId && (
                                            <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.85rem', color: '#374151' }}>
                                                {entry.running_balance === undefined ? '—' : formatMoney(entry.running_balance, entry.currency || 'GBP')}
                                            </td>
                                        )}

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Phase 3: Enhanced Adjustment Modal (FRD Section 3.3) */}
            {
                showAdjustModal && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: 500 }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24 }}>Manual Credit Adjustment</h3>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 600 }}>Event Type *</label>
                                <select
                                    value={adjType}
                                    onChange={(e) => setAdjType(e.target.value)}
                                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                                >
                                    <option value="EARNED">Earned (Credit)</option>
                                    <option value="VOIDED">Voided (Debit)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 600 }}>Reason Code *</label>
                                <select
                                    value={adjReasonCode}
                                    onChange={(e) => setAdjReasonCode(e.target.value)}
                                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                                    required
                                >
                                    <option value="LOYALTY">Loyalty</option>
                                    <option value="CORRECTION">Correction</option>
                                    <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 600 }}>Amount *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={adjAmount}
                                    onChange={(e) => setAdjAmount(e.target.value)}
                                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                                    required
                                />
                                {adjType === 'VOIDED' && <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: 4 }}>Enter as negative number (e.g. -50) to remove credit.</div>}
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 600 }}>Bonus Scheme (Optional)</label>
                                <select
                                    value={adjSchemeId}
                                    onChange={(e) => setAdjSchemeId(e.target.value)}
                                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                                >
                                    <option value="">None</option>
                                    {bonusSchemes.map(scheme => (
                                        <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 600 }}>Notes *</label>
                                <textarea
                                    placeholder="Provide detailed context for this adjustment (required for audit trail)..."
                                    value={adjNotes}
                                    onChange={(e) => setAdjNotes(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)', fontFamily: 'inherit', resize: 'vertical' }}
                                    required
                                />
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
                                    Example: "Customer complaint ticket #1234 - compensation for delayed payout"
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button className="btn-secondary" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                                <button className="btn-primary" onClick={handleAdjustment}>Confirm & Apply</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Transaction Details / Audit Modal */}
            {
                selectedTransaction && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: 600 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Transaction Details</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>ID: {selectedTransaction.id}</p>
                                </div>
                                <button onClick={() => setSelectedTransaction(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Balance Change</label>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: selectedTransaction.amount >= 0 ? '#16a34a' : '#ef4444' }}>
                                        {selectedTransaction.currency || 'GBP'} {selectedTransaction.amount >= 0 ? '+' : ''}{selectedTransaction.amount.toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Reason / Scheme</label>
                                    <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                                        {selectedTransaction.reason_code && <span style={{ color: '#ea580c', fontWeight: 600 }}>[{selectedTransaction.reason_code}]</span>} {selectedTransaction.scheme_name}
                                    </div>
                                </div>
                            </div>

                            <div id="audit-history-section">
                                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>📜</span> Audit History
                                </h4>
                                <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, border: '1px solid var(--border-subtle)' }}>
                                    {selectedTransaction.audit_trail && selectedTransaction.audit_trail.map((log, fontIndex) => (
                                        <div key={fontIndex} style={{ display: 'flex', gap: 16, marginBottom: 16, position: 'relative' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6b7280', zIndex: 1 }}></div>
                                                {fontIndex !== selectedTransaction.audit_trail.length - 1 && <div style={{ width: 2, flex: 1, background: '#e5e7eb', margin: '4px 0' }}></div>}
                                            </div>
                                            <div style={{ paddingBottom: fontIndex !== selectedTransaction.audit_trail.length - 1 ? 8 : 0 }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{log.action}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{new Date(log.date).toLocaleString()} • by {log.user}</div>
                                                {log.notes && <div style={{ fontSize: '0.85rem', color: '#4b5563', fontStyle: 'italic' }}>"{log.notes}"</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 24, textAlign: 'right' }}>
                                <button className="btn-secondary" onClick={() => setSelectedTransaction(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default UserCreditLedger;
