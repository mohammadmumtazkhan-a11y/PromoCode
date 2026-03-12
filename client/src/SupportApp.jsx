import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import logo from './assets/logo.png';

// Pages
import SupportLogin from './pages/Support/SupportLogin';
import SupportDashboard from './pages/Support/SupportDashboard';
import TransactionSearch from './pages/Support/TransactionSearch';
import HelpTickets from './pages/Support/HelpTickets';
import SupportRates from './pages/Support/SupportRates';
import ChangePassword from './pages/Support/ChangePassword';

// Auth Context
export const SupportAuthContext = createContext(null);

export const SupportAuthProvider = ({ children }) => {
    const [agent, setAgent] = useState(() => {
        const saved = sessionStorage.getItem('supportAgent');
        return saved ? JSON.parse(saved) : null;
    });

    const login = (agentData) => {
        sessionStorage.setItem('supportAgent', JSON.stringify(agentData));
        setAgent(agentData);
    };

    const logout = () => {
        sessionStorage.removeItem('supportAgent');
        setAgent(null);
    };

    return (
        <SupportAuthContext.Provider value={{ agent, login, logout }}>
            {children}
        </SupportAuthContext.Provider>
    );
};

export const useSupportAuth = () => useContext(SupportAuthContext);

// Protected Route
const ProtectedRoute = () => {
    const { agent } = useSupportAuth();
    if (!agent) return <Navigate to="/support/login" replace />;
    return <SupportLayout />;
};

// Sidebar
const SupportSidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { agent, logout } = useSupportAuth();
    const isActive = (path) => location.pathname === path;
    const isHelpTicketsActive = location.pathname.startsWith('/support/help-tickets');

    const itemStyle = (active) => ({
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        color: active ? '#ea580c' : '#374151',
        background: active ? '#fff7ed' : 'white',
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontWeight: active ? 600 : 500,
        border: active ? '1px solid #ea580c' : '1px solid #ffedd5',
        borderRadius: 6,
        marginBottom: 8,
        transition: 'all 0.2s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        cursor: 'pointer'
    });

    return (
        <aside
            className={`sidebar-mobile ${isOpen ? 'open' : ''}`}
            style={{
                width: 260, flexShrink: 0, height: '100vh',
                background: '#ffffff',
                borderRight: '1px solid #f3f4f6',
                display: 'flex', flexDirection: 'column',
                fontFamily: "'Inter', sans-serif"
            }}>
            {/* Brand */}
            <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid #f3f4f6', marginBottom: 16 }}>
                <img src={logo} alt="Mito.Money" style={{ height: 32, width: 'auto', marginRight: 12 }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>Support Portal</h2>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
                <Link to="/support/" style={itemStyle(isActive('/support/') || isActive('/support'))} onClick={onClose}>
                    <span>📊</span> Dashboard Home
                </Link>
                <Link to="/support/transactions" style={itemStyle(isActive('/support/transactions'))} onClick={onClose}>
                    <span>🔍</span> Transaction Search
                </Link>
                <Link to="/support/help-tickets" style={itemStyle(isHelpTicketsActive)} onClick={onClose}>
                    <span>🎫</span> Help Tickets
                </Link>
                <Link to="/support/rates" style={itemStyle(isActive('/support/rates'))} onClick={onClose}>
                    <span>💱</span> Rates
                </Link>
            </nav>

            {/* Profile Footer */}
            <div style={{ padding: 16, borderTop: '1px solid #f3f4f6' }}>
                <Link to="/support/change-password" style={{
                    ...itemStyle(isActive('/support/change-password')),
                    marginBottom: 8,
                    justifyContent: 'center',
                    border: '1px solid #e5e7eb',
                    color: '#374151'
                }} onClick={onClose}>
                    🔒 Change Password
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ea580c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                            {agent?.name?.split(' ').map(n => n[0]).join('') || 'SA'}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{agent?.name || 'Support Agent'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Support Agent</div>
                        </div>
                    </div>
                    <button
                        onClick={() => { logout(); onClose(); }}
                        style={{
                            background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 4,
                            padding: '4px 10px', fontSize: '0.75rem', color: '#6b7280', cursor: 'pointer'
                        }}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </aside>
    );
};

// Layout
const SupportLayout = () => {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="app-layout">
            <SupportSidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={() => setMobileOpen(false)}></div>
            )}
            <main className="main-content">
                <button className="mobile-header-btn" onClick={() => setMobileOpen(true)}>☰</button>
                <Outlet />
            </main>
        </div>
    );
};

// App
function SupportApp() {
    return (
        <SupportAuthProvider>
            <Routes>
                <Route path="login" element={<SupportLogin />} />
                <Route element={<ProtectedRoute />}>
                    <Route index element={<SupportDashboard />} />
                    <Route path="transactions" element={<TransactionSearch />} />
                    <Route path="help-tickets" element={<HelpTickets />} />
                    <Route path="help-tickets/:ticketId" element={<HelpTickets />} />
                    <Route path="rates" element={<SupportRates />} />
                    <Route path="change-password" element={<ChangePassword />} />
                </Route>
            </Routes>
        </SupportAuthProvider>
    );
}

export default SupportApp;

