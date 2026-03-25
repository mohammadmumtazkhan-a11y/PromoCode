import React, { useState, useMemo } from 'react';
import { MOCK_CUSTOMERS, AFFILIATES, KYC_STATUS_CONFIG } from './oboMockData';

const OBOStep1Search = ({ onSelectCustomer, onRegisterNew, onCompleteKyc }) => {
  const [search, setSearch] = useState('');
  const [affiliate, setAffiliate] = useState('Rhemito');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MOCK_CUSTOMERS.filter(c => {
      const matchSearch = !q ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);
      const matchAffiliate = !affiliate || c.affiliate === affiliate;
      return matchSearch && matchAffiliate;
    });
  }, [search, affiliate]);

  const inputStyle = {
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    color: '#1f2937',
    background: '#fff',
    transition: 'border-color 0.2s',
  };

  const badgeStyle = (status) => {
    const cfg = KYC_STATUS_CONFIG[status] || KYC_STATUS_CONFIG['Not Done'];
    return {
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: '0.75rem',
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
    };
  };

  const ActionCell = ({ customer }) => {
    const { kycStatus } = customer;
    if (kycStatus === 'Passed' || kycStatus === 'Refer' || kycStatus === 'Selfie Pending') {
      return (
        <button
          onClick={() => onSelectCustomer(customer)}
          style={{
            padding: '6px 14px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Create Transaction
        </button>
      );
    }
    if (kycStatus === 'Failed') {
      return <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 500 }}>Cannot create transaction</span>;
    }
    if (kycStatus === 'Not Done') {
      return (
        <button
          onClick={() => onCompleteKyc && onCompleteKyc(customer)}
          style={{
            padding: '6px 14px',
            background: '#fff',
            color: '#ea580c',
            border: '1px solid #ea580c',
            borderRadius: 6,
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Complete KYC
        </button>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Search Existing Customer
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '6px 0 0' }}>
          Find a customer by name, email, or Customer ID to begin a transaction on their behalf.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#9ca3af' }}>🔍</span>
          <input
            style={{ ...inputStyle, paddingLeft: 38, width: '100%', boxSizing: 'border-box' }}
            placeholder="Search by name, email or Customer ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          style={{ ...inputStyle, minWidth: 160 }}
          value={affiliate}
          onChange={e => setAffiliate(e.target.value)}
        >
          <option value="">All Affiliates</option>
          {AFFILIATES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Results Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ background: '#fff7ed', borderBottom: '2px solid #ffedd5' }}>
                {['Customer ID', 'Name', 'Email', 'Active', 'Locked', 'KYC Status', 'Action'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#92400e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
                    No customers found. Try a different search or <button onClick={onRegisterNew} style={{ color: '#ea580c', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', padding: 0 }}>register a new customer</button>.
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr key={c.id} style={{
                    borderBottom: '1px solid #f9fafb',
                    background: idx % 2 === 0 ? '#fff' : '#fafafa',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    <td style={{ padding: '13px 16px', fontSize: '0.82rem', fontWeight: 600, color: '#ea580c', whiteSpace: 'nowrap' }}>{c.id}</td>
                    <td style={{ padding: '13px 16px', fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap' }}>
                      {c.firstName} {c.lastName}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: '#4b5563' }}>{c.email}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                        fontSize: '0.75rem', fontWeight: 600,
                        color: c.active ? '#16a34a' : '#6b7280',
                        background: c.active ? '#dcfce7' : '#f3f4f6',
                      }}>
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      {c.locked ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 20 }}>Locked</span>
                          <button style={{ fontSize: '0.75rem', color: '#ea580c', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>Unlock</button>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={badgeStyle(c.kycStatus)}>{c.kycStatus}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <ActionCell customer={c} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register New CTA */}
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Customer not found?</span>
        <button
          onClick={onRegisterNew}
          style={{
            padding: '8px 18px',
            background: '#fff',
            color: '#ea580c',
            border: '1px solid #ea580c',
            borderRadius: 8,
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Register New Customer
        </button>
      </div>
    </div>
  );
};

export default OBOStep1Search;
