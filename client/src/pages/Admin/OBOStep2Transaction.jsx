import React, { useState, useEffect } from 'react';
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

const OBOStep2Transaction = ({ customer, txData, ddCompleted, onBack, onContinue }) => {
  const [sendCurrency, setSendCurrency] = useState(txData?.sendCurrency || 'GBP');
  const [receiveCurrency, setReceiveCurrency] = useState(txData?.receiveCurrency || 'NGN');
  const [amount, setAmount] = useState(txData?.amount || '');
  const [method, setMethod] = useState(txData?.method || 'Bank Deposit');
  const [addDD, setAddDD] = useState(txData?.addDD || false);
  const [calc, setCalc] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) { setCalc(null); return; }
    const numAmount = Number(amount);
    const feeConfig = MOCK_FEES[method];
    const fee = feeConfig.fixed + (numAmount * feeConfig.percent / 100);
    const amountAfterFee = numAmount - fee;
    const rate = getRate(sendCurrency, receiveCurrency);
    const theyReceive = amountAfterFee * rate;
    setCalc({
      amountSent: amountAfterFee.toFixed(2),
      fee: fee.toFixed(2),
      rate: rate.toFixed(4),
      total: numAmount.toFixed(2),
      theyReceive: theyReceive.toFixed(2),
    });
  }, [amount, sendCurrency, receiveCurrency, method]);

  const handleContinue = () => {
    const e = {};
    if (!amount || isNaN(amount) || Number(amount) <= 0) e.amount = 'Enter a valid amount';
    if (Object.keys(e).length) { setErrors(e); return; }
    onContinue({ sendCurrency, receiveCurrency, amount: Number(amount), method, addDD, calc });
  };

  const sc = CURRENCY_DETAILS[sendCurrency];
  const rc = CURRENCY_DETAILS[receiveCurrency];

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    border: '1px solid #e5e7eb', borderRadius: 8,
    fontSize: '0.9rem', outline: 'none',
    fontFamily: "'Inter', sans-serif",
    color: '#1f2937', background: '#fff',
    boxSizing: 'border-box',
  };

  const CurrencySelect = ({ value, onChange, label }) => (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          ...inputStyle,
          appearance: 'none',
          backgroundImage: 'none',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {CURRENCIES.map(c => {
          const d = CURRENCY_DETAILS[c];
          return <option key={c} value={c}>{d.flag} {c} — {d.name}</option>;
        })}
      </select>
    </div>
  );

  return (
    <div>
      {/* Customer Banner */}
      <div style={{
        background: '#fff7ed', border: '1px solid #ffedd5',
        borderRadius: 10, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
          {customer.firstName[0]}{customer.lastName[0]}
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1f2937' }}>{customer.firstName} {customer.lastName}</div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{customer.id} · {customer.email}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Wallet Balance</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ea580c' }}>
            £{customer.walletBalance?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>

      {/* Two-column layout: form left, calc right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' }}>

        {/* LEFT — Form Fields */}
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1f2937', margin: '0 0 20px' }}>
            Transaction Details
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <CurrencySelect label="You Send" value={sendCurrency} onChange={setSendCurrency} />
            <CurrencySelect label="They Receive" value={receiveCurrency} onChange={setReceiveCurrency} />
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Amount to Send *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: '0.95rem', fontWeight: 700, color: '#374151',
              }}>
                {sc?.symbol}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                style={{ ...inputStyle, paddingLeft: 36, border: errors.amount ? '1px solid #dc2626' : '1px solid #e5e7eb' }}
                value={amount}
                placeholder="0.00"
                onChange={e => { setAmount(e.target.value); setErrors({}); }}
              />
            </div>
            {errors.amount && <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 4 }}>{errors.amount}</div>}
          </div>

          {/* Receiving Method */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 10 }}>
              Receiving Method
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['Bank Deposit', 'Mobile Money'].map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    flex: 1, padding: '12px 16px',
                    border: method === m ? '2px solid #ea580c' : '1px solid #e5e7eb',
                    borderRadius: 10, background: method === m ? '#fff7ed' : '#fff',
                    color: method === m ? '#ea580c' : '#374151',
                    fontWeight: method === m ? 700 : 400,
                    fontSize: '0.875rem', cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <span>{m === 'Bank Deposit' ? '🏦' : '📱'}</span> {m}
                  {method === m && <span style={{ marginLeft: 4, color: '#ea580c' }}>✓</span>}
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
        <div style={{ position: 'sticky', top: 24 }}>
          {calc ? (
            <div style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              borderRadius: 16, padding: 28,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
                Live Transaction Summary
              </div>
              {[
                { label: 'Amount Sent', value: `${sc?.symbol}${calc.amountSent}`, sub: 'After fees deducted' },
                { label: 'Transfer Fee', value: `${sc?.symbol}${calc.fee}`, sub: method },
                { label: 'Exchange Rate', value: `1 ${sendCurrency} = ${calc.rate} ${receiveCurrency}`, sub: 'Live rate' },
                { label: 'Total to Pay', value: `${sc?.symbol}${calc.total}`, bold: true },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{row.label}</div>
                    {row.sub && <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{row.sub}</div>}
                  </div>
                  <div style={{ fontSize: row.bold ? '1.05rem' : '0.9rem', fontWeight: row.bold ? 700 : 500, color: row.bold ? '#f97316' : '#e5e7eb' }}>
                    {row.value}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #374151', paddingTop: 16, marginTop: 4 }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 4 }}>Recipient Gets</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: 10 }}>Estimated amount in {rc?.name}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80', letterSpacing: '-0.02em' }}>
                  {rc?.symbol}{Number(calc.theyReceive).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#f9fafb', borderRadius: 16, padding: 32,
              border: '2px dashed #e5e7eb', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💱</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Live Rate Calculator</div>
              <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Enter an amount on the left to see the exchange rate, fees and recipient amount</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default OBOStep2Transaction;
