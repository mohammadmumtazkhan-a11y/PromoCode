import React, { useState } from 'react';

// Mock transaction data
const MOCK_TRANSACTIONS = [
    {
        reference: '05023676980', 
        mtn: '05023676980',
        affiliate: 'ITransfer Money Movers',
        status: 'Processed',
        type: 'MONEYTRANSFER',
        sendingCountry: 'ESP',
        beneficiaryFirstName: 'OGBEIDE',
        beneficiaryLastName: 'OSAYANDE',
        beneficiaryPhone: '2348136931833',
        senderFirstName: 'OGBEIDE',
        senderLastName: 'OSAYANDE',
        senderPhone: '',
        serviceName: 'ZENITH BANK PLC',
        serviceCode: '1011',
        collectionMethod: 'BANKACCOUNT',
        account: '2086208819',
        rate: '1645',
        payout: 'NGN 103734',
        settle: 'EUR 63.06',
        total: 'EUR 63.76',
        comments: '11/03/2026 09:48:45: [FTP] New Transaction added',
        notes: '',
        auditTrail: [
            { time: '09:48 AM', event: 'Transaction Initiated', status: 'complete' },
            { time: '09:50 AM', event: 'Funds Cleared', status: 'complete' },
            { time: '09:55 AM', event: 'Partner Payout Confirmed', status: 'complete' }
        ]
    },
    {
        reference: 'MITO-7721003',
        mtn: 'MITO-7721003',
        affiliate: 'Partner-KE',
        status: 'Completed',
        type: 'MONEYTRANSFER',
        sendingCountry: 'GBR',
        beneficiaryFirstName: 'John',
        beneficiaryLastName: 'Doe',
        beneficiaryPhone: '254712345678',
        senderFirstName: 'Jane',
        senderLastName: 'Smith',
        senderPhone: '447712345678',
        serviceName: 'M-PESA',
        serviceCode: 'MPESA-KE',
        collectionMethod: 'MOBILEMONEY',
        account: '254712345678',
        rate: '236',
        payout: 'KES 47200',
        settle: 'GBP 200.00',
        total: 'GBP 200.00',
        comments: 'Regular transfer to Kenya',
        notes: '',
        auditTrail: [
            { time: '09:00 AM', event: 'Transaction Initiated', status: 'complete' },
            { time: '09:02 AM', event: 'Funds Cleared', status: 'complete' },
            { time: '09:10 AM', event: 'Partner Payout Confirmed', status: 'complete' },
            { time: '09:12 AM', event: 'Transaction Complete', status: 'complete' },
        ]
    }
];

const statusColors = {
    'In Progress': { bg: '#fef3c7', color: '#92400e' },
    'Completed': { bg: '#dcfce7', color: '#166534' },
    'Processed': { bg: '#dcfce7', color: '#166534' },
    'Failed': { bg: '#fee2e2', color: '#991b1b' },
};

// Audit Trail Timeline
const AuditTrail = ({ trail }) => (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>📋 Audit Trail</h3>
        <div style={{ position: 'relative', paddingLeft: 28 }}>
            {/* Vertical Line */}
            <div style={{
                position: 'absolute', left: 8, top: 4, bottom: 4, width: 2,
                background: '#e5e7eb'
            }}></div>

            {trail.map((step, i) => {
                const dotColor = step.status === 'complete' ? '#22c55e'
                    : step.status === 'current' ? '#f59e0b'
                        : '#ef4444';

                return (
                    <div key={i} style={{ position: 'relative', marginBottom: i < trail.length - 1 ? 20 : 0, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {/* Dot */}
                        <div style={{
                            position: 'absolute', left: -22, top: 4,
                            width: 14, height: 14, borderRadius: '50%',
                            background: dotColor, border: '2px solid white',
                            boxShadow: `0 0 0 2px ${dotColor}40`,
                            zIndex: 1
                        }}></div>
                        {/* Content */}
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>{step.time}</div>
                            <div style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 500 }}>{step.event}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

const TransactionSearch = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        const found = MOCK_TRANSACTIONS.find(
            t => t.reference.toLowerCase() === query.trim().toLowerCase()
        );
        setResult(found || null);
        setSearched(true);
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 800 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                    Transaction Search
                </h1>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                    Search by reference number to view transaction details
                </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{
                display: 'flex', gap: 12, marginBottom: 8
            }}>
                <input
                    id="transaction-search-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter Biller Ref, Top-up Ref, or Pickup Code"
                    required
                    style={{
                        flex: 1, padding: '12px 16px',
                        border: '1px solid #ea580c', borderRadius: 8,
                        fontSize: '0.95rem', outline: 'none',
                        transition: 'box-shadow 0.2s',
                        boxSizing: 'border-box',
                        color: '#334155'
                    }}
                    onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(234, 88, 12, 0.2)'}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
                <button
                    id="transaction-search-btn"
                    type="submit"
                    style={{
                        background: '#ea580c', color: 'white', border: 'none',
                        padding: '12px 28px', borderRadius: 8,
                        fontWeight: 700, cursor: 'pointer',
                        fontSize: '0.95rem',
                        boxShadow: '0 2px 4px rgba(234,88,12,0.2)',
                        whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#60a5fa' }}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    Search
                </button>
            </form>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 32 }}>
                Try searching for these mock references: <strong style={{ color: '#ea580c', cursor: 'pointer' }} onClick={() => setQuery('05023676980')}>05023676980</strong> or <strong style={{ color: '#ea580c', cursor: 'pointer' }} onClick={() => setQuery('MITO-7721003')}>MITO-7721003</strong>
            </div>

            {/* Empty State */}
            {!searched && (
                <div id="empty-state" style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: 'white', borderRadius: 12,
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
                    <h3 style={{ color: '#334155', fontWeight: 700, marginBottom: 8, fontSize: '1.25rem' }}>Search for a Transaction</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Enter an exact reference number to view transaction details and audit trail.
                    </p>
                </div>
            )}

            {/* No Result */}
            {searched && !result && (
                <div id="no-result" style={{
                    textAlign: 'center', padding: '80px 20px',
                    background: 'white', borderRadius: 12,
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
                        {/* 3D-ish Pinkish Red Cross */}
                        <div style={{ position: 'relative', width: 64, height: 64 }}>
                            {/* Shadow under the cross */}
                            <div style={{ position: 'absolute', bottom: -10, left: 12, right: 12, height: 10, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>
                            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="18" y="4" width="12" height="64" rx="6" transform="rotate(-45 18 4)" fill="#fb7185" />
                                <rect x="4" y="46" width="12" height="64" rx="6" transform="rotate(-135 4 46)" fill="#f43f5e" />
                                {/* Highlights to create 3D bevel effect */}
                                <rect x="20" y="6" width="4" height="60" rx="2" transform="rotate(-45 20 6)" fill="#fda4af" opacity="0.8" />
                            </svg>
                        </div>
                    </div>
                    <h3 style={{ color: '#334155', fontWeight: 700, marginBottom: 12, fontSize: '1.35rem' }}>No Transaction Found</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                        No transaction matches "{query}". Check the reference and try again.
                    </p>
                </div>
            )}

            {/* Result Card */}
            {searched && result && (
                <div id="transaction-result" style={{
                    background: 'white', borderRadius: 12, padding: 28,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                    {/* Reference Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 2 }}>Reference</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>{result.reference}</div>
                        </div>
                        <span style={{
                            padding: '6px 16px', borderRadius: 99,
                            fontSize: '0.85rem', fontWeight: 600,
                            background: statusColors[result.status]?.bg || '#f3f4f6',
                            color: statusColors[result.status]?.color || '#374151'
                        }}>
                            {result.status}
                        </span>
                    </div>

                    {/* Detailed Fields List based on Screenshot */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, max-content) 1fr', rowGap: 8, columnGap: 16, fontSize: '0.95rem', color: '#1f2937' }}>
                        <div style={{ color: '#4b5563' }}>MTN:</div>
                        <div>{result.mtn || result.reference}</div>

                        <div style={{ color: '#4b5563' }}>Affiliate:</div>
                        <div>{result.affiliate || result.mto || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Status:</div>
                        <div>{result.status}</div>

                        <div style={{ color: '#4b5563' }}>Type:</div>
                        <div>{result.type || 'MONEYTRANSFER'}</div>

                        <div style={{ color: '#4b5563' }}>Sending Country:</div>
                        <div>{result.sendingCountry || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Beneficiary First Name:</div>
                        <div>{result.beneficiaryFirstName || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Beneficiary Last Name:</div>
                        <div>{result.beneficiaryLastName || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Beneficiary Contact Number:</div>
                        <div style={{ fontFamily: 'monospace', color: '#991b1b' }}>{result.beneficiaryPhone}</div>

                        <div style={{ color: '#4b5563' }}>Sender First Name:</div>
                        <div>{result.senderFirstName || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Sender Last Name:</div>
                        <div>{result.senderLastName || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Sender Contact Number:</div>
                        <div style={{ fontFamily: 'monospace', color: '#991b1b' }}>{result.senderPhone}</div>

                        <div style={{ color: '#4b5563' }}>Service Name:</div>
                        <div>{result.serviceName || result.provider || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Service Code:</div>
                        <div>{result.serviceCode || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Collection Method:</div>
                        <div>{result.collectionMethod || 'BANKACCOUNT'}</div>

                        <div style={{ color: '#4b5563' }}>Account Number:</div>
                        <div>{result.account}</div>

                        <div style={{ color: '#4b5563' }}>Rate:</div>
                        <div>{result.rate}</div>

                        <div style={{ color: '#4b5563' }}>Payout:</div>
                        <div>{result.payout || result.receiveAmount}</div>

                        <div style={{ color: '#4b5563' }}>Settle:</div>
                        <div>{result.settle || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Total:</div>
                        <div>{result.total || result.sendAmount}</div>

                        <div style={{ color: '#4b5563' }}>Comments:</div>
                        <div>{result.comments || 'N/A'}</div>

                        <div style={{ color: '#4b5563' }}>Notes:</div>
                        <div>{result.notes || ''}</div>
                    </div>

                    {/* Audit Trail */}
                    <AuditTrail trail={result.auditTrail} />
                </div>
            )}
        </div>
    );
};

export default TransactionSearch;
