import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useOffline } from '../../hooks/useOffline';
import { getInitials, classNames } from '../../utils/helpers';
import NotificationBell from '../notifications/NotificationBell';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, sidebarCollapsed, onMobileToggle }) {
  const { user, logout } = useAuth();
  const { isOnline } = useOffline();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      {!isOnline && (
        <div className="offline-banner" id="offline-banner">
          ⚡ You are offline. Changes will sync when you reconnect.
        </div>
      )}
      <header
        id="header"
        className={classNames('header', sidebarCollapsed && 'sidebar-collapsed')}
        style={!isOnline ? { top: '36px' } : undefined}
      >
        <div className="header-left">
          {/* Mobile hamburger */}
          <button
            id="mobile-menu-toggle"
            className="header-icon-btn"
            onClick={onMobileToggle}
            style={{ display: 'none' }}
          >
            ☰
          </button>
          <h1 className="header-title">{title || 'Dashboard'}</h1>
        </div>

        <div className="header-right">
          {/* Search */}
          <div className="header-search">
            <span className="header-search-icon">🔍</span>
            <input
              id="header-search"
              type="text"
              placeholder="Search…"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* User dropdown */}
          <div className="dropdown" ref={dropdownRef}>
            <div
              id="header-user-dropdown"
              className="header-user-dropdown"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                {getInitials(user?.name)}
              </div>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                {user?.name?.split(' ')[0] || 'User'}
              </span>
            </div>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-item" style={{ cursor: 'default', opacity: 0.6 }}>
                  {user?.email}
                </div>
                <div className="dropdown-divider" />
                <div
                  id="header-logout"
                  className="dropdown-item"
                  onClick={handleLogout}
                  style={{ color: 'var(--color-danger)' }}
                >
                  🚪 Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
