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
        beneficiaryEmail: 'ogbeide.o@example.com',
        beneficiaryAddress: '12, Osayande St, Benin City, Nigeria',
        senderFirstName: 'OGBEIDE',
        senderLastName: 'OSAYANDE',
        senderPhone: '34678123456',
        senderEmail: 'ogbeide.sender@example.com',
        senderAddress: 'Calle de Alcala, 45, Madrid, Spain',
        accountBalance: '₦ 1,250,000.00',
        lastUpdated: '11 Mar 2026, 09:48',
        channel: 'FURP (onepipe) / FunTech',
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
        ],
        kycStatus: 'Passed'
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
        beneficiaryEmail: 'john.doe@gmail.com',
        beneficiaryAddress: 'Moi Avenue, Nairobi, Kenya',
        senderFirstName: 'Jane',
        senderLastName: 'Smith',
        senderPhone: '447712345678',
        senderEmail: 'jane.smith@btinternet.co.uk',
        senderAddress: '221B Baker St, London, UK',
        accountBalance: '£ 5,420.50',
        lastUpdated: '08 Mar 2026, 14:10',
        channel: 'Mito Direct',
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
        ],
        kycStatus: 'Pending'
    }
];

const statusColors = {
    'In Progress': { bg: '#fef3c7', color: '#92400e' },
    'Completed': { bg: '#dcfce7', color: '#166534' },
    'Processed': { bg: '#dcfce7', color: '#166534' },
    'Failed': { bg: '#fee2e2', color: '#991b1b' },
};

const kycStatusColors = {
    'Passed': { bg: '#dcfce7', color: '#166534', icon: '✅' },
    'Pending': { bg: '#fef3c7', color: '#92400e', icon: '⏳' },
    'Failed': { bg: '#fee2e2', color: '#991b1b', icon: '❌' },
};

// PII Masking Helper
const maskPII = (value, type) => {
    if (!value) return 'N/A';
    
    switch (type) {
        case 'phone': {
            const clean = value.replace(/\s+/g, '');
            if (clean.length <= 4) return value;
            return '*'.repeat(clean.length - 4) + clean.slice(-4);
        }
        case 'email': {
            const [local, domain] = value.split('@');
            if (!domain) return value;
            if (local.length <= 2) return '*@' + domain;
            return local[0] + '*'.repeat(local.length - 2) + local.slice(-1) + '@' + domain;
        }
        case 'address': {
            const parts = value.split(',');
            if (parts.length <= 1) return '***';
            return '***, ' + parts.slice(1).join(',').trim();
        }
        case 'balance':
            return '****';
            
        default:
            return value;
    }
};

// Audit Trail Timeline
const AuditTrail = ({ trail }) => (
    <div style={{ padding: '24px 0' }}>
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
    const [activeTab, setActiveTab] = useState('Details');

    const handleSearch = (e) => {
        e.preventDefault();
        const found = MOCK_TRANSACTIONS.find(
            t => t.reference.toLowerCase() === query.trim().toLowerCase()
        );
        setResult(found || null);
        setSearched(true);
        setActiveTab('Details'); // Always reset tab on new search
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1000 }}>
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

            {/* Results Section */}
            {searched && result && (
                <div id="search-results">
                    {/* Summary Highlights (Mini Table) */}
                    <div style={{
                        background: 'white', borderRadius: 12, overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24,
                        border: '1px solid #f1f5f9'
                    }}>
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr',
                            padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
                            fontSize: '0.75rem', fontWeight: 700, color: '#64748b',
                            textTransform: 'uppercase', letterSpacing: '0.025em'
                        }}>
                            <div>Ref #</div>
                            <div>Amount Ng.</div>
                            <div>Status</div>
                            <div>Date</div>
                            <div>Channel</div>
                        </div>
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr',
                            padding: '14px 20px', fontSize: '0.85rem', color: '#1e293b',
                            alignItems: 'center'
                        }}>
                            <div style={{ color: '#ea580c', fontWeight: 600 }}>{result.reference}</div>
                            <div>{result.payout}</div>
                            <div>
                                <span style={{
                                    padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
                                    background: statusColors[result.status]?.bg || '#f3f4f6',
                                    color: statusColors[result.status]?.color || '#374151'
                                }}>
                                    {result.status}
                                </span>
                            </div>
                            <div>{result.lastUpdated}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{result.channel}</div>
                        </div>
                    </div>

                    {/* Detailed Card with Tabs */}
                    <div style={{
                        background: 'white', borderRadius: 12,
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                        border: '1px solid #f1f5f9', overflow: 'hidden'
                    }}>
                        {/* Tabs Navigation */}
                        <div style={{
                            display: 'flex', borderBottom: '1px solid #f1f5f9',
                            background: '#f8fafc'
                        }}>
                            {['Details', 'Trail', 'KYC'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '14px 28px', border: 'none', background: 'none',
                                        fontSize: '0.9rem', fontWeight: activeTab === tab ? 700 : 500,
                                        color: activeTab === tab ? '#ea580c' : '#64748b',
                                        borderBottom: activeTab === tab ? '3px solid #ea580c' : '3px solid transparent',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div style={{ padding: 28 }}>
                            {activeTab === 'Details' && (
                                <div id="details-tab">
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, max-content) 1fr', rowGap: 12, columnGap: 24, fontSize: '0.9rem' }}>
                                        <div style={{ color: '#64748b', fontWeight: 500 }}>MTN:</div>
                                        <div style={{ color: '#1e293b', fontWeight: 600 }}>{result.mtn}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Affiliate:</div>
                                        <div style={{ color: '#1e293b' }}>{result.affiliate}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Status:</div>
                                        <div style={{ color: statusColors[result.status]?.color, fontWeight: 600 }}>{result.status}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Type:</div>
                                        <div>{result.type}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Sending Country:</div>
                                        <div>{result.sendingCountry}</div>

                                        <div style={{ margin: '8px 0', gridColumn: 'span 2', height: '1px', background: '#f1f5f9' }}></div>

                                        {/* Beneficiary Details (Masked) */}
                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Beneficiary Name:</div>
                                        <div style={{ color: '#1e293b', fontWeight: 600 }}>{result.beneficiaryFirstName} {result.beneficiaryLastName}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Beneficiary Contact:</div>
                                        <div style={{ color: '#ea580c', fontWeight: 600 }}>{maskPII(result.beneficiaryPhone, 'phone')}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Beneficiary Email:</div>
                                        <div>{maskPII(result.beneficiaryEmail, 'email')}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Beneficiary Address:</div>
                                        <div style={{ fontSize: '0.85rem' }}>{maskPII(result.beneficiaryAddress, 'address')}</div>

                                        <div style={{ margin: '8px 0', gridColumn: 'span 2', height: '1px', background: '#f1f5f9' }}></div>

                                        {/* Sender Details (Masked) */}
                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Sender Name:</div>
                                        <div style={{ color: '#1e293b', fontWeight: 600 }}>{result.senderFirstName} {result.senderLastName}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Sender Contact:</div>
                                        <div style={{ color: '#ea580c', fontWeight: 600 }}>{maskPII(result.senderPhone, 'phone')}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Sender Email:</div>
                                        <div>{maskPII(result.senderEmail, 'email')}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Sender Address:</div>
                                        <div style={{ fontSize: '0.85rem' }}>{maskPII(result.senderAddress, 'address')}</div>

                                        <div style={{ margin: '8px 0', gridColumn: 'span 2', height: '1px', background: '#f1f5f9' }}></div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Service Name:</div>
                                        <div>{result.serviceName}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Service Code:</div>
                                        <div style={{ fontFamily: 'monospace' }}>{result.serviceCode}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Collection Method:</div>
                                        <div>{result.collectionMethod}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Account Number:</div>
                                        <div style={{ fontWeight: 600 }}>{result.account}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Rate:</div>
                                        <div>{result.rate}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Payout:</div>
                                        <div style={{ color: '#059669', fontWeight: 700 }}>{result.payout}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Settle Amount:</div>
                                        <div>{result.settle}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Total Paid:</div>
                                        <div style={{ fontWeight: 700 }}>{result.total}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Comments:</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{result.comments}</div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Trail' && (
                                <div id="trail-tab">
                                    <AuditTrail trail={result.auditTrail} />
                                </div>
                            )}

                            {activeTab === 'KYC' && (
                                <div id="kyc-tab" style={{ textAlign: 'center', padding: '60px 0' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: 20 }}>
                                        {kycStatusColors[result.kycStatus]?.icon || '🛡️'}
                                    </div>
                                    <h3 style={{ margin: '0 0 8px', color: '#64748b', fontSize: '1rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        KYC Verification Status
                                    </h3>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '12px 32px',
                                        borderRadius: 12,
                                        fontSize: '1.5rem',
                                        fontWeight: 800,
                                        background: kycStatusColors[result.kycStatus]?.bg || '#f3f4f6',
                                        color: kycStatusColors[result.kycStatus]?.color || '#374151',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        border: `1px solid ${kycStatusColors[result.kycStatus]?.color}20`
                                    }}>
                                        {result.kycStatus || 'Not Available'}
                                    </div>
                                    <p style={{ marginTop: 24, color: '#94a3b8', fontSize: '0.9rem' }}>
                                        Last updated: {result.lastUpdated}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
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
                        <div style={{ position: 'relative', width: 64, height: 64 }}>
                            <div style={{ position: 'absolute', bottom: -10, left: 12, right: 12, height: 10, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>
                            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="18" y="4" width="12" height="64" rx="6" transform="rotate(-45 18 4)" fill="#fb7185" />
                                <rect x="4" y="46" width="12" height="64" rx="6" transform="rotate(-135 4 46)" fill="#f43f5e" />
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
        </div>
    );
};

export default TransactionSearch;
