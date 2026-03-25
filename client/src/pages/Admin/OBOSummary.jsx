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
  const [txRef] = useState(`TXN-${Date.now().toString().slice(-8)}`);
  const [summarySuccess, setSummarySuccess] = useState(null); // null | 'sendAll' | 'wallet'

  const calc = txData?.calc;
  const sendCur = txData?.sendCurrency || 'GBP';
  const recvCur = txData?.receiveCurrency || 'NGN';
  const sendSym = CURRENCY_SYMBOLS[sendCur] || '£';
  const recvSym = CURRENCY_SYMBOLS[recvCur] || '₦';
  const walletBalance = customer?.walletBalance || 0;
  const walletCur = customer?.walletCurrency || sendCur;

  const cellStyle = {
    padding: '12px 16px',
    fontSize: '0.875rem',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  };
  const labelCell = { ...cellStyle, fontWeight: 500, color: '#6b7280', width: '45%' };
  const valueCell = { ...cellStyle, fontWeight: 600, textAlign: 'right' };

  const orangeBtn = {
    width: '100%', padding: '13px 20px',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
  };

  // ── Select Payment Options View ──
  if (view === 'selectPayment') {
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={() => setView('summary')} style={{ padding: '8px 18px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            ← Back
          </button>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Payment</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 28, alignItems: 'start' }}>
          {/* LEFT — Payment Options */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {PAYMENT_OPTIONS.map(opt => {
                const sel = selectedPayment === opt.id;
                const walletLabel = opt.isWallet
                  ? `${opt.label} (Balance: ${sendCur} ${walletBalance.toFixed(0)})`
                  : opt.label;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedPayment(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Radio */}
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 14,
                      border: sel ? '2px solid #ea580c' : '2px solid #d1d5db',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ea580c' }} />}
                    </div>

                    {/* Card */}
                    <div style={{
                      flex: 1, padding: '14px 18px',
                      border: sel ? '2px solid #ea580c' : '1px solid #e5e7eb',
                      borderRadius: 10, background: sel ? '#fff7ed' : '#fff',
                    }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>
                        {walletLabel}
                        {opt.sub && <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#6b7280' }}> {opt.sub}</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 4 }}>
                        You Pay {sendCur} {calc?.total || '0'} ({sendCur} {calc?.amountSent || '0'} + {sendCur} {calc?.fee || '0'} in Fees)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expiry Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: '0.875rem', color: '#374151' }}>
              <span>Allow the customer</span>
              <input
                type="text"
                value={expiryHours}
                onChange={e => setExpiryHours(e.target.value)}
                style={{
                  width: 44, padding: '6px 8px', textAlign: 'center',
                  border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.875rem',
                  outline: 'none', fontFamily: "'Inter', sans-serif",
                }}
              />
              <select
                value={expiryUnit}
                onChange={e => setExpiryUnit(e.target.value)}
                style={{
                  padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6,
                  fontSize: '0.875rem', outline: 'none', fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                }}
              >
                <option value="Hours">Hours</option>
                <option value="Minutes">Minutes</option>
                <option value="Days">Days</option>
              </select>
              <span>to make the payment</span>
            </div>

            {/* Continue */}
            <button
              onClick={() => setShowSuccess(true)}
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
          </div>

          {/* RIGHT — Amount Summary */}
          <div style={{ border: '1px solid #c7d2fe', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.9rem', color: '#1f2937', borderBottom: '1px solid #e5e7eb' }}>
              Amount
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={labelCell}>You Send</td>
                  <td style={valueCell}>{calc?.total || '0.00'} {sendCur}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Amount Sent</td>
                  <td style={valueCell}>{calc?.amountSent || '0.00'} {sendCur}</td>
                </tr>
                <tr>
                  <td style={labelCell}>They Receive</td>
                  <td style={valueCell}>{Number(calc?.theyReceive || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })} {recvCur}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Transaction Fee</td>
                  <td style={valueCell}>{calc?.fee || '0.00'} {sendCur}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Exchange Rate</td>
                  <td style={valueCell}>1 {sendCur} = {calc?.rate || '—'} {recvCur}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Collection Method</td>
                  <td style={valueCell}>{txData?.method || 'Bank Deposit'}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', textAlign: 'right', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setView('summary')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                View Details
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
            }}>
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
        <button onClick={onBack} style={{ padding: '8px 18px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
          ← Back
        </button>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Summary</h2>
      </div>

      {/* Two-column layout: Amount + Recipient */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 32 }}>

        {/* Amount Table */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>Amount</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <tbody>
              <tr>
                <td style={labelCell}>You Send</td>
                <td style={valueCell}>{sendSym}{calc?.total || '0.00'} {sendCur}</td>
              </tr>
              <tr>
                <td style={labelCell}>Amount Sent</td>
                <td style={valueCell}>{sendSym}{calc?.amountSent || '0.00'} {sendCur}</td>
              </tr>
              <tr>
                <td style={labelCell}>They Receive</td>
                <td style={valueCell}>{recvSym}{Number(calc?.theyReceive || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })} {recvCur}</td>
              </tr>
              <tr>
                <td style={labelCell}>Rate</td>
                <td style={valueCell}>1 {sendCur} = {calc?.rate || '—'} {recvCur}</td>
              </tr>
              <tr>
                <td style={labelCell}>Transaction Fee</td>
                <td style={valueCell}>{sendSym}{calc?.fee || '0.00'} {sendCur}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recipient Table */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>Recipient</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <tbody>
              <tr>
                <td style={labelCell}>Service Type</td>
                <td style={valueCell}>{txData?.method || 'Bank Deposit'}</td>
              </tr>
              <tr>
                <td style={labelCell}>Recipient Type</td>
                <td style={valueCell}>Individual</td>
              </tr>
              <tr>
                <td style={labelCell}>Country</td>
                <td style={valueCell}>{recipient?.country || '—'}</td>
              </tr>
              <tr>
                <td style={labelCell}>Full Name</td>
                <td style={valueCell}>{recipient?.firstName} {recipient?.lastName}</td>
              </tr>
              <tr>
                <td style={labelCell}>Bank Name</td>
                <td style={valueCell}>{recipient?.bank || '—'}</td>
              </tr>
              <tr>
                <td style={labelCell}>Account Number</td>
                <td style={valueCell}>{recipient?.accountNumber || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Payment Link Button */}
      <button
        onClick={() => setShowPopup(true)}
        style={{
          padding: '14px 40px',
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          color: '#fff', border: 'none', borderRadius: 8,
          fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
        }}
      >
        Send Payment Link to the Customer
      </button>

      {/* Choose an Option Popup */}
      {showPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '32px 28px',
            width: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
            fontFamily: "'Inter', sans-serif",
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2937', textAlign: 'center', margin: '0 0 28px' }}>
              Choose an Option!
            </h3>

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
          }}>
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
            <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 24px' }}>
              Transaction Reference: <strong style={{ color: '#1f2937' }}>{txRef}</strong>
            </p>
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
