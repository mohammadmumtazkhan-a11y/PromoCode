import React, { useState, useEffect } from 'react';

// User Segment Manager Component
const UserSegmentManager = () => {
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', description: '',
        criteria: { type: 'TRANSACTION_COUNT', min: 0, max: null, period_days: 30, currency: 'GBP' }
    });

    useEffect(() => { fetchSegments(); }, []);

    const fetchSegments = async () => {
        try {
            const res = await fetch('/api/user-segments');
            const data = await res.json();
            setSegments(data.data);
            setLoading(false);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingId ? `/api/user-segments/${editingId}` : '/api/user-segments';
        const method = editingId ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        setFormData({ name: '', description: '', criteria: { type: 'TRANSACTION_COUNT', min: 0, max: null, period_days: 30, currency: 'GBP' } });
        setEditingId(null);
        fetchSegments();
    };

    // Shared Styles (defined below or inline)
    const inputStyle = { width: '100%', padding: '10px 12px', background: 'white', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' };
    const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 };

    return (
        <div className="glass-panel" style={{ padding: 24, marginTop: 24 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 20 }}>Manage User Segments</h3>

            <form onSubmit={handleSubmit} style={{ marginBottom: 32, padding: 24, background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                        <label style={labelStyle}>Segment Name</label>
                        <input style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. New Users" />
                    </div>
                    <div>
                        <label style={labelStyle}>Description</label>
                        <input style={inputStyle} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Criteria Type</label>
                    <select style={inputStyle} value={formData.criteria.type} onChange={e => setFormData({ ...formData, criteria: { ...formData.criteria, type: e.target.value } })}>
                        <option value="TRANSACTION_COUNT">Transaction Count (for New/Churned)</option>
                        <option value="TRANSACTION_VOLUME">Transaction Volume (for High Value)</option>
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                        <label style={labelStyle}>Min {formData.criteria.type === 'TRANSACTION_VOLUME' ? 'Amount' : 'Count'}</label>
                        <input type="number" style={inputStyle} value={formData.criteria.min} onChange={e => setFormData({ ...formData, criteria: { ...formData.criteria, min: parseFloat(e.target.value) } })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Max {formData.criteria.type === 'TRANSACTION_VOLUME' ? 'Amount' : 'Count'} (Empty = ∞)</label>
                        <input type="number" style={inputStyle} value={formData.criteria.max || ''} onChange={e => setFormData({ ...formData, criteria: { ...formData.criteria, max: e.target.value ? parseFloat(e.target.value) : null } })} />
                    </div>

                    <div>
                        <label style={labelStyle}>{formData.criteria.type === 'TRANSACTION_VOLUME' ? 'Currency' : 'Evaluation Period'}</label>
                        {formData.criteria.type === 'TRANSACTION_VOLUME' ? (
                            <SearchableSelect value={formData.criteria.currency} onChange={val => setFormData({ ...formData, criteria: { ...formData.criteria, currency: val } })} />
                        ) : (
                            <div>
                                <select
                                    style={{ ...inputStyle, marginBottom: 8 }}
                                    value={formData.criteria.period_days ? 'RECENT' : 'LIFETIME'}
                                    onChange={(e) => {
                                        const mode = e.target.value;
                                        setFormData({
                                            ...formData,
                                            criteria: {
                                                ...formData.criteria,
                                                period_days: mode === 'RECENT' ? 30 : null
                                            }
                                        });
                                    }}
                                >
                                    <option value="LIFETIME">Since Registration (Lifetime)</option>
                                    <option value="RECENT">In Past N Days (Recent)</option>
                                </select>

                                {formData.criteria.period_days && (
                                    <div>
                                        <label style={labelStyle}>Number of Days</label>
                                        <input
                                            type="number"
                                            style={inputStyle}
                                            value={formData.criteria.period_days || ''}
                                            onChange={e => setFormData({ ...formData, criteria: { ...formData.criteria, period_days: parseInt(e.target.value) } })}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <button type="submit" className="btn-primary">{editingId ? 'Update Segment' : 'Create Segment'}</button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', description: '', criteria: { type: 'TRANSACTION_COUNT', min: 0, max: null, period_days: 30, currency: 'GBP' } }); }} style={{ marginLeft: 12, color: '#6b7280' }}>Cancel</button>}
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                        <th style={{ padding: 12 }}>Name</th>
                        <th style={{ padding: 12 }}>Criteria</th>
                        <th style={{ padding: 12 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {segments.map(seg => (
                        <tr key={seg.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: 12 }}>
                                <div style={{ fontWeight: 600 }}>{seg.name}</div>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{seg.description}</div>
                            </td>
                            <td style={{ padding: 12, fontSize: '0.9rem' }}>
                                <div>Type: {seg.criteria.type === 'TRANSACTION_VOLUME' ? 'Volume' : 'Count'}</div>
                                <div>Range: {seg.criteria.min} - {seg.criteria.max ?? '∞'}</div>
                                {seg.criteria.type === 'TRANSACTION_VOLUME' ? (
                                    <div>Currency: {seg.criteria.currency}</div>
                                ) : (
                                    <div>Time: {seg.criteria.period_days} days</div>
                                )}
                            </td>
                            <td style={{ padding: 12 }}>
                                <button onClick={() => { setEditingId(seg.id); setFormData({ name: seg.name, description: seg.description, criteria: seg.criteria }); }} style={{ marginRight: 8 }}>✏️</button>
                                <button onClick={async () => { if (confirm('Delete?')) { await fetch(`/api/user-segments/${seg.id}`, { method: 'DELETE' }); fetchSegments(); } }}>🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const BonusSchemeManager = () => {
    const [schemes, setSchemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newTier, setNewTier] = useState({ min: '', max: '', value: '' });

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        bonus_type: 'LOYALTY_CREDIT',
        credit_amount: 10,
        currency: 'GBP',
        min_transaction_threshold: 50,
        min_transactions: 3,
        time_period_days: 30,
        commission_type: 'FIXED',
        commission_percentage: 0,
        is_tiered: false,
        tiers: [],
        eligibility_rules: {
            corridors: [],
            paymentMethods: [],
            affiliates: [],
            segments: []
        },
        start_date: '',
        end_date: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        fetchSchemes();
    }, []);

    const fetchSchemes = async () => {
        try {
            const res = await fetch('/api/bonus-schemes');
            const data = await res.json();
            setSchemes(data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        // FRD Validation (Section 3.1)
        if (!formData.start_date || !formData.end_date) {
            alert('Please provide both start and end dates');
            setSaving(false);
            return;
        }

        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
            alert('Start date must be before end date');
            setSaving(false);
            return;
        }

        // Tier Validation
        if (formData.is_tiered && formData.tiers.length === 0) {
            alert('Please add at least one tier for tiered commission');
            setSaving(false);
            return;
        }

        try {
            let response;
            if (editingId) {
                response = await fetch(`/api/bonus-schemes/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            } else {
                response = await fetch('/api/bonus-schemes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            }

            const data = await response.json();

            if (!response.ok) {
                alert(`Error: ${data.error}`);
                setSaving(false);
                return;
            }

            alert(editingId ? 'Scheme updated successfully' : 'Scheme created successfully');
            resetForm();
            fetchSchemes();
        } catch (err) {
            alert('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (scheme) => {
        setFormData({
            name: scheme.name,
            bonus_type: scheme.bonus_type,
            credit_amount: scheme.credit_amount,
            currency: scheme.currency || 'GBP',
            min_transaction_threshold: scheme.min_transaction_threshold,
            min_transactions: scheme.min_transactions || 0,
            time_period_days: scheme.time_period_days || 0,
            commission_type: scheme.commission_type || 'FIXED',
            commission_percentage: scheme.commission_percentage || 0,
            is_tiered: !!scheme.is_tiered,
            tiers: scheme.tiers || [],
            eligibility_rules: scheme.eligibility_rules,
            start_date: scheme.start_date,
            end_date: scheme.end_date,
            status: scheme.status
        });
        setEditingId(scheme.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this bonus scheme?')) return;

        try {
            await fetch(`/api/bonus-schemes/${id}`, { method: 'DELETE' });
            alert('Scheme deleted');
            fetchSchemes();
        } catch (err) {
            alert('Error deleting scheme');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            bonus_type: 'LOYALTY_CREDIT',
            credit_amount: 10,
            currency: 'GBP',
            min_transaction_threshold: 50,
            min_transactions: 3,
            time_period_days: 30,
            commission_type: 'FIXED',
            commission_percentage: 0,
            is_tiered: false,
            tiers: [],
            eligibility_rules: { corridors: [], paymentMethods: [], affiliates: [], segments: [] },
            start_date: '',
            end_date: '',
            status: 'ACTIVE'
        });
        setEditingId(null);
    };






    const [activeTab, setActiveTab] = useState('SCHEMES');
    const [availableSegments, setAvailableSegments] = useState([]);

    useEffect(() => {
        // Fetch segments for dropdown
        fetch('/api/user-segments').then(res => res.json()).then(data => setAvailableSegments(data.data || []));
    }, [activeTab]); // Refresh when tab switches

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 8 }}>Bonus Scheme Manager</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Configure and manage bonus credit earning rules</p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
                <button
                    onClick={() => setActiveTab('SCHEMES')}
                    style={{ padding: '12px 24px', borderBottom: activeTab === 'SCHEMES' ? '2px solid #3b82f6' : 'none', fontWeight: 600, color: activeTab === 'SCHEMES' ? '#3b82f6' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    Bonus Schemes
                </button>
                <button
                    onClick={() => setActiveTab('SEGMENTS')}
                    style={{ padding: '12px 24px', borderBottom: activeTab === 'SEGMENTS' ? '2px solid #3b82f6' : 'none', fontWeight: 600, color: activeTab === 'SEGMENTS' ? '#3b82f6' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    User Segments
                </button>
            </div>

            {activeTab === 'SEGMENTS' ? (
                <UserSegmentManager />
            ) : (
                <>
                    {/* Form */}
                    <div className="glass-panel" style={{ padding: 32, marginBottom: 32 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 20 }}>
                            {editingId ? 'Edit Bonus Scheme' : 'Create New Scheme'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            {/* Name & Type */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
                                <div>
                                    <label style={labelStyle}>Bonus Name *</label>
                                    <input
                                        style={inputStyle}
                                        placeholder="e.g. Transaction Threshold Credit"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Bonus Type *</label>
                                    <select
                                        style={inputStyle}
                                        value={formData.bonus_type}
                                        onChange={(e) => setFormData({ ...formData, bonus_type: e.target.value })}
                                        required
                                    >
                                        <option value="LOYALTY_CREDIT">Loyalty Credit</option>
                                        <option value="TRANSACTION_THRESHOLD_CREDIT">Transaction Threshold Credit</option>
                                        <option value="REQUEST_MONEY">Request Money Credit</option>
                                    </select>
                                </div>
                            </div>

                            {/* Commission Type & Mode */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 16 }}>
                                    <div>
                                        <label style={labelStyle}>Commission Type *</label>
                                        <select
                                            style={inputStyle}
                                            value={formData.commission_type || 'FIXED'}
                                            onChange={(e) => setFormData({ ...formData, commission_type: e.target.value })}
                                            required
                                        >
                                            <option value="FIXED">Fixed Amount</option>
                                            <option value="PERCENTAGE">Percentage (%)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Structure</label>
                                        <div style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.is_tiered}
                                                    onChange={(e) => setFormData({ ...formData, is_tiered: e.target.checked })}
                                                    style={{ width: 16, height: 16 }}
                                                />
                                                Enable Tiered Commission (Threshold Ranges)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Tiered UI */}
                                {formData.is_tiered ? (
                                    <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                        <label style={{ ...labelStyle, marginBottom: 12 }}>Commission Tiers</label>

                                        {/* Existing Tiers List */}
                                        {formData.tiers.length > 0 && (
                                            <div style={{ marginBottom: 16 }}>
                                                {formData.tiers.map((tier, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: '0.9rem' }}>
                                                        <span style={{ fontWeight: 500, width: 24 }}>{idx + 1}.</span>
                                                        <span style={{ background: 'white', padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db' }}>
                                                            {tier.min} - {tier.max}
                                                        </span>
                                                        <span>→</span>
                                                        <span style={{ fontWeight: 600, color: '#059669' }}>
                                                            {formData.commission_type === 'PERCENTAGE' ? `${tier.value}%` : `${formData.currency} ${tier.value}`}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newTiers = [...formData.tiers];
                                                                newTiers.splice(idx, 1);
                                                                setFormData({ ...formData, tiers: newTiers });
                                                            }}
                                                            style={{ marginLeft: 'auto', color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none' }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add New Tier */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Min Amount</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={newTier.min}
                                                    onChange={(e) => setNewTier({ ...newTier, min: e.target.value })}
                                                    style={{ ...inputStyle, marginBottom: 0, padding: '8px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Max Amount</label>
                                                <input
                                                    type="number"
                                                    placeholder="Max Amount"
                                                    value={newTier.max}
                                                    onChange={(e) => setNewTier({ ...newTier, max: e.target.value })}
                                                    style={{ ...inputStyle, marginBottom: 0, padding: '8px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                    {formData.commission_type === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount'}
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={newTier.value}
                                                    onChange={(e) => setNewTier({ ...newTier, value: e.target.value })}
                                                    style={{ ...inputStyle, marginBottom: 0, padding: '8px' }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!newTier.min || !newTier.value) return;
                                                    // Basic validation
                                                    const min = parseFloat(newTier.min);
                                                    const max = newTier.max ? parseFloat(newTier.max) : Infinity;
                                                    const val = parseFloat(newTier.value);

                                                    setFormData({
                                                        ...formData,
                                                        tiers: [...formData.tiers, { min, max, value: val }].sort((a, b) => a.min - b.min)
                                                    });
                                                    setNewTier({ min: '', max: '', value: '' });
                                                }}
                                                style={{ ...inputStyle, marginBottom: 0, width: 'auto', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            <SearchableSelect
                                                label="Currency For Tiers"
                                                value={formData.currency}
                                                onChange={(val) => setFormData({ ...formData, currency: val })}
                                                style={{ marginBottom: 0 }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* Simple (Non-Tiered) UI */
                                    <>
                                        {formData.commission_type === 'PERCENTAGE' ? (
                                            <div>
                                                <label style={labelStyle}>Commission Percentage *</label>
                                                <div style={{ position: 'relative', marginBottom: 24 }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        style={{ ...inputStyle, marginBottom: 0, paddingRight: 30 }}
                                                        value={formData.commission_percentage || ''}
                                                        onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                                                        required
                                                        min="0.01"
                                                        max="100"
                                                        placeholder="e.g. 5.0"
                                                    />
                                                    <span style={{ position: 'absolute', right: 10, top: 10, color: '#6b7280' }}>%</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                                                <div>
                                                    <label style={labelStyle}>Credit Amount *</label>
                                                    <input
                                                        type="number"
                                                        step="0.50"
                                                        style={{ ...inputStyle, marginBottom: 0 }}
                                                        value={formData.credit_amount}
                                                        onChange={(e) => setFormData({ ...formData, credit_amount: parseFloat(e.target.value) || 0 })}
                                                        required
                                                        min="0.01"
                                                    />
                                                </div>
                                                <div>
                                                    <SearchableSelect
                                                        label="Currency *"
                                                        value={formData.currency}
                                                        onChange={(val) => setFormData({ ...formData, currency: val })}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Conditional: Show for Request Money (Simple Mode) */}
                                        {formData.bonus_type === 'REQUEST_MONEY' && (
                                            <div style={{ marginBottom: 24 }}>
                                                <label style={labelStyle}>
                                                    Minimum Requested Amount
                                                </label>
                                                <input
                                                    type="number"
                                                    step="10"
                                                    style={{ ...inputStyle, marginBottom: 0 }}
                                                    value={formData.min_transaction_threshold}
                                                    onChange={(e) => setFormData({ ...formData, min_transaction_threshold: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Conditional: Show for Loyalty Credit */}
                            {formData.bonus_type === 'LOYALTY_CREDIT' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={labelStyle}>Number of Transactions *</label>
                                        <input
                                            type="number"
                                            step="1"
                                            style={{ ...inputStyle, marginBottom: 0 }}
                                            value={formData.min_transactions}
                                            onChange={(e) => setFormData({ ...formData, min_transactions: parseInt(e.target.value) || 0 })}
                                            required
                                            min="1"
                                            placeholder="e.g., 3"
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Time Period (Days) *</label>
                                        <input
                                            type="number"
                                            step="1"
                                            style={{ ...inputStyle, marginBottom: 0 }}
                                            value={formData.time_period_days}
                                            onChange={(e) => setFormData({ ...formData, time_period_days: parseInt(e.target.value) || 0 })}
                                            required
                                            min="1"
                                            placeholder="e.g., 30"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Validity Period */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
                                <div>
                                    <label style={labelStyle}>Start Date *</label>
                                    <input
                                        type="date"
                                        style={{ ...inputStyle, marginBottom: 0 }}
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>End Date *</label>
                                    <input
                                        type="date"
                                        style={{ ...inputStyle, marginBottom: 0 }}
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Status</label>
                                    <select
                                        style={{ ...inputStyle, marginBottom: 0 }}
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="EXPIRED">Expired</option>
                                    </select>
                                </div>
                            </div>

                            {/* Eligibility Rules - Simplified for now */}
                            {formData.bonus_type !== 'REQUEST_MONEY' && (
                                <div style={{ marginBottom: 24 }}>
                                    <label style={labelStyle}>Eligibility Rules (User Segments)</label>
                                    {formData.bonus_type === 'LOYALTY_CREDIT' && (
                                        <div style={{ fontSize: '0.85rem', color: '#ea580c', background: '#fff7ed', padding: '8px 12px', borderRadius: 6, marginBottom: 8, fontWeight: 500 }}>
                                            ⓘ Loyalty Credit is only for Existing Customers
                                        </div>
                                    )}
                                    <select
                                        style={{ ...inputStyle, marginBottom: 0 }}
                                        value={formData.bonus_type === 'LOYALTY_CREDIT' ? 'existing_customers' : (formData.eligibility_rules.segments[0] || 'all')}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            eligibility_rules: { ...formData.eligibility_rules, segments: [e.target.value] }
                                        })}
                                        disabled={formData.bonus_type === 'LOYALTY_CREDIT'}
                                    >
                                        <option value="all">All Users</option>
                                        {availableSegments.map(seg => (
                                            <option key={seg.id} value={seg.id}>{seg.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                {editingId && (
                                    <button type="button" className="btn-secondary" onClick={resetForm}>
                                        Cancel
                                    </button>
                                )}
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : editingId ? 'Update Scheme' : 'Create Scheme'}
                                </button>
                            </div>
                        </form>
                    </div >

                    {/* Table */}
                    < div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 24, borderBottom: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Existing Bonus Schemes</h3>
                            </div>

                            {/* Filters */}
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                <PredictiveSearchInput
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    options={Array.from(new Set(schemes.map(s => s.name)))}
                                    placeholder="Search by Scheme Name..."
                                    style={{ flex: 1, minWidth: 200 }}
                                />
                                <select
                                    style={{ ...inputStyle, marginBottom: 0, width: 'auto', minWidth: 140 }}
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                >
                                    <option value="ALL">All Types</option>
                                    <option value="LOYALTY_CREDIT">Loyalty</option>
                                    <option value="TRANSACTION_THRESHOLD_CREDIT">Threshold</option>
                                    <option value="REQUEST_MONEY">Request Money</option>
                                </select>
                                <select
                                    style={{ ...inputStyle, marginBottom: 0, width: 'auto', minWidth: 120 }}
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="EXPIRED">Expired</option>
                                </select>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>From:</span>
                                    <input
                                        type="date"
                                        style={{ ...inputStyle, marginBottom: 0, width: 'auto' }}
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>To:</span>
                                    <input
                                        type="date"
                                        style={{ ...inputStyle, marginBottom: 0, width: 'auto' }}
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                    />
                                </div>
                                {(searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL' || filterStartDate || filterEndDate) && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterType('ALL');
                                            setFilterStatus('ALL');
                                            setFilterStartDate('');
                                            setFilterEndDate('');
                                        }}
                                        style={{
                                            background: 'none', border: 'none', color: '#6b7280',
                                            cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline'
                                        }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr style={{ background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)', borderBottom: '2px solid var(--border-subtle)' }}>
                                        <th style={tableHeaderStyle}>Scheme Name</th>
                                        <th style={tableHeaderStyle}>Type</th>
                                        <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Credit Amount</th>
                                        <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Threshold</th>
                                        <th style={tableHeaderStyle}>Validity Period</th>
                                        <th style={tableHeaderStyle}>Status</th>
                                        <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schemes.filter(scheme => {
                                        const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase());
                                        const matchesType = filterType === 'ALL' || scheme.bonus_type === filterType;
                                        const matchesStatus = filterStatus === 'ALL' || scheme.status === filterStatus;

                                        let matchesDate = true;
                                        if (filterStartDate) {
                                            matchesDate = matchesDate && new Date(scheme.start_date) >= new Date(filterStartDate);
                                        }
                                        if (filterEndDate) {
                                            matchesDate = matchesDate && new Date(scheme.end_date) <= new Date(filterEndDate);
                                        }

                                        return matchesSearch && matchesType && matchesStatus && matchesDate;
                                    }).length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                                                No bonus schemes found matching filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        schemes.filter(scheme => {
                                            const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase());
                                            const matchesType = filterType === 'ALL' || scheme.bonus_type === filterType;
                                            const matchesStatus = filterStatus === 'ALL' || scheme.status === filterStatus;

                                            let matchesDate = true;
                                            if (filterStartDate) {
                                                matchesDate = matchesDate && new Date(scheme.start_date) >= new Date(filterStartDate);
                                            }
                                            if (filterEndDate) {
                                                matchesDate = matchesDate && new Date(scheme.end_date) <= new Date(filterEndDate);
                                            }

                                            return matchesSearch && matchesType && matchesStatus && matchesDate;
                                        }).map((scheme, index) => (
                                            <tr
                                                key={scheme.id}
                                                style={{ borderBottom: index < schemes.length - 1 ? '1px solid #f3f4f6' : 'none', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ ...tableCellStyle, fontWeight: 600 }}>{scheme.name}-{scheme.currency}</td>
                                                <td style={tableCellStyle}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                            {scheme.bonus_type.replace(/_/g, ' ')}
                                                        </span>
                                                        {scheme.is_tiered && (
                                                            <span style={{ fontSize: '0.75rem', color: '#7c3aed', background: '#f5f3ff', padding: '2px 6px', borderRadius: 4, width: 'fit-content' }}>
                                                                Tiered ({scheme.tiers?.length})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                                                    {scheme.is_tiered ? (
                                                        (() => {
                                                            if (!scheme.tiers || scheme.tiers.length === 0) return '0.00';
                                                            const prefix = scheme.commission_type === 'PERCENTAGE' ? '' : (scheme.currency || 'GBP') + ' ';
                                                            const suffix = scheme.commission_type === 'PERCENTAGE' ? '%' : '';
                                                            return scheme.tiers.map(t => `${prefix}${t.value}${suffix}`).join(', ');
                                                        })()
                                                    ) : scheme.commission_type === 'PERCENTAGE' ? (
                                                        `${scheme.commission_percentage}%`
                                                    ) : (
                                                        `${scheme.currency || 'GBP'} ${scheme.credit_amount.toFixed(2)}`
                                                    )}
                                                </td>
                                                <td style={{ ...tableCellStyle, textAlign: 'right', color: '#6b7280' }}>
                                                    {scheme.is_tiered ? (
                                                        (() => {
                                                            if (!scheme.tiers || scheme.tiers.length === 0) return '-';
                                                            const mins = scheme.tiers.map(t => parseFloat(t.min));
                                                            const maxs = scheme.tiers.map(t => t.max ? parseFloat(t.max) : Infinity);
                                                            const min = Math.min(...mins);
                                                            const max = Math.max(...maxs);
                                                            const maxStr = max === Infinity ? '∞' : max;
                                                            return `${min} - ${maxStr}`;
                                                        })()
                                                    ) : (
                                                        scheme.min_transaction_threshold.toFixed(2)
                                                    )}
                                                </td>
                                                <td style={tableCellStyle}>
                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                        {new Date(scheme.start_date).toLocaleDateString('en-GB')} -<br />
                                                        {new Date(scheme.end_date).toLocaleDateString('en-GB')}
                                                    </div>
                                                </td>
                                                <td style={tableCellStyle}>
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: 12,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        background: scheme.status === 'ACTIVE' ? '#d1fae5' : scheme.status === 'EXPIRED' ? '#fee2e2' : '#f3f4f6',
                                                        color: scheme.status === 'ACTIVE' ? '#065f46' : scheme.status === 'EXPIRED' ? '#991b1b' : '#6b7280'
                                                    }}>
                                                        {scheme.status}
                                                    </span>
                                                </td>
                                                <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleEdit(scheme)}
                                                            style={editButtonStyle}
                                                            onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; }}
                                                            onMouseLeave={(e) => { e.target.style.background = 'white'; }}
                                                        >
                                                            ✏️ View & Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(scheme.id)}
                                                            style={deleteButtonStyle}
                                                            onMouseEnter={(e) => { e.target.style.background = '#fee2e2'; }}
                                                            onMouseLeave={(e) => { e.target.style.background = '#fef2f2'; }}
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const tableHeaderStyle = {
    padding: '14px 16px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    whiteSpace: 'nowrap'
};

const tableCellStyle = {
    padding: '16px',
    fontSize: '0.875rem',
    color: '#374151',
    verticalAlign: 'middle'
};

const editButtonStyle = {
    padding: '6px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    background: 'white',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

const deleteButtonStyle = {
    padding: '6px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    border: '1px solid #fecaca',
    borderRadius: 6,
    background: '#fef2f2',
    color: '#dc2626',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'white',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box'
};

const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    fontWeight: 500
};

const schemas = [
    { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
    { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'NGN', name: 'Nigerian Naira (₦)', symbol: '₦' },
    { code: 'CAD', name: 'Canadian Dollar (C$)', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar (A$)', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥' },
    { code: 'KES', name: 'Kenyan Shilling (Ksh)', symbol: 'Ksh' },
    { code: 'GHS', name: 'Ghanaian Cedi (gh)', symbol: 'gh' },
    { code: 'ZAR', name: 'South African Rand (R)', symbol: 'R' }
];

const SearchableSelect = ({ value, onChange, label, style }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Initialize search with current value's name or code if valid
    useEffect(() => {
        const current = schemas.find(c => c.code === value);
        if (current && !isOpen) {
            setSearch(`${current.name} (${current.code})`);
        }
    }, [value, isOpen]);

    const filtered = schemas.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ position: 'relative', ...style }}>
            <label style={labelStyle}>{label}</label>
            <input
                type="text"
                style={{ ...inputStyle, marginBottom: 0 }}
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    setSearch('');
                    setIsOpen(true);
                }}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay to allow click
                placeholder="Search currency..."
            />
            {isOpen && (
                <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    zIndex: 10,
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {filtered.map(c => (
                        <li
                            key={c.code}
                            onClick={() => {
                                onChange(c.code);
                                setSearch(`${c.name} (${c.code})`);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                            <span style={{ fontWeight: 600 }}>{c.code}</span> - {c.name}
                        </li>
                    ))}
                    {filtered.length === 0 && (
                        <li style={{ padding: '8px 12px', color: '#9ca3af', fontSize: '0.85rem' }}>No results</li>
                    )}
                </ul>
            )}
        </div>
    );
};

const PredictiveSearchInput = ({ value, onChange, options, placeholder, style }) => {
    const [isOpen, setIsOpen] = useState(false);

    const filtered = options.filter(opt =>
        opt.toLowerCase().includes(value.toLowerCase()) && opt !== value
    );

    return (
        <div style={{ position: 'relative', ...style }}>
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder={placeholder}
                style={{ ...inputStyle, marginBottom: 0 }}
            />
            {isOpen && value && filtered.length > 0 && (
                <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    zIndex: 50,
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {filtered.map((opt, i) => (
                        <li
                            key={i}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};




export default BonusSchemeManager;
