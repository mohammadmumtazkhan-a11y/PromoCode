import React, { useState, useEffect } from 'react';

const ReferralSettings = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/referral-config');
            const data = await res.json();
            setConfig(data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await fetch('/api/referral-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            alert('Settings saved successfully');
        } catch (err) {
            alert('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading referral settings...</div>;

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        background: 'white',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        color: 'var(--text-main)',
        fontSize: '0.9rem',
        outline: 'none',
        marginBottom: '16px'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '0.875rem',
        color: 'var(--text-muted)',
        fontWeight: 500
    };

    return (
        <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0 }}>Referral Scheme</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Configure the "Invite & Earn" program rules.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.9rem', color: config.is_enabled ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                        {config.is_enabled ? 'Active' : 'Disabled'}
                    </span>
                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                        <input
                            type="checkbox"
                            checked={!!config.is_enabled}
                            onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked ? 1 : 0 })}
                            style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: config.is_enabled ? '#16a34a' : '#ccc', borderRadius: 34, transition: '.4s'
                        }}>
                            <span style={{
                                position: 'absolute', content: "", height: 18, width: 18, left: config.is_enabled ? 22 : 4, bottom: 3,
                                backgroundColor: 'white', borderRadius: '50%', transition: '.4s'
                            }}></span>
                        </span>
                    </label>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 32, opacity: config.is_enabled ? 1 : 0.7, pointerEvents: config.is_enabled ? 'auto' : 'none' }}>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 20, color: 'var(--text-main)' }}>Incentive Rules</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    <div>
                        <label style={labelStyle}>Who gets a reward?</label>
                        <select
                            style={inputStyle}
                            value={config.reward_type}
                            onChange={(e) => setConfig({ ...config, reward_type: e.target.value })}
                        >
                            <option value="BOTH">Both Parties (Double-Sided)</option>
                            <option value="REFERRER">Referrer Only</option>
                            <option value="REFEREE">Referee (New User) Only</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Base Currency</label>
                        <select
                            style={inputStyle}
                            value={config.base_currency}
                            onChange={(e) => setConfig({ ...config, base_currency: e.target.value })}
                        >
                            <option value="GBP">GBP (United Kingdom)</option>
                            <option value="USD">USD (United States)</option>
                            <option value="EUR">EUR (Eurozone)</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    <div>
                        <label style={labelStyle}>Referrer Reward</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }}>{config.base_currency === 'USD' ? '$' : config.base_currency === 'EUR' ? '€' : '£'}</span>
                            <input
                                type="number"
                                step="0.50"
                                style={{ ...inputStyle, paddingLeft: 28 }}
                                value={config.referrer_reward}
                                onChange={(e) => setConfig({ ...config, referrer_reward: parseFloat(e.target.value) })}
                                disabled={config.reward_type === 'REFEREE'}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Referee (New User) Reward</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }}>{config.base_currency === 'USD' ? '$' : config.base_currency === 'EUR' ? '€' : '£'}</span>
                            <input
                                type="number"
                                step="0.50"
                                style={{ ...inputStyle, paddingLeft: 28 }}
                                value={config.referee_reward}
                                onChange={(e) => setConfig({ ...config, referee_reward: parseFloat(e.target.value) })}
                                disabled={config.reward_type === 'REFERRER'}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '24px 0' }}></div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 20, color: 'var(--text-main)' }}>Trigger Conditions</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                        <label style={labelStyle}>Trigger Event</label>
                        <input
                            type="text"
                            style={{ ...inputStyle, background: '#f3f4f6', color: '#6b7280' }}
                            value="First Successful Transaction"
                            disabled
                        />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: -12 }}>
                            Reward is only issued after the referee completes their first transfer.
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Minimum Transaction Amount (Floor)</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }}>{config.base_currency === 'USD' ? '$' : config.base_currency === 'EUR' ? '€' : '£'}</span>
                            <input
                                type="number"
                                step="10"
                                style={{ ...inputStyle, paddingLeft: 28 }}
                                value={config.min_transaction_threshold}
                                onChange={(e) => setConfig({ ...config, min_transaction_threshold: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                    style={{ padding: '12px 32px', fontSize: '1rem' }}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default ReferralSettings;
