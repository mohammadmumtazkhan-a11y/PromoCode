import React, { useState } from 'react';
import { COUNTRIES, GENDERS } from './oboMockData';

// Mock directors returned after looking up a business registration number
const MOCK_DIRECTORS = {
  '12345678': [
    { name: 'James Wilson', role: 'Director', appointed: '2019-03-10' },
    { name: 'Sarah Thompson', role: 'Director', appointed: '2020-07-22' },
    { name: 'David Clarke', role: 'Secretary', appointed: '2019-03-10' },
  ],
  '87654321': [
    { name: 'Aisha Patel', role: 'Director', appointed: '2021-01-15' },
    { name: 'Michael Obi', role: 'Director', appointed: '2021-01-15' },
  ],
};
// Fallback directors for any other registration number
const FALLBACK_DIRECTORS = [
  { name: 'John Smith', role: 'Director', appointed: '2022-05-01' },
  { name: 'Emma Johnson', role: 'Director', appointed: '2023-02-14' },
  { name: 'Robert Williams', role: 'Secretary', appointed: '2022-05-01' },
];

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#374151',
  marginBottom: 8,
};

const errStyle = { fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, marginTop: 6 };

const getInputStyle = (hasErr) => ({
  width: '100%',
  padding: '14px 16px',
  border: `1px solid ${hasErr ? '#dc2626' : '#d1d5db'}`,
  borderRadius: 10,
  fontSize: '0.95rem',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  color: '#111827',
  background: '#fff',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
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
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    businessName: '',
    registrationNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [showKycPopup, setShowKycPopup] = useState(false);
  const [showKycTypeModal, setShowKycTypeModal] = useState(false);
  const [kycTypeSelected, setKycTypeSelected] = useState('full');
  const [pendingCustomer, setPendingCustomer] = useState(null);
  const [toast, setToast] = useState('');
  const [kycLinkConfirm, setKycLinkConfirm] = useState(null); // null | 'sent' | 'copied'

  // Business director lookup
  const [directors, setDirectors] = useState([]); // fetched list
  const [fetchingDirectors, setFetchingDirectors] = useState(false);
  const [selectedDirector, setSelectedDirector] = useState(null);
  const [directorFetched, setDirectorFetched] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleLookupDirectors = () => {
    if (!form.registrationNumber.trim()) return;
    setFetchingDirectors(true);
    setSelectedDirector(null);
    setDirectorFetched(false);
    setTimeout(() => {
      const found = MOCK_DIRECTORS[form.registrationNumber.trim()] || FALLBACK_DIRECTORS;
      setDirectors(found);
      setFetchingDirectors(false);
      setDirectorFetched(true);
    }, 1200);
  };

  const validate = () => {
    const e = {};
    if (customerType === 'Individual') {
      const required = ['country', 'firstName', 'lastName', 'gender', 'email', 'password', 'addressLine1', 'city', 'postcode'];
      required.forEach(k => { if (!form[k]) e[k] = 'Required'; });
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
      if (form.password && form.password.length < 8) e.password = 'Min 8 characters';
    } else {
      if (!form.email) e.email = 'Required';
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
      if (!form.country) e.country = 'Required';
      if (!form.businessName) e.businessName = 'Required';
      if (!form.registrationNumber) e.registrationNumber = 'Required';
      if (!selectedDirector) e.director = 'Please select a director';
    }
    return e;
  };

  const handleCreate = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setShowKycPopup(true);
  };

  const buildNewCustomer = () => {
    if (customerType === 'Business') {
      const directorParts = selectedDirector ? selectedDirector.name.split(' ') : ['', ''];
      return {
        id: `CUST-${Date.now().toString().slice(-6)}`,
        firstName: directorParts[0] || '',
        lastName: directorParts.slice(1).join(' ') || '',
        email: form.email,
        mobile: form.mobile,
        country: form.country,
        businessName: form.businessName,
        registrationNumber: form.registrationNumber,
        directorName: selectedDirector?.name || '',
        directorRole: selectedDirector?.role || '',
        customerType: 'Business',
        active: false,
        locked: false,
        kycStatus: 'Passed',
        miniKyc: 'Passed',
        fullKyc: 'Passed',
        selfieVerification: 'Passed',
        emailVerified: false,
        walletBalance: 0,
        walletCurrency: 'GBP',
      };
    }
    return {
      id: `CUST-${Date.now().toString().slice(-6)}`,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      mobile: form.mobile,
      country: form.country,
      gender: form.gender,
      street: form.addressLine1,
      city: form.city,
      postcode: form.postcode,
      active: false,
      locked: false,
      kycStatus: 'Passed',
      miniKyc: 'Passed',
      fullKyc: 'Passed',
      selfieVerification: 'Passed',
      emailVerified: false,
      walletBalance: 0,
      walletCurrency: 'GBP',
    };
  };

  const handleKycOption = (option) => {
    const newCustomer = buildNewCustomer();
    if (option === 'send') {
      newCustomer.emailVerified = true;
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={onBack} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: '#4b5563', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'} onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}>←</button>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>Register New Customer</h2>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '6px 0 0', fontWeight: 500 }}>Create a new account on behalf of a customer.</p>
        </div>
      </div>

      {/* Customer Type Toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', width: 'fit-content', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        {['Individual', 'Business'].map(type => (
          <button
            key={type}
            onClick={() => setCustomerType(type)}
            style={{
              padding: '12px 32px',
              border: 'none',
              background: customerType === type ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#fff',
              color: customerType === type ? '#fff' : '#4b5563',
              fontWeight: customerType === type ? 700 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.2s',
            }}
          >
            {type === 'Individual' ? '👤 ' : '🏢 '}{type}
          </button>
        ))}
      </div>

      {/* Form */}
      {customerType === 'Individual' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Country *" as="select" options={COUNTRIES} {...f('country')} />
          <Field label="First Name *" {...f('firstName')} />
          <Field label="Last Name *" {...f('lastName')} />
          <Field label="Gender *" as="select" options={GENDERS} {...f('gender')} />
          <Field label="Mobile Number" type="text" placeholder="e.g. +44 7700 900000" {...f('mobile')} />
          <Field label="Email Address *" type="email" placeholder="email@example.com" {...f('email')} />
          <Field label="Address Line 1 *" placeholder="Street address" {...f('addressLine1')} />
          <Field label="Address Line 2" placeholder="Apartment, suite, etc. (optional)" {...f('addressLine2')} />
          <Field label="City *" placeholder="City" {...f('city')} />
          <Field label="Post Code *" placeholder="e.g. SW1A 1AA" {...f('postcode')} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Password *" type="password" placeholder="Min 8 characters" {...f('password')} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Email Address *" type="email" placeholder="email@example.com" {...f('email')} />
          <Field label="Country *" as="select" options={COUNTRIES} {...f('country')} />
          <Field label="Business Name *" placeholder="Registered business name" {...f('businessName')} />
          <div>
            <label style={labelStyle}>Business Registration Number *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                style={{ ...getInputStyle(errors.registrationNumber), flex: 1 }}
                value={form.registrationNumber}
                placeholder="e.g. 12345678"
                onChange={e => { set('registrationNumber', e.target.value); setDirectorFetched(false); setSelectedDirector(null); setDirectors([]); }}
              />
              <button
                onClick={handleLookupDirectors}
                disabled={!form.registrationNumber.trim() || fetchingDirectors}
                style={{
                  padding: '0 20px', whiteSpace: 'nowrap',
                  background: form.registrationNumber.trim() && !fetchingDirectors ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#d1d5db',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: '0.85rem', fontWeight: 700, cursor: form.registrationNumber.trim() && !fetchingDirectors ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: form.registrationNumber.trim() && !fetchingDirectors ? '0 2px 8px rgba(234,88,12,0.25)' : 'none',
                }}
              >
                {fetchingDirectors ? 'Fetching…' : 'Lookup'}
              </button>
            </div>
            {errors.registrationNumber && <div style={errStyle}>{errors.registrationNumber}</div>}
          </div>
          <Field label="Phone Number" type="text" placeholder="e.g. +44 7700 900000" {...f('mobile')} />

          {/* Director Lookup Results */}
          {fetchingDirectors && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #fdba74', borderTop: '2px solid #ea580c', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ fontSize: '0.85rem', color: '#c2410c', fontWeight: 500 }}>Looking up company directors…</span>
            </div>
          )}

          {directorFetched && directors.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Select Director *</label>
              {errors.director && <div style={{ ...errStyle, marginTop: 0, marginBottom: 8 }}>{errors.director}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {directors.map((dir, idx) => {
                  const isSel = selectedDirector?.name === dir.name;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDirector(dir)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                        background: isSel ? '#fff7ed' : '#fff',
                        border: `2px solid ${isSel ? '#ea580c' : '#e5e7eb'}`,
                        borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
                        fontFamily: "'Inter', sans-serif", transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (!isSel) { e.currentTarget.style.borderColor = '#fdba74'; e.currentTarget.style.background = '#fffbeb'; } }}
                      onMouseLeave={e => { if (!isSel) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; } }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: isSel ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#f3f4f6',
                        color: isSel ? '#fff' : '#6b7280',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem',
                      }}>
                        {dir.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isSel ? '#c2410c' : '#1f2937' }}>{dir.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{dir.role} · Appointed {dir.appointed}</div>
                      </div>
                      {isSel && <span style={{ color: '#ea580c', fontWeight: 800, fontSize: '1.1rem' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {directorFetched && directors.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '14px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
              <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>No directors found for this registration number. Please check and try again.</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'flex-end' }}>
        <button onClick={onBack} style={{
          padding: '14px 28px', background: '#fff', color: '#4b5563',
          border: '1px solid #d1d5db', borderRadius: 12, fontSize: '0.95rem',
          fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          Cancel
        </button>
        <button onClick={handleCreate} style={{
          padding: '14px 36px',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          color: '#fff', border: 'none', borderRadius: 12,
          fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
          transition: 'transform 0.1s ease',
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
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
            position: 'relative',
          }}>
            {/* Close Button */}
            <button
              onClick={() => { setShowKycPopup(false); setKycLinkConfirm(null); }}
              style={{
                position: 'absolute', top: 12, right: 12,
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
          { id: 'mini',           icon: '👤', title: 'Mini KYC',                              desc: 'Name, date of birth and address — already collected during registration. No new information required.' },
          { id: 'full',           icon: '🆔', title: 'Full KYC without Selfie Verification',  desc: 'ID document upload and AML check. No selfie verification required.' },
          { id: 'fullWithSelfie', icon: '🤳', title: 'Full KYC with Selfie Verification',     desc: 'Complete verification — ID document upload, AML check, and selfie verification.' },
        ];
        const labels = { mini: 'Mini KYC', full: 'Full KYC without Selfie Verification', fullWithSelfie: 'Full KYC with Selfie Verification' };
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
              {/* Close Button */}
              <button
                onClick={() => { setShowKycTypeModal(false); }}
                style={{
                  position: 'absolute', top: 12, right: 12,
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
