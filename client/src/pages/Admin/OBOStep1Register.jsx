import React, { useState } from 'react';
import { COUNTRIES, GENDERS } from './oboMockData';

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: 5,
};

const errStyle = { fontSize: '0.72rem', color: '#dc2626', marginTop: 3 };

const getInputStyle = (hasErr) => ({
  width: '100%',
  padding: '10px 14px',
  border: `1px solid ${hasErr ? '#dc2626' : '#e5e7eb'}`,
  borderRadius: 8,
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  color: '#1f2937',
  background: '#fff',
  boxSizing: 'border-box',
});

// Field is defined OUTSIDE the component so React never re-mounts inputs on re-render
const Field = ({ label, name, type = 'text', as = 'input', options = [], value, onChange, error, placeholder }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    {as === 'select' ? (
      <select style={getInputStyle(error)} value={value} onChange={e => onChange(name, e.target.value)}>
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input
        type={type}
        style={getInputStyle(error)}
        value={value}
        placeholder={placeholder || label}
        autoComplete={type === 'password' ? 'new-password' : type === 'email' ? 'email' : 'off'}
        onChange={e => onChange(name, e.target.value)}
      />
    )}
    {error && <div style={errStyle}>{error}</div>}
  </div>
);

const OBOStep1Register = ({ onBack, onRegistered, onKycByAdmin }) => {
  const [customerType, setCustomerType] = useState('Individual');
  const [form, setForm] = useState({
    country: 'United Kingdom',
    firstName: '',
    lastName: '',
    gender: '',
    mobile: '',
    email: '',
    password: '',
    businessName: '',
    registrationNumber: '',
    businessPhone: '',
  });
  const [errors, setErrors] = useState({});
  const [showKycPopup, setShowKycPopup] = useState(false);
  const [showKycTypeModal, setShowKycTypeModal] = useState(false);
  const [kycTypeSelected, setKycTypeSelected] = useState('full');
  const [pendingCustomer, setPendingCustomer] = useState(null);
  const [toast, setToast] = useState('');
  const [kycLinkConfirm, setKycLinkConfirm] = useState(null); // null | 'sent' | 'copied'

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    const required = ['country', 'firstName', 'lastName', 'gender', 'mobile', 'email', 'password'];
    required.forEach(k => { if (!form[k]) e[k] = 'Required'; });
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (form.password && form.password.length < 8) e.password = 'Min 8 characters';
    if (customerType === 'Business') {
      if (!form.businessName) e.businessName = 'Required';
      if (!form.registrationNumber) e.registrationNumber = 'Required';
      if (!form.businessPhone) e.businessPhone = 'Required';
    }
    return e;
  };

  const handleCreate = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setShowKycPopup(true);
  };

  const buildNewCustomer = () => ({
    id: `CUST-${Date.now().toString().slice(-6)}`,
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    mobile: form.mobile,
    country: form.country,
    active: false,
    locked: false,
    kycStatus: 'Not Done',
    walletBalance: 0,
    walletCurrency: 'GBP',
  });

  const handleKycOption = (option) => {
    const newCustomer = buildNewCustomer();
    if (option === 'send') {
      setKycLinkConfirm('sent');
      setPendingCustomer(newCustomer);
    } else if (option === 'copy') {
      navigator.clipboard?.writeText('https://app.mito.com/kyc/complete?token=mock123');
      setKycLinkConfirm('copied');
      setPendingCustomer(newCustomer);
    } else if (option === 'admin') {
      setShowKycPopup(false);
      if (onKycByAdmin) {
        setPendingCustomer(newCustomer);
        setShowKycTypeModal(true);
      } else {
        onRegistered(newCustomer);
      }
    }
  };

  const f = (name, extraProps = {}) => ({
    name,
    value: form[name],
    onChange: set,
    error: errors[name],
    ...extraProps,
  });

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: '#1f2937', color: '#fff',
          padding: '12px 20px', borderRadius: 10, fontSize: '0.875rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: '1.1rem', color: '#6b7280' }}>←</button>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Register New Customer</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '4px 0 0' }}>Create a new account on behalf of a customer.</p>
        </div>
      </div>

      {/* Customer Type Toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
        {['Individual', 'Business'].map(type => (
          <button
            key={type}
            onClick={() => setCustomerType(type)}
            style={{
              padding: '9px 28px',
              border: 'none',
              background: customerType === type ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#fff',
              color: customerType === type ? '#fff' : '#374151',
              fontWeight: customerType === type ? 700 : 400,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {type === 'Individual' ? '👤 ' : '🏢 '}{type}
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Country *" as="select" options={COUNTRIES} {...f('country')} />
        <Field label="First Name *" {...f('firstName')} />
        <Field label="Last Name *" {...f('lastName')} />
        <Field label="Gender *" as="select" options={GENDERS} {...f('gender')} />
        <Field label="Mobile Number *" type="text" placeholder="e.g. +44 7700 900000" {...f('mobile')} />
        <Field label="Email Address *" type="email" placeholder="email@example.com" {...f('email')} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Password *" type="password" placeholder="Min 8 characters" {...f('password')} />
        </div>

        {customerType === 'Business' && (
          <>
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #f3f4f6', paddingTop: 16, marginTop: 4 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Details</p>
            </div>
            <Field label="Business Name *" {...f('businessName')} />
            <Field label="Registration Number *" {...f('registrationNumber')} />
            <Field label="Business Phone *" type="tel" {...f('businessPhone')} />
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end' }}>
        <button onClick={onBack} style={{
          padding: '10px 24px', background: '#fff', color: '#374151',
          border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem',
          fontWeight: 600, cursor: 'pointer',
        }}>
          Cancel
        </button>
        <button onClick={handleCreate} style={{
          padding: '10px 28px',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          color: '#fff', border: 'none', borderRadius: 8,
          fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
        }}>
          Create Account
        </button>
      </div>

      {/* KYC Popup */}
      {showKycPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32,
            width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
            fontFamily: "'Inter', sans-serif",
          }}>
            {kycLinkConfirm ? (
              /* Confirmation after Send/Copy */
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#15803d', margin: '0 0 8px' }}>
                  {kycLinkConfirm === 'sent' ? 'KYC Link Sent!' : 'KYC Link Copied!'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#166534', margin: '0 0 24px' }}>
                  {kycLinkConfirm === 'sent'
                    ? <>The KYC link has been sent to <strong>{form.email}</strong> successfully.</>
                    : <>The KYC link has been copied to clipboard successfully.</>
                  }
                </p>
                <button onClick={() => { setShowKycPopup(false); setKycLinkConfirm(null); }}
                  style={{
                    padding: '11px 32px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                    fontSize: '0.875rem', cursor: 'pointer',
                  }}>
                  Done
                </button>
              </div>
            ) : (
              /* KYC Options */
              <>
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2937', margin: '0 0 6px' }}>
                    Account Created Successfully
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                    An activation link has been sent to <strong>{form.email}</strong>. Would you like to complete KYC now?
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
                  <button onClick={() => handleKycOption('admin')} style={{
                    padding: '12px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                    fontSize: '0.875rem', cursor: 'pointer',
                  }}>
                    🆔 KYC by Admin
                  </button>
                  <button onClick={() => handleKycOption('send')} style={{
                    padding: '12px', background: '#fff', color: '#374151',
                    border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600,
                    fontSize: '0.875rem', cursor: 'pointer',
                  }}>
                    📧 Send KYC Link to Customer
                  </button>
                  <button onClick={() => handleKycOption('copy')} style={{
                    padding: '12px', background: '#fff', color: '#374151',
                    border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600,
                    fontSize: '0.875rem', cursor: 'pointer',
                  }}>
                    🔗 Copy KYC Link
                  </button>
                </div>
                <button onClick={() => { setShowKycPopup(false); onRegistered(buildNewCustomer()); }}
                  style={{ marginTop: 12, width: '100%', padding: '10px', background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.82rem', cursor: 'pointer' }}>
                  Skip for now — proceed to transaction
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* KYC Type Selection Modal */}
      {showKycTypeModal && (() => {
        const KYC_OPTIONS = [
          { id: 'mini',       icon: '👤', title: 'Mini KYC',                   desc: 'Name, date of birth and address — already collected during registration. No new information required.' },
          { id: 'ddOnly',     icon: '📋', title: 'Due Diligence Only',          desc: 'Income sources, employment details and supporting financial documents.' },
          { id: 'full',       icon: '🆔', title: 'Full KYC',                   desc: 'ID document upload and AML check. No due diligence required.' },
          { id: 'fullWithDD', icon: '🔍', title: 'Full KYC + Due Diligence',   desc: 'Complete verification — ID document upload, AML check, and due diligence.' },
        ];
        const labels = { mini: 'Mini KYC', ddOnly: 'Due Diligence Only', full: 'Full KYC', fullWithDD: 'Full KYC + Due Diligence' };
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', fontFamily: "'Inter', sans-serif" }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2937', margin: '0 0 6px' }}>Select KYC Type</h3>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 20px' }}>Choose the level of KYC verification to perform for this customer.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                {KYC_OPTIONS.map(opt => {
                  const sel = kycTypeSelected === opt.id;
                  return (
                    <div key={opt.id} onClick={() => setKycTypeSelected(opt.id)} style={{
                      border: `2px solid ${sel ? '#ea580c' : '#e5e7eb'}`,
                      borderRadius: 10, padding: '14px 12px', cursor: 'pointer',
                      background: sel ? '#fff7ed' : '#fff',
                    }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{opt.icon}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: sel ? '#c2410c' : '#1f2937', marginBottom: 4 }}>{opt.title}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', lineHeight: 1.5 }}>{opt.desc}</div>
                      {sel && <div style={{ marginTop: 6, fontSize: '0.7rem', fontWeight: 700, color: '#ea580c' }}>✓ Selected</div>}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => { setShowKycTypeModal(false); onKycByAdmin(pendingCustomer, kycTypeSelected); }}
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
                Continue with {labels[kycTypeSelected]} →
              </button>
              <button onClick={() => { setShowKycTypeModal(false); onRegistered(pendingCustomer); }}
                style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                Skip for now — proceed to transaction
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default OBOStep1Register;
