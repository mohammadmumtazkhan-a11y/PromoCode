import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const StagingHeader = ({ onMobileToggle }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const notifRef = useRef(null);
  const userRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdowns when clicking outside
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
      {/* Left: Mobile hamburger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onMobileToggle}
          className="mobile-header-btn"
          title="Open menu"
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '1.4rem',
            cursor: 'pointer',
            color: '#323130',
            padding: 4
          }}
        >
          ☰
        </button>
      </div>

      {/* Right: Notifications & User Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
        {/* Notification Bell Dropdown */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotifications(s => !s)}
            title="Notifications"
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: 'none',
              background: '#f3f2f1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#323130'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: '#FB4B14',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                lineHeight: 1
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              width: 340,
              background: '#ffffff',
              border: '1px solid #edebe9',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 50,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edebe9' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#323130' }}>Notifications</span>
                {unreadCount > 0 && (
                  <span style={{ background: 'rgba(251, 75, 20, 0.1)', color: '#FB4B14', padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f2f1' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#323130' }}>Referral Reward Credited</div>
                  <div style={{ fontSize: '0.78rem', color: '#605e5c', marginTop: 2 }}>Referrer bonus credited for customer transfer event.</div>
                  <div style={{ fontSize: '0.7rem', color: '#a19f9d', marginTop: 4 }}>10 minutes ago</div>
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f2f1' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#323130' }}>Promo Code Redeemed</div>
                  <div style={{ fontSize: '0.78rem', color: '#605e5c', marginTop: 2 }}>Promo code WELCOME10 was redeemed on Send Money.</div>
                  <div style={{ fontSize: '0.7rem', color: '#a19f9d', marginTop: 4 }}>1 hour ago</div>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#323130' }}>Rate Threshold Alert</div>
                  <div style={{ fontSize: '0.78rem', color: '#605e5c', marginTop: 2 }}>GBP to KES corridor rate updated by administrator.</div>
                  <div style={{ fontSize: '0.7rem', color: '#a19f9d', marginTop: 4 }}>Today at 09:30 UTC</div>
                </div>
              </div>
              <div style={{ padding: 12, background: '#fafafa', borderTop: '1px solid #edebe9', display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setUnreadCount(0)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Mark all read
                </button>
                <Link
                  to="/support/inbox"
                  onClick={() => setShowNotifications(false)}
                  className="btn-outline-primary"
                  style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem', textAlign: 'center' }}
                >
                  View all in Inbox
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar & Dropdown */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowUserMenu(s => !s)}
            title="Account menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#FB4B14',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              MA
            </div>
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              width: 260,
              background: '#ffffff',
              border: '1px solid #edebe9',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 50,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #edebe9', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#FB4B14',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  MA
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#323130', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    Mito Admin
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#605e5c', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    admin@mito.money
                  </div>
                </div>
              </div>

              <div style={{ padding: '6px 0' }}>
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 16px',
                    color: '#323130',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>👤</span> Profile Details
                </Link>
                <Link
                  to="/support/inbox"
                  onClick={() => setShowUserMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 16px',
                    color: '#323130',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>🔔</span> Inbox Notifications
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 16px',
                    color: '#323130',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>⚙️</span> Portal Settings
                </Link>
              </div>

              <div style={{ borderTop: '1px solid #edebe9', padding: '6px 0' }}>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 16px',
                    color: '#FB4B14',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#ffede7'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>🚪</span> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default StagingHeader;
