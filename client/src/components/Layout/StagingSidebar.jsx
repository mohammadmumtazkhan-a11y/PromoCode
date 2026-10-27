import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import mitoLogo from '../../assets/Mito_logo.svg';

const StagingSidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const path = location.pathname;

  // Track accordion expand states
  const [openGroups, setOpenGroups] = useState({
    customers: true,
    financials: true,
    support: false,
    partners: false,
    configuration: true,
    content: false,
  });

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-expand group based on active route
  useEffect(() => {
    if (path.startsWith('/customer') || path.startsWith('/admin/on-behalf-of-customer') || path.startsWith('/merchants')) {
      setOpenGroups(prev => ({ ...prev, customers: true }));
    } else if (path.startsWith('/financials')) {
      setOpenGroups(prev => ({ ...prev, financials: true }));
    } else if (path.startsWith('/support')) {
      setOpenGroups(prev => ({ ...prev, support: true }));
    } else if (path.startsWith('/configuration') || path.startsWith('/growth')) {
      setOpenGroups(prev => ({ ...prev, configuration: true }));
    }
  }, [path]);

  const isHomeActive = path === '/' || path === '/dashboard';
  const isRewardsActive = path === '/configuration/rewards' || path.startsWith('/growth/');
  const isRatesActive = path.startsWith('/configuration/rate-manager') || path.startsWith('/configuration/rates-manager');
  const isRateAuditActive = path.startsWith('/configuration/rate-audit-log');
  const isOboActive = path.startsWith('/customer/obo-customer') || path.startsWith('/admin/on-behalf-of-customer');

  return (
    <aside
      className={`staging-sidebar ${isOpen ? 'open' : ''}`}
      style={{
        width: collapsed ? 80 : 260,
        transition: 'width 0.25s ease, transform 0.25s ease'
      }}
    >
      {/* Brand Header */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid #edebe9',
        flexShrink: 0
      }}>
        <Link to="/" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', overflow: 'hidden' }}>
          <img src={mitoLogo} alt="Mito" style={{ height: 38, width: 'auto', flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#323130', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              Mito <span style={{ color: '#FB4B14', fontWeight: 600, fontSize: '0.85rem' }}>Admin</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            border: 'none',
            background: '#edebe9',
            color: '#323130',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 700,
            transition: 'background 0.2s',
            flexShrink: 0
          }}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Nav List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Home */}
        <div>
          <Link
            to="/dashboard"
            onClick={onClose}
            className={`staging-nav-group-btn ${isHomeActive ? 'active' : ''}`}
            title="Home / Dashboard"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6V0H18V6H10ZM0 10V0H8V10H0ZM10 18V8H18V18H10ZM0 18V12H8V18H0ZM2 8H6V2H2V8ZM12 16H16V10H12V16ZM12 4H16V2H12V4ZM2 16H6V14H2V16Z" />
              </svg>
              {!collapsed && <span>Home</span>}
            </span>
          </Link>
        </div>

        {/* Customers */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup('customers')}
            className={`staging-nav-group-btn ${path.startsWith('/customer') || isOboActive ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              {!collapsed && <span>Customers</span>}
            </span>
            {!collapsed && (
              <span style={{ fontSize: '0.65rem', transform: openGroups.customers ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            )}
          </button>
          {!collapsed && openGroups.customers && (
            <ul className="staging-sub-menu">
              <li>
                <Link to="/merchants" onClick={onClose} className={`staging-sub-item ${path === '/merchants' ? 'active' : ''}`}>
                  Users
                </Link>
              </li>
              <li>
                <Link to="/customer/obo-customer" onClick={onClose} className={`staging-sub-item ${isOboActive ? 'active' : ''}`}>
                  On Behalf of Customer
                </Link>
              </li>
            </ul>
          )}
        </div>

        {/* Financials */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup('financials')}
            className={`staging-nav-group-btn ${path.startsWith('/financials') ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
              </svg>
              {!collapsed && <span>Financials</span>}
            </span>
            {!collapsed && (
              <span style={{ fontSize: '0.65rem', transform: openGroups.financials ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            )}
          </button>
          {!collapsed && openGroups.financials && (
            <ul className="staging-sub-menu">
              <li>
                <Link to="/financials/debits" onClick={onClose} className={`staging-sub-item ${path === '/financials/debits' ? 'active' : ''}`}>
                  Transactions
                </Link>
              </li>
              <li>
                <Link to="/financials/receive-money" onClick={onClose} className={`staging-sub-item ${path === '/financials/receive-money' ? 'active' : ''}`}>
                  Receive Money
                </Link>
              </li>
              <li>
                <Link to="/financials/payouts" onClick={onClose} className={`staging-sub-item ${path === '/financials/payouts' ? 'active' : ''}`}>
                  Account Balance
                </Link>
              </li>
              <li>
                <Link to="/financials/commissions" onClick={onClose} className={`staging-sub-item ${path === '/financials/commissions' ? 'active' : ''}`}>
                  Commissions
                </Link>
              </li>
              <li>
                <Link to="/financials/promocodes" onClick={onClose} className={`staging-sub-item ${path === '/financials/promocodes' ? 'active' : ''}`}>
                  Promo Codes
                </Link>
              </li>
            </ul>
          )}
        </div>

        {/* Support */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup('support')}
            className={`staging-nav-group-btn ${path.startsWith('/support') ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />
              </svg>
              {!collapsed && <span>Support</span>}
            </span>
            {!collapsed && (
              <span style={{ fontSize: '0.65rem', transform: openGroups.support ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            )}
          </button>
          {!collapsed && openGroups.support && (
            <ul className="staging-sub-menu">
              <li>
                <Link to="/support/dashboard" onClick={onClose} className={`staging-sub-item ${path === '/support/dashboard' ? 'active' : ''}`}>
                  Support Overview
                </Link>
              </li>
              <li>
                <Link to="/support/transactions" onClick={onClose} className={`staging-sub-item ${path === '/support/transactions' ? 'active' : ''}`}>
                  Search Payments
                </Link>
              </li>
              <li>
                <Link to="/support/help-tickets" onClick={onClose} className={`staging-sub-item ${path === '/support/help-tickets' || path === '/support/tickets' ? 'active' : ''}`}>
                  Help Tickets
                </Link>
              </li>
              <li>
                <Link to="/support/inbox" onClick={onClose} className={`staging-sub-item ${path === '/support/inbox' ? 'active' : ''}`}>
                  Notifications
                </Link>
              </li>
              <li>
                <Link to="/support/ccc-support" onClick={onClose} className={`staging-sub-item ${path === '/support/ccc-support' ? 'active' : ''}`}>
                  Command Centre
                </Link>
              </li>
            </ul>
          )}
        </div>

        {/* Partners */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup('partners')}
            className={`staging-nav-group-btn ${path.startsWith('/merchants/onboard') ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              {!collapsed && <span>Partners</span>}
            </span>
            {!collapsed && (
              <span style={{ fontSize: '0.65rem', transform: openGroups.partners ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            )}
          </button>
          {!collapsed && openGroups.partners && (
            <ul className="staging-sub-menu">
              <li>
                <Link to="/merchants" onClick={onClose} className={`staging-sub-item ${path === '/merchants' ? 'active' : ''}`}>
                  Manage Affiliates
                </Link>
              </li>
              <li>
                <Link to="/merchants/onboard" onClick={onClose} className={`staging-sub-item ${path === '/merchants/onboard' ? 'active' : ''}`}>
                  Create Affiliate
                </Link>
              </li>
              <li>
                <Link to="/configuration/portal-admins" onClick={onClose} className={`staging-sub-item ${path === '/configuration/portal-admins' ? 'active' : ''}`}>
                  Portal Admins
                </Link>
              </li>
            </ul>
          )}
        </div>

        {/* Configuration */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup('configuration')}
            className={`staging-nav-group-btn ${isRewardsActive || isRatesActive || isRateAuditActive ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
              {!collapsed && <span>Configuration</span>}
            </span>
            {!collapsed && (
              <span style={{ fontSize: '0.65rem', transform: openGroups.configuration ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            )}
          </button>
          {!collapsed && openGroups.configuration && (
            <ul className="staging-sub-menu">
              <li>
                <Link to="/configuration/rewards" onClick={onClose} className={`staging-sub-item ${isRewardsActive ? 'active' : ''}`}>
                  Reward$
                </Link>
              </li>
              <li>
                <Link to="/configuration/rate-manager" onClick={onClose} className={`staging-sub-item ${isRatesActive ? 'active' : ''}`}>
                  Rates Manager
                </Link>
              </li>
              <li>
                <Link to="/configuration/rate-audit-log" onClick={onClose} className={`staging-sub-item ${isRateAuditActive ? 'active' : ''}`}>
                  Rate Audit Log
                </Link>
              </li>
            </ul>
          )}
        </div>

        {/* Content */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup('content')}
            className={`staging-nav-group-btn ${path.startsWith('/administration/mitoview') ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
              {!collapsed && <span>Content</span>}
            </span>
            {!collapsed && (
              <span style={{ fontSize: '0.65rem', transform: openGroups.content ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            )}
          </button>
          {!collapsed && openGroups.content && (
            <ul className="staging-sub-menu">
              <li>
                <Link to="/administration/mitoview" onClick={onClose} className={`staging-sub-item ${path.startsWith('/administration/mitoview') ? 'active' : ''}`}>
                  MitoView
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* Pinned Bottom Navigation */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #edebe9',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: '#ffffff',
        flexShrink: 0
      }}>
        <Link
          to="/profile"
          onClick={onClose}
          className={`staging-nav-group-btn ${path === '/profile' ? 'active' : ''}`}
          style={{ fontSize: '0.875rem', padding: '8px 12px' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>👤</span>
            {!collapsed && <span>Profile</span>}
          </span>
        </Link>
        <Link
          to="/api-keys"
          onClick={onClose}
          className={`staging-nav-group-btn ${path === '/api-keys' || path === '/test-checkout' ? 'active' : ''}`}
          style={{ fontSize: '0.875rem', padding: '8px 12px' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🔑</span>
            {!collapsed && <span>Developer</span>}
          </span>
        </Link>
        <Link
          to="/settings"
          onClick={onClose}
          className={`staging-nav-group-btn ${path === '/settings' ? 'active' : ''}`}
          style={{ fontSize: '0.875rem', padding: '8px 12px' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>⚙️</span>
            {!collapsed && <span>Settings</span>}
          </span>
        </Link>
      </div>
    </aside>
  );
};

export default StagingSidebar;
