import React, { useState } from 'react';
import { Search } from 'lucide-react';

const UserCreditLedger = () => {
    const [userId, setUserId] = useState('');
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);

    // Adjustment Form
    const [adjAmount, setAdjAmount] = useState('');
    const [adjType, setAdjType] = useState('MANUAL_ADJUSTMENT');
    const [adjReason, setAdjReason] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/credits/${userId}`);
            const data = await res.json();
            setUserData(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustment = async () => {
        if (!adjAmount || !adjReason) return alert('Please fill in all fields');

        try {
            await fetch('/api/credits/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    amount: parseFloat(adjAmount),
                    type: adjType,
                    reason: adjReason,
                    admin_user: 'Admin' // Should come from auth context
                })
            });
            setShowAdjustModal(false);
            setAdjAmount('');
            setAdjReason('');
            handleSearch({ preventDefault: () => { } }); // Reload data
        } catch (err) {
            alert('Failed to apply adjustment');
        }
    };

    return (
        <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 8 }}>User Credit Ledger</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>View balances and audit history for user bonus wallets.</p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
                <div className="search-box" style={{ flex: 1, height: 48 }}>
                    <Search size={20} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search by User ID (e.g., user_123)..."
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: '1rem', background: 'transparent' }}
                    />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Searching...' : 'Search User'}
                </button>
            </form>

            {userData && (
                <div className="fade-in">
                    {/* Balance Card */}
                    <div className="glass-panel" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 4 }}>Current Balance</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                {userData.currency} {userData.balance.toFixed(2)}
                            </div>
                        </div>
                        <button
                            className="btn-secondary"
                            onClick={() => setShowAdjustModal(true)}
                        >
                            Manual Adjustment
                        </button>
                    </div>

                    {/* History Table */}
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>Ledger History</h3>
                    <div className="table-wrapper">
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Reference / Reason</th>
                                    <th>Amount</th>
                                    <th>Admin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userData.history.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No history found</td></tr>
                                ) : (
                                    userData.history.map(entry => (
                                        <tr key={entry.id}>
                                            <td>{new Date(entry.created_at).toLocaleString()}</td>
                                            <td>
                                                <span className={`status-badge ${entry.amount >= 0 ? 'success' : 'failure'}`}>
                                                    {entry.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{entry.reference_id}</td>
                                            <td style={{ fontWeight: 600, color: entry.amount >= 0 ? '#16a34a' : '#ef4444' }}>
                                                {entry.amount >= 0 ? '+' : ''}{entry.amount.toFixed(2)}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>{entry.admin_user || 'System'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Adjustment Modal */}
            {showAdjustModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 500 }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24 }}>Manual Credit Adjustment</h3>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>Type</label>
                            <select
                                value={adjType}
                                onChange={(e) => setAdjType(e.target.value)}
                                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                            >
                                <option value="MANUAL_ADJUSTMENT">Grant Credit (Goodwill)</option>
                                <option value="VOID_FRAUD">Void Credit (Fraud/Reversal)</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>Amount</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={adjAmount}
                                onChange={(e) => setAdjAmount(e.target.value)}
                                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                            />
                            {adjType === 'VOID_FRAUD' && <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: 4 }}>Enter as negative number (e.g. -50) to remove credit.</div>}
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>Reason Code (Required)</label>
                            <input
                                type="text"
                                placeholder="e.g. Ticket #1234 Customer Complaint"
                                value={adjReason}
                                onChange={(e) => setAdjReason(e.target.value)}
                                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn-secondary" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAdjustment}>Apply Adjustment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserCreditLedger;
