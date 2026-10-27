import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const DATE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: '7_days', label: 'Past 7 days' },
  { value: '30_days', label: 'Past 30 days' },
  { value: 'custom', label: 'Custom' },
];

const CURRENCY_OPTIONS = ['GBP', 'EUR', 'USD', 'NGN'];

const CURRENCY_SYMBOLS = {
  GBP: '£',
  EUR: '€',
  USD: '$',
  NGN: '₦'
};

const Dashboard = () => {
  const [dateFilter, setDateFilter] = useState('30_days');
  const [currency, setCurrency] = useState('GBP');

  const symbol = CURRENCY_SYMBOLS[currency] || '£';

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Banner Notice */}
      <div style={{
        background: '#dcfce7',
        color: '#166534',
        padding: '10px 20px',
        fontSize: '0.85rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        borderRadius: 6,
        border: '1px solid #bbf7d0'
      }}>
        <span>Mito.Money staging environment active. Connected to real working prototype APIs.</span>
        <span style={{ fontWeight: 600 }}>v2.4 Live</span>
      </div>

      {/* Date & Currency Filters matching staging-admin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        {/* Date Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {DATE_FILTERS.map(f => {
            const isSelected = dateFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setDateFilter(f.value)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  border: isSelected ? 'none' : '1px solid #edebe9',
                  background: isSelected ? '#ffede7' : '#ffffff',
                  color: isSelected ? '#323130' : '#605e5c',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Currency Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', color: '#605e5c', fontWeight: 600 }}>Currency:</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid #edebe9',
              background: '#ffffff',
              fontWeight: 700,
              color: '#323130',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {CURRENCY_OPTIONS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#323130', margin: '0 0 16px 0' }}>
        Balances
      </h3>

      {/* 6 Pastel Stat Cards matching staging-admin.mito.money */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        {/* Transactions Card */}
        <div style={{
          background: '#e0eed6',
          borderRadius: 8,
          padding: '18px 20px',
          boxShadow: '0px 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#605e5c' }}>Transactions</span>
            <Link to="/financials/debits" style={{ fontSize: '0.85rem', color: '#FB4B14', textDecoration: 'none', fontWeight: 600 }}>
              View history
            </Link>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: 2 }}>Total transaction</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#323130' }}>
              {symbol}48,250.00
            </div>
          </div>
        </div>

        {/* Collections Card */}
        <div style={{
          background: '#fff6d1',
          borderRadius: 8,
          padding: '18px 20px',
          boxShadow: '0px 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#605e5c' }}>Collections</span>
            <Link to="/financials/payouts" style={{ fontSize: '0.85rem', color: '#FB4B14', textDecoration: 'none', fontWeight: 600 }}>
              View history
            </Link>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: 2 }}>Balances</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#323130' }}>
              {symbol}14,800.00
            </div>
          </div>
        </div>

        {/* Commissions Card */}
        <div style={{
          background: '#e5f1fe',
          borderRadius: 8,
          padding: '18px 20px',
          boxShadow: '0px 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#605e5c' }}>Commissions</span>
            <Link to="/financials/commissions" style={{ fontSize: '0.85rem', color: '#FB4B14', textDecoration: 'none', fontWeight: 600 }}>
              View history
            </Link>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: 2 }}>Total commission earned</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#323130' }}>
              {symbol}2,410.50
            </div>
          </div>
        </div>

        {/* Payouts Card */}
        <div style={{
          background: '#f3f2f1',
          borderRadius: 8,
          padding: '18px 20px',
          boxShadow: '0px 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#605e5c' }}>Payouts</span>
            <Link to="/financials/payouts" style={{ fontSize: '0.85rem', color: '#FB4B14', textDecoration: 'none', fontWeight: 600 }}>
              View all
            </Link>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: 2 }}>Completed payouts</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#323130' }}>
              142
            </div>
          </div>
        </div>

        {/* Tickets Card */}
        <div style={{
          background: '#f5ffcc',
          borderRadius: 8,
          padding: '18px 20px',
          boxShadow: '0px 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#605e5c' }}>Tickets</span>
            <Link to="/support/help-tickets" style={{ fontSize: '0.85rem', color: '#FB4B14', textDecoration: 'none', fontWeight: 600 }}>
              View all
            </Link>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: 2 }}>Pending tickets</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#323130' }}>
              15
            </div>
          </div>
        </div>

        {/* Customers / Users Card */}
        <div style={{
          background: '#fee2e2',
          borderRadius: 8,
          padding: '18px 20px',
          boxShadow: '0px 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#605e5c' }}>Users / Customers</span>
            <Link to="/merchants" style={{ fontSize: '0.85rem', color: '#FB4B14', textDecoration: 'none', fontWeight: 600 }}>
              View all
            </Link>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#605e5c', marginBottom: 2 }}>Total active customers</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#323130' }}>
              84
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel matching staging-admin */}
      <div className="panel" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#323130' }}>
          Quick actions
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ border: '1px solid #edebe9', borderRadius: 8, padding: '14px 16px', background: '#ffffff' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#323130' }}>Rates</div>
            <div style={{ fontSize: '0.78rem', color: '#605e5c', margin: '4px 0 10px 0' }}>Corridors &amp; FX factors</div>
            <Link to="/configuration/rate-manager" style={{ color: '#FB4B14', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>
              Check Rates Today &rarr;
            </Link>
          </div>

          <div style={{ border: '1px solid #edebe9', borderRadius: 8, padding: '14px 16px', background: '#ffffff' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#323130' }}>Balances</div>
            <div style={{ fontSize: '0.78rem', color: '#605e5c', margin: '4px 0 10px 0' }}>Wallets &amp; settlements</div>
            <Link to="/financials/payouts" style={{ color: '#FB4B14', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>
              Check balances &rarr;
            </Link>
          </div>

          <div style={{ border: '1px solid #edebe9', borderRadius: 8, padding: '14px 16px', background: '#ffffff' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#323130' }}>Reward$ Engine</div>
            <div style={{ fontSize: '0.78rem', color: '#605e5c', margin: '4px 0 10px 0' }}>Promos, schemes &amp; referrals</div>
            <Link to="/configuration/rewards" style={{ color: '#FB4B14', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>
              Open Reward$ Hub &rarr;
            </Link>
          </div>

          <div style={{ border: '1px solid #edebe9', borderRadius: 8, padding: '14px 16px', background: '#ffffff' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#323130' }}>Support</div>
            <div style={{ fontSize: '0.78rem', color: '#605e5c', margin: '4px 0 10px 0' }}>Tickets &amp; customer care</div>
            <Link to="/support/dashboard" style={{ color: '#FB4B14', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>
              Support overview &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table Panel */}
      <div className="panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#323130' }}>
            Recent transactions
          </h4>
          <Link to="/financials/debits" style={{ color: '#FB4B14', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
            View all
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table-container">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date (UTC)</th>
                <th>Sender / Recipient</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, color: '#323130' }}>TXN-984210</td>
                <td style={{ fontSize: '0.8rem', color: '#605e5c' }}>27 Oct 2026, 14:22</td>
                <td>Tola Bello &rarr; Chidi Eze</td>
                <td style={{ fontWeight: 700, color: '#323130' }}>GBP 250.00</td>
                <td>
                  <span className="badge badge-active">Processed</span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: '#323130' }}>TXN-984209</td>
                <td style={{ fontSize: '0.8rem', color: '#605e5c' }}>27 Oct 2026, 13:45</td>
                <td>Amina Yusuf &rarr; Kwesi Appiah</td>
                <td style={{ fontWeight: 700, color: '#323130' }}>GBP 500.00</td>
                <td>
                  <span className="badge badge-active">Processed</span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: '#323130' }}>TXN-984208</td>
                <td style={{ fontSize: '0.8rem', color: '#605e5c' }}>27 Oct 2026, 12:10</td>
                <td>David Miller &rarr; Samuel Mensah</td>
                <td style={{ fontWeight: 700, color: '#323130' }}>EUR 180.00</td>
                <td>
                  <span className="badge badge-pending">Under Review</span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: '#323130' }}>TXN-984207</td>
                <td style={{ fontSize: '0.8rem', color: '#605e5c' }}>27 Oct 2026, 10:15</td>
                <td>Sarah Jenkins &rarr; Kofi Boateng</td>
                <td style={{ fontWeight: 700, color: '#323130' }}>GBP 1,200.00</td>
                <td>
                  <span className="badge badge-active">Processed</span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: '#323130' }}>TXN-984206</td>
                <td style={{ fontSize: '0.8rem', color: '#605e5c' }}>27 Oct 2026, 08:30</td>
                <td>Emmanuel Okafor &rarr; Ngozi Okafor</td>
                <td style={{ fontWeight: 700, color: '#323130' }}>GBP 350.00</td>
                <td>
                  <span className="badge badge-active">Processed</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
