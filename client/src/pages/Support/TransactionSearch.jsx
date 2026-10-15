import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supportPageTitleStyle } from './supportTypography';
import {
    TRANSACTIONS,
    SUMMARY_SNAPSHOT_ROWS,
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
    const [rewardsFilter, setRewardsFilter] = useState('All');
    const [showSummarySnapshot, setShowSummarySnapshot] = useState(false);
    const [snapshotAffiliate, setSnapshotAffiliate] = useState('ALL');
    const [activeRewardPopover, setActiveRewardPopover] = useState(null);

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

        // Don't show results if search term is empty and no reward filter is active
        if (!searchTerm.trim() && rewardsFilter === 'All') {
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        if (searchTerm.trim()) {
            setSearchParams({ q: searchTerm, type: searchType });
        }
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

        let matchesReward = true;
        if (rewardsFilter === 'With Rewards') matchesReward = !!t.promoCode || (t.rewardType && t.rewardType !== 'None');
        else if (rewardsFilter === 'Promo Code') matchesReward = t.rewardType === 'Promo Code';
        else if (rewardsFilter === 'Referral / Bonus') matchesReward = t.rewardType === 'Referral / Bonus';
        else if (rewardsFilter === 'No Rewards') matchesReward = !t.promoCode && (!t.rewardType || t.rewardType === 'None');

        return matchesQuery && matchesDate && matchesStatus && matchesReward;
    });

    const handleExportAccountantCsv = () => {
        const rowsToExport = showResults && results.length > 0 ? results : TRANSACTIONS;
        const headers = [
            'Reference', 'Date', 'Affiliate', 'Sender', 'Beneficiary', 'Send Currency',
            'Send Amount (Before Discount)', 'Amount Sent', 'Transaction Fee',
            'Reward Type', 'Promo Code', 'Sender Discount Cost', 'Receiver Bonus Cost',
            'Actual Customer Paid', 'Exchange Rate', 'Beneficiary Payout', 'Status'
        ];
        const escapeCsv = (val) => {
            const s = val === null || val === undefined ? '' : String(val);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = [
            headers.map(escapeCsv).join(','),
            ...rowsToExport.map(t => [
                t.reference,
                t.lastUpdated,
                t.affiliate,
                `${t.senderFirstName} ${t.senderLastName}`,
                `${t.beneficiaryFirstName} ${t.beneficiaryLastName}`,
                t.sendCurrency || '',
                t.sendAmount || t.total,
                t.amountSent || t.settle,
                t.feeAmount || '0.00',
                t.rewardType || 'None',
                t.promoCode || '-',
                t.discountAmount || '0.00',
                t.receiverBonusAmount || '0.00',
                t.customerPaid || t.total,
                t.rate,
                t.payout,
                t.status
            ].map(escapeCsv).join(','))
        ].join('\n');
        const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `accountant_transactions_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const demoTips = [
        { label: '22505502 (SAVE55)', value: '22505502' },
        { label: 'MITO-7721003', value: 'MITO-7721003' },
        { label: 'ogbeide.sender@example.com', value: 'ogbeide.sender@example.com' }
    ];

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1120 }}>
            {/* Header + Summary Snapshot & Accountant Export Actions */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={supportPageTitleStyle}>Transaction Search</h1>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                        Search by transaction reference, sender email, or filter by promo/reward usage
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        id="summary-snapshot-btn"
                        type="button"
                        onClick={() => setShowSummarySnapshot((v) => !v)}
                        style={{
                            padding: '10px 16px', borderRadius: 10, border: '1px solid #cbd5e1',
                            background: showSummarySnapshot ? '#0f172a' : 'white',
                            color: showSummarySnapshot ? 'white' : '#1e293b',
                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        📊 {showSummarySnapshot ? 'Hide Summary Snapshot' : 'Summary Snapshot'}
                    </button>
                    <button
                        id="export-accountant-csv-btn"
                        type="button"
                        onClick={handleExportAccountantCsv}
                        style={{
                            padding: '10px 16px', borderRadius: 10, border: '1px solid #fed7aa',
                            background: '#fff7ed', color: '#c2410c',
                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 8
                        }}
                    >
                        ⬇️ Export Accountant Report (CSV)
                    </button>
                </div>
            </div>

            {/* Collapsible Summary Snapshot (MTO Submissions Summary per Currency) */}
            {showSummarySnapshot && (
                <div id="summary-snapshot-panel" style={{
                    background: 'white', borderRadius: 14, padding: '20px 24px', marginBottom: 24,
                    border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Summary Snapshot (MTO Submissions)</h3>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Aggregated transaction counts, processed values, commissions, and balances by currency</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <select
                                aria-label="Snapshot Affiliate"
                                value={snapshotAffiliate}
                                onChange={(e) => setSnapshotAffiliate(e.target.value)}
                                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#f8fafc' }}
                            >
                                <option value="ALL">Affiliate: ALL</option>
                                <option value="Rhemito Direct">Rhemito Direct</option>
                                <option value="ITransfer Money Movers">ITransfer Money Movers</option>
                                <option value="Partner-KE">Partner-KE</option>
                            </select>
                            <span style={{ fontSize: '0.78rem', color: '#475569', background: '#f1f5f9', padding: '6px 10px', borderRadius: 8 }}>
                                Date Range: {startDate} to {endDate}
                            </span>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ background: '#1e3a8a', color: 'white' }}>
                                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Currency</th>
                                    <th style={{ padding: '9px 10px' }}>Total</th>
                                    <th style={{ padding: '9px 10px' }}>New</th>
                                    <th style={{ padding: '9px 10px' }}>InProgress</th>
                                    <th style={{ padding: '9px 10px' }}>Processed</th>
                                    <th style={{ padding: '9px 10px' }}>Failed</th>
                                    <th style={{ padding: '9px 10px' }}>Pending Val</th>
                                    <th style={{ padding: '9px 10px' }}>Failed Val</th>
                                    <th style={{ padding: '9px 10px' }}>Total Val</th>
                                    <th style={{ padding: '9px 10px' }}>Processed Val</th>
                                    <th style={{ padding: '9px 10px' }}>Comms Val</th>
                                    <th style={{ padding: '9px 10px' }}>ProcPlusComms Val</th>
                                    <th style={{ padding: '9px 10px' }}>Receipt</th>
                                    <th style={{ padding: '9px 10px' }}>Bal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SUMMARY_SNAPSHOT_ROWS.map((r, idx) => (
                                    <tr key={r.currency} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#1e293b' }}>{r.currency}</td>
                                        <td style={{ padding: '8px 10px' }}>{r.total}</td>
                                        <td style={{ padding: '8px 10px' }}>{r.newCount}</td>
                                        <td style={{ padding: '8px 10px' }}>{r.inProgress}</td>
                                        <td style={{ padding: '8px 10px', color: '#166534', fontWeight: 600 }}>{r.processed}</td>
                                        <td style={{ padding: '8px 10px', color: r.failed > 0 ? '#991b1b' : '#64748b' }}>{r.failed}</td>
                                        <td style={{ padding: '8px 10px' }}>{r.pendingVal}</td>
                                        <td style={{ padding: '8px 10px' }}>{r.failedVal}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.totalVal}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.processedVal}</td>
                                        <td style={{ padding: '8px 10px' }}>{r.commsVal}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.procPlusCommsVal}</td>
                                        <td style={{ padding: '8px 10px' }}>{r.receipt}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{r.bal}</td>
                                    </tr>
                                ))}
                                <tr style={{ background: '#e0f2fe', fontWeight: 700, color: '#0f172a', borderTop: '2px solid #0284c7' }}>
                                    <td style={{ padding: '9px 10px', textAlign: 'left' }}>Totals</td>
                                    <td style={{ padding: '9px 10px' }}>{SUMMARY_SNAPSHOT_ROWS.reduce((s, r) => s + r.total, 0)}</td>
                                    <td style={{ padding: '9px 10px' }}>{SUMMARY_SNAPSHOT_ROWS.reduce((s, r) => s + r.newCount, 0)}</td>
                                    <td style={{ padding: '9px 10px' }}>{SUMMARY_SNAPSHOT_ROWS.reduce((s, r) => s + r.inProgress, 0)}</td>
                                    <td style={{ padding: '9px 10px' }}>{SUMMARY_SNAPSHOT_ROWS.reduce((s, r) => s + r.processed, 0)}</td>
                                    <td style={{ padding: '9px 10px' }}>{SUMMARY_SNAPSHOT_ROWS.reduce((s, r) => s + r.failed, 0)}</td>
                                    <td colSpan={8} style={{ padding: '9px 10px', textAlign: 'right', fontSize: '0.74rem', color: '#0369a1' }}>
                                        Multi-currency totals shown per row above
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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

                    {/* Row 2: Dates, Status, Rewards Filter, and Button */}
                    {showAdvancedFilters ? (
                        <>
                            <div style={{ gridColumn: 'span 2' }}>
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
                            <div style={{ gridColumn: 'span 2' }}>
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
                            <div style={{ gridColumn: 'span 2' }}>
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
                        <div style={{ gridColumn: 'span 6' }}></div>
                    )}

                    <div style={{ gridColumn: 'span 3' }}>
                        <label htmlFor="transaction-rewards-filter" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rewards / Promo Filter</label>
                        <select
                            id="transaction-rewards-filter"
                            value={rewardsFilter}
                            onChange={(e) => {
                                setRewardsFilter(e.target.value);
                                if (e.target.value !== 'All') setShowResults(true);
                            }}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                                outline: 'none', fontSize: '0.9rem', background: '#f8fafc', height: '44px',
                                transition: 'all 0.2s', boxSizing: 'border-box'
                            }}
                        >
                            <option value="All">All Transactions</option>
                            <option value="With Rewards">With Rewards / Promo</option>
                            <option value="Promo Code">Promo Code Applied</option>
                            <option value="Referral / Bonus">Referral / Bonus</option>
                            <option value="No Rewards">No Rewards</option>
                        </select>
                    </div>

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
                    border: '1px solid #f1f5f9', overflow: 'visible'
                }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', fontWeight: 600 }}>
                            Search Results {searchTerm ? <>for: <span style={{ color: '#ea580c' }}>"{searchTerm}"</span></> : `(${rewardsFilter})`}
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                            {results.length} {results.length === 1 ? 'transaction' : 'transactions'} found
                        </span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            <tr>
                                {['Reference', 'Date', 'Beneficiary', 'Sender', 'Status', 'Amount / Payout', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {results.length > 0 ? results.map((t, i) => {
                                const hasReward = !!t.promoCode && !!t.discountAmount;
                                const isPopoverOpen = activeRewardPopover === t.reference;
                                return (
                                    <tr
                                        key={i}
                                        onClick={() => {
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
                                        <td style={{ padding: '16px 20px', position: 'relative' }} onClick={(e) => { if (hasReward) e.stopPropagation(); }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                                                    {t.sendAmount || t.total}
                                                </span>
                                                {hasReward && (
                                                    <button
                                                        type="button"
                                                        aria-label={`View reward breakdown for ${t.reference}`}
                                                        title={`Promo ${t.promoCode}: -${t.discountAmount} (Paid ${t.customerPaid || t.total})`}
                                                        onMouseEnter={() => setActiveRewardPopover(t.reference)}
                                                        onMouseLeave={() => setActiveRewardPopover(null)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveRewardPopover(isPopoverOpen ? null : t.reference);
                                                        }}
                                                        style={{
                                                            border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4f46e5',
                                                            borderRadius: 999, padding: '2px 7px', fontSize: '0.72rem', fontWeight: 700,
                                                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3
                                                        }}
                                                    >
                                                        🎁 ⓘ
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#059669', marginTop: 2 }}>
                                                → {t.payout}
                                            </div>
                                            {hasReward && isPopoverOpen && (
                                                <div
                                                    role="tooltip"
                                                    style={{
                                                        position: 'absolute', bottom: '100%', right: 16, zIndex: 50,
                                                        background: '#0f172a', color: 'white', padding: '12px 14px',
                                                        borderRadius: 10, width: 250, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                                        fontSize: '0.76rem', lineHeight: 1.5, marginBottom: 4
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 6, borderBottom: '1px solid #334155', paddingBottom: 4 }}>
                                                        Reward &amp; Payment Breakdown
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#cbd5e1' }}>Send Amount:</span>
                                                        <strong>{t.sendAmount || t.total}</strong>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80' }}>
                                                        <span>Discount ({t.promoCode}):</span>
                                                        <strong>-{t.discountAmount}</strong>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', marginTop: 4, paddingTop: 4 }}>
                                                        <span style={{ color: '#cbd5e1' }}>Actual Customer Paid:</span>
                                                        <strong>{t.customerPaid || t.total}</strong>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
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
                                );
                            }) : (
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
