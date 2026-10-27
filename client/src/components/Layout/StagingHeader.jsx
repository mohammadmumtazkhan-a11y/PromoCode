import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import mitoLogo from '../../assets/Mito_logo.svg';

// Exact SVG Icons from staging-admin.mito.money (_app chunk 96972)
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.0001 9.7041V9C19.0001 5.13401 15.8661 2 12.0001 2C8.13407 2 5.00006 5.13401 5.00006 9V9.7041C5.00006 10.5491 4.74995 11.3752 4.28123 12.0783L3.13263 13.8012C2.08349 15.3749 2.88442 17.5139 4.70913 18.0116C9.48258 19.3134 14.5175 19.3134 19.291 18.0116C21.1157 17.5139 21.9166 15.3749 20.8675 13.8012L19.7189 12.0783C19.2502 11.3752 19.0001 10.5491 19.0001 9.7041Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 19C8.15503 20.7478 9.92246 22 12 22C14.0775 22 15.845 20.7478 16.5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 6V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SignOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(90deg)', marginRight: 8, flexShrink: 0 }}>
    <path opacity="0.5" d="M17 9.00195C19.175 9.01406 20.3529 9.11051 21.1213 9.8789C22 10.7576 22 12.1718 22 15.0002V16.0002C22 18.8286 22 20.2429 21.1213 21.1215C20.2426 22.0002 18.8284 22.0002 16 22.0002H8C5.17157 22.0002 3.75736 22.0002 2.87868 21.1215C2 20.2429 2 18.8286 2 16.0002L2 15.0002C2 12.1718 2 10.7576 2.87868 9.87889C3.64706 9.11051 4.82497 9.01406 7 9.00195" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 15L12 2M12 2L15 5.5M12 2L9 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MenuHamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 7L4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path opacity="0.5" d="M20 12L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M20 17L4 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const UnreadBadge = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <span style={{
      position: 'absolute',
      top: -4,
      right: -4,
      display: 'flex',
      height: 20,
      minWidth: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      background: '#FB4B14',
      padding: '0 4px',
      fontSize: '10px',
      fontWeight: 700,
      lineHeight: 1,
      color: '#ffffff'
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

const StagingHeader = ({ onMobileToggle, collapsed, onToggleCollapse }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef(null);
  const userRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setShowUserMenu(false);
    sessionStorage.setItem('mitoLoggedOut', 'true');
    navigate('/login');
  };

  return (
    <header className="staging-header">
      {/* Left: Horizontal logo & collapse button when sidebar is collapsed or on mobile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center' }}>
              <img src={mitoLogo} alt="Mito Logo" style={{ height: 48, width: 'auto', maxWidth: 170, objectFit: 'contain' }} />
            </Link>
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              style={{
                display: 'flex',
                padding: 8,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(224, 230, 237, 0.4)',
                color: '#323130',
                cursor: 'pointer'
              }}
            >
              <MenuHamburgerIcon />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onMobileToggle}
          className="mobile-header-btn"
          title="Open menu"
          style={{
            padding: 8,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(224, 230, 237, 0.4)',
            color: '#323130',
            cursor: 'pointer'
          }}
        >
          <MenuHamburgerIcon />
        </button>
      </div>

      {/* Right: Notification Bell & User Avatar matching staging_app.js */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
        {/* Notifications Dropdown */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotifications((s) => !s)}
            style={{
              position: 'relative',
              display: 'block',
              padding: 8,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(224, 230, 237, 0.4)',
              color: '#323130',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(224, 230, 237, 0.9)';
              e.currentTarget.style.color = '#FB4B14';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(224, 230, 237, 0.4)';
              e.currentTarget.style.color = '#323130';
            }}
          >
            <span style={{ position: 'relative', display: 'block' }}>
              <BellIcon />
              <UnreadBadge count={unreadCount} />
            </span>
          </button>

          {showNotifications && (
            <ul style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              width: 340,
              listStyle: 'none',
              padding: 0,
              margin: '8px 0 0 0',
              background: '#ffffff',
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              border: '1px solid #e0e6ed',
              zIndex: 50,
              color: '#323130'
            }}>
              <li style={{ borderBottom: '1px solid #e0e6ed' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', fontWeight: 600 }}>
                  <h4 style={{ margin: 0, fontSize: '18px' }}>Notifications</h4>
                </div>
                <p style={{ margin: 0, padding: '0 16px 8px 16px', fontSize: '11px', color: '#64748b' }}>
                  Dismiss hides it here. It stays in Inbox until you Delete.
                </p>
              </li>
              <li>
                <div style={{ minHeight: 160, display: 'grid', placeContent: 'center', textAlign: 'center', fontSize: '14px', padding: 16 }}>
                  <div style={{ margin: '0 auto 12px auto', width: 40, height: 40, borderRadius: '50%', background: 'rgba(251, 75, 20, 0.12)', color: '#FB4B14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BellIcon />
                  </div>
                  <div>No unread notifications.</div>
                  <Link
                    to="/support/inbox"
                    onClick={() => setShowNotifications(false)}
                    style={{ marginTop: 12, fontSize: '14px', fontWeight: 600, color: '#FB4B14', textDecoration: 'none' }}
                  >
                    Open Inbox
                  </Link>
                </div>
              </li>
            </ul>
          )}
        </div>

        {/* User Avatar Dropdown matching staging_app.js */}
        <div ref={userRef} style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowUserMenu((s) => !s)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <div style={{ position: 'relative', display: 'inline-block', height: 36, width: 36, marginRight: 8 }}>
              <span style={{
                display: 'flex',
                height: 36,
                width: 36,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: '50%',
                background: '#fb4b14',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600
              }}>
                MA
              </span>
              <UnreadBadge count={unreadCount} />
            </div>
          </button>

          {showUserMenu && (
            <ul style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              minWidth: 290,
              listStyle: 'none',
              padding: 0,
              margin: '8px 0 0 0',
              background: '#ffffff',
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              border: '1px solid #e0e6ed',
              fontWeight: 600,
              color: '#323130',
              zIndex: 50,
              overflow: 'hidden'
            }}>
              <li>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
                  <div style={{ display: 'inline-block', height: 36, width: 36, overflow: 'hidden', borderRadius: '50%', marginRight: 8, flexShrink: 0 }}>
                    <span style={{
                      display: 'flex',
                      height: '100%',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fb4b14',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}>
                      MA
                    </span>
                  </div>
                  <div style={{ paddingLeft: 16, overflow: 'hidden' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', color: '#323130' }}>Mito Admin</h4>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#605e5c', fontWeight: 400 }}>admin@mito.money</h4>
                  </div>
                </div>
              </li>
              <li style={{ borderTop: '1px solid #e0e6ed' }}>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    color: '#FB4B14',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FB4B14';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#FB4B14';
                  }}
                >
                  <SignOutIcon />
                  Sign Out
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </header>
  );
};

export default StagingHeader;
