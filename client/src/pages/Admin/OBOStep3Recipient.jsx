import React, { useState, useMemo } from 'react';
import { MOCK_RECIPIENTS, MOCK_BANKS, RELATIONSHIPS, TRANSFER_REASONS, COUNTRIES } from './oboMockData';

const OBOStep3Recipient = ({ customer, txData, onBack, onContinue }) => {
  const [view, setView] = useState('list'); // 'list' | 'details' | 'add'
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [addMethod, setAddMethod] = useState('Direct to bank');
  const [bankSearch, setBankSearch] = useState('');
  const [bankSearchResults, setBankSearchResults] = useState([]);
  const [accountValidated, setAccountValidated] = useState(false);
  const [validatingAccount, setValidatingAccount] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    bank: '', accountNumber: '', accountHolder: '',
    firstName: '', lastName: '', dob: '', nickname: '', mobile: '',
    country: txData?.receiveCurrency === 'NGN' ? 'Nigeria' : 'Ghana',
    relationship: '', reason: '',
  });
  const [errors, setErrors] = useState({});
  const [detailRelationship, setDetailRelationship] = useState('');
  const [detailReason, setDetailReason] = useState('');

  const recent = MOCK_RECIPIENTS.slice(0, 5);

  const filtered = useMemo(() => {
    if (!search) return MOCK_RECIPIENTS;
    const q = search.toLowerCase();
    return MOCK_RECIPIENTS.filter(r =>
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      r.nickname?.toLowerCase().includes(q)
    );
  }, [search]);

  const setNR = (key, val) => setNewRecipient(p => ({ ...p, [key]: val }));

  const [bankFocused, setBankFocused] = useState(false);

  const handleBankSearch = (val) => {
    setBankSearch(val);
    setNR('bank', val);
    if (val.length >= 1) {
      setBankSearchResults(MOCK_BANKS.filter(b => b.toLowerCase().includes(val.toLowerCase())));
    } else {
      setBankSearchResults(MOCK_BANKS);
    }
    setAccountValidated(false);
    setNR('accountHolder', '');
  };

  const handleValidateAccount = () => {
    if (!newRecipient.accountNumber || newRecipient.accountNumber.length < 8) {
      setErrors(e => ({ ...e, accountNumber: 'Enter a valid account number' }));
      return;
    }
    setValidatingAccount(true);
    setTimeout(() => {
      setAccountValidated(true);
      setNR('accountHolder', `${newRecipient.firstName || 'Account'} ${newRecipient.lastName || 'Holder'} (Verified)`);
      setValidatingAccount(false);
    }, 1200);
  };

  const validateNewRecipient = () => {
    const e = {};
    if (!newRecipient.bank) e.bank = 'Required';
    if (!newRecipient.accountNumber) e.accountNumber = 'Required';
    if (!newRecipient.firstName) e.firstName = 'Required';
    if (!newRecipient.lastName) e.lastName = 'Required';
    if (!newRecipient.mobile) e.mobile = 'Required';
    if (!newRecipient.relationship) e.relationship = 'Required';
    if (!newRecipient.reason) e.reason = 'Required';
    return e;
  };

  const handleAddRecipient = () => {
    const e = validateNewRecipient();
    if (Object.keys(e).length) { setErrors(e); return; }
    const rec = {
      id: `REC-${Date.now()}`,
      ...newRecipient,
      method: addMethod,
      lastUsed: new Date().toISOString().split('T')[0],
    };
    onContinue(rec);
  };

  const inputStyle = (hasErr) => ({
    width: '100%', padding: '14px 16px',
    border: `1px solid ${hasErr ? '#dc2626' : '#d1d5db'}`,
    borderRadius: 10, fontSize: '0.95rem', outline: 'none',
    fontFamily: "'Inter', sans-serif", fontWeight: 500,
    color: '#111827', background: '#fff', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: 8 };
  const errStyle = { fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, marginTop: 6 };

  const RecipientCard = ({ rec, isRecent }) => (
    <div
      onClick={() => setSelected(rec)}
      style={{
        padding: '14px 16px',
        border: selected?.id === rec.id ? '2px solid #ea580c' : '1px solid #e5e7eb',
        borderRadius: 10, cursor: 'pointer',
        background: selected?.id === rec.id ? '#fff7ed' : '#fff',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: selected?.id === rec.id ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#f3f4f6',
        color: selected?.id === rec.id ? '#fff' : '#6b7280',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '0.85rem',
      }}>
        {rec.firstName[0]}{rec.lastName[0]}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
          {rec.firstName} {rec.lastName}
          {rec.nickname && <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400, marginLeft: 6 }}>({rec.nickname})</span>}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{rec.bank} · ••••{rec.accountNumber.slice(-4)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{rec.method}</div>
        {isRecent && <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600 }}>Recent</div>}
        {selected?.id === rec.id && <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 700 }}>✓ Selected</div>}
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>Select Recipient</h2>
        <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: '8px 0 0' }}>
          Choose an existing beneficiary or add a new one for <strong style={{ color: '#1f2937' }}>{customer.firstName} {customer.lastName}</strong>.
        </p>
      </div>

      {view === 'list' ? (
        <>
          {/* Recent Recipients — horizontal cards */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 32, justifyContent: 'flex-start', overflowX: 'auto', paddingBottom: 12 }}>
            {recent.map(r => {
              const sel = selected?.id === r.id;
              return (
                <div key={r.id} onClick={() => { setSelected(r); setDetailRelationship(r.relationship || ''); setDetailReason(r.reason || ''); setView('details'); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer',
                    minWidth: 80,
                  }}
                >
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    border: sel ? 'none' : '2px solid #e5e7eb',
                    background: sel ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1.25rem', color: sel ? '#fff' : '#111827',
                    boxShadow: sel ? '0 8px 16px rgba(234,88,12,0.3)' : '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: sel ? 'scale(1.05)' : 'scale(1)',
                  }}>
                    {r.firstName[0]}{r.lastName[0]}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: sel ? '#ea580c' : '#4b5563', fontWeight: sel ? 800 : 600, textAlign: 'center', maxWidth: 90, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.firstName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search + Add New Recipient */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
            <input
              style={{ flex: 1, padding: '12px 18px', border: '1px solid #d1d5db', borderRadius: 12, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: "'Inter', sans-serif", boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
              placeholder="Search Recipients by name or nickname..."
              value={search}
              onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={() => setView('add')}
              style={{
                padding: '12px 24px', whiteSpace: 'nowrap',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
                transition: 'transform 0.1s ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              + Add New Recipient
            </button>
          </div>

          {/* Recipients Table */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginBottom: 32 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Recipient name', 'Bank', 'Account Number'].map(h => (
                    <th key={h} style={{
                      padding: '16px 24px', textAlign: 'left', fontWeight: 700,
                      fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const sel = selected?.id === r.id;
                  return (
                    <tr key={r.id} onClick={() => { setSelected(r); setDetailRelationship(r.relationship || ''); setDetailReason(r.reason || ''); setView('details'); }}
                      style={{
                        cursor: 'pointer',
                        background: sel ? '#fff7ed' : '#fff',
                        transition: 'all 0.15s',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = '#fff'; }}
                    >
                      <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: sel ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#f3f4f6', color: sel ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', boxShadow: sel ? '0 2px 8px rgba(234,88,12,0.3)' : 'none' }}>
                            {r.firstName[0]}{r.lastName[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: sel ? '#ea580c' : '#111827' }}>{r.firstName} {r.lastName}</div>
                            {r.nickname && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>"{r.nickname}"</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: '#4b5563', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {r.bank}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: '#4b5563', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {r.accountNumber}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: '0.95rem', fontWeight: 500 }}>No recipients found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button onClick={onBack} style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
          </div>
        </>
      ) : view === 'details' ? (
        /* Recipient Details View */
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <button onClick={() => setView('list')} style={{ padding: '8px 16px', background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: 24, transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            ← Back to List
          </button>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 24px' }}>Recipient Details</h2>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, marginBottom: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <label style={labelStyle}>Recipient First Name</label>
                <div style={{ ...inputStyle(false), background: '#f9fafb', color: '#4b5563', borderColor: '#e5e7eb' }}>{selected?.firstName || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Recipient Last Name</label>
                <div style={{ ...inputStyle(false), background: '#f9fafb', color: '#4b5563', borderColor: '#e5e7eb' }}>{selected?.lastName || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <div style={{ ...inputStyle(false), background: '#f9fafb', color: '#4b5563', borderColor: '#e5e7eb' }}>{selected?.dob || '25/07/1987'}</div>
              </div>
              <div>
                <label style={labelStyle}>Relationship to Sender *</label>
                <select style={{ ...inputStyle(false), cursor: 'pointer' }} value={detailRelationship} onChange={e => setDetailRelationship(e.target.value)}>
                  <option value="">Select Relationship…</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Unique Nickname</label>
                <div style={{ ...inputStyle(false), background: '#f9fafb', color: '#4b5563', borderColor: '#e5e7eb' }}>{selected?.nickname || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Mobile Number</label>
                <div style={{ ...inputStyle(false), background: '#f9fafb', color: '#4b5563', borderColor: '#e5e7eb' }}>{selected?.mobile || '—'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Reason for Transfer *</label>
                <select style={{ ...inputStyle(false), cursor: 'pointer' }} value={detailReason} onChange={e => setDetailReason(e.target.value)}>
                  <option value="">Select Transfer Reason…</option>
                  {TRANSFER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => selected && onContinue({ ...selected, relationship: detailRelationship, reason: detailReason })}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
              transition: 'transform 0.1s ease',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Continue with {selected?.firstName} →
          </button>
        </div>
      ) : (
        /* Add New Recipient Form */
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => setView('list')} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#4b5563', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'} onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}>←</button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>Add New Recipient</h3>
          </div>

          {/* Section: Transfer Method */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>⚡</span> Transfer Route
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Direct to bank', 'SWIFT'].map(m => (
                <button key={m} onClick={() => setAddMethod(m)} style={{
                  flex: 1, padding: '16px 20px',
                  border: addMethod === m ? '2px solid #ea580c' : '1px solid #d1d5db',
                  borderRadius: 12, background: addMethod === m ? '#fff7ed' : '#fff',
                  color: addMethod === m ? '#ea580c' : '#4b5563',
                  fontWeight: addMethod === m ? 700 : 500,
                  fontSize: '0.95rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  boxShadow: addMethod === m ? '0 4px 12px rgba(234,88,12,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                }}>
                  <div style={{ fontWeight: 800, color: addMethod === m ? '#c2410c' : '#111827', marginBottom: 4 }}>{m}</div>
                  <div style={{ fontSize: '0.75rem', color: addMethod === m ? '#ea580c' : '#6b7280' }}>{m === 'Direct to bank' ? '~30 mins processing · Local route' : '~24 hours processing · International route'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Bank Details */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🏦</span> Bank Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                <label style={labelStyle}>Bank Name *</label>
                <input
                  style={inputStyle(errors.bank)}
                  value={bankSearch}
                  placeholder="Search bank name…"
                  onChange={e => handleBankSearch(e.target.value)}
                  onFocus={e => { setBankFocused(true); if (!bankSearch) setBankSearchResults(MOCK_BANKS); e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.1)'; }}
                  onBlur={e => { setTimeout(() => setBankFocused(false), 200); e.target.style.borderColor = errors.bank ? '#dc2626' : '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
                />
                {errors.bank && <div style={errStyle}>{errors.bank}</div>}
                {bankFocused && bankSearchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, zIndex: 10, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
                    {bankSearchResults.map(b => (
                      <div key={b} onClick={() => { setNR('bank', b); setBankSearch(b); setBankSearchResults([]); setBankFocused(false); }}
                        style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '0.9rem', color: '#111827', fontWeight: 500 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >{b}</div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Account Number * <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>(max 40 chars)</span></label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    style={{ ...inputStyle(errors.accountNumber), flex: 1, fontFamily: 'monospace', fontSize: '1rem' }}
                    maxLength={40}
                    value={newRecipient.accountNumber}
                    placeholder="0000000000"
                    onChange={e => { setNR('accountNumber', e.target.value); setAccountValidated(false); setNR('accountHolder', ''); setErrors(er => ({ ...er, accountNumber: null })); }}
                  />
                  <button onClick={handleValidateAccount} style={{
                    padding: '0 20px', background: accountValidated ? '#10b981' : '#1f2937', color: '#fff',
                    border: 'none', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {validatingAccount ? 'Verifying...' : accountValidated ? '✓ Verified' : 'Verify'}
                  </button>
                </div>
                {errors.accountNumber && <div style={errStyle}>{errors.accountNumber}</div>}
              </div>

              <div>
                <label style={labelStyle}>Account Holder Name</label>
                <input
                  style={{ ...inputStyle(false), background: '#f9fafb', color: accountValidated ? '#059669' : '#9ca3af', borderColor: '#e5e7eb', fontWeight: accountValidated ? 700 : 500 }}
                  value={newRecipient.accountHolder}
                  readOnly
                  placeholder="Auto-filled after verification"
                />
              </div>
            </div>
          </div>

          {/* Section: Personal Details */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>👤</span> Personal Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { label: 'First Name *', key: 'firstName' },
                { label: 'Last Name *', key: 'lastName' },
                { label: 'Date of Birth', key: 'dob', type: 'date' },
                { label: 'Nickname', key: 'nickname' },
              ].map(({ label, key, type = 'text' }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} style={inputStyle(errors[key])} value={newRecipient[key]} placeholder={label.replace(' *', '')} onChange={e => setNR(key, e.target.value)} />
                  {errors[key] && <div style={errStyle}>{errors[key]}</div>}
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Mobile Number *</label>
                <input style={inputStyle(errors.mobile)} value={newRecipient.mobile} placeholder="+234 800 000 0000" onChange={e => setNR('mobile', e.target.value)} />
                {errors.mobile && <div style={errStyle}>{errors.mobile}</div>}
              </div>
            </div>
          </div>

          {/* Section: Transfer Details */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 32, border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>💬</span> Transfer Context
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={labelStyle}>Relationship to Sender *</label>
                <select style={{...inputStyle(errors.relationship), cursor: 'pointer'}} value={newRecipient.relationship} onChange={e => setNR('relationship', e.target.value)}>
                  <option value="">Select Relationship…</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.relationship && <div style={errStyle}>{errors.relationship}</div>}
              </div>
              <div>
                <label style={labelStyle}>Reason for Transfer *</label>
                <select style={{...inputStyle(errors.reason), cursor: 'pointer'}} value={newRecipient.reason} onChange={e => setNR('reason', e.target.value)}>
                  <option value="">Select Reason…</option>
                  {TRANSFER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.reason && <div style={errStyle}>{errors.reason}</div>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => setView('list')} style={{ padding: '16px 32px', background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              Cancel
            </button>
            <button onClick={handleAddRecipient} style={{
              flex: 1, padding: '16px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
              transition: 'transform 0.1s ease',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              Save New Recipient & Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OBOStep3Recipient;
