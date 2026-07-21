import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useNotifications } from '../../contexts/NotificationContext';
import { classNames } from '../../utils/helpers';

// Route → page title mapping
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/communities': 'Communities',
  '/communities/create': 'Create Community',
  '/complaints': 'Complaints',
  '/complaints/create': 'New Complaint',
  '/admin/members': 'Manage Members',
  '/admin/categories': 'Manage Categories',
  '/admin/sla': 'SLA Rules',
  '/admin/routing': 'Routing',
  '/admin/join-requests': 'Join Requests',
};

function getPageTitle(pathname) {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(route)) return title;
  }
  // Detail pages
  if (pathname.match(/^\/complaints\/[^/]+$/)) return 'Complaint Detail';
  if (pathname.match(/^\/communities\/[^/]+$/)) return 'Community Detail';
  return 'ResolveHub';
}

export default function Layout({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = getPageTitle(location.pathname);

  // Extract community ID from URL path to feed active community context into Sidebar links
  let activeCommunity = '';
  const pathParts = location.pathname.split('/');
  if (pathParts[1] === 'communities' && pathParts[2] && pathParts[2] !== 'create') {
    activeCommunity = pathParts[2];
    localStorage.setItem('activeCommunityId', activeCommunity);
  } else if (pathParts[1] === 'admin' && pathParts[3]) {
    activeCommunity = pathParts[3];
    localStorage.setItem('activeCommunityId', activeCommunity);
  } else {
    activeCommunity = localStorage.getItem('activeCommunityId') || '';
  }

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Show mobile hamburger on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const toggle = document.getElementById('mobile-menu-toggle');
    function updateToggle() {
      if (toggle) toggle.style.display = mq.matches ? 'flex' : 'none';
    }
    updateToggle();
    mq.addEventListener('change', updateToggle);
    return () => mq.removeEventListener('change', updateToggle);
  }, []);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => {
          setCollapsed(c => !c);
          setMobileOpen(false);
        }}
        activeCommunity={activeCommunity}
      />

      <div className={classNames('main-wrapper', collapsed && 'sidebar-collapsed')}>
        <Header
          title={title}
          sidebarCollapsed={collapsed}
          onMobileToggle={() => setMobileOpen(m => !m)}
        />
        <main className="main-content page-transition">
          {children}
        </main>
      </div>
    </div>
  );
}
