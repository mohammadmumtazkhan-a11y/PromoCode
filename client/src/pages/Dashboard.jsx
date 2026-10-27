import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DATE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: '7_days', label: 'Past 7 days' },
  { value: '30_days', label: 'Past 30 days' },
  { value: 'custom', label: 'Custom' },
];

const CURRENCY_OPTIONS = [
  { value: 'GBP', label: 'GBP', symbol: '£', bg: '#012169', text: 'GB' },
  { value: 'EUR', label: 'EUR', symbol: '€', bg: '#003399', text: 'EU' },
  { value: 'USD', label: 'USD', symbol: '$', bg: '#3C3B6E', text: 'US' },
  { value: 'NGN', label: 'NGN', symbol: '₦', bg: '#008751', text: 'NG' },
];

const QUICK_ACTIONS = [
  { title: 'Rates', linkText: 'Check Rates Today', href: '/configuration/rate-manager', hint: 'Corridors & factors' },
  { title: 'Balances', linkText: 'Check balances', href: '/financials/payouts', hint: 'Wallets & payouts' },
  { title: 'Customisation', linkText: 'Customisation', href: '/configuration/rewards', hint: 'Branding & services' },
  { title: 'Support', linkText: 'Contact Us', href: '/support/help-tickets', hint: 'Get help' },
];

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12Z" stroke="currentColor" strokeWidth="1.5" />
    <path opacity="0.5" d="M7 4V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path opacity="0.5" d="M17 4V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path opacity="0.5" d="M2 9H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M10 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 4H20V10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 4L11 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BalanceCard = ({ title, bgColor, label, value, topLinkHref, topLinkText }) => (
  <div style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderRadius: 8,
    padding: 16,
    background: bgColor,
    boxShadow: '0px 4px 8px 0px #faf9f8'
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#605e5c' }}>{title}</div>
      {topLinkHref && topLinkText && (
        <Link
          to={topLinkHref}
          style={{ whiteSpace: 'nowrap', fontSize: '13px', color: '#fb4b14', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          {topLinkText}
        </Link>
      )}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <p style={{ margin: 0, fontSize: '10px', color: '#605e5c' }}>{label}</p>
      <div style={{ fontSize: '24px', fontWeight: 700, color: '#323130', lineHeight: 1.3 }}>{value}</div>
    </div>
  </div>
);

const statusDotColor = (status) => {
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
      return '#8F0404';
    case 'In Progress':
    case 'Under Review':
    case 'Ready To Process':
    case 'Awaiting Payment':
      return '#FED217';
    default:
      return '#9658F7';
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('GBP');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const currencyRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target)) {
        setCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const currentCurrObj = CURRENCY_OPTIONS.find((c) => c.value === selectedCurrency) || CURRENCY_OPTIONS[0];
  const sym = currentCurrObj.symbol;

  const recentTransactions = [
    { reference: 'TXN-984210', date: '27 Oct 2026, 14:22', recipientFullName: 'Tola Bello', amount: '250.00', sendCurrency: selectedCurrency, transactionStatus: 'Processed' },
    { reference: 'TXN-984209', date: '27 Oct 2026, 13:45', recipientFullName: 'Amina Yusuf', amount: '500.00', sendCurrency: selectedCurrency, transactionStatus: 'Processed' },
    { reference: 'TXN-984208', date: '27 Oct 2026, 12:10', recipientFullName: 'David Miller', amount: '180.00', sendCurrency: selectedCurrency, transactionStatus: 'Under Review' },
    { reference: 'TXN-984207', date: '27 Oct 2026, 10:15', recipientFullName: 'Sarah Jenkins', amount: '1200.00', sendCurrency: selectedCurrency, transactionStatus: 'Processed' },
    { reference: 'TXN-984206', date: '27 Oct 2026, 08:30', recipientFullName: 'Emmanuel Okafor', amount: '350.00', sendCurrency: selectedCurrency, transactionStatus: 'Processed' },
  ];

  return (
    <div style={{ paddingTop: 20 }}>
      {/* Top Filter Row: Date Pills & Currency Dropdown */}
      <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        {/* Date Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {DATE_OPTIONS.map((opt) => {
            const active = opt.value === selectedRange;
            const isCustom = opt.value === 'custom';
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedRange(opt.value)}
                style={{
                  display: 'flex',
                  minWidth: 100,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  borderRadius: 9999,
                  padding: '8px 16px',
                  fontSize: '16px',
                  background: active ? '#ffede7' : '#ffffff',
                  border: active ? '1px solid transparent' : '1px solid #e1dfdd',
                  fontWeight: active ? 700 : 400,
                  color: '#605e5c',
                  cursor: 'pointer'
                }}
              >
                {opt.label}
                {isCustom && <CalendarIcon />}
              </button>
            );
          })}
        </div>

        {/* Currency Selector Dropdown matching staging_dashboard.js */}
        <div ref={currencyRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setCurrencyDropdownOpen((o) => !o)}
            style={{
              display: 'flex',
              width: 200,
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 8,
              border: '1px solid #e1dfdd',
              background: '#ffffff',
              padding: 8,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'flex',
                height: 24,
                width: 24,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: '50%',
                background: currentCurrObj.bg,
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700
              }}>
                {currentCurrObj.text}
              </span>
              <span style={{ color: '#605e5c', fontSize: '14px' }}>{selectedCurrency}</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#605e5c" strokeWidth="1.5">
              <path d="M19 9L12 15L5 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {currencyDropdownOpen && (
            <ul style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              minWidth: 200,
              listStyle: 'none',
              padding: '4px 0',
              margin: '4px 0 0 0',
              background: '#ffffff',
              border: '1px solid #e1dfdd',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              zIndex: 40
            }}>
              {CURRENCY_OPTIONS.map((c) => (
                <li key={c.value}>
                  <span
                    onClick={() => {
                      setSelectedCurrency(c.value);
                      setCurrencyDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      width: '100%',
                      cursor: 'pointer',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      fontSize: '14px',
                      color: '#323130'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#ffede7')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{
                      display: 'flex',
                      height: 24,
                      width: 24,
                      flexShrink: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: c.bg,
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700
                    }}>
                      {c.text}
                    </span>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Balances Section */}
      <h4 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 700, color: '#323130' }}>
        Balances
      </h4>

      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Row 1 */}
        <div className="staging-balance-row">
          <BalanceCard
            title="Transactions"
            bgColor="#e0eed6"
            label="Total transaction"
            value={`${sym}48,250`}
            topLinkHref="/financials/debits"
            topLinkText="View history"
          />
          <BalanceCard
            title="Collections"
            bgColor="#fff6d1"
            label="Balances"
            value={`${sym}14,800`}
            topLinkHref="/financials/payouts"
            topLinkText="View history"
          />
          <BalanceCard
            title="Commissions"
            bgColor="#e5f1fe"
            label="Total commission earned"
            value={`${sym}2,410`}
            topLinkHref="/financials/commissions"
            topLinkText="View history"
          />
        </div>

        {/* Row 2 */}
        <div className="staging-balance-row">
          <BalanceCard
            title="Payouts"
            bgColor="#f3f2f1"
            label="Completed payouts"
            value="142"
            topLinkHref="/financials/payouts"
            topLinkText="View all"
          />
          <BalanceCard
            title="Tickets"
            bgColor="#f5ffcc"
            label="Pending tickets"
            value="15"
            topLinkHref="/support/help-tickets"
            topLinkText="View all"
          />
          <BalanceCard
            title="Users"
            bgColor="#fee2e2"
            label="Total users"
            value="84"
            topLinkHref="/merchants"
            topLinkText="View all"
          />
        </div>
      </div>

      {/* Quick actions panel matching staging_dashboard.js */}
      <div className="panel" style={{ marginBottom: 24, padding: 16 }}>
        <div style={{ marginBottom: 12, fontSize: '18px', fontWeight: 700, color: '#323130' }}>
          Quick actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {QUICK_ACTIONS.map((item) => (
            <div
              key={item.href}
              style={{
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                padding: '10px 12px'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#323130' }}>{item.title}</div>
              <div style={{ marginTop: 2, fontSize: '12px', color: 'rgba(50, 49, 48, 0.7)' }}>{item.hint}</div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 600 }}>
                <Link
                  to={item.href}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#323130', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <ExternalLinkIcon />
                  <span>{item.linkText}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions panel matching staging_dashboard.js */}
      <div className="panel">
        <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#605e5c' }}>
            Recent transactions
          </div>
          <span
            onClick={() => navigate('/financials/debits')}
            style={{ cursor: 'pointer', color: '#fb4b14', fontSize: '14px' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            View all
          </span>
        </div>

        <div style={{ minHeight: 300, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', fontSize: '13px', fontWeight: 700, color: '#605e5c', background: '#ffffff' }}>ID</th>
                <th style={{ padding: '8px', fontSize: '13px', fontWeight: 700, color: '#605e5c', background: '#ffffff' }}>DATE &amp; TIME (UTC)</th>
                <th style={{ padding: '8px', fontSize: '13px', fontWeight: 700, color: '#605e5c', background: '#ffffff' }}>NAME</th>
                <th style={{ padding: '8px', fontSize: '13px', fontWeight: 700, color: '#605e5c', background: '#ffffff' }}>AMOUNT</th>
                <th style={{ padding: '8px', fontSize: '13px', fontWeight: 700, color: '#605e5c', background: '#ffffff' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((row) => (
                <tr
                  key={row.reference}
                  style={{
                    background: '#ffffff',
                    borderRadius: 4,
                    boxShadow: '0 0 1px 0 rgba(0,0,0,0.25)'
                  }}
                >
                  <td style={{ padding: '10px 8px', fontSize: '14px', color: '#323130' }}>{row.reference}</td>
                  <td style={{ padding: '10px 8px', fontSize: '14px', color: '#323130' }}>{row.date}</td>
                  <td style={{ padding: '10px 8px', fontSize: '14px', color: '#323130' }}>{row.recipientFullName}</td>
                  <td style={{ padding: '10px 8px', fontSize: '14px', color: '#323130' }}>{sym}{row.amount}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ height: 10, width: 10, borderRadius: '50%', background: statusDotColor(row.transactionStatus) }} />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#323130' }}>{row.transactionStatus}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
