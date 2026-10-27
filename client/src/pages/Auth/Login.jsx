import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import mitoLogo from '../../assets/Mito_logo.svg';

const Login = () => {
  const [email, setEmail] = useState('admin@mito.money');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      sessionStorage.removeItem('mitoLoggedOut');
      setLoading(false);
      navigate('/dashboard');
    }, 400);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to top, #ffffff, #ffede7)',
      padding: '40px 24px',
      fontFamily: "'Open Sans', 'Noto Sans', sans-serif"
    }}>
      {/* Mito Logo */}
      <div style={{ marginBottom: 32, width: '100%', maxWidth: 440, textAlign: 'left' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src={mitoLogo} alt="Mito" style={{ height: 48, width: 'auto' }} />
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#323130', letterSpacing: '-0.02em' }}>
            Mito <span style={{ color: '#FB4B14', fontWeight: 600, fontSize: '1.1rem' }}>Admin</span>
          </span>
        </Link>
      </div>

      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        padding: '36px 32px',
        boxShadow: '0px 4px 24px rgba(237, 235, 233, 0.9)',
        border: '1px solid #edebe9'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#323130', margin: '0 0 8px 0' }}>
          Login to your account
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#605e5c', margin: '0 0 24px 0' }}>
          Enter your credentials to access the Mito Admin Portal.
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#323130', marginBottom: 6 }}>
              Email <span style={{ color: '#FB4B14' }}>*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid #edebe9',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FB4B14'}
              onBlur={(e) => e.target.style.borderColor = '#edebe9'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#323130', marginBottom: 6 }}>
              Password <span style={{ color: '#FB4B14' }}>*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid #edebe9',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FB4B14'}
              onBlur={(e) => e.target.style.borderColor = '#edebe9'}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.85rem', color: '#FB4B14', cursor: 'pointer' }}>
              Forgot password?
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: 8 }}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 24, fontSize: '0.8rem', color: '#605e5c' }}>
        Prototype demo mode • Instant access enabled
      </div>
    </div>
  );
};

export default Login;
