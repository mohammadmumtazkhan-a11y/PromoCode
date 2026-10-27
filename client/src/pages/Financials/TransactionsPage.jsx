import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Funnel / Filter SVG Icon
const FilterIcon = ({ className = 'w-4 h-4' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 6H20M7 12H17M10 18H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = ({ className = 'w-4 h-4' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// Top Financials Tabs matching module 97917 in staging-admin
const FINANCIALS_TABS = [
  { label: 'Transactions', href: '/financials/transactions' },
  { label: 'MTO Submissions', href: '/financials/mto-submissions' },
  { label: 'Retail Submissions', href: '/financials/retail-transactions' },
  { label: 'Biller Submissions', href: '/financials/biller-transactions' },
  { label: 'Receive Money', href: '/financials/receive-money' },
];

// Status badge dot color helper matching module 33607 in staging-admin
const getStatusDotColor = (status) => {
  switch (status) {
    case 'Successful':
    case 'Processed':
    case 'Paid Out':
    case 'PAID':
      return '#62AA32';
    case 'Failed':
    case 'Aborted':
    case 'Cancelled':
    case 'Timeout':
    case 'EXPIRED':
    case 'Expired':
    case 'FAILED':
    case 'CANCELLED':
      return '#8F0404';
    case 'In Progress':
    case 'Under Review':
    case 'Ready To Process':
    case 'Paying Out':
    case 'Payment Processing':
    case 'Pending':
    case 'Awaiting Payment':
      return '#FED217';
    default:
      return '#9658F7';
  }
};

const DEFAULT_FILTER_VALUES = {
  senderAccount: '',
  transactionRef: '',
  merchantRef: '',
  payerRef: '',
  recipientAccount: '',
  channel: '',
  type: '',
  status: '',
  payer: '',
  provider: '',
  paymentStatus: '',
  paymentMethod: '',
  application: '',
  splitFilter: '',
  startDate: '',
  endDate: '',
};

// Seed/mock transactions dataset with full Mito fields
const SEED_TRANSACTIONS = [
  {
    id: 't1',
    reference: 'TXN100001',
    channel: 'Web Portal',
    date: '24/10/2024',
    time: '10:30 AM',
    type: 'Money Transfer',
    sendCurrency: 'GBP',
    amount: '500.00',
    rate: '1545.7900',
    details: 'Transfer to Global Tech Ltd via GTBank',
    provider: 'GTBank Nigeria',
    accBal: '£ 12,450.00',
    createdBy: 'admin@mito.money',
    transactionStatus: 'Successful',
    paymentStatus: 'PAID',
    senderAccount: 'FURP-882101',
    merchantRef: 'MTN-8821',
    payerRef: 'PAY-0091',
    recipientAccount: '0123456789',
    application: 'Mito Web'
  },
  {
    id: 't2',
    reference: 'TXN100002',
    channel: 'Mobile App',
    date: '24/10/2024',
    time: '11:15 AM',
    type: 'Debit',
    sendCurrency: 'NGN',
    amount: '150,000.00',
    rate: '1.0000',
    details: 'Debit from John Doe Logistics wallet',
    provider: 'Flutterwave',
    accBal: '₦ 840,000.00',
    createdBy: 'john@doelogistics.com',
    transactionStatus: 'Pending',
    paymentStatus: 'PENDING',
    senderAccount: 'FURP-882102',
    merchantRef: 'MTN-8822',
    payerRef: 'PAY-0092',
    recipientAccount: '0987654321',
    application: 'Mito App'
  },
  {
    id: 't3',
    reference: 'TXN100003',
    channel: 'API Integration',
    date: '23/10/2024',
    time: '09:45 PM',
    type: 'Money Transfer',
    sendCurrency: 'USD',
    amount: '1,200.00',
    rate: '1620.5000',
    details: 'Remittance payout to ShopRite Nigeria',
    provider: 'Cellulant Payout',
    accBal: '$ 45,900.00',
    createdBy: 'api-service@mito.money',
    transactionStatus: 'Successful',
    paymentStatus: 'PAID',
    senderAccount: 'FURP-882103',
    merchantRef: 'MTN-8823',
    payerRef: 'PAY-0093',
    recipientAccount: '1122334455',
    application: 'Mito API'
  },
  {
    id: 't4',
    reference: 'TXN100004',
    channel: 'Web Portal',
    date: '23/10/2024',
    time: '04:12 PM',
    type: 'Bill Payment',
    sendCurrency: 'KES',
    amount: '45,000.00',
    rate: '130.2500',
    details: 'Utility bill settlement Nairobi Water',
    provider: 'M-Pesa Kenya',
    accBal: 'KSh 320,000.00',
    createdBy: 'ops@mito.money',
    transactionStatus: 'Failed',
    paymentStatus: 'FAILED',
    senderAccount: 'FURP-882104',
    merchantRef: 'MTN-8824',
    payerRef: 'PAY-0094',
    recipientAccount: '2233445566',
    application: 'Mito Web'
  },
  {
    id: 't5',
    reference: 'TXN100005',
    channel: 'Mobile App',
    date: '22/10/2024',
    time: '01:50 PM',
    type: 'Money Transfer',
    sendCurrency: 'EUR',
    amount: '750.00',
    rate: '1.0820',
    details: 'Family support transfer to Accra Ghana',
    provider: 'MTN MoMo Ghana',
    accBal: '€ 8,230.00',
    createdBy: 'kwame@example.com',
    transactionStatus: 'In Progress',
    paymentStatus: 'PENDING',
    senderAccount: 'FURP-882105',
    merchantRef: 'MTN-8825',
    payerRef: 'PAY-0095',
    recipientAccount: '3344556677',
    application: 'Mito App'
  },
  {
    id: 't6',
    reference: 'TXN100006',
    channel: 'API Integration',
    date: '22/10/2024',
    time: '10:05 AM',
    type: 'Airtime',
    sendCurrency: 'NGN',
    amount: '10,000.00',
    rate: '1.0000',
    details: 'Airtime VTU topup MTN Nigeria',
    provider: 'OnePipe VTU',
    accBal: '₦ 2,150,000.00',
    createdBy: 'system@mito.money',
    transactionStatus: 'Successful',
    paymentStatus: 'PAID',
    senderAccount: 'FURP-882106',
    merchantRef: 'MTN-8826',
    payerRef: 'PAY-0096',
    recipientAccount: '4455667788',
    application: 'Mito API'
  }
];

const TransactionsPage = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Filter visibility toggle
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTER_VALUES);

  // Table data state
  const [transactions, setTransactions] = useState(SEED_TRANSACTIONS);
  const [selectedIds, setSelectedIds] = useState({});
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeModal, setActiveModal] = useState(null); // 'hold' | 'fail' | 'success' | 'detail'
  const [selectedTx, setSelectedTx] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [alertBanner, setAlertBanner] = useState(null);

  // Fetch live transactions from backend if available
  useEffect(() => {
    fetch('/api/transactions')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map((row) => ({
            id: String(row.id || row.ref_number),
            reference: row.ref_number || `TXN${row.id}`,
            channel: row.channel || 'Web Portal',
            date: row.debit_date ? new Date(row.debit_date).toLocaleDateString('en-GB') : '24/10/2024',
            time: row.debit_date ? new Date(row.debit_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '10:30 AM',
            type: row.type || 'Debit',
            sendCurrency: row.sendCurrency || 'NGN',
            amount: Number(row.amount_debit_ngn || row.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 }),
            rate: row.rate_applied ? Number(row.rate_applied).toFixed(4) : '1.0000',
            details: `Debit transaction from ${row.merchant_name || 'Merchant'}`,
            provider: row.merchant_name || 'Mito Pay',
            accBal: '₦ 500,000.00',
            createdBy: 'admin@mito.money',
            transactionStatus: row.status || 'Successful',
            paymentStatus: row.status === 'Successful' ? 'PAID' : 'PENDING',
            senderAccount: 'FURP-001',
            merchantRef: row.ref_number,
            payerRef: 'PAY-001',
            recipientAccount: '0123456789',
            application: 'Mito Web'
          }));
          // Merge unique rows
          const existingRefs = new Set(mapped.map((m) => m.reference));
          const complementary = SEED_TRANSACTIONS.filter((s) => !existingRefs.has(s.reference));
          setTransactions([...mapped, ...complementary]);
        }
      })
      .catch(() => {
        // Fallback to seed transactions if offline
      });
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilter = () => {
    setFilters(DEFAULT_FILTER_VALUES);
    setCurrentPage(1);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.transactionRef && !tx.reference.toLowerCase().includes(filters.transactionRef.toLowerCase())) return false;
      if (filters.senderAccount && !tx.senderAccount.toLowerCase().includes(filters.senderAccount.toLowerCase())) return false;
      if (filters.merchantRef && !tx.merchantRef.toLowerCase().includes(filters.merchantRef.toLowerCase())) return false;
      if (filters.recipientAccount && !tx.recipientAccount.toLowerCase().includes(filters.recipientAccount.toLowerCase())) return false;
      if (filters.channel && tx.channel !== filters.channel) return false;
      if (filters.type && tx.type !== filters.type) return false;
      if (filters.status && tx.transactionStatus !== filters.status) return false;
      if (filters.provider && tx.provider !== filters.provider) return false;
      if (filters.paymentStatus && tx.paymentStatus !== filters.paymentStatus) return false;
      if (filters.application && tx.application !== filters.application) return false;
      return true;
    });
  }, [transactions, filters]);

  const totalCount = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Checkbox selection
  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  const allCurrentSelected = displayedTransactions.length > 0 && displayedTransactions.every((tx) => selectedIds[tx.id]);

  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      setSelectedIds({});
    } else {
      const next = { ...selectedIds };
      displayedTransactions.forEach((tx) => {
        next[tx.id] = true;
      });
      setSelectedIds(next);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearSelection = () => {
    setSelectedIds({});
  };

  // Bulk actions
  const handleBulkAction = (actionType) => {
    if (selectedCount === 0) return;
    setActiveModal(actionType);
  };

  const executeBulkAction = () => {
    const affectedIds = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    setTransactions((prev) =>
      prev.map((t) => {
        if (!affectedIds.includes(t.id)) return t;
        if (activeModal === 'hold') return { ...t, transactionStatus: 'Under Review' };
        if (activeModal === 'fail') return { ...t, transactionStatus: 'Failed', paymentStatus: 'FAILED' };
        if (activeModal === 'success') return { ...t, transactionStatus: 'Successful', paymentStatus: 'PAID' };
        return t;
      })
    );
    setAlertBanner(`Successfully updated ${affectedIds.length} transaction(s).`);
    setTimeout(() => setAlertBanner(null), 4000);
    setActiveModal(null);
    setActionNotes('');
    clearSelection();
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Breadcrumb matching staging_chunk2089.js */}
      <div className="staging-breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span>/</span>
        <span style={{ color: '#605e5c' }}>Financials</span>
        <span>/</span>
        <span style={{ fontWeight: 600, color: '#323130' }}>Transactions</span>
      </div>

      {alertBanner && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#d1fae5', color: '#065f46', borderRadius: 8, fontWeight: 600 }}>
          {alertBanner}
        </div>
      )}

      {/* Top Panel: Financials Tabs + Title & Filter Toggle */}
      <div className="panel mb-6 mt-4" style={{ padding: '20px 24px', marginBottom: 20 }}>
        {/* 5 Financials Tabs from module 97917 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {FINANCIALS_TABS.map((tab) => {
            const isActive = currentPath === tab.href || (tab.href === '/financials/transactions' && currentPath === '/financials/debits');
            return isActive ? (
              <span
                key={tab.href}
                className="btn btn-primary btn-sm"
                style={{
                  height: 40,
                  padding: '8px 16px',
                  background: '#FB4B14',
                  color: '#ffffff',
                  fontWeight: 600,
                  borderRadius: 6,
                  cursor: 'default'
                }}
              >
                {tab.label}
              </span>
            ) : (
              <Link
                key={tab.href}
                to={tab.href}
                className="btn btn-outline-primary btn-sm"
                style={{
                  height: 40,
                  padding: '8px 16px',
                  background: '#ffffff',
                  border: '1px solid #FB4B14',
                  color: '#FB4B14',
                  fontWeight: 600,
                  borderRadius: 6,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Title & Filter Trigger */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <h5 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#323130' }}>
            Transactions
          </h5>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              background: '#FB4B14',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.875rem'
            }}
          >
            <FilterIcon />
            <span>Filter</span>
          </button>
        </div>

        {/* Collapsible Filter Section */}
        {isFilterOpen && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #edebe9' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="FURP Account No."
                  value={filters.senderAccount}
                  onChange={(e) => handleFilterChange('senderAccount', e.target.value)}
                />
              </div>
              <div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Transaction Ref"
                  value={filters.transactionRef}
                  onChange={(e) => handleFilterChange('transactionRef', e.target.value)}
                />
              </div>
              <div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Merchant Ref (MTN etc)"
                  value={filters.merchantRef}
                  onChange={(e) => handleFilterChange('merchantRef', e.target.value)}
                />
              </div>
              <div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Payer Ref"
                  value={filters.payerRef}
                  onChange={(e) => handleFilterChange('payerRef', e.target.value)}
                />
              </div>
              <div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Recipient (Mobile, Account)"
                  value={filters.recipientAccount}
                  onChange={(e) => handleFilterChange('recipientAccount', e.target.value)}
                />
              </div>
              <div>
                <select
                  className="form-select"
                  value={filters.channel}
                  onChange={(e) => handleFilterChange('channel', e.target.value)}
                >
                  <option value="">Select channel</option>
                  <option value="Web Portal">Web Portal</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="API Integration">API Integration</option>
                </select>
              </div>
              <div>
                <select
                  className="form-select"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">Select type</option>
                  <option value="Money Transfer">Money Transfer</option>
                  <option value="Debit">Debit</option>
                  <option value="Bill Payment">Bill Payment</option>
                  <option value="Airtime">Airtime</option>
                </select>
              </div>
              <div>
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Select transaction status</option>
                  <option value="Successful">Successful</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Failed">Failed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <select
                  className="form-select"
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                >
                  <option value="">Select payment status</option>
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
              <div>
                <select
                  className="form-select"
                  value={filters.provider}
                  onChange={(e) => handleFilterChange('provider', e.target.value)}
                >
                  <option value="">Select provider</option>
                  <option value="GTBank Nigeria">GTBank Nigeria</option>
                  <option value="Flutterwave">Flutterwave</option>
                  <option value="Cellulant Payout">Cellulant Payout</option>
                  <option value="M-Pesa Kenya">M-Pesa Kenya</option>
                  <option value="MTN MoMo Ghana">MTN MoMo Ghana</option>
                  <option value="OnePipe VTU">OnePipe VTU</option>
                </select>
              </div>
              <div>
                <select
                  className="form-select"
                  value={filters.application}
                  onChange={(e) => handleFilterChange('application', e.target.value)}
                >
                  <option value="">Select application</option>
                  <option value="Mito Web">Mito Web</option>
                  <option value="Mito App">Mito App</option>
                  <option value="Mito API">Mito API</option>
                </select>
              </div>
              <div>
                <select
                  className="form-select"
                  value={filters.splitFilter}
                  onChange={(e) => handleFilterChange('splitFilter', e.target.value)}
                >
                  <option value="">Filter by split</option>
                  <option value="P">Split (Parent Only)</option>
                  <option value="C">Split (Child Only)</option>
                  <option value="N">Non-Split</option>
                </select>
              </div>
            </div>

            {/* Filter Buttons */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={handleClearFilter}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #d97706',
                  color: '#d97706',
                  background: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Clear filter
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#FB4B14',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span>Show transactions</span>
                <SearchIcon />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Panel */}
      <div className="panel" style={{ padding: '20px 24px' }}>
        {/* Controls row: Bulk Actions + Rows Per Page */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          {/* Left: Bulk Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: '0.875rem', color: '#605E5C', fontWeight: 600 }}>
              {selectedCount} selected
            </span>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={selectedCount === 0}
              onClick={() => handleBulkAction('hold')}
            >
              Pause/Hold
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              disabled={selectedCount === 0}
              onClick={() => handleBulkAction('fail')}
            >
              Bulk Failed
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ background: '#FB4B14', color: '#ffffff', border: 'none' }}
              disabled={selectedCount === 0}
              onClick={() => handleBulkAction('success')}
            >
              Bulk Success
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={selectedCount === 0}
              onClick={() => handleBulkAction('query')}
            >
              Bulk Query
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={selectedCount === 0}
              onClick={() => handleBulkAction('retry')}
            >
              Retry
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              disabled={selectedCount === 0}
              onClick={() => handleBulkAction('abort')}
            >
              Abort
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={clearSelection}
                style={{ background: '#edebe9', color: '#323130', border: 'none' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Right: Count + Rows per page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '0.875rem', color: '#605E5C' }}>
              Showing {displayedTransactions.length} of {totalCount} transactions
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#605E5C' }}>
              <span>Rows</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '4px 8px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>

        {/* Data Table matching staging_chunk2089.js */}
        <div style={{ overflowX: 'auto', minHeight: 300 }}>
          <table className="table-container" style={{ width: '100%', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    onChange={toggleSelectAll}
                    style={{ accentColor: '#FB4B14', cursor: 'pointer' }}
                  />
                </th>
                <th>Ref</th>
                <th>Channel</th>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Rate</th>
                <th>Details</th>
                <th>Provider</th>
                <th>Acc Bal.</th>
                <th>CreatedBy</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '32px 16px', color: '#605E5C' }}>
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((tx) => {
                  const isChecked = !!selectedIds[tx.id];
                  const dotColor = getStatusDotColor(tx.transactionStatus);
                  return (
                    <tr key={tx.id} style={{ background: isChecked ? '#fff7ed' : '#ffffff' }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(tx.id)}
                          style={{ accentColor: '#FB4B14', cursor: 'pointer' }}
                        />
                      </td>
                      <td>
                        <Link
                          to={`/financials/transactions/${tx.id || tx.reference}`}
                          style={{
                            color: '#FB4B14',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {tx.reference}
                        </Link>
                      </td>
                      <td style={{ color: '#323130' }}>{tx.channel}</td>
                      <td>
                        <div style={{ color: '#323130', fontWeight: 500 }}>{tx.date}</div>
                        <div style={{ fontSize: '0.75rem', color: '#605E5C' }}>{tx.time}</div>
                      </td>
                      <td style={{ color: '#323130' }}>{tx.type}</td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>{tx.sendCurrency}</div>
                        <div style={{ fontWeight: 600, color: '#323130' }}>{tx.amount}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#323130' }}>{tx.rate}</td>
                      <td style={{ maxWidth: 200, whiteSpace: 'normal', color: '#323130' }}>{tx.details}</td>
                      <td>
                        <span style={{ color: '#323130', fontWeight: 500 }}>{tx.provider}</span>
                      </td>
                      <td style={{ color: '#323130', fontWeight: 500 }}>{tx.accBal}</td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: '#605E5C' }}>{tx.createdBy}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 12,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#323130'
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: dotColor,
                              display: 'inline-block'
                            }}
                          />
                          <span>{tx.transactionStatus}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls matching module 39147 in staging-admin */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #edebe9' }}>
          <div style={{ fontSize: '0.875rem', color: '#605E5C' }}>
            Page {currentPage} of {totalPages}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              style={{ padding: '6px 10px' }}
            >
              «
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '6px 12px' }}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: currentPage === pg ? 'none' : '1px solid #e2e8f0',
                  background: currentPage === pg ? '#FB4B14' : '#ffffff',
                  color: currentPage === pg ? '#ffffff' : '#323130',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                {pg}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '6px 12px' }}
            >
              ›
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{ padding: '6px 10px' }}
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {activeModal === 'detail' && selectedTx && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}
          onClick={() => setActiveModal(null)}
        >
          <div
            className="panel"
            style={{ maxWidth: 640, width: '100%', padding: '24px 28px', background: '#ffffff', borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#323130' }}>
                Transaction Details: {selectedTx.reference}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#605E5C' }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Reference</label>
                <div style={{ fontWeight: 600, color: '#FB4B14' }}>{selectedTx.reference}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Date &amp; Time</label>
                <div style={{ fontWeight: 600 }}>{selectedTx.date} {selectedTx.time}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Type</label>
                <div style={{ fontWeight: 600 }}>{selectedTx.type}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Channel</label>
                <div style={{ fontWeight: 600 }}>{selectedTx.channel}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Amount</label>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#323130' }}>
                  {selectedTx.sendCurrency} {selectedTx.amount}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Exchange Rate</label>
                <div style={{ fontWeight: 600 }}>{selectedTx.rate}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Provider / Gateway</label>
                <div style={{ fontWeight: 600 }}>{selectedTx.provider}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Account Balance</label>
                <div style={{ fontWeight: 600 }}>{selectedTx.accBal}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Sender Account</label>
                <div style={{ fontWeight: 600 }}>{selectedTx.senderAccount}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Recipient Account</label>
                <div style={{ fontWeight: 600 }}>{selectedTx.recipientAccount}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.75rem', color: '#605E5C', fontWeight: 600 }}>Summary Description</label>
                <div style={{ fontWeight: 500, color: '#323130', marginTop: 4 }}>{selectedTx.details}</div>
              </div>
            </div>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="btn btn-primary"
                style={{ background: '#FB4B14', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: 6, fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {['hold', 'fail', 'success', 'query', 'retry', 'abort'].includes(activeModal) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}
          onClick={() => setActiveModal(null)}
        >
          <div
            className="panel"
            style={{ maxWidth: 480, width: '100%', padding: '24px 28px', background: '#ffffff', borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', fontWeight: 700, color: '#323130' }}>
              {activeModal === 'hold' && 'Pause / Hold Selected'}
              {activeModal === 'fail' && 'Fail Selected Transactions'}
              {activeModal === 'success' && 'Mark Selected as Successful'}
              {activeModal === 'query' && 'Query Selected Transactions'}
              {activeModal === 'retry' && 'Retry Selected Transactions'}
              {activeModal === 'abort' && 'Abort Selected Transactions'}
            </h3>
            <p style={{ color: '#605E5C', fontSize: '0.875rem', margin: '0 0 16px 0' }}>
              Are you sure you want to perform this action on {selectedCount} selected transaction(s)?
            </p>
            {(activeModal === 'fail' || activeModal === 'success') && (
              <textarea
                className="form-input"
                rows={3}
                placeholder="Enter notes or audit reasoning..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                style={{ marginBottom: 16 }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveModal(null)}
                style={{ padding: '8px 16px', borderRadius: 6 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={activeModal === 'fail' || activeModal === 'abort' ? 'btn btn-outline-danger' : 'btn btn-primary'}
                onClick={executeBulkAction}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  fontWeight: 600,
                  background: activeModal === 'fail' || activeModal === 'abort' ? '#e11d48' : '#FB4B14',
                  color: '#ffffff',
                  border: 'none'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;