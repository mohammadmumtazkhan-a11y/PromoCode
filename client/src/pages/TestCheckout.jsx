import React, { useState } from 'react';

const TestCheckout = () => {
    const [transaction, setTransaction] = useState({
        amount: 100,
        source_currency: 'GBP',
        dest_currency: 'NGN',
        payment_method: 'Bank Transfer',
        userId: 'u_test_001'
    });

    const [promoCode, setPromoCode] = useState('');
    const [promoStatus, setPromoStatus] = useState(null); // { valid: bool, msg: string, data: object }
    const [loading, setLoading] = useState(false);

    const checkPromo = async () => {
        if (!promoCode) return;
        setLoading(true);
        setPromoStatus(null);
        try {
            const res = await fetch('/api/promocodes/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: promoCode,
                    amount: transaction.amount,
                    currency: transaction.source_currency, // Assuming source currency is fee base
                    userId: transaction.userId,
                    source_currency: transaction.source_currency,
                    dest_currency: transaction.dest_currency,
                    payment_method: transaction.payment_method
                })
            });
            const data = await res.json();
            if (res.ok) {
                setPromoStatus({ valid: true, msg: 'Promo Applied!', data });
            } else {
                setPromoStatus({ valid: false, msg: data.error });
            }
        } catch (err) {
            setPromoStatus({ valid: false, msg: 'Network Error' });
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        if (promoStatus?.valid) {
            // Atomic Apply (Story 1.2) - In real app, this happens on "Submit Transfer"
            alert('This would lock the code on submission.');
        } else {
            await checkPromo();
        }
    };

    const submitTransfer = async () => {
        if (!promoStatus?.valid) {
            alert('No valid promo applied');
            return;
        }
        try {
            const res = await fetch('/api/promocodes/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: promoCode })
            });
            const data = await res.json();
            if (data.success) {
                alert('Transfer Submitted! Promo Code Redeemed.');
                setPromoCode('');
                setPromoStatus(null);
            } else {
                alert('Failed: ' + data.error);
            }
        } catch (err) {
            alert('Submission Error');
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: 20 }}>
            <h2 style={{ marginBottom: 20 }}>Checkout Simulation (User Journey)</h2>

            <div className="glass-panel" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)' }}>You Send</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="number"
                                value={transaction.amount}
                                onChange={e => setTransaction({ ...transaction, amount: parseFloat(e.target.value) })}
                                style={inputStyle}
                            />
                            <select
                                value={transaction.source_currency}
                                onChange={e => setTransaction({ ...transaction, source_currency: e.target.value })}
                                style={{ ...inputStyle, width: 80 }}
                            >
                                <option>GBP</option>
                                <option>USD</option>
                                <option>EUR</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)' }}>Recipient Gets</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                value={(transaction.amount * 1500).toFixed(2)} // Mock Rate
                                readOnly
                                style={{ ...inputStyle, background: 'rgba(255,255,255,0.02)' }}
                            />
                            <select
                                value={transaction.dest_currency}
                                onChange={e => setTransaction({ ...transaction, dest_currency: e.target.value })}
                                style={{ ...inputStyle, width: 80 }}
                            >
                                <option>NGN</option>
                                <option>INR</option>
                                <option>KES</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)' }}>Payment Method</label>
                    <select
                        value={transaction.payment_method}
                        onChange={e => setTransaction({ ...transaction, payment_method: e.target.value })}
                        style={inputStyle}
                    >
                        <option>Bank Transfer</option>
                        <option>Card</option>
                    </select>
                </div>

                <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span>Transfer Fee</span>
                        <span>{transaction.source_currency} 5.00</span>
                    </div>
                    {promoStatus?.valid && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontWeight: 600 }}>
                            <span>Promo Discount</span>
                            <span>{promoStatus.data.display_text}</span>
                        </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700 }}>
                        <span>Total to Pay</span>
                        <span>
                            {transaction.source_currency} {' '}
                            {(transaction.amount + 5.00 - (promoStatus?.valid ? promoStatus.data.applied_discount : 0)).toFixed(2)}
                        </span>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)' }}>Promo Code</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <input
                            value={promoCode}
                            onChange={e => {
                                setPromoCode(e.target.value.toUpperCase());
                                setPromoStatus(null);
                            }}
                            placeholder="Enter Code"
                            style={inputStyle}
                        />
                        <button
                            className="btn-primary"
                            onClick={checkPromo}
                            disabled={loading || !promoCode}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {loading ? 'Checking...' : 'Apply'}
                        </button>
                    </div>
                    {promoStatus && (
                        <div style={{
                            marginTop: 8, fontSize: '0.875rem',
                            color: promoStatus.valid ? '#4ade80' : '#f87171'
                        }}>
                            {promoStatus.msg}
                        </div>
                    )}
                </div>

                <button
                    className="btn-primary"
                    onClick={submitTransfer}
                    style={{ marginTop: 16, padding: 16, fontSize: '1rem' }}
                >
                    Confirm & Send Money
                </button>
            </div>
        </div>
    );
};

const inputStyle = {
    width: '100%',
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box'
};

export default TestCheckout;
