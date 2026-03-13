import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

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
        messageHistory: [
            { timestamp: '11 Mar 2026, 09:48', user: 'System', message: '[FTP] New Transaction added', type: 'system' },
            { timestamp: '11 Mar 2026, 10:15', user: 'Support Agent', message: 'Verifying payout status with partner.', type: 'agent' }
        ],
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
        messageHistory: [
            { timestamp: '08 Mar 2026, 14:10', user: 'System', message: 'Transaction created via Direct channel', type: 'system' },
            { timestamp: '08 Mar 2026, 14:45', user: 'Agent Smith', message: 'Customer called inquiring about delay. Escalated to partner.', type: 'agent' }
        ],
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
        case 'name': {
            const parts = value.trim().split(/\s+/);
            return parts.map(part => {
                if (part.length <= 2) return part;
                return part.slice(0, 2) + '*'.repeat(part.length - 2);
            }).join(' ');
        }
        case 'account': {
            const clean = value.replace(/\s+/g, '');
            if (clean.length <= 4) return value;
            return '*'.repeat(clean.length - 4) + clean.slice(-4);
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
    const [searchParams, setSearchParams] = useSearchParams();
    const queryParam = searchParams.get('q') || '';
    const tabParam = searchParams.get('tab') || 'Details';

    const [query, setQuery] = useState(queryParam);
    const [newComment, setNewComment] = useState('');
    const [localComments, setLocalComments] = useState({}); // { mtn: [messages] }
    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
    const [unreadTabs, setUnreadTabs] = useState({ 'Comments': true, 'Help Tickets': true });

    // Derived state from URL parameters
    const result = React.useMemo(() => {
        if (!queryParam) return null;
        return MOCK_TRANSACTIONS.find(
            t => t.reference.toLowerCase() === queryParam.toLowerCase() || 
                 t.senderEmail.toLowerCase() === queryParam.toLowerCase()
        ) || null;
    }, [queryParam]);

    const searched = !!queryParam;
    const activeTab = tabParam;

    // Sync input field with URL (e.g. browser back button)
    useEffect(() => {
        setQuery(queryParam);
    }, [queryParam]);

    const handleSearch = (e) => {
        e.preventDefault();
        const searchTerm = query.trim();
        if (searchTerm) {
            setSearchParams({ q: searchTerm, tab: 'Details' });
        }
    };

    const handleTabChange = (newTab) => {
        setSearchParams({ q: queryParam, tab: newTab });
        if (unreadTabs[newTab]) {
            setUnreadTabs(prev => ({ ...prev, [newTab]: false }));
        }
    };

    const inputStyle = {
        width: '100%', padding: '10px 14px',
        border: '1px solid #d1d5db', borderRadius: 6,
        fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
        color: '#374151'
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1000 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                    Transaction Search
                </h1>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                    Search by reference number or sender email to view transaction details
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
                    placeholder="Enter Biller Ref, Top-up Ref, Pickup Code, or Sender Email"
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
                Try searching for these mock references: <strong style={{ color: '#ea580c', cursor: 'pointer' }} onClick={() => setQuery('05023676980')}>05023676980</strong>, <strong style={{ color: '#ea580c', cursor: 'pointer' }} onClick={() => setQuery('MITO-7721003')}>MITO-7721003</strong> or email <strong style={{ color: '#ea580c', cursor: 'pointer' }} onClick={() => setQuery('ogbeide.sender@example.com')}>ogbeide.sender@example.com</strong>
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
                            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr 1.2fr',
                            padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
                            fontSize: '0.75rem', fontWeight: 700, color: '#64748b',
                            textTransform: 'uppercase', letterSpacing: '0.025em'
                        }}>
                            <div>Ref #</div>
                            <div>Amount Ng.</div>
                            <div>Status</div>
                            <div>Date</div>
                            <div>Channel</div>
                            <div>Sender Email</div>
                        </div>
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr 1.2fr',
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
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{maskPII(result.senderEmail, 'email')}</div>
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
                            {['Details', 'Trail', 'KYC', 'Comments', 'Help Tickets'].map(tab => (
                                <button
                                    key={tab}
                                    id={`tab-${tab.toLowerCase().replace(' ', '-')}`}
                                    onClick={() => handleTabChange(tab)}
                                    style={{
                                        padding: '14px 28px', border: 'none', background: 'none',
                                        fontSize: '0.9rem', fontWeight: activeTab === tab ? 700 : 500,
                                        color: activeTab === tab ? '#ea580c' : '#64748b',
                                        borderBottom: activeTab === tab ? '3px solid #ea580c' : '3px solid transparent',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        outline: 'none',
                                        position: 'relative'
                                    }}
                                >
                                    {tab}
                                    {unreadTabs[tab] && (
                                        <span id={`notifier-${tab.toLowerCase().replace(' ', '-')}`} style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 14,
                                            width: 8,
                                            height: 8,
                                            background: '#ef4444',
                                            borderRadius: '50%',
                                        }} />
                                    )}
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
                                        <div style={{ color: '#1e293b', fontWeight: 600 }}>{maskPII(`${result.beneficiaryFirstName} ${result.beneficiaryLastName}`, 'name')}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Beneficiary Contact:</div>
                                        <div style={{ color: '#ea580c', fontWeight: 600 }}>{maskPII(result.beneficiaryPhone, 'phone')}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Beneficiary Email:</div>
                                        <div>{maskPII(result.beneficiaryEmail, 'email')}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Beneficiary Address:</div>
                                        <div style={{ fontSize: '0.85rem' }}>{maskPII(result.beneficiaryAddress, 'address')}</div>

                                        <div style={{ margin: '8px 0', gridColumn: 'span 2', height: '1px', background: '#f1f5f9' }}></div>

                                        {/* Sender Details (Masked) */}
                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Sender Name:</div>
                                        <div style={{ color: '#1e293b', fontWeight: 600 }}>{maskPII(`${result.senderFirstName} ${result.senderLastName}`, 'name')}</div>

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
                                        <div style={{ fontWeight: 600 }}>{maskPII(result.account, 'account')}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Rate:</div>
                                        <div>{result.rate}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Payout:</div>
                                        <div style={{ color: '#059669', fontWeight: 700 }}>{result.payout}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Settle Amount:</div>
                                        <div>{result.settle}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Total Paid:</div>
                                        <div style={{ fontWeight: 700 }}>{result.total}</div>

                                        <div style={{ color: '#64748b', fontWeight: 500 }}>Latest Comment:</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            {result.messageHistory?.[result.messageHistory.length - 1]?.message || 'No comments'}
                                        </div>
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

                            {activeTab === 'Comments' && (
                                <div id="comments-tab">
                                    <div style={{ marginBottom: 24 }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>💬 Agent Comments Thread</h3>
                                        <div style={{ border: '1px solid #f1f5f9', borderRadius: 12, overflow: 'hidden' }}>
                                            <div style={{ maxHeight: 300, overflowY: 'auto', padding: 20, background: '#fcfcfc' }}>
                                                {[...(result.messageHistory || []), ...(localComments[result.mtn] || [])].map((msg, i) => (
                                                    <div key={i} style={{ 
                                                        marginBottom: 16, 
                                                        textAlign: msg.type === 'agent' ? 'left' : 'center',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: msg.type === 'agent' ? 'flex-start' : 'center'
                                                    }}>
                                                        <div style={{ 
                                                            fontSize: '0.75rem', 
                                                            color: '#94a3b8', 
                                                            marginBottom: 4,
                                                            display: 'flex',
                                                            gap: 8
                                                        }}>
                                                            <strong>{msg.user}</strong> • {msg.timestamp}
                                                        </div>
                                                        <div style={{ 
                                                            padding: msg.type === 'agent' ? '10px 16px' : '6px 14px',
                                                            background: msg.type === 'agent' ? '#fff' : '#f1f5f9',
                                                            border: msg.type === 'agent' ? '1px solid #e2e8f0' : 'none',
                                                            borderRadius: 12,
                                                            fontSize: '0.9rem',
                                                            color: msg.type === 'agent' ? '#334155' : '#64748b',
                                                            maxWidth: '85%',
                                                            boxShadow: msg.type === 'agent' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                            fontStyle: msg.type === 'system' ? 'italic' : 'normal'
                                                        }}>
                                                            {msg.message}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ padding: 16, background: 'white', borderTop: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', gap: 12 }}>
                                                    <input 
                                                        type="text" 
                                                        id="new-comment-input"
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        placeholder="Add a comment to this transaction..." 
                                                        style={{ 
                                                            flex: 1, 
                                                            padding: '10px 14px', 
                                                            border: '1px solid #e2e8f0', 
                                                            borderRadius: 8, 
                                                            fontSize: '0.9rem',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                    <button 
                                                        id="post-comment-btn"
                                                        onClick={() => {
                                                            if (!newComment.trim()) return;
                                                            const msg = {
                                                                timestamp: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                                                user: 'Support Agent',
                                                                message: newComment.trim(),
                                                                type: 'agent'
                                                            };
                                                            setLocalComments(prev => ({
                                                                ...prev,
                                                                [result.mtn]: [...(prev[result.mtn] || []), msg]
                                                            }));
                                                            setNewComment('');
                                                        }}
                                                        style={{ 
                                                            background: '#ea580c', 
                                                            color: 'white', 
                                                            border: 'none', 
                                                            padding: '0 20px', 
                                                            borderRadius: 8, 
                                                            fontWeight: 600, 
                                                            cursor: 'pointer' 
                                                        }}
                                                    >
                                                        Post
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Help Tickets' && (
                                <div id="tickets-tab">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>🎟️ Linked Help Tickets</h3>
                                        <button 
                                            id="start-communication-btn"
                                            onClick={() => setIsCreateTicketModalOpen(true)}
                                            style={{ 
                                                background: '#ea580c', color: 'white', border: 'none', 
                                                padding: '8px 16px', borderRadius: 6, fontWeight: 600, 
                                                fontSize: '0.85rem', cursor: 'pointer' 
                                            }}
                                        >
                                            Create a New Ticket
                                        </button>
                                    </div>
                                    
                                    {result.mtn === 'MITO-7721003' ? (
                                        <div style={{ border: '1px solid #f1f5f9', borderRadius: 12, overflow: 'hidden' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px', padding: '12px 20px', background: '#f8fafc', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                                <div>ID</div>
                                                <div>Subject</div>
                                                <div>Created</div>
                                                <div>Status</div>
                                            </div>
                                            <div 
                                                id="linked-ticket-2651"
                                                onClick={() => window.location.href = `/support/help-tickets/2651`}
                                                style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px', padding: '16px 20px', fontSize: '0.85rem', color: '#1e293b', borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
                                            >
                                                <div style={{ color: '#ea580c', fontWeight: 600 }}>#2651</div>
                                                <div>Transaction stuck in processing for 6 hours</div>
                                                <div style={{ color: '#64748b' }}>08 Mar 2026</div>
                                                <div>
                                                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8' }}>Open</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed #e2e8f0', borderRadius: 12 }}>
                                            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🎫</div>
                                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>No help tickets linked to this transaction yet.</p>
                                        </div>
                                    )}
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
                        Enter an exact reference number or sender email to view transaction details and audit trail.
                    </p>
                </div>
            )}

            {/* Create Ticket Modal */}
            {isCreateTicketModalOpen && (
                <div id="create-ticket-modal" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: 20
                }}>
                    <div style={{
                        background: 'white', borderRadius: 12, padding: 32,
                        width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto',
                        position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <button 
                            id="close-modal-btn"
                            onClick={() => setIsCreateTicketModalOpen(false)}
                            style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}
                        >
                            ✕
                        </button>

                        <h2 style={{ textAlign: 'center', color: '#374151', fontSize: '1.5rem', fontWeight: 700, marginTop: 0, marginBottom: 32 }}>Create a new ticket</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Transaction Reference</label>
                                <input id="modal-txn-ref" type="text" value={result?.mtn || ''} readOnly style={{ ...inputStyle, background: '#f8fafc' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Select user <span style={{ color: '#ea580c' }}>*</span></label>
                                <select id="modal-user-select" style={{ ...inputStyle, appearance: 'none', background: 'white url("data:image/svg+xml,%3Csvg stroke=\'%236b7280\' fill=\'none\' stroke-width=\'2\' viewBox=\'0 0 24 24\' stroke-linecap=\'round\' stroke-linejoin=\'round\' height=\'1em\' width=\'1em\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 12px center' }}>
                                    <option value="">Select...</option>
                                    <option value="user1" selected>{result?.senderFirstName} {result?.senderLastName}</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Subject <span style={{ color: '#ea580c' }}>*</span></label>
                                <input id="modal-subject-input" type="text" placeholder="Enter subject" style={inputStyle} defaultValue={result?.mtn ? `Issue with Transaction ${result.mtn}` : ''} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Message <span style={{ color: '#ea580c' }}>*</span></label>
                                <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 16, alignItems: 'center', color: '#374151', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: 12, fontWeight: 700, fontFamily: 'serif' }}>
                                            <span style={{ cursor: 'pointer' }}>B</span>
                                            <span style={{ cursor: 'pointer', fontStyle: 'italic' }}>I</span>
                                            <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>U</span>
                                            <span style={{ cursor: 'pointer', textDecoration: 'line-through' }}>S</span>
                                        </div>
                                        <span style={{ cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>"</span>
                                        <span style={{ cursor: 'pointer' }}>🔗</span>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <span style={{ cursor: 'pointer' }}>≡</span>
                                            <span style={{ cursor: 'pointer', fontStyle: 'italic' }}>•≡</span>
                                        </div>
                                    </div>
                                    <textarea id="modal-message-textarea" placeholder="Message" rows={8} style={{ width: '100%', border: 'none', padding: 16, outline: 'none', resize: 'vertical', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', boxSizing: 'border-box' }}></textarea>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                                <button 
                                    id="cancel-modal-btn"
                                    onClick={() => setIsCreateTicketModalOpen(false)}
                                    style={{ background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '10px 24px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    id="submit-ticket-btn"
                                    onClick={() => setIsCreateTicketModalOpen(false)}
                                    style={{ background: '#ea580c', color: 'white', border: 'none', padding: '10px 32px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.2)' }}
                                >
                                    Create Ticket
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionSearch;
