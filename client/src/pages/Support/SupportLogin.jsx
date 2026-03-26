import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupportAuth } from '../../SupportApp';
import logo from '../../assets/logo.png';
import { supportPageTitleStyle } from './supportTypography';

// Mock credentials
const VALID_AGENTS = [
    { email: 'agent@mito.money', password: 'support123', name: 'Sarah Johnson' },
    { email: 'admin@mito.money', password: 'admin123', name: 'James Admin' },
];

const SupportLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, agent } = useSupportAuth();

    // Redirect if already logged in
    if (agent) {
        navigate('/support/', { replace: true });
        return null;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        setTimeout(() => {
            const found = VALID_AGENTS.find(a => a.email === email && a.password === password);
            if (found) {
                login({ name: found.name, email: found.email });
                navigate('/support/', { replace: true });
            } else {
                setError('Invalid email or password. Please try again.');
            }
            setLoading(false);
        }, 600);
    };

    return (
        <div className="support-shell" style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f9fafb 0%, #fff7ed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                width: 420, background: 'white', borderRadius: 16,
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                padding: '48px 40px', textAlign: 'center'
            }}>
                {/* Logo */}
                <div style={{ marginBottom: 8 }}>
                    <img src={logo} alt="Mito.Money" style={{ height: 48, width: 'auto' }} />
                </div>
                <h1 style={supportPageTitleStyle}>
                    Customer Support Portal
                </h1>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 0 32px' }}>
                    Sign in to your workspace
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div style={{ textAlign: 'left', marginBottom: 16 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                            Email Address
                        </label>
                        <input
                            id="support-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="agent@mito.money"
                            required
                            style={{
                                width: '100%', padding: '10px 14px',
                                border: '1px solid #d1d5db', borderRadius: 8,
                                fontSize: '0.9rem', outline: 'none',
                                transition: 'border-color 0.2s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ textAlign: 'left', marginBottom: 24 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                            Password
                        </label>
                        <input
                            id="support-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                width: '100%', padding: '10px 14px',
                                border: '1px solid #d1d5db', borderRadius: 8,
                                fontSize: '0.9rem', outline: 'none',
                                transition: 'border-color 0.2s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div id="login-error" style={{
                            background: '#fef2f2', color: '#dc2626',
                            padding: '10px 14px', borderRadius: 8,
                            fontSize: '0.85rem', marginBottom: 16,
                            border: '1px solid #fecaca'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        id="support-login-btn"
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '12px',
                            background: loading ? '#fb923c' : '#ea580c',
                            color: 'white', border: 'none', borderRadius: 8,
                            fontSize: '0.95rem', fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(234,88,12,0.3)'
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Hint */}
                <div style={{
                    marginTop: 24, padding: '12px 16px',
                    background: '#f0fdf4', borderRadius: 8,
                    border: '1px solid #bbf7d0',
                    fontSize: '0.8rem', color: '#166534', textAlign: 'left'
                }}>
                    <strong>Demo credentials:</strong><br />
                    Email: agent@mito.money<br />
                    Password: support123
                </div>
            </div>
        </div>
    );
};

export default SupportLogin;
