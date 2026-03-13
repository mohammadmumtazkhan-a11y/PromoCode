import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supportPageTitleStyle, supportSectionTitleStyle } from './supportTypography';
import { 
    TRANSACTIONS, 
    statusColors, 
    kycStatusColors, 
    maskPII 
} from './transactionUtils';

// Audit Trail Timeline (Copied from Search for consistency)
const AuditTrail = ({ trail }) => (
    <div style={{ padding: '24px 0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>📋 Audit Trail</h3>
        <div style={{ position: 'relative', paddingLeft: 28 }}>
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
                        <div style={{
                            position: 'absolute', left: -22, top: 4,
                            width: 14, height: 14, borderRadius: '50%',
                            background: dotColor, border: '2px solid white',
                            boxShadow: `0 0 0 2px ${dotColor}40`,
                            zIndex: 1
                        }}></div>
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

const TransactionDetails = () => {
    const { reference} = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'Details';
    const searchQuery = searchParams.get('q') || '';

    const [newComment, setNewComment] = useState('');
    const [localComments, setLocalComments] = useState({}); 
    const [clearedNotifications, setClearedNotifications] = useState({
        Comments: false,
        'Help Tickets': false
    });
    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
    const [localLinkedTickets, setLocalLinkedTickets] = useState([
        { ticketId: '2651', subject: 'Transaction stuck in processing for 6 hours', name: 'Rockmanstar', createdAt: '10 Mar 2026, 14:30', status: 'New' },
        { ticketId: '2653', subject: 'Incorrect beneficiary details', name: 'Rockmanstar', createdAt: '09 Mar 2026, 09:15', status: 'New' },
        { ticketId: '2649', subject: 'Important information update request', name: 'Keke Igere', createdAt: '06 Mar 2026, 10:55', status: 'New' },
        { ticketId: '2604', subject: 'Refund Request', name: 'Kj Busam-Adah', createdAt: '09 Feb 2026, 01:20', status: 'New' }
    ]);
    const [ticketForm, setTicketForm] = useState({ subject: '', message: '', attachments: [] });
    const [ticketSearchQuery, setTicketSearchQuery] = useState('');
    const [activeTicketTab, setActiveTicketTab] = useState('New');

    const transaction = TRANSACTIONS.find(t => t.reference === reference);

    if (!transaction) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <h2 style={{ color: '#ef4444' }}>Transaction Not Found</h2>
                <button 
                    onClick={() => navigate('/support/transactions')}
                    style={{
                        padding: '10px 20px', background: '#ea580c', color: 'white',
                        border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 20
                    }}
                >
                    Back to Search
                </button>
            </div>
        );
    }

    const handleTabChange = (newTab) => {
        setSearchParams({ tab: newTab });
        if (newTab === 'Comments' || newTab === 'Help Tickets') {
            setClearedNotifications(prev => ({ ...prev, [newTab]: true }));
        }
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1000 }}>
            {/* Header / Back Link */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <button 
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'none', border: 'none', color: '#ea580c',
                        cursor: 'pointer', fontSize: '1.2rem', padding: 0
                    }}
                    title="Go Back"
                >
                    ←
                </button>
                <h1 style={supportPageTitleStyle}>
                    Transaction {transaction.reference}
                </h1>
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
                    {['Details', 'Trail', 'KYC', 'Comments', 'Help Tickets'].map(tab => {
                        const hasNotification = (
                            (tab === 'Comments' && transaction.hasUnseenComments && !clearedNotifications.Comments) ||
                            (tab === 'Help Tickets' && transaction.hasUnseenTickets && !clearedNotifications['Help Tickets'])
                        );

                        return (
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
                                    outline: 'none', position: 'relative'
                                }}
                            >
                                {tab}
                                {hasNotification && (
                                    <span 
                                        id={`notifier-${tab.toLowerCase().replace(' ', '-')}`}
                                        style={{
                                            position: 'absolute', top: 12, right: 18,
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: '#ef4444', border: '2px solid white',
                                            boxShadow: '0 0 0 1px #ef444430'
                                        }}
                                    ></span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div style={{ padding: 28 }}>
                    {activeTab === 'Details' && (
                        <div id="details-tab">
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0', width: '180px' }}>MTN:</td>
                                        <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0' }}>{transaction.mtn}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Affiliate:</td>
                                        <td style={{ color: '#1e293b', padding: '6px 0' }}>{transaction.affiliate}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Status:</td>
                                        <td style={{ color: statusColors[transaction.status]?.color, fontWeight: 600, padding: '6px 0' }}>{transaction.status}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Type:</td>
                                        <td style={{ padding: '6px 0' }}>{transaction.type}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Sending Country:</td>
                                        <td style={{ padding: '6px 0' }}>{transaction.sendingCountry}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="2" style={{ padding: '8px 0' }}>
                                            <div style={{ height: '1px', background: '#f1f5f9' }}></div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Beneficiary Name:</td>
                                        <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0' }}>{maskPII(`${transaction.beneficiaryFirstName} ${transaction.beneficiaryLastName}`, 'name')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Beneficiary Contact:</td>
                                        <td style={{ color: '#ea580c', fontWeight: 600, padding: '6px 0' }}>{maskPII(transaction.beneficiaryPhone, 'phone')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Beneficiary Email:</td>
                                        <td style={{ padding: '6px 0' }}>{maskPII(transaction.beneficiaryEmail, 'email')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Beneficiary Address:</td>
                                        <td style={{ fontSize: '0.85rem', padding: '6px 0' }}>{maskPII(transaction.beneficiaryAddress, 'address')}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="2" style={{ padding: '8px 0' }}>
                                            <div style={{ height: '1px', background: '#f1f5f9' }}></div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Sender Name:</td>
                                        <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0' }}>{maskPII(`${transaction.senderFirstName} ${transaction.senderLastName}`, 'name')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Sender Contact:</td>
                                        <td style={{ color: '#ea580c', fontWeight: 600, padding: '6px 0' }}>{maskPII(transaction.senderPhone, 'phone')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Sender Email:</td>
                                        <td style={{ padding: '6px 0' }}>{maskPII(transaction.senderEmail, 'email')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Sender Address:</td>
                                        <td style={{ fontSize: '0.85rem', padding: '6px 0' }}>{maskPII(transaction.senderAddress, 'address')}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="2" style={{ padding: '8px 0' }}>
                                            <div style={{ height: '1px', background: '#f1f5f9' }}></div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Service Name:</td>
                                        <td style={{ padding: '6px 0' }}>{transaction.serviceName}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Service Code:</td>
                                        <td style={{ fontFamily: 'monospace', padding: '6px 0' }}>{transaction.serviceCode}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Collection Method:</td>
                                        <td style={{ padding: '6px 0' }}>{transaction.collectionMethod}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Account Number:</td>
                                        <td style={{ fontWeight: 600, padding: '6px 0' }}>{maskPII(transaction.account, 'account')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Rate:</td>
                                        <td style={{ padding: '6px 0' }}>{transaction.rate}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Payout:</td>
                                        <td style={{ color: '#059669', fontWeight: 700, padding: '6px 0' }}>{transaction.payout}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Settle Amount:</td>
                                        <td style={{ padding: '6px 0' }}>{transaction.settle}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', fontWeight: 500, padding: '6px 12px 6px 0' }}>Total Paid:</td>
                                        <td style={{ fontWeight: 700, padding: '6px 0' }}>{transaction.total}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'Trail' && (
                        <div id="trail-tab">
                            <AuditTrail trail={transaction.auditTrail} />
                        </div>
                    )}

                    {activeTab === 'KYC' && (
                        <div id="kyc-tab" style={{ textAlign: 'center', padding: '60px 0' }}>
                            <div style={{ fontSize: '4rem', marginBottom: 20 }}>
                                {kycStatusColors[transaction.kycStatus]?.icon || '🛡️'}
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
                                background: kycStatusColors[transaction.kycStatus]?.bg || '#f3f4f6',
                                color: kycStatusColors[transaction.kycStatus]?.color || '#374151',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                border: `1px solid ${kycStatusColors[transaction.kycStatus]?.color}20`
                            }}>
                                {transaction.kycStatus || 'Not Available'}
                            </div>
                            <p style={{ marginTop: 24, color: '#94a3b8', fontSize: '0.9rem' }}>
                                Last updated: {transaction.lastUpdated}
                            </p>
                        </div>
                    )}

                    {activeTab === 'Comments' && (
                        <div id="comments-tab">
                            <div style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>💬 Agent Comments Thread</h3>
                                <div style={{ border: '1px solid #f1f5f9', borderRadius: 12, overflow: 'hidden' }}>
                                    <div style={{ maxHeight: 300, overflowY: 'auto', padding: 20, background: '#fcfcfc' }}>
                                        {[...(transaction.messageHistory || []), ...(localComments[transaction.mtn] || [])].map((msg, i) => (
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
                                                id="new-comment-input"
                                                type="text" 
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
                                                        [transaction.mtn]: [...(prev[transaction.mtn] || []), msg]
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
                        <div id="tickets-tab" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                            {/* Advanced Header Controls */}
                            <div style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                marginBottom: 24, flexWrap: 'wrap', gap: 16 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <h2 style={{ ...supportSectionTitleStyle, fontSize: '1.25rem' }}>
                                        Help tickets ({localLinkedTickets.length})
                                    </h2>
                                    <button 
                                        id="start-communication-btn"
                                        onClick={() => setIsCreateTicketModalOpen(true)}
                                        style={{ 
                                            background: '#5b21b6', color: 'white', border: 'none', 
                                            padding: '10px 18px', borderRadius: 8, fontWeight: 600, 
                                            fontSize: '0.85rem', cursor: 'pointer', display: 'flex', 
                                            alignItems: 'center', gap: 8, transition: 'all 0.2s'
                                        }}
                                    >
                                        <span style={{ fontSize: '1.1rem' }}>⊕</span> Create ticket
                                    </button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <button style={{ 
                                        background: '#7c3aed', color: 'white', border: 'none', 
                                        padding: '10px 18px', borderRadius: 8, fontWeight: 600, 
                                        fontSize: '0.85rem', cursor: 'pointer', display: 'flex', 
                                        alignItems: 'center', gap: 8
                                    }}>
                                        <span>⚙️</span> Filter
                                    </button>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Search" 
                                            value={ticketSearchQuery}
                                            onChange={(e) => setTicketSearchQuery(e.target.value)}
                                            style={{ 
                                                padding: '10px 40px 10px 16px', borderRadius: 8, 
                                                border: '1px solid #e2e8f0', fontSize: '0.9rem', 
                                                width: 220, outline: 'none'
                                            }} 
                                        />
                                        <span style={{ 
                                            position: 'absolute', right: 0, top: 0, bottom: 0, 
                                            width: 40, display: 'flex', alignItems: 'center', 
                                            justifyContent: 'center', background: '#7c3aed', 
                                            color: 'white', borderRadius: '0 8px 8px 0', cursor: 'pointer'
                                        }}>🔍</span>
                                    </div>
                                </div>
                            </div>

                            {/* Status Sub-tabs */}
                            <div style={{ 
                                display: 'flex', gap: 32, borderBottom: '1px solid #f1f5f9', 
                                marginBottom: 24, overflowX: 'auto', paddingBottom: 2 
                            }}>
                                {['New (4)', 'Open (5)', 'Resolved (4)', 'Spam (3)', 'Blocked (2)', 'All (18)'].map(subTab => {
                                    const label = subTab.split(' ')[0];
                                    const isActive = activeTicketTab === label;
                                    return (
                                        <button 
                                            key={label}
                                            onClick={() => setActiveTicketTab(label)}
                                            style={{ 
                                                padding: '12px 4px', border: 'none', background: 'none',
                                                fontSize: '0.9rem', fontWeight: isActive ? 700 : 500,
                                                color: isActive ? '#5b21b6' : '#64748b',
                                                borderBottom: isActive ? '3px solid #5b21b6' : '3px solid transparent',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {subTab}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Enhanced Table */}
                            <div style={{ border: '1px solid #f1f5f9', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontWeight: 600 }}>Ticket No</th>
                                            <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontWeight: 600 }}>Date</th>
                                            <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontWeight: 600 }}>Name</th>
                                            <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontWeight: 600 }}>Subject</th>
                                            <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontWeight: 600 }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {localLinkedTickets
                                            .filter(t => t.subject.toLowerCase().includes(ticketSearchQuery.toLowerCase()) || t.ticketId.includes(ticketSearchQuery))
                                            .map((t, i) => (
                                            <tr key={i} style={{ borderBottom: i < localLinkedTickets.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.2s' }}>
                                                <td
                                                    id={`linked-ticket-${t.ticketId}`}
                                                    style={{ padding: '16px', color: '#5b21b6', fontWeight: 700, cursor: 'pointer' }}
                                                    onClick={() => {
                                                        // Store transaction search context for "Back to list" navigation
                                                        if (searchQuery) {
                                                            sessionStorage.setItem('txnSearchContext', JSON.stringify({ query: searchQuery }));
                                                        }
                                                        navigate(`/support/help-tickets/${t.ticketId}`);
                                                    }}
                                                >
                                                    {t.ticketId}
                                                </td>
                                                <td style={{ padding: '16px', color: '#1e293b' }}>{t.createdAt}</td>
                                                <td style={{ padding: '16px', color: '#1e293b' }}>{t.name || 'Rockmanstar'}</td>
                                                <td style={{ padding: '16px', color: '#64748b' }}>{t.subject}</td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ 
                                                        padding: '4px 12px', borderRadius: 20, 
                                                        background: '#fef2f2', color: '#dc2626', 
                                                        fontSize: '0.75rem', fontWeight: 700, 
                                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                                        border: '1px solid #fee2e2'
                                                    }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }}></span>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Ticket Modal */}
            {isCreateTicketModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: 20
                }}>
                    <div 
                        id="create-ticket-modal"
                        style={{
                            background: 'white', borderRadius: 16, padding: 32,
                            width: '100%', maxWidth: 600, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            position: 'relative'
                        }}
                    >
                        <button 
                            id="close-modal-btn"
                            onClick={() => setIsCreateTicketModalOpen(false)}
                            style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                        >
                            ✕
                        </button>
                        
                        <h2 style={{ ...supportPageTitleStyle, marginBottom: 24 }}>Create Support Ticket</h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Transaction Reference</label>
                                <input 
                                    id="modal-txn-ref"
                                    type="text" 
                                    value={transaction.reference} 
                                    disabled 
                                    style={{ 
                                        width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', 
                                        borderRadius: 8, background: '#f8fafc', color: '#94a3b8', fontSize: '0.9rem',
                                        boxSizing: 'border-box'
                                    }} 
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Subject <span style={{ color: '#ef4444' }}>*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Brief summary of the issue"
                                    value={ticketForm.subject}
                                    onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                                    style={{ 
                                        width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', 
                                        borderRadius: 8, fontSize: '0.9rem', outline: 'none',
                                        boxSizing: 'border-box'
                                    }} 
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Message <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea 
                                    placeholder="Provide details about the request..."
                                    rows={5}
                                    value={ticketForm.message}
                                    onChange={(e) => setTicketForm(prev => ({ ...prev, message: e.target.value }))}
                                    style={{ 
                                        width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', 
                                        borderRadius: 8, fontSize: '0.9rem', outline: 'none', resize: 'none',
                                        boxSizing: 'border-box', fontFamily: 'inherit'
                                    }} 
                                />
                            </div>

                            {/* Attachments Section */}
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                    Attachments
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                                    <button 
                                        type="button"
                                        onClick={() => document.getElementById('ticket-attachment-input').click()}
                                        style={{ 
                                            background: '#f3f4f6', color: '#4b5563', border: '1px dashed #d1d5db', 
                                            padding: '10px 16px', borderRadius: 8, fontSize: '0.85rem', 
                                            fontWeight: 600, cursor: 'pointer', display: 'flex', 
                                            alignItems: 'center', gap: 8, transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                    >
                                        <span style={{ fontSize: '1.2rem' }}>📎</span> Add attachment
                                    </button>
                                    <input 
                                        id="ticket-attachment-input"
                                        type="file" 
                                        multiple 
                                        style={{ display: 'none' }} 
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            setTicketForm(prev => ({
                                                ...prev,
                                                attachments: [...prev.attachments, ...files.map(f => f.name)]
                                            }));
                                        }}
                                    />
                                    
                                    {ticketForm.attachments.map((fileName, idx) => (
                                        <div key={idx} style={{ 
                                            background: '#f8fafc', border: '1px solid #e2e8f0', 
                                            padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', 
                                            color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 
                                        }}>
                                            📄 {fileName}
                                            <span 
                                                onClick={() => setTicketForm(prev => ({
                                                    ...prev,
                                                    attachments: prev.attachments.filter((_, i) => i !== idx)
                                                }))}
                                                style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', marginLeft: 4 }}
                                            >×</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                                <button 
                                    onClick={() => setIsCreateTicketModalOpen(false)}
                                    style={{ 
                                        padding: '10px 20px', border: '1px solid #e2e8f0', background: 'white',
                                        borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#64748b',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        if (!ticketForm.subject.trim() || !ticketForm.message.trim()) return;
                                        const newTicket = {
                                            ticketId: Math.floor(1000 + Math.random() * 9000).toString(),
                                            subject: ticketForm.subject.trim(),
                                            name: 'Support Agent',
                                            createdAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                            status: 'New'
                                        };
                                        setLocalLinkedTickets(prev => [newTicket, ...prev]);
                                        setTicketForm({ subject: '', message: '', attachments: [] });
                                        setIsCreateTicketModalOpen(false);
                                    }}
                                    style={{ 
                                        padding: '10px 24px', border: 'none', background: '#5b21b6',
                                        color: 'white', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
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

export default TransactionDetails;
