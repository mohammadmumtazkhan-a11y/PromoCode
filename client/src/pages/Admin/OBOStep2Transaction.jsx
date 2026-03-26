import React, { useState } from 'react';
import { MOCK_EXCHANGE_RATES, MOCK_FEES } from './oboMockData';

const CURRENCY_DETAILS = {
  GBP: { name: 'British Pound', flag: '🇬🇧', symbol: '£' },
  USD: { name: 'US Dollar', flag: '🇺🇸', symbol: '$' },
  EUR: { name: 'Euro', flag: '🇪🇺', symbol: '€' },
  NGN: { name: 'Nigerian Naira', flag: '🇳🇬', symbol: '₦' },
  GHS: { name: 'Ghanaian Cedi', flag: '🇬🇭', symbol: '₵' },
  KES: { name: 'Kenyan Shilling', flag: '🇰🇪', symbol: 'KSh' },
  INR: { name: 'Indian Rupee', flag: '🇮🇳', symbol: '₹' },
  ZAR: { name: 'South African Rand', flag: '🇿🇦', symbol: 'R' },
};

const CURRENCIES = Object.keys(CURRENCY_DETAILS);

const getRate = (from, to) => {
  const key = `${from}-${to}`;
  const revKey = `${to}-${from}`;
  if (MOCK_EXCHANGE_RATES[key]) return MOCK_EXCHANGE_RATES[key];
  if (MOCK_EXCHANGE_RATES[revKey]) return 1 / MOCK_EXCHANGE_RATES[revKey];
  return 1;
};

const inputStyle = {
  width: '100%', padding: '14px 16px',
  border: '1px solid #d1d5db', borderRadius: 10,
  fontSize: '0.95rem', outline: 'none',
  fontFamily: "'Inter', sans-serif", fontWeight: 600,
  color: '#111827', background: '#fff',
  boxSizing: 'border-box',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const CurrencySelect = ({ value, onChange, label }) => (
  <div style={{ flex: 1, position: 'relative' }}>
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...inputStyle,
        appearance: 'none',
        cursor: 'pointer',
      }}
      onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.1)'; }}
      onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
    >
      {CURRENCIES.map(c => {
        const d = CURRENCY_DETAILS[c];
        return <option key={c} value={c}>{d.flag} {c} — {d.name}</option>;
      })}
    </select>
    <span style={{ position: 'absolute', right: 16, top: 40, pointerEvents: 'none', color: '#9ca3af', fontSize: '0.8rem' }}>▼</span>
  </div>
);

const OBOStep2Transaction = ({ customer, txData, ddCompleted, onBack, onContinue }) => {
  const [sendCurrency, setSendCurrency] = useState(txData?.sendCurrency || 'GBP');
  const [receiveCurrency, setReceiveCurrency] = useState(txData?.receiveCurrency || 'NGN');
  const [amount, setAmount] = useState(txData?.amount || '');
  const [method, setMethod] = useState(txData?.method || 'Bank Deposit');
  const [addDD, setAddDD] = useState(txData?.addDD || false);
  const [kycThreshold, setKycThreshold] = useState(null); // null | 1 | 2
  const [errors, setErrors] = useState({});

  const parsedAmount = Number(amount);
  const isValidAmount = amount && !isNaN(amount) && parsedAmount > 0;
  
  const calc = React.useMemo(() => {
    if (!isValidAmount) return null;
    const feeConfig = MOCK_FEES[method] || MOCK_FEES['Bank Deposit'];
    const fee = feeConfig.fixed + (parsedAmount * feeConfig.percent / 100);
    const amountAfterFee = parsedAmount - fee;
    const rate = getRate(sendCurrency, receiveCurrency);
    const theyReceive = amountAfterFee * rate;
    return {
      amountSent: amountAfterFee.toFixed(2),
      fee: fee.toFixed(2),
      rate: rate.toFixed(4),
      total: parsedAmount.toFixed(2),
      theyReceive: theyReceive.toFixed(2),
    };
  }, [parsedAmount, sendCurrency, receiveCurrency, method, isValidAmount]);

  const handleContinue = () => {
    const e = {};
    if (!amount || isNaN(amount) || Number(amount) <= 0) e.amount = 'Enter a valid amount';
    if (Object.keys(e).length) { setErrors(e); return; }

    const amountInGBP = sendCurrency === 'GBP' ? Number(amount) : Number(amount) * getRate(sendCurrency, 'GBP');

    if (amountInGBP >= 10000) {
      setKycThreshold(2);
      return;
    }
    if (amountInGBP >= 5000) {
      setKycThreshold(1);
      return;
    }

    // Below threshold — proceed normally
    onContinue({ sendCurrency, receiveCurrency, amount: Number(amount), method, addDD, calc, requiresFullKyc: false });
  };

  const handleKycOptionSelected = (selectedKycType) => {
    const requiresDD = kycThreshold === 2;
    onContinue({
      sendCurrency, receiveCurrency, amount: Number(amount), method,
      addDD: requiresDD || addDD,
      calc,
      requiresFullKyc: true,
      kycType: selectedKycType,
    });
    setKycThreshold(null);
  };

  const sc = CURRENCY_DETAILS[sendCurrency];
  const rc = CURRENCY_DETAILS[receiveCurrency];



  return (
    <div>
      {/* Customer Banner */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb',
        borderRadius: 16, padding: '16px 24px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 36,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)'
      }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(234,88,12,0.25)' }}>
          {customer.firstName[0]}{customer.lastName[0]}
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>{customer.firstName} {customer.lastName}</div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500, marginTop: 4 }}>
            <span style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', color: '#4b5563' }}>{customer.id}</span>
            <span style={{ marginLeft: 8 }}>{customer.email}</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right', background: '#fff7ed', padding: '10px 16px', borderRadius: 12, border: '1px solid #ffedd5' }}>
          <div style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Wallet Balance</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ea580c' }}>
            £{customer.walletBalance?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>

      {/* Two-column layout: form left, calc right */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>

        {/* LEFT — Form Fields */}
        <div style={{ flex: '1 1 400px', minWidth: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 24px' }}>
            Transaction Details
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <CurrencySelect label="You Send" value={sendCurrency} onChange={setSendCurrency} />
            <CurrencySelect label="They Receive" value={receiveCurrency} onChange={setReceiveCurrency} />
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
              Amount to Send *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                fontSize: '1.05rem', fontWeight: 800, color: '#111827',
              }}>
                {sc?.symbol}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                style={{ 
                  ...inputStyle, paddingLeft: 42, fontSize: '1.05rem', fontWeight: 700,
                  border: errors.amount ? '1px solid #dc2626' : '1px solid #d1d5db',
                }}
                onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = errors.amount ? '#dc2626' : '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
                value={amount}
                placeholder="0.00"
                onChange={e => { setAmount(e.target.value); setErrors({}); }}
              />
            </div>
            {errors.amount && <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, marginTop: 6 }}>{errors.amount}</div>}
          </div>

          {/* Receiving Method */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: 12 }}>
              Receiving Method
            </label>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Bank Deposit', 'Mobile Money'].map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    flex: 1, padding: '16px', position: 'relative', overflow: 'hidden',
                    border: method === m ? '2px solid #ea580c' : '1px solid #e5e7eb',
                    borderRadius: 12, background: method === m ? '#fff7ed' : '#fff',
                    color: method === m ? '#ea580c' : '#4b5563',
                    fontWeight: method === m ? 700 : 600,
                    fontSize: '0.95rem', cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: method === m ? '0 4px 12px rgba(234,88,12,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{m === 'Bank Deposit' ? '🏦' : '📱'}</span> {m}
                  {method === m && <div style={{ position: 'absolute', top: -14, right: -14, background: '#ea580c', color: '#fff', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', paddingBottom: 6, paddingLeft: 8, fontSize: '0.8rem' }}>✓</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Due Diligence — hidden if already completed during KYC */}
          {ddCompleted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: '1.1rem' }}>✅</span>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534' }}>Due Diligence Completed</div>
                <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>Enhanced compliance review was completed during KYC</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
              <button
                onClick={() => setAddDD(v => !v)}
                style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: addDD ? 'none' : '1px solid #d1d5db',
                  background: addDD ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {addDD && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}
              </button>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>Additional Due Diligence Required</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Check if this transaction requires enhanced compliance review</div>
              </div>
            </div>
          )}

          {/* Threshold Tip */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 16px', marginBottom: 24,
            background: '#eff6ff', borderRadius: 10,
            border: '1px solid #bfdbfe',
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>💡</span>
            <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.5, fontWeight: 500 }}>
              <strong style={{ fontWeight: 700 }}>Tip:</strong> Full KYC triggers at <strong style={{ fontWeight: 700 }}>GBP 5,000</strong> and Due Diligence at <strong style={{ fontWeight: 700 }}>GBP 10,000</strong>.
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={onBack} style={{
              padding: '10px 20px', background: '#fff', color: '#374151',
              border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem',
              fontWeight: 600, cursor: 'pointer',
            }}>
              ← Back
            </button>
            <button onClick={handleContinue} style={{
              padding: '11px 32px',
              background: calc ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#d1d5db',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 700, cursor: calc ? 'pointer' : 'not-allowed',
              boxShadow: calc ? '0 2px 8px rgba(234,88,12,0.25)' : 'none',
            }}>
              Continue → Select Recipient
            </button>
          </div>
        </div>

        {/* RIGHT — Live Calculation Panel */}
        <div style={{ flex: '1 1 350px', minWidth: 280, position: 'sticky', top: 24 }}>
          {calc ? (
            <div style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #0f172a 100%)',
              borderRadius: 20, padding: 32,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)',
              color: '#f9fafb',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Live Transaction Summary
                </div>
              </div>
              {[
                { label: 'Amount Sent', value: `${sc?.symbol}${calc.amountSent}`, sub: 'After fees deducted' },
                { label: 'Transfer Fee', value: `${sc?.symbol}${calc.fee}`, sub: method },
                { label: 'Exchange Rate', value: `1 ${sendCurrency} = ${calc.rate} ${receiveCurrency}`, sub: 'Live rate' },
                { label: 'Total to Pay', value: `${sc?.symbol}${calc.total}`, bold: true },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: row.bold ? '#fff' : '#9ca3af', fontWeight: row.bold ? 700 : 500 }}>{row.label}</div>
                    {row.sub && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>{row.sub}</div>}
                  </div>
                  <div style={{ fontSize: row.bold ? '1.2rem' : '1rem', fontWeight: row.bold ? 800 : 600, color: row.bold ? '#f97316' : '#fff' }}>
                    {row.value}
                  </div>
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, marginTop: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: '0.85rem', color: '#d1d5db', fontWeight: 600 }}>Recipient Gets</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12 }}>{rc?.name}</div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em', marginTop: 8 }}>
                  {rc?.symbol}{Number(calc.theyReceive).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#f9fafb', borderRadius: 20, padding: '48px 32px',
              border: '2px dashed #e5e7eb', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ width: 64, height: 64, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 20 }}>💱</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>Live Rate Calculator</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.5, maxWidth: 260 }}>Enter an amount on the left to instantly calculate the exchange rate, transfer fees, and the final recipient amount.</div>
            </div>
          )}
        </div>

      </div>

      {/* KYC Threshold Modal */}
      {kycThreshold !== null && (() => {
        const isThreshold2 = kycThreshold === 2;
        const thresholdAmount = isThreshold2 ? '£10,000' : '£5,000';
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{
              background: '#fff', padding: 32, borderRadius: 16, maxWidth: 520, width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              textAlign: 'center',
              position: 'relative',
            }}>
              {/* Close Button */}
              <button
                onClick={() => setKycThreshold(null)}
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
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px' }}>⚠️</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1f2937', margin: '0 0 12px' }}>KYC Threshold Reached</h3>
              <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: '0 0 8px', lineHeight: 1.5 }}>
                The transaction amount exceeds {thresholdAmount}. Full KYC{isThreshold2 ? ' and Due Diligence are' : ' is'} required before you can proceed.
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 24px' }}>
                Please select a KYC verification option below:
              </p>

              {/* KYC Option Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {/* Option 1: Full KYC without Selfie */}
                <button
                  onClick={() => handleKycOptionSelected('full')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                    background: '#fff', border: '2px solid #e5e7eb', borderRadius: 12,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.background = '#fff7ed'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}>
                    🆔
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
                      Full KYC without Selfie Verification
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.4 }}>
                      ID document upload and AML check{isThreshold2 ? ' + Due Diligence review' : ''}. No selfie verification required.
                    </div>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '1.2rem', flexShrink: 0 }}>→</span>
                </button>

                {/* Option 2: Full KYC with Selfie */}
                <button
                  onClick={() => handleKycOptionSelected('fullWithSelfie')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                    background: '#fff', border: '2px solid #e5e7eb', borderRadius: 12,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.background = '#fff7ed'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}>
                    🤳
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
                      Full KYC with Selfie Verification
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.4 }}>
                      Complete verification — ID document, AML check, and selfie{isThreshold2 ? ' + Due Diligence review' : ''}.
                    </div>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '1.2rem', flexShrink: 0 }}>→</span>
                </button>
              </div>

              {isThreshold2 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a',
                  marginBottom: 16,
                }}>
                  <span style={{ fontSize: '1rem' }}>📋</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>
                    Due Diligence is mandatory for transactions over £10,000 and will be included in both options.
                  </span>
                </div>
              )}

              <button
                onClick={() => setKycThreshold(null)}
                style={{
                  padding: '10px 24px', background: '#fff', color: '#374151',
                  border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem',
                  fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default OBOStep2Transaction;
