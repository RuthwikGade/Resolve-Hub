import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';
import { getInitials, classNames } from '../../utils/helpers';

export default function Sidebar({ collapsed, onToggle, activeCommunity }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role = user?.role || 'member';
  const sections = NAV_ITEMS[role] || NAV_ITEMS.member;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // For admin nav items that need communityId
  const resolvePath = (path) => {
    if (path.startsWith('/admin/') && activeCommunity) {
      return `${path}/${activeCommunity}`;
    }
    return path;
  };

  return (
    <>
      <aside id="sidebar" className={classNames('sidebar', collapsed && 'collapsed')}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">R</div>
          <span className="sidebar-brand-text">ResolveHub</span>
        </div>

        {/* Toggle */}
        <button
          id="sidebar-toggle"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▸' : '◂'}
        </button>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={resolvePath(item.path)}
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={({ isActive }) =>
                    classNames('sidebar-link', isActive && 'active')
                  }
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
            <div className="sidebar-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
