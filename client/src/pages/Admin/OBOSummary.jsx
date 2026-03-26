import React, { useState } from 'react';

const CURRENCY_SYMBOLS = { GBP: '£', USD: '$', EUR: '€', NGN: '₦', GHS: '₵', KES: 'KSh', INR: '₹', ZAR: 'R' };

const PAYMENT_OPTIONS = [
  { id: 'wallet', label: 'Customer Wallet', sub: null, isWallet: true },
  { id: 'instant', label: 'Instant Bank Transfer', sub: null },
  { id: 'normal', label: 'Normal Bank Transfer', sub: null },
  { id: 'card', label: 'Credit/Debit Card', sub: null },
  { id: 'gpay', label: 'Google Pay', sub: '(Only Master and Visa cards accepted)' },
];

const OBOSummary = ({ customer, txData, recipient, onBack, onContinue }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [view, setView] = useState('summary'); // 'summary' | 'selectPayment'
  const [selectedPayment, setSelectedPayment] = useState('instant');
  const [expiryHours, setExpiryHours] = useState('04');
  const [expiryUnit, setExpiryUnit] = useState('Hours');
  const [showSuccess, setShowSuccess] = useState(false);
  const [txRef] = useState(() => `TXN-${Date.now().toString().slice(-8)}`);
  const [summarySuccess, setSummarySuccess] = useState(null); // null | 'sendAll' | 'wallet'

  const calc = txData?.calc;
  const sendCur = txData?.sendCurrency || 'GBP';
  const recvCur = txData?.receiveCurrency || 'NGN';
  const sendSym = CURRENCY_SYMBOLS[sendCur] || '£';
  const recvSym = CURRENCY_SYMBOLS[recvCur] || '₦';
  const walletBalance = customer?.walletBalance || 0;
  const walletCur = customer?.walletCurrency || sendCur;

  const summaryRowStyle = {
    display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px dashed #e5e7eb',
    alignItems: 'center'
  };
  const summaryLabelStyle = { fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 };
  const summaryValueStyle = { fontSize: '0.9rem', color: '#1f2937', fontWeight: 600, textAlign: 'right', flex: 1, paddingLeft: 16 };

  const orangeBtn = {
    width: '100%', padding: '14px 20px',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
    transition: 'transform 0.1s ease',
  };

  // ── Select Payment Options View ──
  if (view === 'selectPayment') {
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={() => setView('summary')} style={{ padding: '8px 16px', background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            ← Back
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>Payment</h2>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
          {/* LEFT — Payment Options */}
          <div style={{ flex: '1 1 400px', minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {PAYMENT_OPTIONS.filter(opt => {
                if (opt.isWallet && (!walletBalance || walletBalance <= 0)) return false;
                return true;
              }).map(opt => {
                const sel = selectedPayment === opt.id;
                const walletLabel = opt.isWallet
                  ? `${opt.label} (Balance: ${sendCur} ${walletBalance.toFixed(0)})`
                  : opt.label;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedPayment(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      cursor: 'pointer',
                      padding: '20px 24px',
                      background: sel ? '#fff7ed' : '#ffffff',
                      border: sel ? '2px solid #ea580c' : '1px solid #e5e7eb',
                      borderRadius: 16,
                      boxShadow: sel ? '0 4px 14px rgba(234,88,12,0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Radio Button */}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      border: sel ? '7px solid #ea580c' : '2px solid #d1d5db',
                      background: '#fff',
                      transition: 'border 0.2s ease',
                      boxShadow: sel ? '0 0 0 4px rgba(234,88,12,0.1)' : 'none',
                    }} />

                    {/* Content */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: sel ? '#9a3412' : '#1f2937' }}>
                        {walletLabel}
                        {opt.sub && <span style={{ fontWeight: 400, fontSize: '0.85rem', color: sel ? '#c2410c' : '#6b7280' }}> {opt.sub}</span>}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: sel ? '#ea580c' : '#6b7280', fontWeight: 500 }}>
                        You Pay {sendCur} {calc?.total || '0'} <span style={{opacity: 0.8}}>({sendCur} {calc?.amountSent || '0'} + {sendCur} {calc?.fee || '0'} in Fees)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expiry Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26, fontSize: '0.9rem', color: '#4b5563', padding: '0 8px' }}>
              <span style={{ fontWeight: 500 }}>Allow the customer</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="text"
                  value={expiryHours}
                  onChange={e => setExpiryHours(e.target.value)}
                  style={{
                    width: 50, padding: '10px 12px', textAlign: 'center',
                    border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem',
                    outline: 'none', fontFamily: "'Inter', sans-serif", fontWeight: 600,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }}
                />
                <select
                  value={expiryUnit}
                  onChange={e => setExpiryUnit(e.target.value)}
                  style={{
                    padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8,
                    fontSize: '0.95rem', outline: 'none', fontFamily: "'Inter', sans-serif",
                    cursor: 'pointer', fontWeight: 600, backgroundColor: '#f9fafb',
                  }}
                >
                  <option value="Hours">Hours</option>
                  <option value="Minutes">Minutes</option>
                  <option value="Days">Days</option>
                </select>
              </div>
              <span style={{ fontWeight: 500 }}>to make the payment</span>
            </div>

            {/* Continue */}
            <button
              onClick={() => setShowSuccess(true)}
              style={{
                padding: '16px 48px',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                boxShadow: '0 4px 14px rgba(234,88,12,0.25)',
                transition: 'transform 0.1s ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Continue
            </button>
          </div>

          {/* RIGHT — Amount Summary */}
          <div style={{ flex: '1 1 320px', minWidth: 280, background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: 16, padding: '24px 28px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1c1917', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>💷</div>
                Amount Breakdown
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={summaryRowStyle}>
                <div style={summaryLabelStyle}>You Send</div>
                <div style={summaryValueStyle}>{sendSym}{calc?.total || '0.00'} {sendCur}</div>
              </div>
              <div style={summaryRowStyle}>
                <div style={summaryLabelStyle}>Amount Sent</div>
                <div style={summaryValueStyle}>{sendSym}{calc?.amountSent || '0.00'} {sendCur}</div>
              </div>
              <div style={summaryRowStyle}>
                <div style={summaryLabelStyle}>Transaction Fee</div>
                <div style={{ ...summaryValueStyle, color: '#ea580c' }}>{sendSym}{calc?.fee || '0.00'} {sendCur}</div>
              </div>
              <div style={summaryRowStyle}>
                <div style={summaryLabelStyle}>Exchange Rate</div>
                <div style={summaryValueStyle}>1 {sendCur} = {calc?.rate || '—'} {recvCur}</div>
              </div>
              <div style={summaryRowStyle}>
                <div style={summaryLabelStyle}>Collection Method</div>
                <div style={summaryValueStyle}>{txData?.method || 'Bank Deposit'}</div>
              </div>
              
              <div style={{ ...summaryRowStyle, borderBottom: 'none', marginTop: 8, background: '#fff', padding: '16px', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ ...summaryLabelStyle, color: '#1f2937', fontWeight: 700, fontSize: '0.95rem' }}>They Receive</div>
                  <div style={{ ...summaryValueStyle, color: '#059669', fontSize: '1.2rem', fontWeight: 800 }}>{recvSym}{Number(calc?.theyReceive || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })} {recvCur}</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button 
                onClick={() => setView('summary')} 
                style={{ 
                  background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#4b5563', 
                  padding: '10px 24px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, 
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif", width: '100%',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#e5e7eb'}
                onMouseOut={e => e.currentTarget.style.background = '#f3f4f6'}
              >
                View Full Details
              </button>
            </div>
          </div>
        </div>

        {/* Success Confirmation Popup */}
        {showSuccess && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '36px 32px',
              width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
              fontFamily: "'Inter', sans-serif", textAlign: 'center',
              position: 'relative',
            }}>
              {/* Close Button */}
              <button
                onClick={() => { setShowSuccess(false); }}
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
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#15803d', margin: '0 0 8px' }}>
                Payment Link Sent Successfully!
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#166534', margin: '0 0 8px' }}>
                A payment link has been sent to <strong>{customer?.firstName} {customer?.lastName}</strong> via email.
              </p>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 20px' }}>
                Transaction Reference: <strong style={{ color: '#1f2937' }}>{txRef}</strong>
              </p>
              <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 24px' }}>
                The customer has <strong>{expiryHours} {expiryUnit}</strong> to complete the payment using <strong>{PAYMENT_OPTIONS.find(o => o.id === selectedPayment)?.label || selectedPayment}</strong>.
              </p>
              <button
                onClick={() => { setShowSuccess(false); onContinue('done'); }}
                style={{
                  ...orangeBtn,
                  width: 'auto',
                  padding: '12px 40px',
                  display: 'inline-block',
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Summary View (default) ──
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={onBack} style={{ padding: '8px 16px', background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          ← Back
        </button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>Summary</h2>
      </div>

      {/* Two-column layout: Amount + Recipient */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginBottom: 36 }}>

        {/* Amount Card */}
        <div style={{ flex: '1 1 400px', minWidth: 0, background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: 16, padding: '24px 28px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1c1917', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>💷</div>
            Amount Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={summaryRowStyle}>
              <div style={summaryLabelStyle}>You Send</div>
              <div style={summaryValueStyle}>{sendSym}{calc?.total || '0.00'} {sendCur}</div>
            </div>
            <div style={summaryRowStyle}>
              <div style={summaryLabelStyle}>Amount Sent</div>
              <div style={summaryValueStyle}>{sendSym}{calc?.amountSent || '0.00'} {sendCur}</div>
            </div>
            <div style={summaryRowStyle}>
              <div style={summaryLabelStyle}>Transaction Fee</div>
              <div style={{ ...summaryValueStyle, color: '#ea580c' }}>{sendSym}{calc?.fee || '0.00'} {sendCur}</div>
            </div>
            <div style={summaryRowStyle}>
              <div style={summaryLabelStyle}>Exchange Rate</div>
              <div style={summaryValueStyle}>1 {sendCur} = {calc?.rate || '—'} {recvCur}</div>
            </div>
            <div style={{ ...summaryRowStyle, borderBottom: 'none', marginTop: 8, background: '#fff', padding: '16px', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb' }}>
              <div style={{ ...summaryLabelStyle, color: '#1f2937', fontWeight: 700, fontSize: '0.95rem' }}>They Receive</div>
              <div style={{ ...summaryValueStyle, color: '#059669', fontSize: '1.2rem', fontWeight: 800 }}>{recvSym}{Number(calc?.theyReceive || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })} {recvCur}</div>
            </div>
          </div>
        </div>

        {/* Recipient Card */}
        <div style={{ flex: '1 1 400px', minWidth: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px 28px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👤</div>
            Recipient Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={summaryRowStyle}>
              <div style={summaryLabelStyle}>Service Type</div>
              <div style={summaryValueStyle}>{txData?.method || 'Bank Deposit'}</div>
            </div>
            <div style={summaryRowStyle}>
              <div style={summaryLabelStyle}>Recipient Type</div>
              <div style={summaryValueStyle}>Individual</div>
            </div>
            <div style={summaryRowStyle}>
              <div style={summaryLabelStyle}>Country</div>
              <div style={summaryValueStyle}>{recipient?.country || '—'}</div>
            </div>
            <div style={summaryRowStyle}>
              <div style={summaryLabelStyle}>Full Name</div>
              <div style={summaryValueStyle}>{recipient?.firstName} {recipient?.lastName}</div>
            </div>
            <div style={summaryRowStyle}>
              <div style={summaryLabelStyle}>Bank Name</div>
              <div style={summaryValueStyle}>{recipient?.bank || '—'}</div>
            </div>
            <div style={{ ...summaryRowStyle, borderBottom: 'none' }}>
              <div style={summaryLabelStyle}>Account Number</div>
              <div style={summaryValueStyle}>{recipient?.accountNumber || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Payment Link Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button
          onClick={() => setShowPopup(true)}
          style={{
            padding: '16px 40px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 8px 16px rgba(234,88,12,0.25)',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '1.2rem' }}>🔗</span> Send Payment Link to the Customer
        </button>
      </div>

      {/* Choose an Option Popup */}
      {showPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '36px 32px',
            width: 520, maxWidth: '92vw', boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
            fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
            position: 'relative',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowPopup(false)}
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', textAlign: 'center', margin: '0 0 28px' }}>
              Choose an Option!
            </h3>

            {/* Link Validity Selector */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', marginBottom: 24, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.88rem', color: '#4b5563', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 500 }}>Allow the customer</span>
                <input
                  type="text"
                  value={expiryHours}
                  onChange={e => setExpiryHours(e.target.value)}
                  style={{
                    width: 44, padding: '7px 8px', textAlign: 'center',
                    border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.92rem',
                    outline: 'none', fontFamily: "'Inter', sans-serif", fontWeight: 700,
                    background: '#fff', boxSizing: 'border-box',
                  }}
                />
                <select
                  value={expiryUnit}
                  onChange={e => setExpiryUnit(e.target.value)}
                  style={{
                    padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8,
                    fontSize: '0.92rem', outline: 'none', fontFamily: "'Inter', sans-serif",
                    cursor: 'pointer', fontWeight: 600, backgroundColor: '#fff',
                  }}
                >
                  <option value="Hours">Hours</option>
                  <option value="Minutes">Minutes</option>
                  <option value="Days">Days</option>
                </select>
                <span style={{ fontWeight: 500 }}>to make the payment</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <button onClick={() => { setShowPopup(false); setSummarySuccess('sendAll'); }} style={orangeBtn}>
                Send All Payment Options
              </button>
              <button onClick={() => { setShowPopup(false); setView('selectPayment'); }}
                style={{ ...orangeBtn, background: '#fff', color: '#ea580c', border: '2px solid #ea580c', boxShadow: 'none' }}>
                Select Payment Option to send
              </button>
            </div>

            {/* Wallet Section — only shown if sufficient balance */}
            {walletBalance >= Number(calc?.total || 0) && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 18 }}>
                <div
                  onClick={() => setUseWallet(w => !w)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14 }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 4,
                    border: useWallet ? 'none' : '1px solid #d1d5db',
                    background: useWallet ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {useWallet && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>
                    Use Wallet {'{'}Balance: {walletCur} {walletBalance.toFixed(2)}{'}'}
                  </span>
                </div>

                <button
                  onClick={() => { setShowPopup(false); setSummarySuccess('wallet'); }}
                  disabled={!useWallet}
                  style={{
                    ...orangeBtn,
                    background: useWallet ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#d1d5db',
                    cursor: useWallet ? 'pointer' : 'not-allowed',
                    boxShadow: useWallet ? '0 2px 8px rgba(234,88,12,0.25)' : 'none',
                  }}
                >
                  Deduct from wallet
                </button>
              </div>
            )}

            <button
              onClick={() => setShowPopup(false)}
              style={{ width: '100%', marginTop: 14, padding: '10px', background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary Success Popup (Send All / Wallet) */}
      {summarySuccess && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '36px 32px',
            width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
            fontFamily: "'Inter', sans-serif", textAlign: 'center',
            position: 'relative',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSummarySuccess(null)}
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
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#15803d', margin: '0 0 8px' }}>
              {summarySuccess === 'wallet' ? 'Amount Deducted Successfully!' : 'Payment Link Sent Successfully!'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#166534', margin: '0 0 8px' }}>
              {summarySuccess === 'wallet'
                ? <>{sendSym}{calc?.total} has been deducted from <strong>{customer?.firstName} {customer?.lastName}</strong>'s wallet.</>
                : <>All available payment methods have been emailed to <strong>{customer?.email || `${customer?.firstName} ${customer?.lastName}`}</strong>.</>
              }
            </p>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 8px' }}>
              Transaction Reference: <strong style={{ color: '#1f2937' }}>{txRef}</strong>
            </p>
            {summarySuccess === 'sendAll' && (
              <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 24px' }}>
                The customer has <strong>{expiryHours} {expiryUnit}</strong> to complete the payment.
              </p>
            )}
            {summarySuccess === 'wallet' && <div style={{ marginBottom: 24 }} />}
            <button
              onClick={() => { setSummarySuccess(null); onContinue('done'); }}
              style={{ ...orangeBtn, width: 'auto', padding: '12px 40px', display: 'inline-block' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OBOSummary;
