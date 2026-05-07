import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supportPageTitleStyle } from './supportTypography';
import {
    TRANSACTIONS,
    DEFAULT_START_DATE,
    DEFAULT_END_DATE,
    statusColors,
    formatDateInputValue,
    maskPII
} from './transactionUtils';

const TransactionSearch = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryParam = searchParams.get('q') || '';
    const typeParam = searchParams.get('type') || 'reference';

    const [searchTerm, setSearchTerm] = useState(queryParam);
    const [searchType, setSearchType] = useState(typeParam);
    const [startDate, setStartDate] = useState(formatDateInputValue(DEFAULT_START_DATE));
    const [endDate, setEndDate] = useState(formatDateInputValue(DEFAULT_END_DATE));
    const [statusFilter, setStatusFilter] = useState('All');

    // UI State
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(!!queryParam);

    // Sync state with URL when it changes
    React.useEffect(() => {
        if (queryParam) {
            setSearchTerm(queryParam);
            setSearchType(typeParam);
            setShowResults(true);
        } else if (!queryParam) {
            setShowResults(false);
        }
    }, [queryParam, typeParam]);

    const handleSearch = (e) => {
        if (e) e.preventDefault();

        // Don't show results if search term is empty
        if (!searchTerm.trim()) {
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        setSearchParams({ q: searchTerm, type: searchType });
        setTimeout(() => {
            setIsSearching(false);
            setShowResults(true);
        }, 600);
    };

    const showAdvancedFilters = ['payer', 'account', 'affiliate', 'email'].includes(searchType);

    const results = TRANSACTIONS.filter(t => {
        let matchesQuery = true;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            switch (searchType) {
                case 'reference':
                    matchesQuery = t.reference.toLowerCase().includes(q) || t.mtn.toLowerCase().includes(q);
                    break;
                case 'payer':
                    matchesQuery = `${t.senderFirstName} ${t.senderLastName}`.toLowerCase().includes(q);
                    break;
                case 'account':
                    matchesQuery = t.account && t.account.includes(q);
                    break;
                case 'affiliate':
                    matchesQuery = t.affiliate.toLowerCase().includes(q);
                    break;
                case 'email':
                    matchesQuery = t.senderEmail.toLowerCase().includes(q);
                    break;
                default:
                    matchesQuery = t.reference.toLowerCase().includes(q) || t.senderEmail.toLowerCase().includes(q);
            }
        }

        let matchesDate = true;
        if (showAdvancedFilters) {
            const tDate = t.lastUpdatedAt;
            const sDate = new Date(`${startDate}T00:00:00`);
            const eDate = new Date(`${endDate}T23:59:59`);
            matchesDate = tDate >= sDate && tDate <= eDate;
        }

        const matchesStatus = !showAdvancedFilters || statusFilter === 'All' || t.status === statusFilter;

        return matchesQuery && matchesDate && matchesStatus;
    });

    const demoTips = [
        { label: 'MITO-7721003', value: 'MITO-7721003' },
        { label: 'ogbeide.sender@example.com', value: 'ogbeide.sender@example.com' }
    ];

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1000 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={supportPageTitleStyle}>Transaction Search</h1>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                    Search by transaction reference or sender email
                </p>
            </div>

            {/* Search Filters Card */}
            <div style={{
                background: 'white', padding: '28px 32px', borderRadius: 16,
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)',
                border: '1px solid #f1f5f9', marginBottom: 32
            }}>
                <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px 20px', alignItems: 'end' }}>
                    {/* Row 1: Search Query */}
                    <div style={{ gridColumn: 'span 12' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Query</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>DEMO TIPS:</span>
                                {demoTips.map((tip, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm(tip.value);
                                            if (tip.value.includes('@')) setSearchType('email');
                                            else setSearchType('reference');
                                        }}
                                        style={{
                                            background: '#fff7ed', border: '1px solid #ffedd5', color: '#ea580c', cursor: 'pointer',
                                            padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#ffedd5'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#fff7ed'; }}
                                    >
                                        {tip.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <select
                                value={searchType}
                                onChange={(e) => {
                                    setSearchType(e.target.value);
                                    if (e.target.value === 'email' && !searchTerm.includes('@')) setSearchTerm('');
                                }}
                                style={{
                                    width: '180px', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
                                    outline: 'none', fontSize: '0.9rem', background: '#f8fafc', height: '44px',
                                    transition: 'all 0.2s', boxSizing: 'border-box'
                                }}
                            >
                                <option value="reference">Ref / MTN</option>
                                <option value="payer">Payer Name</option>
                                <option value="account">Bank Account</option>
                                <option value="affiliate">Affiliate</option>
                                <option value="email">Sender Email</option>
                            </select>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    id="transaction-search-input"
                                    type="text"
                                    placeholder={searchType === 'payer' ? 'Sender Name...' : searchType === 'account' ? 'Account Number...' : searchType === 'affiliate' ? 'Affiliate Name...' : searchType === 'email' ? 'Sender Email...' : 'Transaction Ref or MTN...'}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
                                        outline: 'none', fontSize: '1rem', background: '#f8fafc', height: '44px',
                                        transition: 'all 0.2s', boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.1)'; e.currentTarget.style.background = '#fff'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f8fafc'; }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Dates, Status, and Button */}
                    {showAdvancedFilters ? (
                        <>
                            <div style={{ gridColumn: 'span 3' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</label>
                                <input
                                    id="transaction-date-from"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                                        outline: 'none', fontSize: '0.9rem', height: '44px', background: '#f8fafc',
                                        transition: 'all 0.2s', boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.background = '#fff'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 3' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</label>
                                <input
                                    id="transaction-date-to"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                                        outline: 'none', fontSize: '0.9rem', height: '44px', background: '#f8fafc',
                                        transition: 'all 0.2s', boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.background = '#fff'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 3' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                                        outline: 'none', fontSize: '0.9rem', background: '#f8fafc', height: '44px',
                                        transition: 'all 0.2s', boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.background = '#fff'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Processed">Processed</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Failed">Failed</option>
                                    <option value="In Progress">In Progress</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <div style={{ gridColumn: 'span 9' }}></div>
                    )}

                    <div style={{ gridColumn: 'span 3' }}>
                        <button
                            id="transaction-search-btn"
                            type="submit"
                            disabled={isSearching}
                            style={{
                                width: '100%', padding: '11px 24px', background: 'linear-gradient(135deg, #ea580c 0%, #d9480f 100%)',
                                color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', opacity: isSearching ? 0.7 : 1,
                                height: '44px', boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.2)'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 12px -1px rgba(234, 88, 12, 0.3)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(234, 88, 12, 0.2)'; }}
                        >
                            {isSearching ? 'Searching...' : 'Search Transactions'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Results */}
            {showResults && (
                <div id="search-results" style={{
                    background: 'white', borderRadius: 12,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    border: '1px solid #f1f5f9', overflow: 'hidden'
                }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', fontWeight: 600 }}>
                            Search Results for: <span style={{ color: '#ea580c' }}>"{searchTerm}"</span>
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                            {results.length} {results.length === 1 ? 'transaction' : 'transactions'} found
                        </span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            <tr>
                                {['Reference', 'Date', 'Beneficiary', 'Sender', 'Status', 'Payout', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {results.length > 0 ? results.map((t, i) => (
                                <tr
                                    key={i}
                                    onClick={() => {
                                        // Store search context for potential "Back to list" navigation
                                        if (searchTerm) {
                                            sessionStorage.setItem('txnSearchContext', JSON.stringify({ query: searchTerm, type: searchType }));
                                        }
                                        navigate(`/support/transactions/${t.reference}${searchTerm ? `?q=${searchTerm}&type=${searchType}` : ''}`);
                                    }}
                                    style={{
                                        borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fff7ed'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{t.reference}</td>
                                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b' }}>{t.lastUpdated}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>{maskPII(`${t.beneficiaryFirstName} ${t.beneficiaryLastName}`, 'name')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{maskPII(t.beneficiaryPhone, 'phone')}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>{maskPII(`${t.senderFirstName} ${t.senderLastName}`, 'name')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{maskPII(t.senderPhone, 'phone')}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{maskPII(t.senderEmail, 'email')}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600,
                                            background: statusColors[t.status]?.bg || '#f3f4f6', color: statusColors[t.status]?.color || '#374151'
                                        }}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>{t.payout}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <button
                                            style={{
                                                background: 'none', border: '1px solid #e2e8f0', padding: '6px 12px',
                                                borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td id="no-result" colSpan="7" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
                                        No Transaction Found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {!showResults && (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: 'white', borderRadius: 12, border: '1px dashed #e2e8f0',
                    color: '#94a3b8'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
                    <p>Enter search criteria above to find transactions.</p>
                </div>
            )}
        </div>
    );
};

export default TransactionSearch;
