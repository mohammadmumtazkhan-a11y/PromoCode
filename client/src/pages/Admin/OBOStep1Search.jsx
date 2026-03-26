import React, { useState, useMemo, useCallback, useRef } from 'react';
import { MOCK_CUSTOMERS, AFFILIATES, KYC_STATUS_CONFIG } from './oboMockData';

const KYC_LINK_LABELS = {
  miniKyc: 'Mini KYC',
  fullKyc: 'Full KYC',
  selfieVerification: 'Selfie Verification',
};

const KYC_LINK_ICONS = {
  miniKyc: '👤',
  fullKyc: '🆔',
  selfieVerification: '🤳',
};

const KYC_LINK_URLS = {
  miniKyc: 'https://app.mito.com/kyc/mini?token=',
  fullKyc: 'https://app.mito.com/kyc/full?token=',
  selfieVerification: 'https://app.mito.com/kyc/selfie?token=',
};

function buildMockLink(field, customerId) {
  return `${KYC_LINK_URLS[field]}${customerId}-${Math.random().toString(36).slice(2, 10)}`;
}

const OBOStep1Search = ({ onSelectCustomer, onRegisterNew, onCompleteKyc }) => {
  const [search, setSearch] = useState('');
  const [affiliate, setAffiliate] = useState('Rhemito');
  const [kycPopup, setKycPopup] = useState(null); // { customer, field } or null
  const [kycPopupState, setKycPopupState] = useState('options'); // 'options' | 'sent' | 'copied'
  const mockLinkRef = useRef('');
  const [verifiedEmails, setVerifiedEmails] = useState(new Set());

  // Email Verification Popup
  const [emailVerifyPopup, setEmailVerifyPopup] = useState(null); // { customer } or null
  const [emailVerifyState, setEmailVerifyState] = useState('ask'); // 'ask' | 'sent'
  const [emailVerifyLink, setEmailVerifyLink] = useState('');

  // Invite a Customer
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ firstName: '', lastName: '', email: '' });
  const [inviteErrors, setInviteErrors] = useState({});
  const [inviteState, setInviteState] = useState('form'); // 'form' | 'sent'
  const [inviteLink, setInviteLink] = useState('');

  const openKycPopup = useCallback((customer, field) => {
    mockLinkRef.current = buildMockLink(field, customer.id);
    setKycPopup({ customer, field });
    setKycPopupState('options');
  }, []);

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
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(234,88,12,0.25)',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          Create Transaction
        </button>
      );
    }
    if (kycStatus === 'Failed') {
      return <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600, background: '#fef2f2', padding: '6px 12px', borderRadius: 8 }}>Restricted</span>;
    }
    if (kycStatus === 'Not Done') {
      return (
        <button
          onClick={() => onCompleteKyc && onCompleteKyc(customer)}
          style={{
            padding: '8px 16px',
            background: '#fff',
            color: '#ea580c',
            border: '1px solid #ea580c',
            borderRadius: 8,
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
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
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>
            Search Existing Customer
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '6px 0 0', fontWeight: 500 }}>
            Find a customer by name, email, or Customer ID to begin a transaction on their behalf.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => { setInviteLink(`https://app.mito.money/kyc/invite?token=${Math.random().toString(36).slice(2, 10)}`); setShowInvite(true); setInviteState('form'); setInviteForm({ firstName: '', lastName: '', email: '' }); setInviteErrors({}); }}
            style={{
              padding: '10px 20px',
              background: '#fff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#d1d5db'; }}
          >
            <span style={{ fontSize: '0.95rem' }}>✉</span> Invite a Customer
          </button>
          <button
            onClick={onRegisterNew}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s ease',
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(234,88,12,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(234,88,12,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(0) scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(-1px) scale(1)'}
          >
            <span style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1 }}>+</span> Register New Customer
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', color: '#9ca3af' }}>🔍</span>
          <input
            style={{ 
              padding: '12px 16px 12px 42px', width: '100%', boxSizing: 'border-box',
              border: '1px solid #d1d5db', borderRadius: 10, fontSize: '0.95rem',
              outline: 'none', fontFamily: "'Inter', sans-serif", color: '#1f2937', fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)', transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
            placeholder="Search by name, email or Customer ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ position: 'relative', minWidth: 200 }}>
          <select
            style={{ 
              padding: '12px 36px 12px 16px', width: '100%', boxSizing: 'border-box',
              border: '1px solid #d1d5db', borderRadius: 10, fontSize: '0.95rem',
              outline: 'none', fontFamily: "'Inter', sans-serif", color: '#374151', fontWeight: 600,
              backgroundColor: '#f9fafb', cursor: 'pointer', appearance: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            value={affiliate}
            onChange={e => setAffiliate(e.target.value)}
          >
            <option value="">All Affiliates</option>
            {AFFILIATES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af', fontSize: '0.8rem' }}>▼</span>
        </div>
      </div>

      {/* Results Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Customer ID', 'Name', 'Email', 'Status', 'Risk Profile', 'Mini-KYC', 'Full-KYC', 'Selfie', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '14px 12px',
                    textAlign: h === '' ? 'right' : ['Mini-KYC', 'Full-KYC', 'Selfie'].includes(h) ? 'center' : 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6b7280',
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
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: '#6b7280', fontSize: '0.95rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
                    No customers found. Try a different search or <br/><button onClick={onRegisterNew} style={{ color: '#ea580c', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', padding: '8px 0', marginTop: 4 }}>register a new customer</button>.
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr key={c.id} style={{
                    borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid #f3f4f6',
                    background: '#fff',
                    transition: 'background 0.2s ease',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap' }}>
                      <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 6, color: '#4b5563', fontFamily: 'monospace', letterSpacing: '0.02em', border: '1px solid #e5e7eb' }}>{c.id}</span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.9rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                      {c.firstName} {c.lastName}
                    </td>
                    <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{c.email}</div>
                      {(() => {
                        const isVerified = c.emailVerified || verifiedEmails.has(c.id);
                        return (
                          <span
                            onClick={!isVerified ? (e) => {
                              e.stopPropagation();
                              setEmailVerifyLink(`https://app.mito.money/verify-email?token=${c.id}-${Math.random().toString(36).slice(2, 10)}`);
                              setEmailVerifyPopup({ customer: c });
                              setEmailVerifyState('ask');
                            } : undefined}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              marginTop: 4, padding: '2px 8px', borderRadius: 12,
                              fontSize: '0.68rem', fontWeight: 600,
                              color: isVerified ? '#15803d' : '#b45309',
                              background: isVerified ? '#dcfce7' : '#fef3c7',
                              border: `1px solid ${isVerified ? '#bbf7d0' : '#fde68a'}`,
                              cursor: !isVerified ? 'pointer' : 'default',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={!isVerified ? (e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; } : undefined}
                            onMouseLeave={!isVerified ? (e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; } : undefined}
                          >
                            {isVerified ? '✓ Verified' : '✗ Not Verified'}
                          </span>
                        );
                      })()}
                    </td>
                    
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20,
                        fontSize: '0.75rem', fontWeight: 700,
                        color: c.active ? '#065f46' : '#6b7280',
                        background: c.active ? '#d1fae5' : '#f3f4f6',
                        border: `1px solid ${c.active ? '#a7f3d0' : '#e5e7eb'}`
                      }}>
                        {c.active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />}
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    
                    <td style={{ padding: '16px 20px' }}>
                      {c.locked ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: 20 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>Locked</span>
                          <span style={{ width: 1, height: 12, background: '#fca5a5' }} />
                          <button style={{ fontSize: '0.75rem', color: '#ea580c', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>Unlock</button>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>None</span>
                      )}
                    </td>
                    
                    {['miniKyc', 'fullKyc', 'selfieVerification'].map(field => {
                      const status = c[field] || 'Not Done';
                      const isClickable = status === 'Not Done' || status === 'Failed';
                      return (
                        <td key={field} style={{ padding: '16px 12px', textAlign: 'center' }}>
                          <span
                            onClick={isClickable ? (e) => { e.stopPropagation(); openKycPopup(c, field); } : undefined}
                            style={{
                              ...badgeStyle(status),
                              border: '1px solid rgba(0,0,0,0.05)',
                              cursor: isClickable ? 'pointer' : 'default',
                              transition: 'all 0.2s',
                              ...(isClickable ? { textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' } : {}),
                            }}
                            onMouseEnter={isClickable ? (e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; } : undefined}
                            onMouseLeave={isClickable ? (e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; } : undefined}
                          >
                            {status}
                          </span>
                        </td>
                      );
                    })}
                    
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <ActionCell customer={c} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite a Customer Popup */}
      {showInvite && (() => {
        const inputStyle = (hasErr) => ({
          width: '100%', padding: '12px 14px',
          border: `1px solid ${hasErr ? '#dc2626' : '#d1d5db'}`,
          borderRadius: 10, fontSize: '0.9rem', outline: 'none',
          fontFamily: "'Inter', sans-serif", fontWeight: 500, color: '#111827',
          background: '#fff', boxSizing: 'border-box',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        });
        const errText = { fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: 4 };
        const mockInviteLink = inviteLink;

        const handleInviteSend = () => {
          const e = {};
          if (!inviteForm.firstName.trim()) e.firstName = 'Required';
          if (!inviteForm.lastName.trim()) e.lastName = 'Required';
          if (!inviteForm.email.trim()) e.email = 'Required';
          else if (!/\S+@\S+\.\S+/.test(inviteForm.email)) e.email = 'Invalid email';
          if (Object.keys(e).length) { setInviteErrors(e); return; }
          setInviteErrors({});
          setInviteState('sent');
        };

        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: 20,
          }}>
            <div style={{
              background: '#fff', borderRadius: 20, padding: '28px 28px 24px',
              width: 460, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
              fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
              position: 'relative',
            }}>
              {/* Close Button */}
              <button
                onClick={() => setShowInvite(false)}
                style={{
                  position: 'sticky', top: 0, float: 'right',
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#f3f4f6', border: 'none', color: '#6b7280',
                  fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', zIndex: 1, marginTop: -4, marginRight: -4,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#1f2937'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
              >
                ×
              </button>

              {inviteState === 'form' ? (
                <>
                  {/* Header */}
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px',
                      background: '#fff7ed', border: '2px solid #ffedd5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                    }}>
                      ✉️
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
                      Invite a Customer
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                      Send an invitation email with a KYC registration link.
                    </p>
                  </div>

                  {/* Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 5 }}>First Name *</label>
                        <input
                          style={inputStyle(inviteErrors.firstName)}
                          value={inviteForm.firstName}
                          placeholder="First name"
                          onChange={e => setInviteForm(f => ({ ...f, firstName: e.target.value }))}
                          onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.1)'; }}
                          onBlur={e => { e.target.style.borderColor = inviteErrors.firstName ? '#dc2626' : '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                        />
                        {inviteErrors.firstName && <div style={errText}>{inviteErrors.firstName}</div>}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 5 }}>Last Name *</label>
                        <input
                          style={inputStyle(inviteErrors.lastName)}
                          value={inviteForm.lastName}
                          placeholder="Last name"
                          onChange={e => setInviteForm(f => ({ ...f, lastName: e.target.value }))}
                          onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.1)'; }}
                          onBlur={e => { e.target.style.borderColor = inviteErrors.lastName ? '#dc2626' : '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                        />
                        {inviteErrors.lastName && <div style={errText}>{inviteErrors.lastName}</div>}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 5 }}>Email Address *</label>
                      <input
                        type="email"
                        style={inputStyle(inviteErrors.email)}
                        value={inviteForm.email}
                        placeholder="customer@example.com"
                        onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                        onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = inviteErrors.email ? '#dc2626' : '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                      />
                      {inviteErrors.email && <div style={errText}>{inviteErrors.email}</div>}
                    </div>
                  </div>

                  {/* What happens info */}
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                    padding: '10px 14px', marginBottom: 20,
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: 6 }}>What happens next?</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        'Customer receives the invitation email',
                        'Clicking the link verifies their email address',
                        'Mito.Money Mini KYC page opens for the customer',
                        'Customer completes KYC and creates their password',
                        'Customer is registered and ready for transactions',
                      ].map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                            background: '#dcfce7', color: '#15803d',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.55rem', fontWeight: 800,
                          }}>{i + 1}</span>
                          <span style={{ fontSize: '0.75rem', color: '#166534', lineHeight: 1.4 }}>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setShowInvite(false)}
                      style={{
                        flex: 1, padding: '12px',
                        background: '#fff', color: '#374151',
                        border: '1px solid #d1d5db', borderRadius: 10,
                        fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInviteSend}
                      style={{
                        flex: 2, padding: '12px',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        color: '#fff', border: 'none', borderRadius: 10,
                        fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(234,88,12,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(234,88,12,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      Invite Customer for KYC
                    </button>
                  </div>
                </>
              ) : (
                /* Success Confirmation */
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                    background: '#f0fdf4', border: '2px solid #bbf7d0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
                  }}>
                    ✅
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', margin: '0 0 8px' }}>
                    Invitation Sent Successfully!
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#166534', margin: '0 0 6px', lineHeight: 1.6 }}>
                    A KYC registration invite has been sent to <strong>{inviteForm.email}</strong>.
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
                    When <strong style={{ color: '#1f2937' }}>{inviteForm.firstName} {inviteForm.lastName}</strong> clicks the link, their email will be verified and the Mito.Money Mini KYC page will open. Once they complete KYC and create a password, they will be registered as a customer.
                  </p>

                  {/* Invite Link Box */}
                  <div style={{
                    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10,
                    padding: '12px 16px', marginBottom: 24, textAlign: 'left',
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                      Invitation link (also copy to share manually):
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{
                        flex: 1, padding: '8px 12px', background: '#fff', border: '1px solid #d1d5db',
                        borderRadius: 6, fontSize: '0.78rem', color: '#4b5563',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {mockInviteLink}
                      </div>
                      <button
                        onClick={() => navigator.clipboard?.writeText(mockInviteLink)}
                        style={{
                          padding: '8px 16px', background: '#fff',
                          border: '1px solid #d1d5db', borderRadius: 6,
                          fontSize: '0.8rem', fontWeight: 600, color: '#374151',
                          cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                          whiteSpace: 'nowrap', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowInvite(false)}
                    style={{
                      padding: '12px 36px',
                      background: 'linear-gradient(135deg, #f97316, #ea580c)',
                      color: '#fff', border: 'none', borderRadius: 10,
                      fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Email Verification Popup */}
      {emailVerifyPopup && (() => {
        const vc = emailVerifyPopup.customer;
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <div style={{
              background: '#fff', borderRadius: 20, padding: '36px 32px',
              width: 480, maxWidth: '92vw', boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
              fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
              position: 'relative',
            }}>
              {/* Close Button */}
              <button
                onClick={() => setEmailVerifyPopup(null)}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#f3f4f6', border: 'none', color: '#6b7280',
                  fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#1f2937'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
              >
                ×
              </button>

              {emailVerifyState === 'ask' ? (
                <>
                  {/* Header */}
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                      background: '#fef3c7', border: '2px solid #fde68a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
                    }}>
                      ✉️
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
                      Email Not Verified
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                      Would you like to send a verification link to this customer so they can verify their email address?
                    </p>
                  </div>

                  {/* Customer Info Card */}
                  <div style={{
                    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12,
                    padding: '14px 16px', marginBottom: 24,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f97316, #ea580c)',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                    }}>
                      {vc.firstName[0]}{vc.lastName[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>
                        {vc.firstName} {vc.lastName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {vc.email}
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                      fontSize: '0.75rem', fontWeight: 600,
                      color: '#b45309', background: '#fef3c7',
                      border: '1px solid #fde68a',
                    }}>
                      ✗ Not Verified
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                      onClick={() => {
                        setVerifiedEmails(prev => new Set(prev).add(vc.id));
                        setEmailVerifyState('sent');
                      }}
                      style={{
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        color: '#fff', border: 'none', borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span style={{ fontSize: '1.1rem' }}>📧</span> Send Verification Link
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(emailVerifyLink);
                        setEmailVerifyState('sent');
                      }}
                      style={{
                        padding: '14px 20px',
                        background: '#fff', color: '#374151',
                        border: '1px solid #e5e7eb', borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <span style={{ fontSize: '1.1rem' }}>🔗</span> Copy Link to Send Manually
                    </button>
                  </div>

                  <button
                    onClick={() => setEmailVerifyPopup(null)}
                    style={{
                      width: '100%', marginTop: 16, padding: '10px',
                      background: 'none', border: 'none', color: '#9ca3af',
                      fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                /* Confirmation State */
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                    background: '#f0fdf4', border: '2px solid #bbf7d0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
                  }}>
                    ✅
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', margin: '0 0 8px' }}>
                    Verification Link Sent!
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#166534', margin: '0 0 6px', lineHeight: 1.6 }}>
                    A verification link has been sent to <strong>{vc.email}</strong>.
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
                    When <strong style={{ color: '#1f2937' }}>{vc.firstName} {vc.lastName}</strong> clicks the link, their email will be marked as verified.
                  </p>

                  {/* Verification Link Box */}
                  <div style={{
                    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10,
                    padding: '12px 16px', marginBottom: 24, textAlign: 'left',
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                      Verification link (copy to share manually):
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{
                        flex: 1, padding: '8px 12px', background: '#fff', border: '1px solid #d1d5db',
                        borderRadius: 6, fontSize: '0.78rem', color: '#4b5563',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {emailVerifyLink}
                      </div>
                      <button
                        onClick={() => navigator.clipboard?.writeText(emailVerifyLink)}
                        style={{
                          padding: '8px 16px', background: '#fff',
                          border: '1px solid #d1d5db', borderRadius: 6,
                          fontSize: '0.8rem', fontWeight: 600, color: '#374151',
                          cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                          whiteSpace: 'nowrap', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setEmailVerifyPopup(null)}
                    style={{
                      padding: '12px 36px',
                      background: 'linear-gradient(135deg, #f97316, #ea580c)',
                      color: '#fff', border: 'none', borderRadius: 10,
                      fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* KYC Link Popup */}
      {kycPopup && (() => {
        const { customer: popupCustomer, field } = kycPopup;
        const status = popupCustomer[field] || 'Not Done';
        const label = KYC_LINK_LABELS[field];
        const icon = KYC_LINK_ICONS[field];
        const mockLink = mockLinkRef.current;

        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <div style={{
              background: '#fff', borderRadius: 20, padding: '36px 32px',
              width: 460, maxWidth: '92vw', boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
              fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
              position: 'relative',
            }}>
              {/* Close Button */}
              <button
                onClick={() => setKycPopup(null)}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#f3f4f6', border: 'none', color: '#6b7280',
                  fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#1f2937'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
              >
                ×
              </button>
              {kycPopupState === 'options' ? (
                <>
                  {/* Header */}
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                      background: status === 'Failed' ? '#fef2f2' : '#fff7ed',
                      border: `2px solid ${status === 'Failed' ? '#fecaca' : '#ffedd5'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
                    }}>
                      {icon}
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
                      {label} — {status}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                      Send a {label.toLowerCase()} completion link to <strong style={{ color: '#1f2937' }}>{popupCustomer.firstName} {popupCustomer.lastName}</strong> so they can complete verification.
                    </p>
                  </div>

                  {/* Customer Info Card */}
                  <div style={{
                    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12,
                    padding: '14px 16px', marginBottom: 24,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f97316, #ea580c)',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                    }}>
                      {popupCustomer.firstName[0]}{popupCustomer.lastName[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>
                        {popupCustomer.firstName} {popupCustomer.lastName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {popupCustomer.email}
                      </div>
                    </div>
                    <span style={{
                      ...badgeStyle(status),
                      border: '1px solid rgba(0,0,0,0.05)',
                    }}>
                      {status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                      onClick={() => {
                        setVerifiedEmails(prev => new Set(prev).add(popupCustomer.id));
                        setKycPopupState('sent');
                      }}
                      style={{
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        color: '#fff', border: 'none', borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span style={{ fontSize: '1.1rem' }}>📧</span> Send {label} Link to Email
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(mockLink);
                        setKycPopupState('copied');
                      }}
                      style={{
                        padding: '14px 20px',
                        background: '#fff', color: '#374151',
                        border: '1px solid #e5e7eb', borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <span style={{ fontSize: '1.1rem' }}>🔗</span> Copy {label} Link
                    </button>
                  </div>

                  <button
                    onClick={() => setKycPopup(null)}
                    style={{
                      width: '100%', marginTop: 16, padding: '10px',
                      background: 'none', border: 'none', color: '#9ca3af',
                      fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                /* Confirmation State — sent or copied */
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                    background: '#f0fdf4', border: '2px solid #bbf7d0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
                  }}>
                    ✅
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', margin: '0 0 8px' }}>
                    {kycPopupState === 'sent' ? `${label} Link Sent!` : `${label} Link Copied!`}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#166534', margin: '0 0 6px', lineHeight: 1.6 }}>
                    {kycPopupState === 'sent' ? (
                      <>The {label.toLowerCase()} verification link has been sent to <strong>{popupCustomer.email}</strong> successfully.</>
                    ) : (
                      <>The {label.toLowerCase()} verification link has been copied to your clipboard successfully.</>
                    )}
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 24px' }}>
                    Customer: <strong style={{ color: '#1f2937' }}>{popupCustomer.firstName} {popupCustomer.lastName}</strong> ({popupCustomer.id})
                  </p>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {kycPopupState === 'sent' && (
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(mockLink);
                          setKycPopupState('copied');
                        }}
                        style={{
                          padding: '12px 24px', background: '#fff', color: '#374151',
                          border: '1px solid #e5e7eb', borderRadius: 10,
                          fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif",
                          display: 'flex', alignItems: 'center', gap: 8,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <span>🔗</span> Also Copy Link
                      </button>
                    )}
                    {kycPopupState === 'copied' && (
                      <button
                        onClick={() => {
                          setVerifiedEmails(prev => new Set(prev).add(popupCustomer.id));
                          setKycPopupState('sent');
                        }}
                        style={{
                          padding: '12px 24px', background: '#fff', color: '#374151',
                          border: '1px solid #e5e7eb', borderRadius: 10,
                          fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif",
                          display: 'flex', alignItems: 'center', gap: 8,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <span>📧</span> Also Send to Email
                      </button>
                    )}
                    <button
                      onClick={() => setKycPopup(null)}
                      style={{
                        padding: '12px 32px',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        color: '#fff', border: 'none', borderRadius: 10,
                        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default OBOStep1Search;
