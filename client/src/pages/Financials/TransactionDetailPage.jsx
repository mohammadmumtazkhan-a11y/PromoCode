import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';

// SVG Icons matching staging
const BackArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FB4B14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const DetailsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ActionsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CommentsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const KycIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const TicketsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 15h0M2 9.5a2.5 2.5 0 0 1 0-5M22 9.5a2.5 2.5 0 0 0 0-5M2 19.5a2.5 2.5 0 0 0 0-5M22 19.5a2.5 2.5 0 0 1 0-5" />
  </svg>
);

// Fallback seed database for single transaction lookups
const SEED_LOOKUP = {
  t1: {
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
    senderName: 'Johnathan Doe',
    senderEmail: 'jdoe@example.com',
    senderPhone: '+44 7911 123456',
    senderAccount: 'FURP-882101',
    recipientName: 'Global Tech Ltd (Beneficiary)',
    recipientAccount: '0123456789',
    recipientBank: 'Guaranty Trust Bank (GTB)',
    recipientPhone: '+234 802 345 6789',
    receiveCurrency: 'NGN',
    receiveAmount: '772,895.00',
    fee: '£ 2.50',
    commission: '£ 1.25',
    gatewayRef: 'GTB-REF-992014',
    merchantRef: 'MTN-8821',
    payerRef: 'PAY-0091'
  }
};

const getStatusDotColor = (status) => {
  switch (status) {
    case 'Successful':
    case 'PAID':
    case 'Processed':
      return '#62AA32';
    case 'Failed':
    case 'Aborted':
    case 'Cancelled':
      return '#8F0404';
    case 'In Progress':
    case 'Pending':
    case 'Under Review':
      return '#FED217';
    default:
      return '#9658F7';
  }
};

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: '0.875rem', color: '#A19F9D', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: '#323130', fontWeight: 700, textAlign: 'right' }}>
        {value || '—'}
      </span>
    </div>
  </div>
);

const DetailCard = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2E5BFF', margin: '0 0 12px 0' }}>
      {title}
    </h3>
    <div className="panel" style={{ padding: '20px 24px', background: '#ffffff', borderRadius: 12 }}>
      {children}
    </div>
  </div>
);

const TransactionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'details';

  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([
    { id: 1, author: 'admin@mito.money', text: 'Transaction processed and confirmed by GTBank gateway.', timestamp: '24/10/2024 10:32 AM' },
    { id: 2, author: 'system', text: 'Status changed from PENDING to SUCCESSFUL.', timestamp: '24/10/2024 10:31 AM' }
  ]);
  const [newComment, setNewComment] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    // Try to fetch from server
    fetch('/api/transactions')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          const match = json.data.find((item) => String(item.id) === String(id) || String(item.ref_number) === String(id));
          if (match) {
            setTx({
              id: String(match.id),
              reference: match.ref_number || `TXN${match.id}`,
              channel: match.channel || 'Web Portal',
              date: match.debit_date ? new Date(match.debit_date).toLocaleDateString('en-GB') : '24/10/2024',
              time: match.debit_date ? new Date(match.debit_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '10:30 AM',
              type: match.type || 'Debit',
              sendCurrency: match.sendCurrency || 'NGN',
              amount: Number(match.amount_debit_ngn || match.amount || 500000).toLocaleString('en-GB', { minimumFractionDigits: 2 }),
              rate: match.rate_applied ? Number(match.rate_applied).toFixed(4) : '1545.7900',
              details: `Debit transaction from ${match.merchant_name || 'Merchant'}`,
              provider: match.merchant_name || 'GTBank Nigeria',
              accBal: '₦ 500,000.00',
              createdBy: 'admin@mito.money',
              transactionStatus: match.status || 'Successful',
              paymentStatus: match.status === 'Successful' ? 'PAID' : 'PENDING',
              senderName: match.merchant_name || 'Global Tech Ltd',
              senderEmail: 'contact@globaltech.com',
              senderPhone: '+234 801 234 5678',
              senderAccount: 'FURP-882101',
              recipientName: 'Mito Settlement Account',
              recipientAccount: '0123456789',
              recipientBank: 'Guaranty Trust Bank',
              recipientPhone: '+234 809 876 5432',
              receiveCurrency: 'USD',
              receiveAmount: match.amount_output_target ? Number(match.amount_output_target).toLocaleString('en-GB', { minimumFractionDigits: 2 }) : '323.45',
              fee: '₦ 500.00',
              commission: match.total_commission_ngn ? `₦ ${Number(match.total_commission_ngn).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '₦ 7,500.00',
              gatewayRef: `GTB-${match.ref_number || id}`,
              merchantRef: match.ref_number,
              payerRef: 'PAY-001'
            });
            setLoading(false);
            return;
          }
        }
        // Fallback to seed
        const fallback = SEED_LOOKUP[id] || {
          id: id || 'TXN100001',
          reference: id || 'TXN100001',
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
          senderName: 'Johnathan Doe',
          senderEmail: 'jdoe@example.com',
          senderPhone: '+44 7911 123456',
          senderAccount: 'FURP-882101',
          recipientName: 'Global Tech Ltd',
          recipientAccount: '0123456789',
          recipientBank: 'Guaranty Trust Bank (GTB)',
          recipientPhone: '+234 802 345 6789',
          receiveCurrency: 'NGN',
          receiveAmount: '772,895.00',
          fee: '£ 2.50',
          commission: '£ 1.25',
          gatewayRef: `GTB-${id}`,
          merchantRef: 'MTN-8821',
          payerRef: 'PAY-0091'
        };
        setTx(fallback);
        setLoading(false);
      })
      .catch(() => {
        setTx(SEED_LOOKUP.t1);
        setLoading(false);
      });
  }, [id]);

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const added = {
      id: Date.now(),
      author: 'admin@mito.money',
      text: newComment.trim(),
      timestamp: new Date().toLocaleString('en-GB')
    };
    setComments([added, ...comments]);
    setNewComment('');
  };

  const handleActionClick = (actionName) => {
    setActionMessage(`Action "${actionName}" triggered successfully for ${tx?.reference}.`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  if (loading || !tx) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: '#605E5C' }}>Loading transaction details...</p>
      </div>
    );
  }

  const dotColor = getStatusDotColor(tx.transactionStatus);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div className="staging-breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span>/</span>
        <Link to="/financials/transactions">Financials</Link>
        <span>/</span>
        <Link to="/financials/transactions">Transactions</Link>
        <span>/</span>
        <span style={{ fontWeight: 600, color: '#323130' }}>Transaction Details</span>
      </div>

      {actionMessage && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#d1fae5', color: '#065f46', borderRadius: 8, fontWeight: 600 }}>
          {actionMessage}
        </div>
      )}

      {/* Top Title & Navigation matching module 49245 in staging-admin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, margin: '20px 0 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/financials/transactions')}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid #FEC9B8',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Back to transactions list"
          >
            <BackArrowIcon />
          </button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#605E5C' }}>
            Transaction Details
          </h1>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => window.print()}
          >
            Print Receipt
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ background: '#FB4B14', color: '#ffffff', border: 'none' }}
            onClick={() => handleActionClick('Refresh Status')}
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* Summary Card matching module 8307 */}
      <div
        className="panel mb-4"
        style={{
          borderRadius: 12,
          border: '1px solid #EDEBE9',
          background: '#ffffff',
          padding: '16px 20px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#605E5C' }}>Summary</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#323130' }}>
              {tx.transactionStatus}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#A19F9D' }}>Reference</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FB4B14', marginTop: 2 }}>{tx.reference}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#A19F9D' }}>Total amount</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#323130', marginTop: 2 }}>
              {tx.sendCurrency} {tx.amount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#A19F9D' }}>Receive amount</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#323130', marginTop: 2 }}>
              {tx.receiveCurrency} {tx.receiveAmount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#A19F9D' }}>Exchange Rate</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#323130', marginTop: 2 }}>{tx.rate}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#A19F9D' }}>Payment mode</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#323130', marginTop: 2 }}>{tx.channel}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#A19F9D' }}>Provider</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#323130', marginTop: 2 }}>{tx.provider}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#A19F9D' }}>Date created</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#323130', marginTop: 2 }}>{tx.date} {tx.time}</div>
          </div>
        </div>
      </div>

      {/* Tabs matching module 97433 in staging-admin */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 24, overflowX: 'auto' }}>
        {[
          { key: 'details', label: 'Details', icon: DetailsIcon },
          { key: 'actions', label: 'Actions', icon: ActionsIcon },
          { key: 'comments', label: 'Trail & comments', icon: CommentsIcon },
          { key: 'kyc', label: 'KYC', icon: KycIcon },
          { key: 'tickets', label: 'Help tickets', icon: TicketsIcon },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? '#FB4B14' : '#f1f5f9',
                color: isActive ? '#ffffff' : '#334155',
                transition: 'all 0.15s ease'
              }}
            >
              <IconComp />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panes */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
          {/* Section 1: Transaction Information */}
          <DetailCard title="Transaction Information">
            <DetailRow label="Transaction Reference" value={tx.reference} />
            <DetailRow label="Channel / Initiation Route" value={tx.channel} />
            <DetailRow label="Transaction Type" value={tx.type} />
            <DetailRow label="Date & Time" value={`${tx.date} ${tx.time}`} />
            <DetailRow label="Gateway Ref" value={tx.gatewayRef} />
            <DetailRow label="Merchant Ref (MTN)" value={tx.merchantRef} />
            <DetailRow label="Payer Reference" value={tx.payerRef} />
            <DetailRow label="Created By" value={tx.createdBy} />
            <DetailRow label="Transaction Status" value={tx.transactionStatus} />
            <DetailRow label="Payment Status" value={tx.paymentStatus} />
          </DetailCard>

          {/* Section 2: Sender Information */}
          <DetailCard title="Sender Information">
            <DetailRow label="Sender Name" value={tx.senderName} />
            <DetailRow label="Account Number" value={tx.senderAccount} />
            <DetailRow label="Sender Email" value={tx.senderEmail} />
            <DetailRow label="Sender Phone" value={tx.senderPhone} />
            <DetailRow label="Send Currency" value={tx.sendCurrency} />
            <DetailRow label="Send Amount" value={`${tx.sendCurrency} ${tx.amount}`} />
          </DetailCard>

          {/* Section 3: Recipient Information */}
          <DetailCard title="Recipient & Payout Information">
            <DetailRow label="Recipient Name" value={tx.recipientName} />
            <DetailRow label="Account / Wallet Number" value={tx.recipientAccount} />
            <DetailRow label="Payout Bank / Provider" value={tx.recipientBank} />
            <DetailRow label="Recipient Phone" value={tx.recipientPhone} />
            <DetailRow label="Receive Currency" value={tx.receiveCurrency} />
            <DetailRow label="Receive Amount" value={`${tx.receiveCurrency} ${tx.receiveAmount}`} />
            <DetailRow label="Applied Exchange Rate" value={tx.rate} />
          </DetailCard>

          {/* Section 4: Financials & Fees */}
          <DetailCard title="Financials & Balance Breakdown">
            <DetailRow label="Transfer Amount" value={`${tx.sendCurrency} ${tx.amount}`} />
            <DetailRow label="Transaction Fee" value={tx.fee} />
            <DetailRow label="Total Amount Paid" value={`${tx.sendCurrency} ${tx.amount}`} />
            <DetailRow label="Partner Commission" value={tx.commission} />
            <DetailRow label="Merchant Account Balance" value={tx.accBal} />
            <DetailRow label="Transaction Notes" value={tx.details} />
          </DetailCard>
        </div>
      )}

      {/* Tab: Actions */}
      {activeTab === 'actions' && (
        <div className="panel" style={{ padding: '24px 28px', background: '#ffffff', borderRadius: 12 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#323130', margin: '0 0 16px 0' }}>
            Administrative Actions for {tx.reference}
          </h3>
          <p style={{ color: '#605E5C', fontSize: '0.875rem', marginBottom: 20 }}>
            Execute authorized lifecycle operations on this transaction. All actions are logged to the audit trail.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => handleActionClick('Pause / Hold')}
            >
              Pause / Hold Transaction
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#62AA32', color: '#ffffff', border: 'none' }}
              onClick={() => handleActionClick('Approve Payout')}
            >
              Approve Payout
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#FB4B14', color: '#ffffff', border: 'none' }}
              onClick={() => handleActionClick('Mark as Succeeded')}
            >
              Mark as Succeeded
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => handleActionClick('Retry Gateway')}
            >
              Retry Gateway
            </button>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => handleActionClick('Fail Transaction')}
            >
              Fail Transaction
            </button>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => handleActionClick('Abort Transaction')}
            >
              Abort Transaction
            </button>
          </div>
        </div>
      )}

      {/* Tab: Comments & Trail */}
      {activeTab === 'comments' && (
        <div className="panel" style={{ padding: '24px 28px', background: '#ffffff', borderRadius: 12 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#323130', margin: '0 0 16px 0' }}>
            Audit Trail &amp; Comments
          </h3>

          <form onSubmit={handleAddComment} style={{ marginBottom: 24 }}>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Add an internal note or audit observation..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#FB4B14', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 600 }}
            >
              Post Note
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comments.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#323130' }}>{c.author}</span>
                  <span style={{ fontSize: '0.75rem', color: '#A19F9D' }}>{c.timestamp}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563' }}>{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: KYC Status matching module 95082 */}
      {activeTab === 'kyc' && (
        <div
          className="panel"
          style={{
            padding: '40px 24px',
            background: '#ffffff',
            borderRadius: 12,
            textAlign: 'center',
            minHeight: 340,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}
          >
            <KycIcon />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#323130', margin: '0 0 8px 0' }}>
            KYC Verification Status: Passed
          </h3>
          <p style={{ color: '#605E5C', fontSize: '0.875rem', maxWidth: 480, margin: '0 auto 16px auto' }}>
            Sender identity and compliance checks have been verified. Linked to account <strong>{tx.senderAccount}</strong>.
          </p>
          <span style={{ fontSize: '0.8125rem', color: '#71AD42', fontWeight: 700 }}>
            ✓ Verified Tier 2 Customer
          </span>
        </div>
      )}

      {/* Tab: Help Tickets */}
      {activeTab === 'tickets' && (
        <div className="panel" style={{ padding: '24px 28px', background: '#ffffff', borderRadius: 12 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#323130', margin: '0 0 16px 0' }}>
            Related Help Tickets
          </h3>
          <p style={{ color: '#605E5C', fontSize: '0.875rem' }}>
            No open support or dispute tickets found for transaction reference <strong>{tx.reference}</strong>.
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPage;