import React, { useState, useEffect } from 'react';
import CreatePromoModal from '../../components/Promo/CreatePromoModal';
import CreateDistributionModal from '../../components/Promo/CreateDistributionModal';

const PromoCodes = () => {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null); // a code that has not been used yet
    const [usagePromo, setUsagePromo] = useState(null); // show where a code was used
    const [usageRows, setUsageRows] = useState([]);
    const [usageLoading, setUsageLoading] = useState(false);

    const openUsage = async (promo) => {
        setUsagePromo(promo);
        setUsageRows([]);
        setUsageLoading(true);
        try {
            const res = await fetch(`/api/promocodes/${promo.id}/redemptions`);
            const data = await res.json();
            setUsageRows(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setUsageLoading(false);
        }
    };
    const [showDistributeModal, setShowDistributeModal] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState(null);

    useEffect(() => {
        fetchPromos();
    }, []);

    const fetchPromos = async () => {
        try {
            const res = await fetch('/api/promocodes');
            const data = await res.json();
            setPromos(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'Active' ? 'Disabled' : 'Active';
        try {
            await fetch(`/api/promocodes/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchPromos();
        } catch (err) {
            alert('Error updating status');
        }
    };

    return (
        <div className="promo-codes-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8 }}>Promo Codes</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Configure and monitor your active promo codes and discounts.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Create New</button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 24 }}>
                {loading ? (
                    <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>
                ) : (
                    <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-container" style={{ minWidth: 1000, tableLayout: 'fixed' }}>
                            <thead>
                                <tr>

                                    <th style={{ width: 100 }}>Code</th>
                                    <th style={{ width: 90 }}>Type</th>
                                    <th style={{ width: 90 }}>Value</th>
                                    <th style={{ width: 100 }}>Cost Incurred</th>
                                    <th style={{ width: 100, textAlign: 'center' }}>Usage</th>
                                    <th style={{ width: 110, textAlign: 'center' }}>Period</th>
                                    <th style={{ width: 80, textAlign: 'center' }}>Status</th>
                                    <th style={{ width: 210, textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {promos.map(promo => (
                                    <tr key={promo.id}
                                        onClick={() => setSelectedPromo(promo)}
                                        style={{ cursor: 'pointer', background: selectedPromo?.id === promo.id ? '#fff7ed' : 'transparent' }}
                                    >

                                        <td style={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>{promo.code}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {promo.type === 'FX_BOOST' ? 'FX Boost' :
                                                promo.type === 'BONUS_CREDIT' ? 'Bonus Credit' : promo.type}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {promo.type === 'Percentage' ? `${promo.value}%` :
                                                (promo.type === 'Fixed' || promo.type === 'BONUS_CREDIT') ? `${promo.currency} ${promo.value}` :
                                                    promo.type === 'FX_BOOST' ? `+${promo.value}` : `${promo.value}%`}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {promo.currency} {promo.total_discount_utilized || 0}
                                            {promo.budget_limit !== -1 && (
                                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}> / {promo.budget_limit.toLocaleString()}</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {promo.usage_count}/{promo.usage_limit_global === -1 ? '∞' : promo.usage_limit_global}
                                            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>({promo.usage_limit_per_user}/user)</div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                                            <div>{new Date(promo.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>to</div>
                                            <div>{new Date(promo.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                                        </td>
                                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {(() => {
                                                const expired = promo.status === 'Active' && new Date(promo.end_date) < new Date();
                                                return (
                                                    <span className={`badge ${promo.status === 'Active' && !expired ? 'success' : 'danger'}`}
                                                        title={expired ? 'The end date has passed, so customers cannot use this code.' : undefined}>
                                                        {expired ? 'Expired' : promo.status}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            <button
                                                className="btn-primary"
                                                style={{ padding: '4px 10px', fontSize: '0.7rem', background: '#6b7280', boxShadow: 'none', marginRight: 6 }}
                                                title="See the transfers this code was used on"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openUsage(promo);
                                                }}
                                            >
                                                Usage
                                            </button>
                                            {(promo.usage_count || 0) === 0 && (
                                                <button
                                                    className="btn-primary"
                                                    style={{ padding: '4px 10px', fontSize: '0.7rem', background: '#2563eb', boxShadow: 'none', marginRight: 6 }}
                                                    title="Only codes that have not been used can be edited"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingPromo(promo);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                className="btn-primary"
                                                style={{
                                                    padding: '4px 10px', fontSize: '0.7rem',
                                                    background: promo.status === 'Active' ? '#ef4444' : '#22c55e',
                                                    boxShadow: 'none'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleStatus(promo.id, promo.status);
                                                }}
                                            >
                                                {promo.status === 'Active' ? 'Disable' : 'Enable'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreatePromoModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={fetchPromos}
                />
            )}

            {usagePromo && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setUsagePromo(null)}>
                    <div className="glass-panel" style={{ width: 720, maxHeight: '80vh', overflowY: 'auto', padding: 28, background: 'white' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 style={{ margin: 0 }}>Where <span style={{ fontFamily: 'monospace' }}>{usagePromo.code}</span> was used</h3>
                            <button onClick={() => setUsagePromo(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>
                        {usageLoading ? (
                            <div style={{ padding: 16, textAlign: 'center' }}>Loading...</div>
                        ) : usageRows.length === 0 ? (
                            <div style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>This code has not been used on any transfer yet.</div>
                        ) : (
                            <table className="table-container" style={{ width: '100%' }}>
                                <thead>
                                    <tr><th>Transfer</th><th>Customer</th><th>Discount</th><th>Status</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                    {usageRows.map((r) => (
                                        <tr key={r.id}>
                                            <td style={{ fontFamily: 'monospace' }}>{r.transaction_id}</td>
                                            <td>{r.user_id || '-'}</td>
                                            <td>{usagePromo.currency} {Number(r.discount_amount || 0).toFixed(2)}</td>
                                            <td>{r.status === 'Released' ? 'Released (refunded/cancelled)' : r.status}</td>
                                            <td>{new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {editingPromo && (
                <CreatePromoModal
                    promo={editingPromo}
                    onClose={() => setEditingPromo(null)}
                    onSuccess={fetchPromos}
                />
            )}


            {/* Pass to modal */}
            {showDistributeModal && (
                <CreateDistributionModal
                    onClose={() => setShowDistributeModal(false)}
                    onSuccess={() => {
                        fetchPromos();
                        setSelectedPromo(null);
                    }}
                    selectedPromo={selectedPromo}
                />
            )}
        </div>
    );
};

export default PromoCodes;
