import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const SectionHeader = ({ title }) => (
    <h3 style={{
        fontSize: '0.95rem', fontWeight: 600, color: '#c2410c', // Dark Orange
        borderBottom: '1px solid #ffedd5', paddingBottom: 6, marginBottom: 12,
        marginTop: 0
    }}>
        {title}
    </h3>
);

const Label = ({ children, required }) => (
    <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: 3, fontWeight: 500 }}>
        {children} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
);

const Input = ({ type = "text", value, placeholder, style, width }) => (
    <input type={type} defaultValue={value} placeholder={placeholder} style={{
        width: width || '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.85rem', color: '#111827',
        background: '#fff', transition: 'all 0.15s ease', outline: 'none',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', ...style
    }} />
);

const SearchableSelect = ({ label, value, onChange, placeholder = "Select..." }) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [isOpen, setIsOpen] = useState(false);

    // Common currency list
    const currencies = ['USD', 'EUR', 'GBP', 'SGD', 'NGN', 'INR', 'AUD', 'CAD', 'JPY', 'CNY', 'CHF', 'AED', 'ZAR', 'KES'];

    const filteredCurrencies = currencies.filter(curr =>
        curr.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    setIsOpen(true);
                    if (onChange) onChange(e.target.value);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: '0.9rem',
                    color: '#111827',
                    background: '#fff',
                    fontWeight: 600,
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
            />
            {isOpen && filteredCurrencies.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    maxHeight: 200,
                    overflowY: 'auto',
                    zIndex: 1000
                }}>
                    {filteredCurrencies.map(curr => (
                        <div
                            key={curr}
                            onClick={() => {
                                setInputValue(curr);
                                setIsOpen(false);
                                if (onChange) onChange(curr);
                            }}
                            style={{
                                padding: '8px 10px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: '#374151',
                                transition: 'background 0.1s ease',
                                background: inputValue === curr ? '#fff7ed' : 'transparent'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                            onMouseLeave={(e) => e.target.style.background = inputValue === curr ? '#fff7ed' : 'transparent'}
                        >
                            {curr}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const SettingsGrid = ({ type }) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: 16 }}>
            <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Service</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: 80, fontWeight: 600, color: '#374151' }}>Factor</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: 60, fontWeight: 600, color: '#374151' }}>Ovr</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: 80, fontWeight: 600, color: '#374151' }}>Comm ($)</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: 80, fontWeight: 600, color: '#374151' }}>Comm (%)</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: 90, fontWeight: 600, color: '#ea580c' }}>P/L ($)</th>
                </tr>
            </thead>
            <tbody>
                {['Money (All)', 'Money (Cash)', 'Money (Mobile)', 'Airtime', 'Bill'].map((service) => (
                    <tr key={service} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 8px', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{service}</td>
                        <td style={{ padding: '8px 4px' }}><Input value="1" style={{ textAlign: 'center', padding: '6px' }} /></td>
                        <td style={{ padding: '8px 4px', textAlign: 'center' }}><input type="checkbox" /></td>
                        <td style={{ padding: '8px 4px' }}><Input value="0" style={{ textAlign: 'right', padding: '6px' }} /></td>
                        <td style={{ padding: '8px 4px' }}><Input value="0" style={{ textAlign: 'right', padding: '6px' }} /></td>
                        <td style={{ padding: '8px 8px', color: '#9ca3af', fontStyle: 'italic' }}>-</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const RateSettings = () => {
    const { id } = useParams();

    // Save handler — logs change to audit log
    const handleSave = async () => {
        try {
            await fetch('/api/rate-audit-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rate_id: id,
                    corridor: `${fromCurrency} → ${toCurrency}`,
                    change_type: 'RATE',
                    field_name: 'Rate Settings Update',
                    old_value: 'Previous Values',
                    new_value: 'Updated Values',
                    admin_id: 'admin_john',
                    admin_name: 'John Smith'
                })
            });
            alert('Settings saved & audit log entry created.');
        } catch {
            alert('Saved, but failed to create audit entry.');
        }
    };

    // Currency State
    const [fromCurrency, setFromCurrency] = useState('EUR');
    const [toCurrency, setToCurrency] = useState('SGD');

    // Mock State for Form
    const [formData] = useState({
        refreshFreq: 15,
        sendMin: 0, sendMax: 0, receiveMin: 0, receiveMax: 0,
        active: true,
        useRateForCorridor: false,
        enableRetail: true,
        baseTypeRetail: 'Buy Rate',
        enableWholesale: false,
    });

    // Mock Data for Derived Panel
    const derivedRates = {
        currencyCloud: '1.2000',
        finMoney: '1.2050',
    };

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', paddingBottom: 40 }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Rate Settings (ID: {id})</h1>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                    <Link to="/configuration/rate-manager" style={{ color: '#4b5563', textDecoration: 'none' }}>Rate Manager</Link>
                    {' > '}
                    <span style={{ color: '#ea580c', fontWeight: 500 }}>Update</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '70% 28%', gap: '2%' }}>

                {/* Left Panel: Main Settings */}
                <div className="glass-panel" style={{ padding: 20 }}>
                    {/* Top Controls */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, marginBottom: 24, alignItems: 'end', paddingRight: 16 }}>
                        <div>
                            <Label required>From Currency</Label>
                            <SearchableSelect
                                value={fromCurrency}
                                onChange={setFromCurrency}
                                placeholder="Select..."
                            />
                        </div>
                        <div>
                            <Label required>To Currency</Label>
                            <SearchableSelect
                                value={toCurrency}
                                onChange={setToCurrency}
                                placeholder="Select..."
                            />
                        </div>
                        <div style={{ marginRight: 8 }}>
                            <Label>Refresh Freq (mins) <span style={{ color: '#ef4444' }}>*</span></Label>
                            <Input value={formData.refreshFreq} style={{ textAlign: 'center' }} />
                        </div>
                    </div>

                    <SectionHeader title="Threshold Settings" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28, marginBottom: 24, paddingRight: 16 }}>
                        <div><Label>Send (Min)</Label><Input value={0} /></div>
                        <div><Label>Send (Max)</Label><Input value={0} /></div>
                        <div><Label>Receive (Min)</Label><Input value={0} /></div>
                        <div style={{ marginRight: 8 }}><Label>Receive (Max)</Label><Input value={0} /></div>
                    </div>

                    <div style={{ marginBottom: 24, display: 'flex', gap: 24 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#374151', cursor: 'pointer' }}>
                            <input type="checkbox" checked={formData.active} readOnly /> Active
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#374151', cursor: 'pointer' }}>
                            <input type="checkbox" checked={formData.useRateForCorridor} readOnly /> Use this rate for this corridor?
                        </label>
                    </div>

                    {/* Retail Settings */}
                    <SectionHeader title="Retail Settings" />
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
                                <input type="checkbox" checked={formData.enableRetail} readOnly /> Enable Retail Rates
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Label>Base Type:</Label>
                                <select style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', fontSize: '0.85rem' }}>
                                    <option>Buy Rate</option>
                                    <option>Sell Rate</option>
                                </select>
                            </div>
                        </div>

                        <SettingsGrid type="retail" />
                    </div>

                    {/* Wholesale & Bulk Swap Settings */}
                    <SectionHeader title="Wholesale & Bulk Swap Settings" />
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#374151', marginBottom: 16, fontWeight: 600 }}>
                            <input type="checkbox" checked={formData.enableWholesale} readOnly /> Enable Wholesale Rates
                        </label>

                        {/* Bulk Swap Specific Config */}
                        <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 6, border: '1px solid #bbf7d0', marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '1rem' }}>💱</span> Bulk Currency Swap
                                </h4>
                                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                    <input type="checkbox" checked /> Allow Swap?
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div><Label>Min Swap Amount</Label><Input value="1,000" /></div>
                                <div><Label>Max Swap Amount</Label><Input value="100,000" /></div>
                            </div>
                        </div>

                        <Label>Wholesale Rates (Used for Swaps):</Label>
                        <SettingsGrid type="wholesale" />

                        {/* Cross-Currency Bridge Logic */}
                        <div style={{ background: '#fffbeb', padding: 12, borderRadius: 6, border: '1px solid #fde68a', marginTop: 16 }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '1rem' }}>🌉</span> Smart Bridge Logic
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div>
                                    <Label required>Enable Logic?</Label>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                                            <input type="radio" name="bridgeEnabled" defaultChecked /> Yes
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                                            <input type="radio" name="bridgeEnabled" /> No
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <Label required>Primary Bridge</Label>
                                    <select style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: 4, background: 'white', fontSize: '0.85rem' }}>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <Label>Secondary Bridge</Label>
                                    <select style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: 4, background: 'white', fontSize: '0.85rem' }}>
                                        <option value="">None</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Min Margin Adv (%)</Label>
                                    <Input value="0.5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Derived Rates */}
                <div className="glass-panel" style={{ padding: 16, height: 'fit-content' }}>
                    <SectionHeader title="Derived Rates" />

                    {/* Payers Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: 20 }}>
                        <thead>
                            <tr style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                                <th style={{ padding: 6, textAlign: 'left', color: '#c2410c' }}>Payers</th>
                                <th style={{ padding: 6, textAlign: 'right', color: '#c2410c' }}>C.Cloud</th>
                                <th style={{ padding: 6, textAlign: 'right', color: '#c2410c' }}>FinMoney</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: 6, fontWeight: 500 }}>MTO Rate</td>
                                <td style={{ padding: 6, textAlign: 'right' }}>{derivedRates.currencyCloud}</td>
                                <td style={{ padding: 6, textAlign: 'right' }}>{derivedRates.finMoney}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: 6, fontWeight: 500 }}>Base Used</td>
                                <td style={{ padding: 6, textAlign: 'center' }}><input type="radio" name="base" defaultChecked /></td>
                                <td style={{ padding: 6, textAlign: 'center' }}><input type="radio" name="base" /></td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ marginBottom: 16 }}>
                        <Label required>Manual Override Payer</Label>
                        <select style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, background: 'white', fontSize: '0.85rem' }}>
                            <option>Select Payer Rate</option>
                            <option>CurrencyCloud ({derivedRates.currencyCloud})</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <Label required>Downtime Factor</Label>
                        <Input placeholder="Enter factor..." />
                    </div>

                    <SectionHeader title="Preview Rates" />
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', marginBottom: 24 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '6px 4px', textAlign: 'left' }}>Service</th>
                                <th style={{ padding: '6px 4px', textAlign: 'right' }}>Retail</th>
                                <th style={{ padding: '6px 4px', textAlign: 'right' }}>Wholesale</th>
                            </tr>
                        </thead>
                        <tbody>
                            {['Money', 'Money (Cash)', 'Money (Mobile)', 'Airtime', 'Bill'].map(s => (
                                <tr key={s} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '6px 4px' }}>{s}</td>
                                    <td style={{ padding: '6px 4px', textAlign: 'right', color: '#6b7280' }}>-</td>
                                    <td style={{ padding: '6px 4px', textAlign: 'right', color: '#6b7280' }}>-</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                        <button onClick={handleSave} style={{ flex: 1, background: '#ea580c', color: 'white', padding: '8px', borderRadius: 6, border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Save</button>
                        <button style={{ flex: 1, background: 'white', color: '#374151', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RateSettings;
