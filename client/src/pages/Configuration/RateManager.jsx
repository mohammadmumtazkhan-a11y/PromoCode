import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RateAuditLog from './RateAuditLog';

const RateManager = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('rates');

    // 1. Mock Data (Grid)
    const [rates] = useState([
        { id: 1246, from: 'EUR', to: 'SGD', moneyR: '1.0000 / 1.3900', mobileR: '1.0000 / 1.3900', billR: '1.0000 / 1.3900', moneyW: '1.2000 / 1.6680', plFactor: '+2.5%', plCommBase: 'N/A', plCommPct: '+1.0%', active: true },
        { id: 2309, from: 'GBP', to: 'INR', moneyR: '1.0000 / 105.0000', mobileR: '1.0000 / 0.0000', billR: '1.0000 / 0.0000', moneyW: '1.0000 / 105.0000', plFactor: '+15.2%', plCommBase: 'N/A', plCommPct: '+0.5%', active: true, override: true },
        { id: 2269, from: 'EUR', to: 'TRY', moneyR: '0.9800 / 4.2826', mobileR: '1.0000 / 4.3700', billR: '1.0000 / 4.3700', moneyW: '1.0000 / 800.0000', plFactor: '-1.5%', plCommBase: 'N/A', plCommPct: '+0.0%', active: true, override: true },
        { id: 1203, from: 'NGN', to: 'USD', moneyR: '1.0000 / 0.0000', mobileR: '1.0000 / 0.0000', billR: '1.0000 / 0.0000', moneyW: '1.0000 / 643.0000', plFactor: '0.0%', plCommBase: 'N/A', plCommPct: '+0.0%', active: true, override: true },
    ]);

    // 2. Render badge
    const StatusBadge = ({ active }) => (
        <span style={{
            background: active ? '#dcfce7' : '#fee2e2',
            color: active ? '#15803d' : '#b91c1c',
            padding: '4px 12px',
            borderRadius: 99,
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
        }}>
            {active ? 'Active' : 'Inactive'}
        </span>
    );

    const OverrideBadge = () => (
        <span style={{
            background: '#ffedd5',
            color: '#c2410c',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: '0.7rem',
            fontWeight: 600,
            marginLeft: 8,
            border: '1px solid #fdba74'
        }}>
            Override
        </span>
    );

    const tabStyle = (isActive) => ({
        padding: '12px 4px',
        borderBottom: isActive ? '2px solid #ea580c' : '2px solid transparent',
        color: isActive ? '#ea580c' : '#6b7280',
        fontWeight: isActive ? 600 : 500,
        background: 'transparent',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        cursor: 'pointer'
    });

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: 0 }}>Rate Manager</h1>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 4 }}>
                        <Link to="/" style={{ color: '#4b5563', textDecoration: 'none' }}>Home</Link>
                        {' > '}
                        <span style={{ color: '#9ca3af' }}>Configuration</span>
                        {' > '}
                        <span style={{ color: '#ea580c', fontWeight: 500 }}>Rate Manager</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ marginBottom: 24, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 24 }}>
                <button style={tabStyle(activeTab === 'rates')} onClick={() => setActiveTab('rates')}>
                    Rates
                </button>
                <button style={tabStyle(activeTab === 'country')} onClick={() => setActiveTab('country')}>
                    Country-Currency Settings
                </button>
                <button style={tabStyle(activeTab === 'audit')} onClick={() => setActiveTab('audit')}>
                    Rate Audit Log
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'audit' ? (
                <RateAuditLog />
            ) : (
                <>
                    {/* Filters */}
                    <div className="glass-panel" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: 200, color: '#374151' }}>
                            <option>&lt;All From Currency&gt;</option>
                            <option>USD</option>
                            <option>GBP</option>
                            <option>EUR</option>
                        </select>

                        <select style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: 200, color: '#374151' }}>
                            <option>&lt;All To Currency&gt;</option>
                            <option>NGN</option>
                            <option>INR</option>
                            <option>SGD</option>
                        </select>

                        <select style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: 150, color: '#374151' }}>
                            <option>&lt;All Status&gt;</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>

                        <button style={{
                            background: '#ea580c', color: 'white', padding: '8px 24px', borderRadius: 6, border: 'none', fontWeight: 500, cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                            Search Rates
                        </button>
                    </div>

                    {/* Rates Table */}
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Ref</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>From-To</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Money-R</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Mobile-R</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Bill-R</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Money-W</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#ea580c', fontWeight: 600 }}>P/L Factor</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#ea580c', fontWeight: 600 }}>P/L Comm Base</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#ea580c', fontWeight: 600 }}>P/L Comm %</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rates.map((rate) => (
                                        <tr key={rate.id} style={{ borderBottom: '1px solid #f3f4f6', background: 'white' }}>
                                            <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: 500 }}>{rate.id}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{rate.from} - {rate.to}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                                                {rate.moneyR}
                                                {rate.override && <OverrideBadge />}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{rate.mobileR}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{rate.billR}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                                                {rate.moneyW}
                                                {rate.override && <OverrideBadge />}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: rate.plFactor.includes('-') ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{rate.plFactor}</td>
                                            <td style={{ padding: '12px 16px', color: '#6b7280' }}>{rate.plCommBase}</td>
                                            <td style={{ padding: '12px 16px', color: '#16a34a' }}>{rate.plCommPct}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => navigate(`/configuration/rate-manager/${rate.id}`)}
                                                    style={{
                                                        background: '#ea580c',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '6px 14px',
                                                        borderRadius: 4,
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 500
                                                    }}>
                                                    Rates
                                                </button>
                                                <div style={{ marginTop: 4 }}>
                                                    <StatusBadge active={rate.active} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RateManager;
