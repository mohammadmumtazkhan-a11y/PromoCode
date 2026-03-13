import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supportModalTitleStyle, supportPageTitleStyle, supportSectionTitleStyle } from './supportTypography';

// Mock tickets — realistic sample data across all statuses
const INITIAL_TICKETS = [
    // --- NEW ---
    {
        ticketId: '2654', status: 'New', customer: 'Rockmanstar', email: 'willsrock52@yahoo.com',
        userType: 'Unregistered user', orderNumber: 'N/A', platform: 'Cokobar (Web (Mobile))',
        subject: 'Inquiry', createdAt: '10 Mar 2026, 19:24',
        thread: [
            { sender: 'Customer', message: 'This is my phone number 07459154675 Rockmanstar', time: '19:24' },
        ]
    },
    {
        ticketId: '2653', status: 'New', customer: 'Rockmanstar', email: 'willsrock52@yahoo.com',
        userType: 'Unregistered user', orderNumber: 'N/A', platform: 'Cokobar (Web (Mobile))',
        subject: 'Inquiry about inventory availability', createdAt: '10 Mar 2026, 19:23',
        thread: [
            { sender: 'Customer', message: 'Hi, I wanted to check if you have the chocolate hamper box available for delivery this weekend?', time: '19:23' },
        ]
    },
    {
        ticketId: '2649', status: 'New', customer: 'Keke Igere', email: 'keke.igere@gmail.com',
        userType: 'Registered user', orderNumber: 'ORD-88412', platform: 'Mito.Money (iOS)',
        subject: 'Important information update request', createdAt: '6 Mar 2026, 10:55',
        thread: [
            { sender: 'Customer', message: 'I need to update my registered phone number and address. My old number is no longer active. Please advise on the process.', time: '10:55' },
        ]
    },
    {
        ticketId: '2604', status: 'New', customer: 'Kj Busam-Adah', email: 'kjbusam@outlook.com',
        userType: 'Registered user', orderNumber: 'ORD-77201', platform: 'Mito.Money (Android)',
        subject: 'Refund Request', createdAt: '9 Feb 2026, 01:20',
        thread: [
            { sender: 'Customer', message: 'I made a transfer of £250 to the wrong beneficiary on 7 Feb. Transaction ref MITO-4429103. Please process a refund immediately.', time: '01:20' },
        ]
    },

    // --- OPEN ---
    {
        ticketId: '2651', status: 'Open', customer: 'Amara Osei', email: 'amara.osei@hotmail.com',
        userType: 'Registered user', orderNumber: 'ORD-90122', platform: 'Mito.Money (iOS)',
        subject: 'Transaction stuck in processing for 6 hours', createdAt: '8 Mar 2026, 14:10',
        thread: [
            { sender: 'Customer', message: 'My transaction MITO-7721003 has been stuck in processing for over 6 hours. Can you help?', time: '14:10' },
            { sender: 'Agent', message: 'Hi Amara, we are looking into this now. The payment provider is experiencing delays. We will update you shortly.', time: '14:45' },
            { sender: 'Customer', message: 'Thanks, please keep me posted.', time: '15:02' },
        ]
    },
    {
        ticketId: '2648', status: 'Open', customer: 'David Chen', email: 'david.chen@gmail.com',
        userType: 'Registered user', orderNumber: 'ORD-88901', platform: 'Mito.Money (Web)',
        subject: 'Rate discrepancy on GBP-INR corridor', createdAt: '5 Mar 2026, 09:30',
        thread: [
            { sender: 'Customer', message: 'The rate shown was 105 but my transaction processed at 103.5. Please investigate.', time: '09:30' },
            { sender: 'Agent', message: 'This was due to a rate refresh mid-session. We are reviewing whether a correction is needed.', time: '10:15' },
        ]
    },
    {
        ticketId: '2641', status: 'Open', customer: 'Fatima Al-Rashid', email: 'fatima.ar@yahoo.com',
        userType: 'Registered user', orderNumber: 'ORD-86700', platform: 'Mito.Money (Android)',
        subject: 'Failed transaction — money deducted', createdAt: '1 Mar 2026, 11:00',
        thread: [
            { sender: 'Customer', message: 'Transaction MITO-5530092 failed but money was deducted from my account. Please process a refund.', time: '11:00' },
            { sender: 'Agent', message: 'We are reviewing the failed transaction. Refunds typically take 3-5 business days once approved.', time: '11:30' },
            { sender: 'Customer', message: 'Can it be expedited? This is an urgent matter.', time: '11:45' },
        ]
    },
    {
        ticketId: '2635', status: 'Open', customer: 'Samuel Mensah', email: 'samuel.m@gmail.com',
        userType: 'Affiliate', orderNumber: 'N/A', platform: 'Partner Portal',
        subject: 'Partner payout delayed for MITO-8839201', createdAt: '27 Feb 2026, 10:30',
        thread: [
            { sender: 'Customer', message: 'The partner payout is delayed for MITO-8839201. It has been over 48 hours since the funds were cleared.', time: '10:30' },
            { sender: 'Agent', message: 'Checking the audit trail now. Please hold.', time: '10:35' },
        ]
    },
    {
        ticketId: '2630', status: 'Open', customer: 'Lucia Fernandez', email: 'lucia.f@email.com',
        userType: 'Registered user', orderNumber: 'ORD-84500', platform: 'Mito.Money (iOS)',
        subject: 'KYC verification taking too long', createdAt: '25 Feb 2026, 16:00',
        thread: [
            { sender: 'Customer', message: 'I submitted my documents 2 weeks ago and my KYC is still pending. I cannot make any transactions.', time: '16:00' },
            { sender: 'Agent', message: 'Apologies for the delay. We have escalated your verification to the compliance team. You should hear back within 48 hours.', time: '16:30' },
        ]
    },

    // --- RESOLVED ---
    {
        ticketId: '2645', status: 'Resolved', customer: 'Priya Sharma', email: 'priya.sharma@gmail.com',
        userType: 'Registered user', orderNumber: 'ORD-87990', platform: 'Mito.Money (Web)',
        subject: 'Unable to login — 2FA issue', createdAt: '3 Mar 2026, 08:20',
        thread: [
            { sender: 'Customer', message: 'I changed my phone and now the 2FA codes are not working. I cannot access my account.', time: '08:20' },
            { sender: 'Agent', message: 'We have reset your 2FA. Please log in again and set up a new authenticator app.', time: '09:00' },
            { sender: 'Customer', message: 'It works now, thank you!', time: '09:15' },
        ]
    },
    {
        ticketId: '2638', status: 'Resolved', customer: 'James Adeyemi', email: 'james.a@outlook.com',
        userType: 'Registered user', orderNumber: 'ORD-85200', platform: 'Mito.Money (Android)',
        subject: 'Beneficiary name mismatch', createdAt: '28 Feb 2026, 13:00',
        thread: [
            { sender: 'Customer', message: 'The beneficiary name on my transfer does not match the account holder. Transaction MITO-6641020.', time: '13:00' },
            { sender: 'Agent', message: 'We have verified the details with the receiving bank. The name is an alias on the account and the transfer went through successfully.', time: '14:00' },
            { sender: 'Customer', message: 'Understood, thanks for confirming.', time: '14:20' },
        ]
    },
    {
        ticketId: '2620', status: 'Resolved', customer: 'Elena Popov', email: 'elena.p@mail.com',
        userType: 'Registered user', orderNumber: 'ORD-82100', platform: 'Mito.Money (Web)',
        subject: 'Double charge on card', createdAt: '20 Feb 2026, 17:45',
        thread: [
            { sender: 'Customer', message: 'I was charged twice for transaction MITO-3310445. £150 was taken twice from my Visa card.', time: '17:45' },
            { sender: 'Agent', message: 'We can confirm one charge was a temporary hold that has been released. Please check your statement in 24-48 hours.', time: '18:30' },
            { sender: 'Customer', message: 'Checked today, the duplicate charge is gone. Thank you.', time: '10:00' },
        ]
    },
    {
        ticketId: '2610', status: 'Resolved', customer: 'Chibuzor Eze', email: 'chibuzor.e@gmail.com',
        userType: 'Registered user', orderNumber: 'ORD-80050', platform: 'Mito.Money (iOS)',
        subject: 'Promo code SAVE20 not applying', createdAt: '15 Feb 2026, 12:30',
        thread: [
            { sender: 'Customer', message: 'I tried applying promo code SAVE20 but it says "code not valid". I meet all the requirements.', time: '12:30' },
            { sender: 'Agent', message: 'The code was restricted to GBP-NGN corridor only. I have applied a manual credit of £20 to your account as a goodwill gesture.', time: '13:00' },
            { sender: 'Customer', message: 'That is very kind, thank you!', time: '13:10' },
        ]
    },

    // --- SPAM ---
    {
        ticketId: '2647', status: 'Spam', customer: 'Unknown User', email: 'test12345@tempmail.org',
        userType: 'Unregistered user', orderNumber: 'N/A', platform: 'Cokobar (Web)',
        subject: 'FREE MONEY - Click here now!!!', createdAt: '4 Mar 2026, 03:12',
        thread: [
            { sender: 'Customer', message: 'Congratulations! You have won $5,000,000. Click this link to claim your prize immediately. Act now before it expires!', time: '03:12' },
        ]
    },
    {
        ticketId: '2632', status: 'Spam', customer: 'Marketing Bot', email: 'noreply@spamservice.xyz',
        userType: 'Unregistered user', orderNumber: 'N/A', platform: 'Cokobar (Web)',
        subject: 'Buy followers and likes cheap', createdAt: '26 Feb 2026, 01:44',
        thread: [
            { sender: 'Customer', message: 'Get 10,000 Instagram followers for only $5! Visit our website for more details. Guaranteed results in 24 hours.', time: '01:44' },
        ]
    },
    {
        ticketId: '2615', status: 'Spam', customer: 'Auto Sender', email: 'offers@bulkmail.net',
        userType: 'Unregistered user', orderNumber: 'N/A', platform: 'Web',
        subject: 'Important: Your account has been selected', createdAt: '18 Feb 2026, 06:30',
        thread: [
            { sender: 'Customer', message: 'Dear customer, your account has been selected for a special reward. Please verify your identity by clicking the link below.', time: '06:30' },
        ]
    },

    // --- BLOCKED ---
    {
        ticketId: '2640', status: 'Blocked', customer: 'Banned User X', email: 'blocked.user@protonmail.com',
        userType: 'Blocked user', orderNumber: 'N/A', platform: 'Mito.Money (Web)',
        subject: 'Account suspended unfairly', createdAt: '28 Feb 2026, 22:10',
        thread: [
            { sender: 'Customer', message: 'My account has been suspended without warning. I demand it to be reinstated immediately or I will take legal action.', time: '22:10' },
            { sender: 'Agent', message: 'Your account was suspended due to violations of our Terms of Service (multiple chargeback attempts). This decision is final and has been reviewed by our compliance team.', time: '09:00' },
        ]
    },
    {
        ticketId: '2612', status: 'Blocked', customer: 'Fraudulent Actor', email: 'fake.identity@mail.com',
        userType: 'Blocked user', orderNumber: 'N/A', platform: 'Mito.Money (Android)',
        subject: 'Why is my account locked?', createdAt: '16 Feb 2026, 14:55',
        thread: [
            { sender: 'Customer', message: 'I cannot access my account anymore. What happened?', time: '14:55' },
            { sender: 'Agent', message: 'Your account was flagged and locked due to suspicious activity detected by our fraud detection system. Please contact compliance@mito.money for further information.', time: '15:30' },
        ]
    },
];

const TAB_STATUSES = ['New', 'Open', 'Resolved', 'Spam', 'Blocked', 'All'];

const statusConfig = {
    'New': { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', dot: '#dc2626' },
    'Open': { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd', dot: '#1d4ed8' },
    'Resolved': { bg: '#f0fdf4', color: '#166534', border: '#86efac', dot: '#166534' },
    'Spam': { bg: '#fefce8', color: '#a16207', border: '#fde047', dot: '#a16207' },
    'Blocked': { bg: '#faf5ff', color: '#7c3aed', border: '#c4b5fd', dot: '#7c3aed' },
    'Reopened': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', dot: '#92400e' },
};

const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig['Open'];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 99,
            fontSize: '0.75rem', fontWeight: 600,
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
            {status}
        </span>
    );
};

const HelpTickets = () => {
    const navigate = useNavigate();
    const { ticketId } = useParams();
    const isDetailRoute = Boolean(ticketId);
    const [tickets, setTickets] = useState(INITIAL_TICKETS);
    const [activeTab, setActiveTab] = useState('New');
    const [selectedId, setSelectedId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    
    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTicketNo, setFilterTicketNo] = useState('');
    const [filterEmail, setFilterEmail] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTill, setFilterTill] = useState('');

    const handleClearFilters = () => {
        setFilterTicketNo('');
        setFilterEmail('');
        setFilterName('');
        setFilterSubject('');
        setFilterFrom('');
        setFilterTill('');
    };

    // Compute tab counts from current tickets state
    const tabCounts = useMemo(() => {
        const counts = {};
        TAB_STATUSES.forEach(s => { counts[s] = 0; });
        tickets.forEach(t => {
            if (counts[t.status] !== undefined) counts[t.status]++;
            counts['All']++;
        });
        return counts;
    }, [tickets]);

    // Filtered tickets based on active tab and applied filters
    const filteredTickets = useMemo(() => {
        let base = tickets;

        // Apply advanced filters
        if (filterTicketNo) base = base.filter(t => t.ticketId.includes(filterTicketNo));
        if (filterEmail) base = base.filter(t => t.email.toLowerCase().includes(filterEmail.toLowerCase()));
        if (filterName) base = base.filter(t => t.customer.toLowerCase().includes(filterName.toLowerCase()));
        if (filterSubject) base = base.filter(t => t.subject.toLowerCase().includes(filterSubject.toLowerCase()));
        // Note: Date filtering skipped for simplicity in mock data matching, can be added later
        
        // Apply text search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            base = base.filter(t => 
                t.ticketId.toLowerCase().includes(q) || 
                t.customer.toLowerCase().includes(q) || 
                t.subject.toLowerCase().includes(q) || 
                t.email.toLowerCase().includes(q)
            );
        }

        if (activeTab === 'All') return base;
        return base.filter(t => t.status === activeTab);
    }, [tickets, activeTab, filterTicketNo, filterEmail, filterName, filterSubject, searchQuery]);

    const activeTicketId = isDetailRoute ? ticketId : selectedId;
    const selectedTicket = tickets.find(t => t.ticketId === activeTicketId);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        const filtered = tab === 'All' ? tickets : tickets.filter(t => t.status === tab);
        setSelectedId(filtered.length > 0 ? filtered[0].ticketId : null);
    };

    // Keep selected ticket in sync with route mode.
    React.useEffect(() => {
        if (isDetailRoute) {
            setSelectedId(ticketId);
            return;
        }
        const newTickets = INITIAL_TICKETS.filter(t => t.status === 'New');
        if (newTickets.length > 0) {
            setSelectedId(newTickets[0].ticketId);
        }
    }, [isDetailRoute, ticketId]);

    const handleSendReply = () => {
        if (!replyText.trim()) return;
        setTickets(prev => prev.map(t => {
            if (t.ticketId === activeTicketId) {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                return {
                    ...t,
                    status: t.status === 'New' ? 'Open' : t.status,
                    thread: [...t.thread, { sender: 'Agent', message: replyText.trim(), time: timeStr }]
                };
            }
            return t;
        }));
        setReplyText('');
        setIsReplying(false);
    };

    const handleStatusChange = (newStatus) => {
        setTickets(prev => prev.map(t => {
            if (t.ticketId === activeTicketId) {
                return { ...t, status: newStatus };
            }
            return t;
        }));
    };

    const inputStyle = {
        width: '100%', padding: '10px 14px',
        border: '1px solid #d1d5db', borderRadius: 6,
        fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
        color: '#374151'
    };
    
    const labelStyle = {
        display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', marginBottom: 6
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            {!isDetailRoute && (
            <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <h1 style={{ ...supportPageTitleStyle, margin: 0 }}>
                        Help tickets ({tabCounts[activeTab]})
                    </h1>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        style={{
                            background: '#5b21b6', color: 'white', border: 'none',
                            padding: '8px 18px', borderRadius: 6, fontWeight: 600,
                            fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                        }}
                    >
                        ⊕ Create ticket
                    </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        style={{
                            background: '#7c3aed', color: 'white', border: 'none',
                            padding: '8px 20px', borderRadius: 6, fontWeight: 600,
                            fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                        </svg>
                        Filter
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
                        <input 
                            type="text" 
                            placeholder="Search" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ border: 'none', padding: '8px 14px', outline: 'none', width: '200px', fontSize: '0.85rem' }} 
                        />
                        <button style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Expandable Filter Panel */}
            {isFilterOpen && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>Ticket no</label>
                            <input type="text" placeholder="Enter ticket no" value={filterTicketNo} onChange={e => setFilterTicketNo(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input type="text" placeholder="Enter email" value={filterEmail} onChange={e => setFilterEmail(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Name</label>
                            <input type="text" placeholder="Enter name" value={filterName} onChange={e => setFilterName(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Subject</label>
                            <input type="text" placeholder="Enter subject" value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Created From</label>
                            <input type="text" placeholder="Created From" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Created Till</label>
                            <input type="text" placeholder="Created Till" value={filterTill} onChange={e => setFilterTill(e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button 
                            onClick={handleClearFilters}
                            style={{
                                background: 'white', color: '#6b7280', border: '1px solid #d1d5db',
                                padding: '8px 24px', borderRadius: 6, fontWeight: 500,
                                fontSize: '0.9rem', cursor: 'pointer',
                            }}
                        >
                            Clear all
                        </button>
                        <button 
                            style={{
                                background: '#7c3aed', color: 'white', border: 'none',
                                padding: '8px 24px', borderRadius: 6, fontWeight: 600,
                                fontSize: '0.9rem', cursor: 'pointer',
                            }}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb',
                marginBottom: 20, background: 'white', borderRadius: '10px 10px 0 0',
                padding: '0 16px',
            }}>
                {TAB_STATUSES.map(tab => {
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            id={`tab-${tab.toLowerCase()}`}
                            onClick={() => handleTabChange(tab)}
                            style={{
                                background: 'none', border: 'none',
                                padding: '12px 20px',
                                fontSize: '0.9rem', fontWeight: isActive ? 700 : 500,
                                color: isActive ? '#5b21b6' : '#6b7280',
                                cursor: 'pointer',
                                borderBottom: isActive ? '3px solid #5b21b6' : '3px solid transparent',
                                marginBottom: '-2px',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {tab} ({tabCounts[tab]})
                        </button>
                    );
                })}
            </div>

            {/* Table-style ticket list */}
            <div style={{
                background: 'white', borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                overflow: 'hidden',
            }}>
                {/* Table Header */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1.5fr 110px',
                    padding: '14px 24px', borderBottom: '1px solid #e5e7eb',
                    fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'capitalize',
                }}>
                    <div>Ticket no</div>
                    <div>Date</div>
                    <div>Name</div>
                    <div>Subject</div>
                    <div>Status</div>
                </div>

                {/* Ticket Rows */}
                {filteredTickets.length === 0 ? (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
                        No tickets in this category
                    </div>
                ) : (
                    filteredTickets.map(t => (
                        <div
                            key={t.ticketId}
                            id={`ticket-row-${t.ticketId}`}
                            onClick={() => navigate(`/support/help-tickets/${t.ticketId}`)}
                            style={{
                                display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1.5fr 110px',
                                padding: '14px 24px', borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer', alignItems: 'center',
                                background: ticketId === t.ticketId ? '#faf5ff' : 'white',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { if (ticketId !== t.ticketId) e.currentTarget.style.background = '#fafafa'; }}
                            onMouseLeave={e => { if (ticketId !== t.ticketId) e.currentTarget.style.background = 'white'; }}
                        >
                            <div style={{ color: '#5b21b6', fontWeight: 600, fontSize: '0.85rem' }}>{t.ticketId}</div>
                            <div style={{ color: '#374151', fontSize: '0.85rem' }}>{t.createdAt}</div>
                            <div style={{ color: '#374151', fontSize: '0.85rem' }}>{t.customer}</div>
                            <div style={{ color: '#6b7280', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                            <div><StatusBadge status={t.status} /></div>
                        </div>
                    ))
                )}
            </div>
            </>
            )}

            {/* Ticket Detail Panel (shown below when a ticket is selected) */}
            {isDetailRoute && !selectedTicket && (
                <div style={{
                    marginTop: 12, background: 'white', borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '24px 28px',
                }}>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#111827' }}>Ticket not found</h2>
                    <button
                        onClick={() => navigate('/support/help-tickets')}
                        style={{
                            background: 'white', color: '#5b21b6', border: '1px solid #5b21b6',
                            padding: '8px 18px', borderRadius: 6, fontWeight: 600,
                            fontSize: '0.85rem', cursor: 'pointer',
                        }}
                    >
                        Back to help tickets
                    </button>
                </div>
            )}
            {isDetailRoute && selectedTicket && (
                <div style={{
                    marginTop: 12, background: 'white', borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                }}>
                    {/* Detail Header */}
                    <div style={{ padding: '20px 28px', borderBottom: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => {
                                // Check if we came from transaction search
                                const txnContext = sessionStorage.getItem('txnSearchContext');
                                if (txnContext) {
                                    const { query } = JSON.parse(txnContext);
                                    sessionStorage.removeItem('txnSearchContext');
                                    navigate(`/support/transactions?q=${query}`);
                                } else {
                                    navigate(-1);
                                }
                            }}
                            style={{
                                background: 'white', color: '#5b21b6', border: '1px solid #c4b5fd',
                                padding: '6px 12px', borderRadius: 6, fontWeight: 600,
                                fontSize: '0.8rem', cursor: 'pointer', marginBottom: 14,
                            }}
                        >
                            ← Back to list
                        </button>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ ...supportSectionTitleStyle, fontSize: '1.25rem' }}>
                                #{selectedTicket.ticketId}
                            </h2>
                            <span style={{ cursor: 'pointer', fontSize: '1.2rem', color: '#6b7280' }}>⋮</span>
                        </div>

                        {/* Ticket Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 10, fontSize: '0.88rem' }}>
                            <span style={{ fontWeight: 600, color: '#374151' }}>Ticket No.</span>
                            <span style={{ color: '#1f2937' }}>{selectedTicket.ticketId}</span>

                            <span style={{ fontWeight: 600, color: '#374151' }}>Request date:</span>
                            <span style={{ color: '#1f2937' }}>{selectedTicket.createdAt}</span>

                            <span style={{ fontWeight: 600, color: '#374151' }}>Name:</span>
                            <span style={{ color: '#1f2937' }}>{selectedTicket.customer}</span>

                            <span style={{ fontWeight: 600, color: '#374151' }}>Email:</span>
                            <span style={{ color: '#1f2937' }}>{selectedTicket.email}</span>

                            <span style={{ fontWeight: 600, color: '#374151' }}>User type</span>
                            <span style={{ color: '#1f2937' }}>{selectedTicket.userType}</span>

                            <span style={{ fontWeight: 600, color: '#374151' }}>Transaction Ref#</span>
                            <span style={{ color: '#1f2937' }}>{selectedTicket.orderNumber}</span>

                            <span style={{ fontWeight: 600, color: '#374151' }}>Platform</span>
                            <span style={{ color: '#1f2937' }}>{selectedTicket.platform}</span>

                            <span style={{ fontWeight: 600, color: '#374151' }}>Ticket status</span>
                            <span><StatusBadge status={selectedTicket.status} /></span>

                            <span style={{ fontWeight: 600, color: '#374151' }}>Subject:</span>
                            <span style={{ color: '#1f2937' }}>{selectedTicket.subject}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {!isReplying && (
                    <div style={{ padding: '12px 28px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <button
                            id="reply-toggle-btn"
                            onClick={() => setIsReplying(true)}
                            style={{
                                background: 'white', color: '#5b21b6', border: '1px solid #5b21b6',
                                padding: '7px 22px', borderRadius: 6, fontWeight: 600,
                                fontSize: '0.85rem', cursor: 'pointer',
                            }}
                        >
                            Reply
                        </button>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {/* Standard States (New/Open) */}
                            {['New', 'Open', 'Reopened'].includes(selectedTicket.status) && (
                                <>
                                    <button
                                        id="resolve-btn"
                                        onClick={() => handleStatusChange('Resolved')}
                                        style={{
                                            background: 'white', color: '#374151', border: '1px solid #d1d5db',
                                            padding: '7px 18px', borderRadius: 6, fontWeight: 600,
                                            fontSize: '0.85rem', cursor: 'pointer',
                                        }}
                                    >
                                        Mark as resolved
                                    </button>
                                    <button
                                        id="spam-btn"
                                        onClick={() => handleStatusChange('Spam')}
                                        style={{
                                            background: 'white', color: '#374151', border: '1px solid #d1d5db',
                                            padding: '7px 18px', borderRadius: 6, fontWeight: 600,
                                            fontSize: '0.85rem', cursor: 'pointer',
                                        }}
                                    >
                                        Mark as spam
                                    </button>
                                </>
                            )}
                            
                            {/* Resolved State */}
                            {selectedTicket.status === 'Resolved' && (
                                <button
                                    id="reopen-btn"
                                    onClick={() => handleStatusChange('Reopened')}
                                    style={{
                                        background: 'white', color: '#5b21b6', border: '1px solid #5b21b6',
                                        padding: '7px 18px', borderRadius: 6, fontWeight: 600,
                                        fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                >
                                    Re-Open
                                </button>
                            )}
                            
                            {/* Spam State */}
                            {selectedTicket.status === 'Spam' && (
                                <>
                                    <button
                                        id="reopen-spam-btn"
                                        onClick={() => handleStatusChange('Reopened')}
                                        style={{
                                            background: 'white', color: '#5b21b6', border: '1px solid #5b21b6',
                                            padding: '7px 18px', borderRadius: 6, fontWeight: 600,
                                            fontSize: '0.85rem', cursor: 'pointer',
                                        }}
                                    >
                                        Re-Open
                                    </button>
                                    <button
                                        id="block-user-btn"
                                        onClick={() => handleStatusChange('Blocked')}
                                        style={{
                                            background: 'white', color: '#5b21b6', border: '1px solid #5b21b6',
                                            padding: '7px 18px', borderRadius: 6, fontWeight: 600,
                                            fontSize: '0.85rem', cursor: 'pointer',
                                        }}
                                    >
                                        Block user
                                    </button>
                                </>
                            )}

                            {/* Blocked State */}
                            {selectedTicket.status === 'Blocked' && (
                                <button
                                    id="unblock-btn"
                                    onClick={() => handleStatusChange('Open')}
                                    style={{
                                        background: 'white', color: '#5b21b6', border: '1px solid #5b21b6',
                                        padding: '7px 18px', borderRadius: 6, fontWeight: 600,
                                        fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                >
                                    Unblock
                                </button>
                            )}
                        </div>
                    </div>
                    )}

                    {/* Reply Container - Only show if not replying */}
                    {!isReplying && (
                        <div style={{ padding: '16px 28px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{
                                width: '100%', padding: '10px 14px',
                                border: '1px solid #d1d5db', borderRadius: 8,
                                fontSize: '0.9rem', color: '#9ca3af',
                                cursor: 'text', background: '#f9fafb'
                            }} onClick={() => setIsReplying(true)}>
                                Click 'Reply' or type here to start replying...
                            </div>
                        </div>
                    )}

                    {/* Expandable Rich Reply Box */}
                    {isReplying && (
                        <div style={{ padding: '20px 28px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <button style={{ background: 'white', color: '#5b21b6', border: '1px solid #5b21b6', padding: '6px 24px', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem' }}>
                                    Reply
                                </button>
                                <button onClick={() => setIsReplying(false)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '1.2rem', cursor: 'pointer' }}>
                                    ✕
                                </button>
                            </div>

                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Message <span style={{ color: '#5b21b6' }}>*</span></label>
                            
                            <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
                                {/* Mock Toolbar */}
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
                                        <span style={{ cursor: 'pointer' }}>•≡</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.85rem' }}>
                                        <span style={{ cursor: 'pointer' }}>X₂</span>
                                        <span style={{ cursor: 'pointer' }}>X²</span>
                                    </div>
                                    <select style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', color: '#374151', fontSize: '0.85rem' }}>
                                        <option>Normal</option>
                                    </select>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <span style={{ cursor: 'pointer' }}>A</span>
                                        <span style={{ cursor: 'pointer' }}>A̲</span>
                                        <span style={{ cursor: 'pointer', fontStyle: 'italic' }}>Tₓ</span>
                                    </div>
                                </div>
                                {/* Text Area */}
                                <textarea 
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Message" 
                                    rows={6} 
                                    style={{ width: '100%', border: 'none', padding: 16, outline: 'none', resize: 'vertical', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginTop: 24 }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px 0' }}>
                                    Attachments <span style={{ background: '#4b5563', color: 'white', borderRadius: '50%', width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>i</span>
                                </h3>
                                <button style={{ background: 'white', color: '#5b21b6', border: '1px solid #c4b5fd', padding: '8px 16px', borderRadius: 4, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    📎 Add Attachment
                                </button>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <button 
                                    onClick={handleSendReply}
                                    style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '10px 32px', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Thread / Messages */}
                    <div style={{ padding: '20px 28px' }}>
                        {selectedTicket.thread.map((msg, i) => {
                            const isAgent = msg.sender === 'Agent';
                            return (
                                <div key={i} style={{
                                    marginBottom: 20, padding: '16px 20px',
                                    background: isAgent ? '#faf5ff' : '#f9fafb',
                                    borderRadius: 10,
                                    borderLeft: isAgent ? '3px solid #5b21b6' : '3px solid #d1d5db',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: isAgent ? '#5b21b6' : '#6b7280',
                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: '0.75rem',
                                        }}>
                                            {(isAgent ? 'A' : selectedTicket.customer.charAt(0)).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1f2937' }}>
                                                {isAgent ? 'Support Agent' : selectedTicket.customer}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{msg.time}</div>
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 42, fontSize: '0.9rem', color: '#374151', lineHeight: 1.6 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>Message</div>
                                        {msg.message}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create Ticket Modal */}
            {isCreateModalOpen && (
                <div style={{
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
                            onClick={() => setIsCreateModalOpen(false)}
                            style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}
                        >
                            ✕
                        </button>

                        <h2 style={supportModalTitleStyle}>Create a new ticket</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Select user <span style={{ color: '#5b21b6' }}>*</span></label>
                                <select style={{ ...inputStyle, appearance: 'none', background: 'white url("data:image/svg+xml,%3Csvg stroke=\'%236b7280\' fill=\'none\' stroke-width=\'2\' viewBox=\'0 0 24 24\' stroke-linecap=\'round\' stroke-linejoin=\'round\' height=\'1em\' width=\'1em\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 12px center' }}>
                                    <option value="">Select...</option>
                                    <option value="user1">Rockmanstar</option>
                                    <option value="user2">John Doe</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Subject <span style={{ color: '#5b21b6' }}>*</span></label>
                                <input type="text" placeholder="Enter subject" style={inputStyle} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Message <span style={{ color: '#5b21b6' }}>*</span></label>
                                <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                                    {/* Mock Toolbar */}
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
                                            <span style={{ cursor: 'pointer' }}>•≡</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, fontSize: '0.85rem' }}>
                                            <span style={{ cursor: 'pointer' }}>X₂</span>
                                            <span style={{ cursor: 'pointer' }}>X²</span>
                                        </div>
                                        <select style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', color: '#374151' }}>
                                            <option>Normal</option>
                                            <option>Heading 1</option>
                                            <option>Heading 2</option>
                                        </select>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <span style={{ cursor: 'pointer' }}>A</span>
                                            <span style={{ cursor: 'pointer' }}>A̲</span>
                                            <span style={{ cursor: 'pointer', fontStyle: 'italic' }}>Tₓ</span>
                                        </div>
                                    </div>
                                    {/* Text Area */}
                                    <textarea placeholder="Message" rows={8} style={{ width: '100%', border: 'none', padding: 16, outline: 'none', resize: 'vertical', fontFamily: "'Inter', sans-serif" }}></textarea>
                                </div>
                            </div>
                            
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 16px' }}>
                                    Attachments <span style={{ background: '#4b5563', color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>i</span>
                                </h3>
                                <button style={{ background: 'white', color: '#5b21b6', border: '1px solid #5b21b6', padding: '10px 20px', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    📎 Add Attachment
                                </button>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <button style={{ background: '#5b21b6', color: 'white', border: 'none', padding: '12px 32px', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                                    Create ticket
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HelpTickets;
