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
    width: '100%', padding: '10px 14px',
    border: `1px solid ${hasErr ? '#dc2626' : '#e5e7eb'}`,
    borderRadius: 8, fontSize: '0.875rem', outline: 'none',
    fontFamily: "'Inter', sans-serif",
    color: '#1f2937', background: '#fff', boxSizing: 'border-box',
  });

  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5 };
  const errStyle = { fontSize: '0.72rem', color: '#dc2626', marginTop: 3 };

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
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Select Recipient</h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '6px 0 0' }}>
          Choose an existing beneficiary or add a new one for <strong>{customer.firstName} {customer.lastName}</strong>.
        </p>
      </div>

      {view === 'list' ? (
        <>
          {/* Recent Recipients — horizontal cards */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, justifyContent: 'flex-start' }}>
            {recent.map(r => {
              const sel = selected?.id === r.id;
              return (
                <div key={r.id} onClick={() => { setSelected(r); setDetailRelationship(r.relationship || ''); setDetailReason(r.reason || ''); setView('details'); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 10,
                    border: sel ? '2px solid #ea580c' : '1px solid #d1d5db',
                    background: sel ? '#fff7ed' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.9rem', color: sel ? '#ea580c' : '#374151',
                    transition: 'all 0.15s',
                  }}>
                    {r.firstName[0]}{r.lastName[0]}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: sel ? '#ea580c' : '#374151', fontWeight: sel ? 700 : 500, textAlign: 'center', maxWidth: 90, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.firstName} {r.lastName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search + Add New Recipient */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
            <input
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: "'Inter', sans-serif" }}
              placeholder="Search Recipients"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={() => setView('add')}
              style={{
                padding: '10px 20px', whiteSpace: 'nowrap',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
              }}
            >
              Add New Recipient
            </button>
          </div>

          {/* Recipients Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr>
                {['Recipient name', 'Bank', 'Account'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'center', fontWeight: 700,
                    fontSize: '0.85rem', color: '#1f2937',
                    borderBottom: '2px solid #e5e7eb', background: '#fff',
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
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = '#fff'; }}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.875rem', color: sel ? '#ea580c' : '#374151', fontWeight: sel ? 600 : 400, borderBottom: '1px solid #f3f4f6' }}>
                      {r.firstName} {r.lastName}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.875rem', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
                      {r.bank}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.875rem', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
                      {r.accountNumber}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No recipients found</td></tr>
              )}
            </tbody>
          </table>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button onClick={onBack} style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
          </div>
        </>
      ) : view === 'details' ? (
        /* Recipient Details View */
        <>
          <button onClick={() => setView('list')} style={{ padding: '8px 18px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}>
            ← Back
          </button>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1f2937', margin: '0 0 24px' }}>Recipients Details</h2>

          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={labelStyle}>Recipient First Name *</label>
                <div style={{ ...inputStyle(false), background: '#fff', padding: '12px 14px' }}>{selected?.firstName || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Recipient Last Name *</label>
                <div style={{ ...inputStyle(false), background: '#fff', padding: '12px 14px' }}>{selected?.lastName || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>DOB</label>
                <div style={{ ...inputStyle(false), background: '#fff', padding: '12px 14px' }}>{selected?.dob || '25/07/1987'}</div>
              </div>
              <div>
                <label style={labelStyle}>Relationship *</label>
                <select style={{ ...inputStyle(false), background: '#fff', padding: '12px 14px', cursor: 'pointer' }} value={detailRelationship} onChange={e => setDetailRelationship(e.target.value)}>
                  <option value="">Select…</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Unique Nick Name</label>
                <div style={{ ...inputStyle(false), background: '#fff', padding: '12px 14px' }}>{selected?.nickname || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Mobile Number *</label>
                <div style={{ ...inputStyle(false), background: '#fff', padding: '12px 14px' }}>{selected?.mobile || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Reason *</label>
                <select style={{ ...inputStyle(false), background: '#fff', padding: '12px 14px', cursor: 'pointer' }} value={detailReason} onChange={e => setDetailReason(e.target.value)}>
                  <option value="">Select…</option>
                  {TRANSFER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => selected && onContinue({ ...selected, relationship: detailRelationship, reason: detailReason })}
            style={{
              padding: '13px 40px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
            }}
          >
            Continue
          </button>
        </>
      ) : (
        /* Add New Recipient Form */
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.1rem' }}>←</button>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Add New Recipient</h3>
          </div>

          {/* Method Toggle */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Transfer Method</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Direct to bank', 'SWIFT'].map(m => (
                <button key={m} onClick={() => setAddMethod(m)} style={{
                  flex: 1, padding: '11px 16px',
                  border: addMethod === m ? '2px solid #ea580c' : '1px solid #e5e7eb',
                  borderRadius: 8, background: addMethod === m ? '#fff7ed' : '#fff',
                  color: addMethod === m ? '#ea580c' : '#374151',
                  fontWeight: addMethod === m ? 700 : 400,
                  fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}>
                  <div style={{ fontWeight: 700 }}>{m}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{m === 'Direct to bank' ? '~30 mins · Local' : '~24 hours · International'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Bank Details */}
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>🏦 Bank Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Bank Name with autocomplete */}
              <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                <label style={labelStyle}>Bank Name *</label>
                <input
                  style={inputStyle(errors.bank)}
                  value={bankSearch}
                  placeholder="Search bank name…"
                  onChange={e => handleBankSearch(e.target.value)}
                  onFocus={() => { setBankFocused(true); if (!bankSearch) setBankSearchResults(MOCK_BANKS); }}
                  onBlur={() => setTimeout(() => setBankFocused(false), 200)}
                />
                {errors.bank && <div style={errStyle}>{errors.bank}</div>}
                {bankFocused && bankSearchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 180, overflowY: 'auto' }}>
                    {bankSearchResults.map(b => (
                      <div key={b} onClick={() => { setNR('bank', b); setBankSearch(b); setBankSearchResults([]); setBankFocused(false); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.875rem', color: '#1f2937' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >{b}</div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Account Number * <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>(max 40 chars)</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...inputStyle(errors.accountNumber), flex: 1 }}
                    maxLength={40}
                    value={newRecipient.accountNumber}
                    placeholder="Account number"
                    onChange={e => { setNR('accountNumber', e.target.value); setAccountValidated(false); setNR('accountHolder', ''); setErrors(er => ({ ...er, accountNumber: null })); }}
                  />
                  <button onClick={handleValidateAccount} style={{
                    padding: '0 14px', background: '#1f2937', color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {validatingAccount ? '…' : 'Verify'}
                  </button>
                </div>
                {errors.accountNumber && <div style={errStyle}>{errors.accountNumber}</div>}
              </div>

              <div>
                <label style={labelStyle}>Account Holder Name</label>
                <input
                  style={{ ...inputStyle(false), background: '#f3f4f6', color: accountValidated ? '#16a34a' : '#9ca3af' }}
                  value={newRecipient.accountHolder}
                  readOnly
                  placeholder="Auto-filled after verification"
                />
                {accountValidated && <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 3 }}>✓ Account verified</div>}
              </div>
            </div>
          </div>

          {/* Section: Personal Details */}
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>👤 Personal Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>💬 Transfer Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Relationship *</label>
                <select style={inputStyle(errors.relationship)} value={newRecipient.relationship} onChange={e => setNR('relationship', e.target.value)}>
                  <option value="">Select…</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.relationship && <div style={errStyle}>{errors.relationship}</div>}
              </div>
              <div>
                <label style={labelStyle}>Reason for Transfer *</label>
                <select style={inputStyle(errors.reason)} value={newRecipient.reason} onChange={e => setNR('reason', e.target.value)}>
                  <option value="">Select…</option>
                  {TRANSFER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.reason && <div style={errStyle}>{errors.reason}</div>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setView('list')} style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
            <button onClick={handleAddRecipient} style={{
              padding: '11px 28px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
            }}>
              Save & Continue →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default OBOStep3Recipient;
