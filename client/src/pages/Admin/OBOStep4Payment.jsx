import React, { useState } from 'react';

const PAYMENT_METHODS = [
  { id: 'instant', label: 'Instant Bank Transfer', icon: '⚡' },
  { id: 'normal', label: 'Normal Bank Transfer', icon: '🏦' },
  { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'gpay', label: 'Google Pay', icon: '🔵' },
  { id: 'apay', label: 'Apple Pay', icon: '🍎' },
];

const EXPIRY_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
  { label: '4 hours (default)', value: 4 },
  { label: '8 hours', value: 8 },
  { label: '24 hours', value: 24 },
];

const CURRENCY_SYMBOLS = { GBP: '£', USD: '$', EUR: '€', NGN: '₦', GHS: '₵', KES: 'KSh', INR: '₹' };

const OBOStep4Payment = ({ customer, txData, recipient, onBack, onDone }) => {
  const [paymentTab, setPaymentTab] = useState('wallet'); // 'wallet' | 'link'
  const [selectedMethods, setSelectedMethods] = useState(['instant', 'normal', 'card', 'gpay', 'apay']);
  const [sendAll, setSendAll] = useState(true);
  const [expiry, setExpiry] = useState(4);
  const [linkMode, setLinkMode] = useState('email'); // 'email' | 'link'
  const [popup, setPopup] = useState(null); // null | 'wallet' | 'link' | 'success'
  const [txRef] = useState(`TXN-${Date.now().toString().slice(-8)}`);

  const calc = txData?.calc;
  const sendSym = CURRENCY_SYMBOLS[txData?.sendCurrency] || '£';
  const recvSym = CURRENCY_SYMBOLS[txData?.receiveCurrency] || '₦';
  const walletSufficient = (customer?.walletBalance || 0) >= Number(calc?.total || 0);

  const toggleMethod = (id) => {
    setSelectedMethods(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
      {children}
    </div>
  );

  const InfoRow = ({ label, value, highlight, large }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{label}</span>
      <span style={{
        fontSize: large ? '1rem' : '0.875rem',
        fontWeight: large ? 800 : 600,
        color: highlight ? '#ea580c' : '#1f2937',
      }}>{value}</span>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1f2937', margin: '0 0 20px' }}>
        Review & Payment
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 20, marginBottom: 24 }}>
        {/* Transaction Summary */}
        <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12, padding: 20 }}>
          <SectionTitle>💸 Transaction Summary</SectionTitle>
          <InfoRow label="You Send" value={`${sendSym}${calc?.total || '—'}`} />
          <InfoRow label="Transfer Fee" value={`${sendSym}${calc?.fee || '—'}`} />
          <InfoRow label="Exchange Rate" value={`1 ${txData?.sendCurrency} = ${calc?.rate} ${txData?.receiveCurrency}`} />
          <InfoRow label="Receiving Method" value={txData?.method || '—'} />
          <InfoRow label="Recipient Gets" value={`${recvSym}${Number(calc?.theyReceive || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`} highlight large />
        </div>

        {/* Recipient Summary */}
        <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12, padding: 20 }}>
          <SectionTitle>👤 Recipient Details</SectionTitle>
          <InfoRow label="Name" value={`${recipient?.firstName} ${recipient?.lastName}`} />
          <InfoRow label="Bank" value={recipient?.bank || '—'} />
          <InfoRow label="Account" value={recipient?.accountNumber ? `••••${recipient.accountNumber.slice(-4)}` : '—'} />
          <InfoRow label="Relationship" value={recipient?.relationship || '—'} />
          <InfoRow label="Transfer Reason" value={recipient?.reason || '—'} />

          {/* Customer wallet */}
          <div style={{ marginTop: 14, padding: '10px 14px', background: walletSufficient ? '#dcfce7' : '#f3f4f6', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#374151' }}>Wallet Balance</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: walletSufficient ? '#16a34a' : '#6b7280' }}>
              £{(customer?.walletBalance || 0).toFixed(2)}
              {walletSufficient ? ' ✓' : ''}
            </span>
          </div>
        </div>

        {/* Payment Method Tabs — 3rd column */}
        <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
          {[
            { key: 'wallet', label: '💰 Deduct from Wallet', disabled: !walletSufficient },
            { key: 'link', label: '🔗 Send Payment Link', disabled: false },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setPaymentTab(tab.key)}
              style={{
                flex: 1, padding: '14px 20px',
                background: paymentTab === tab.key ? '#fff7ed' : '#fff',
                color: tab.disabled ? '#d1d5db' : paymentTab === tab.key ? '#ea580c' : '#374151',
                border: 'none',
                borderBottom: paymentTab === tab.key ? '3px solid #ea580c' : '3px solid transparent',
                fontWeight: paymentTab === tab.key ? 700 : 500,
                fontSize: '0.875rem', cursor: tab.disabled ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {tab.label}
              {tab.key === 'wallet' && !walletSufficient && (
                <span style={{ fontSize: '0.7rem', color: '#dc2626', display: 'block', fontWeight: 400 }}>Insufficient balance</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {paymentTab === 'wallet' ? (
            <div>
              {walletSufficient ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#15803d', marginBottom: 4 }}>✓ Sufficient Wallet Balance</div>
                  <div style={{ fontSize: '0.82rem', color: '#166534' }}>
                    {customer?.firstName}'s wallet has <strong>{sendSym}{(customer?.walletBalance || 0).toFixed(2)}</strong>, which covers the total of <strong>{sendSym}{calc?.total}</strong>.
                    Clicking below will immediately deduct the amount and process the transaction.
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>✗ Insufficient Wallet Balance</div>
                  <div style={{ fontSize: '0.82rem', color: '#991b1b' }}>
                    {customer?.firstName}'s wallet has <strong>{sendSym}{(customer?.walletBalance || 0).toFixed(2)}</strong>, but the total required is <strong>{sendSym}{calc?.total}</strong>.
                    Please use the payment link option instead, or top up the wallet first.
                  </div>
                </div>
              )}
              <button
                onClick={() => setPopup('wallet')}
                disabled={!walletSufficient}
                style={{
                  width: '100%', padding: '14px',
                  background: walletSufficient ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#d1d5db',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: '0.95rem', fontWeight: 700,
                  cursor: walletSufficient ? 'pointer' : 'not-allowed',
                  boxShadow: walletSufficient ? '0 4px 12px rgba(234,88,12,0.3)' : 'none',
                }}
              >
                Deduct from Wallet Balance — {sendSym}{calc?.total}
              </button>
            </div>
          ) : (
            <div>
              {/* Send All toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                <button
                  onClick={() => { setSendAll(v => !v); if (!sendAll) setSelectedMethods(['instant', 'normal', 'card', 'gpay', 'apay']); }}
                  style={{
                    width: 20, height: 20, borderRadius: 4, border: 'none', flexShrink: 0,
                    background: sendAll ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#e5e7eb',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {sendAll && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}
                </button>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>Send All Payment Options</div>
              </div>

              {/* Individual Method Checkboxes */}
              {!sendAll && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => toggleMethod(m.id)}
                      style={{
                        padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
                        border: selectedMethods.includes(m.id) ? '2px solid #ea580c' : '1px solid #e5e7eb',
                        borderRadius: 8, background: selectedMethods.includes(m.id) ? '#fff7ed' : '#fff',
                        color: selectedMethods.includes(m.id) ? '#ea580c' : '#374151',
                        fontWeight: selectedMethods.includes(m.id) ? 600 : 400,
                        fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Delivery Mode */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Send Via</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ key: 'email', label: '📧 Email', sub: customer?.email }, { key: 'link', label: '🔗 Copy Link', sub: 'Share via WhatsApp etc.' }].map(opt => (
                    <button key={opt.key} onClick={() => setLinkMode(opt.key)} style={{
                      flex: 1, padding: '10px 16px', border: linkMode === opt.key ? '2px solid #ea580c' : '1px solid #e5e7eb',
                      borderRadius: 8, background: linkMode === opt.key ? '#fff7ed' : '#fff',
                      color: linkMode === opt.key ? '#ea580c' : '#374151',
                      fontWeight: linkMode === opt.key ? 700 : 400,
                      fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif", textAlign: 'left',
                    }}>
                      <div>{opt.label}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiry */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Link Expiry</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EXPIRY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setExpiry(opt.value)} style={{
                      padding: '7px 14px', border: expiry === opt.value ? '2px solid #ea580c' : '1px solid #e5e7eb',
                      borderRadius: 20, background: expiry === opt.value ? '#fff7ed' : '#fff',
                      color: expiry === opt.value ? '#ea580c' : '#374151',
                      fontWeight: expiry === opt.value ? 700 : 400,
                      fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setPopup('link')}
                disabled={!sendAll && selectedMethods.length === 0}
                style={{
                  width: '100%', padding: '14px',
                  background: (!sendAll && selectedMethods.length === 0) ? '#e5e7eb' : 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: (!sendAll && selectedMethods.length === 0) ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 10,
                  fontSize: '0.95rem', fontWeight: 700,
                  cursor: (!sendAll && selectedMethods.length === 0) ? 'not-allowed' : 'pointer',
                  boxShadow: (!sendAll && selectedMethods.length === 0) ? 'none' : '0 4px 12px rgba(234,88,12,0.3)',
                }}
              >
                {linkMode === 'email' ? `📧 Send Payment Link to ${customer?.firstName}` : '🔗 Copy Payment Link'}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ marginTop: 20 }}>
        <button onClick={onBack} style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
          ← Back
        </button>
      </div>

      {/* Confirmation Popups */}
      {popup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 36, width: 440, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', fontFamily: "'Inter', sans-serif" }}>
            {popup === 'success' ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1f2937', margin: '0 0 8px' }}>Transaction Complete!</h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 4px' }}>The transaction has been successfully submitted.</p>
                <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 8, padding: '10px 16px', margin: '16px 0', fontSize: '0.82rem', color: '#92400e', fontWeight: 700 }}>
                  Reference: {txRef}
                </div>
                <button onClick={onDone} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
                  Done — Back to Search
                </button>
              </>
            ) : popup === 'wallet' ? (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💰</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2937', margin: '0 0 8px' }}>Confirm Wallet Deduction</h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  Deduct <strong>{sendSym}{calc?.total}</strong> from <strong>{customer?.firstName}'s</strong> wallet and process the transaction immediately?
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button onClick={() => setPopup(null)} style={{ flex: 1, padding: '12px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => setPopup('success')} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                    Confirm Deduction
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{linkMode === 'email' ? '📧' : '🔗'}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2937', margin: '0 0 8px' }}>
                  {linkMode === 'email' ? 'Confirm Send Payment Link' : 'Payment Link Copied!'}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  {linkMode === 'email'
                    ? `Send payment link to ${customer?.email} with ${expiry}-hour expiry?`
                    : `Link expires in ${expiry} hours. Share it with ${customer?.firstName} via WhatsApp or any channel.`}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button onClick={() => setPopup(null)} style={{ flex: 1, padding: '12px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => setPopup('success')} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                    {linkMode === 'email' ? 'Send Link' : 'Done'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OBOStep4Payment;
