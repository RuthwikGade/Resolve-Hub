import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
// @ts-ignore
import { ToastContainer } from './components/ui/Toast';

// Layout & UI
// @ts-ignore
import Layout from './components/layout/Layout';
// @ts-ignore
import Loader from './components/ui/Loader';

// Pages
// @ts-ignore
import Login from './pages/auth/Login';
// @ts-ignore
import Register from './pages/auth/Register';
// @ts-ignore
import MemberDashboard from './pages/dashboard/MemberDashboard';
// @ts-ignore
import AdminDashboard from './pages/dashboard/AdminDashboard';
// @ts-ignore
import CommunityList from './pages/communities/CommunityList';
// @ts-ignore
import CommunityDetail from './pages/communities/CommunityDetail';
// @ts-ignore
import CreateCommunity from './pages/communities/CreateCommunity';
// @ts-ignore
import ComplaintList from './pages/complaints/ComplaintList';
// @ts-ignore
import ComplaintDetail from './pages/complaints/ComplaintDetail';
// @ts-ignore
import CreateComplaint from './pages/complaints/CreateComplaint';

// Admin Pages
// @ts-ignore
import ManageMembers from './pages/admin/ManageMembers';
// @ts-ignore
import ManageCategories from './pages/admin/ManageCategories';
// @ts-ignore
import ManageSLA from './pages/admin/ManageSLA';
// @ts-ignore
import ManageRouting from './pages/admin/ManageRouting';
// @ts-ignore
import JoinRequests from './pages/admin/JoinRequests';
// @ts-ignore
import NotFound from './pages/NotFound';

// New Pages
// @ts-ignore
import LandingPage from './pages/LandingPage';
// @ts-ignore
import AIInsightsDashboard from './pages/dashboard/AIInsightsDashboard';
// @ts-ignore
import ProfileSettings from './pages/profile/ProfileSettings';

/**
 * Route protector that checks if user is authenticated.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader variant="page" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

/**
 * Dashboard Switcher component based on user role.
 */
function DashboardSwitcher() {
  const { user } = useAuth();

  // If staff (responsible_person) or community admin or platform super_admin, show admin dashboard
  if (user?.role === 'community_admin' || user?.role === 'responsible_person' || user?.role === 'super_admin') {
    return <AdminDashboard />;
  }

  return <MemberDashboard />;
}

function GlobalToasts() {
  const { toasts, removeToast } = useNotifications();
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <GlobalToasts />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardSwitcher />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/communities"
                element={
                  <ProtectedRoute>
                    <CommunityList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/communities/create"
                element={
                  <ProtectedRoute>
                    <CreateCommunity />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/communities/:id"
                element={
                  <ProtectedRoute>
                    <CommunityDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/communities/:communityId/ai-insights"
                element={
                  <ProtectedRoute>
                    <AIInsightsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaints"
                element={
                  <ProtectedRoute>
                    <ComplaintList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaints/create"
                element={
                  <ProtectedRoute>
                    <CreateComplaint />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaints/:id"
                element={
                  <ProtectedRoute>
                    <ComplaintDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/settings"
                element={
                  <ProtectedRoute>
                    <ProfileSettings />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/members/:communityId"
                element={
                  <ProtectedRoute>
                    <ManageMembers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories/:communityId"
                element={
                  <ProtectedRoute>
                    <ManageCategories />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/sla/:communityId"
                element={
                  <ProtectedRoute>
                    <ManageSLA />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/routing/:communityId"
                element={
                  <ProtectedRoute>
                    <ManageRouting />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/join-requests/:communityId"
                element={
                  <ProtectedRoute>
                    <JoinRequests />
                  </ProtectedRoute>
                }
              />

              {/* Fallback 404 Route */}
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <NotFound />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
