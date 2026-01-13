import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './index.css';

// Components
const Sidebar = ({ isOpen, onClose }) => {

  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // New "Outlined Button" style
  const itemStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px',
    color: active ? '#ea580c' : '#374151', // Active: deep orange, Inactive: dark gray
    background: 'white',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    border: active ? '1px solid #ea580c' : '1px solid #ffedd5', // Active: bold orange, Inactive: light orange wash
    borderRadius: 6,
    marginBottom: 8,
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  });

  return (
    <aside
      className={`sidebar-mobile ${isOpen ? 'open' : ''}`}
      style={{
        width: 260, flexShrink: 0, height: '100vh',
        background: '#ffffff', // White background
        borderRight: '1px solid #f3f4f6',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', sans-serif"
      }}>
      {/* Brand */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid #f3f4f6', marginBottom: 16 }}>
        <div style={{ width: 24, height: 24, background: '#ea580c', marginRight: 12, borderRadius: 4 }}></div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>Mito Admin</h2>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        <Link to="/" style={itemStyle(isActive('/'))} onClick={onClose}>
          <span>🏠</span> Dashboard
        </Link>

        {/* Financials Section */}
        <div style={{ ...itemStyle(false), flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: 0, border: '1px solid #ffedd5', overflow: 'hidden' }}>
          {/* Header for Group */}
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid #fff7ed' }}>
            <span>💵</span> Financials
          </div>

          {/* Subitems */}
          <div style={{ background: '#fff7ed', padding: '8px 0' }}>
            <Link to="/financials/promocodes" style={{
              display: 'block', padding: '8px 16px 8px 48px',
              color: isActive('/financials/promocodes') ? '#c2410c' : '#4b5563',
              textDecoration: 'none', fontSize: '0.85rem', fontWeight: isActive('/financials/promocodes') ? 600 : 400
            }}>
              Promo Codes
            </Link>
            <Link to="/financials/debits" style={{
              display: 'block', padding: '8px 16px 8px 48px',
              color: isActive('/financials/debits') ? '#c2410c' : '#4b5563',
              textDecoration: 'none', fontSize: '0.85rem'
            }}>
              Debit Logs
            </Link>
          </div>
        </div>

        <Link to="/reports" style={itemStyle(false)}>
          <span>📄</span> Reports
        </Link>
        <Link to="/crm" style={itemStyle(false)}>
          <span>🤝</span> CRM & Marketing
        </Link>
        <Link to="/integration" style={itemStyle(false)}>
          <span>🔌</span> Integration
        </Link>
        <Link to="/admin" style={itemStyle(false)}>
          <span>👤</span> Administration
        </Link>
        <Link to="/config" style={itemStyle(false)}>
          <span>⚙️</span> Configuration
        </Link>
        <Link to="/logs" style={itemStyle(false)}>
          <span>📋</span> Logs
        </Link>
        <Link to="/kyc" style={itemStyle(false)}>
          <span>🆔</span> New KYC Module
        </Link>
      </nav>

      {/* Profile Footer */}
      <div style={{ padding: 16, borderTop: '1px solid #f3f4f6' }}>
        <Link to="/profile" style={{
          ...itemStyle(false),
          marginBottom: 0,
          justifyContent: 'center', // Center content or keep left? Standard usually left.
          border: '1px solid #e5e7eb',
          color: '#374151'
        }} onClick={onClose}>
          Profile
        </Link>
        <Link to="/support" style={{
          ...itemStyle(false),
          marginTop: 8,
          marginBottom: 0,
          border: '1px solid #e5e7eb',
          color: '#374151'
        }} onClick={onClose}>
          Support
        </Link>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ea580c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>JS</div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>John Smith</div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Administrator</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Header = () => {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Welcome back, Mito Admin</h1>
        <p style={{ color: 'var(--text-muted)' }}>Your financial overview for today.</p>
      </div>

      <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Context:</span>
        <select style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontWeight: 600, outline: 'none' }}>
          <option>Wholesale Biller</option>
          <option>Administrator</option>
        </select>
      </div>
    </header>
  );
};

// Placeholder Pages
const Dashboard = () => {
  return (
    <div style={{ fontFamily: 'sans-serif', color: '#4b5563' }}>
      {/* Top Banner */}
      <div style={{ background: '#dcfce7', color: '#166534', padding: '12px 24px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderRadius: 4 }}>
        <span style={{ flex: 1 }}>MIito.Money uses cookies. By using our site you agree to our privacy policy.</span>
        <button style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
      </div>

      {/* Header Area */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 300, color: '#4ade80', margin: '0 0 8px 0' }}>
          Account Overview <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 400 }}>A quick dashboard view of account status</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#6b7280', background: '#f3f4f6', padding: '8px 16px', borderRadius: 4 }}>
          <span>🏠 Home</span> <span>&gt;</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>

        {/* Left Column: Chart */}
        <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#e5e7eb', padding: '10px 16px', borderRadius: '4px 4px 0 0', fontWeight: 600, color: '#374151', marginBottom: 16 }}>
            Successful transactions in the last 30 days
          </div>
          <div style={{ height: 300, position: 'relative' }}>
            {/* Mock Chart SVG */}
            <svg viewBox="0 0 500 300" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Grid Lines */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <line key={i} x1="0" y1={i * 60} x2="500" y2={i * 60} stroke="#e5e7eb" strokeWidth="1" />
              ))}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <line key={i} x1={i * 100} y1="0" x2={i * 100} y2="300" stroke="#e5e7eb" strokeWidth="1" />
              ))}

              {/* Y Axis Labels */}
              <text x="-10" y="300" fontSize="10" fill="#9ca3af" textAnchor="end">0</text>
              <text x="-10" y="240" fontSize="10" fill="#9ca3af" textAnchor="end">1000</text>
              <text x="-10" y="180" fontSize="10" fill="#9ca3af" textAnchor="end">2000</text>
              <text x="-10" y="120" fontSize="10" fill="#9ca3af" textAnchor="end">3000</text>
              <text x="-10" y="60" fontSize="10" fill="#9ca3af" textAnchor="end">4000</text>
              <text x="-10" y="10" fontSize="10" fill="#9ca3af" textAnchor="end">5000</text>

              {/* Data Path (Mock) */}
              <path d="M0,280 L50,220 L75,240 L100,200 L125,260 L150,160 L175,160 L200,60 L225,220 L250,160 L275,200 L300,180 L325,220 L350,220 L375,200 L400,220 L425,180 L450,230 L475,180 L500,290"
                fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {/* Points */}
              <circle cx="200" cy="60" r="4" fill="#2563eb" />
              <circle cx="500" cy="290" r="4" fill="#2563eb" />
            </svg>
          </div>
        </div>

        {/* Right Column: Overview */}
        <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#e5e7eb', padding: '10px 16px', borderRadius: '4px 4px 0 0', fontWeight: 600, color: '#374151', marginBottom: 16 }}>
            ℹ Overview
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <OverviewCard title="Pending Transaction" value="972" />
            <OverviewCard title="MTO Pending" value="106" />
            <OverviewCard title="Forex Pending" value="3" />

            <OverviewCard title="KYC Pending" value="0" />
            <OverviewCard title="Tickets Pending" value="15" />
            <OverviewCard title="Pin Pending" value="2408" />

            <OverviewCard title="Users Joined" value="8" />
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewCard = ({ title, value }) => (
  <div style={{
    background: '#fef3c7', // beige/yellowish
    borderRadius: 8,
    padding: '16px 8px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80
  }}>
    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#78350f', lineHeight: 1.2, marginBottom: 4 }}>
      {title.split(' ').map((word, i) => <div key={i}>{word}</div>)}
    </div>
    <div style={{ fontSize: '1.25rem', fontWeight: 400, color: '#92400e' }}>{value}</div>
  </div>
);

// Pages
import TestCheckout from './pages/TestCheckout';
import DebitLogs from './pages/Financials/DebitLogs';
import Payouts from './pages/Financials/Payouts';
import Commissions from './pages/Financials/Commissions';
import PromoCodes from './pages/Financials/PromoCodes';
import MerchantList from './pages/Merchants/MerchantList';
import OnboardingWizard from './pages/Merchants/OnboardingWizard';
import ApiKeys from './pages/Settings/ApiKeys';

// App Layout
function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Router>
      <div className="app-layout">
        <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        {mobileOpen && (
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)}></div>
        )}
        <main className="main-content">
          <button className="mobile-header-btn" onClick={() => setMobileOpen(true)}>☰</button>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/financials/debits" element={<DebitLogs />} />
            <Route path="/financials/payouts" element={<Payouts />} />
            <Route path="/financials/commissions" element={<Commissions />} />
            <Route path="/financials/promocodes" element={<PromoCodes />} />
            <Route path="/merchants" element={<MerchantList />} />
            <Route path="/merchants/onboard" element={<OnboardingWizard />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            {/* Dev Route */}
            <Route path="/test-checkout" element={<TestCheckout />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
