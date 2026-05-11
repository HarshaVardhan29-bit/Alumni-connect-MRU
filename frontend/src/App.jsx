import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';
import PageLoader from './components/PageLoader';
import NetworkStatus from './components/NetworkStatus';
import ConnectionStatus from './components/ConnectionStatus';

// ── Eagerly loaded (critical path — needed immediately) ──────────
import LandingPage   from './pages/LandingPage';
import LoginPage     from './pages/LoginPage';
import RegisterPage  from './pages/RegisterPage';

// ── Lazily loaded (split into separate chunks) ───────────────────
// Each lazy import = separate JS chunk = only loaded when navigated to
const FeedPage          = lazy(() => import('./pages/FeedPage'));
const Dashboard         = lazy(() => import('./pages/Dashboard'));
const PostDetail        = lazy(() => import('./pages/PostDetail'));
const ProfilePage       = lazy(() => import('./pages/ProfilePage'));
const MentorshipPage    = lazy(() => import('./pages/MentorshipPage'));
const MessagesInbox     = lazy(() => import('./pages/MessagesInbox'));
const AnalyticsPage     = lazy(() => import('./pages/AnalyticsPage'));
const ExplorePage       = lazy(() => import('./pages/ExplorePage'));
const SettingsPage      = lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const GroupsPage        = lazy(() => import('./pages/GroupsPage'));
const SavedPostsPage    = lazy(() => import('./pages/SavedPostsPage'));
const ForgotPasswordPage= lazy(() => import('./pages/ForgotPasswordPage'));
const GoogleAuthSuccess = lazy(() => import('./pages/GoogleAuthSuccess'));

// Admin — completely separate chunk (never loaded for regular users)
const AdminLogin        = lazy(() => import('./admin/AdminLogin'));
const AdminDashboard    = lazy(() => import('./admin/AdminDashboard'));
const AdminUsers        = lazy(() => import('./admin/AdminUsers'));
const AdminUserDetail   = lazy(() => import('./admin/AdminUserDetail'));
const AdminMentorships  = lazy(() => import('./admin/AdminMentorships'));
const AdminAnnouncements= lazy(() => import('./admin/AdminAnnouncements'));
const AdminLogs         = lazy(() => import('./admin/AdminLogs'));
const AdminAppeals      = lazy(() => import('./admin/AdminAppeals'));

// ── Skeleton fallback — shown while lazy chunk loads ─────────────
function PageSkeleton() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '3px solid rgba(124,69,184,.2)',
        borderTopColor: '#7c45b8',
        animation: 'spin .7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/feed" replace /> : children;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/admin/login" />;
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Handle push notification taps
  useEffect(() => {
    const handler = (e) => {
      const url = e.detail?.url;
      if (url) navigate(url);
    };
    window.addEventListener('push-navigate', handler);
    return () => window.removeEventListener('push-navigate', handler);
  }, [navigate]);

  // Prefetch likely next pages after initial load
  useEffect(() => {
    if (!user) return;
    // After 3s, prefetch the most common pages in background
    const t = setTimeout(() => {
      import('./pages/MessagesInbox');
      import('./pages/ProfilePage');
      import('./pages/ExplorePage');
    }, 3000);
    return () => clearTimeout(t);
  }, [user]);

  return (
    <>
      <NetworkStatus />
      {user && <ConnectionStatus />}
      {!loaded && <PageLoader onDone={() => setLoaded(true)} />}

      {/* Suspense wraps all lazy routes — shows spinner while chunk loads */}
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"               element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login"          element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"       element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password"element={<ForgotPasswordPage />} />
          <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />

          {/* ── Private ── */}
          <Route path="/feed"                   element={<PrivateRoute><FeedPage /></PrivateRoute>} />
          <Route path="/dashboard"              element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/post/:id"               element={<PrivateRoute><PostDetail /></PrivateRoute>} />
          <Route path="/profile"                element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/profile/:id"            element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/mentorship"             element={<PrivateRoute><MentorshipPage /></PrivateRoute>} />
          <Route path="/mentorship/connections" element={<PrivateRoute><MentorshipPage /></PrivateRoute>} />
          <Route path="/messages"               element={<PrivateRoute><MessagesInbox /></PrivateRoute>} />
          <Route path="/messages/:id"           element={<PrivateRoute><MessagesInbox /></PrivateRoute>} />
          <Route path="/groups"                 element={<PrivateRoute><GroupsPage pageType="group" /></PrivateRoute>} />
          <Route path="/groups/:id"             element={<PrivateRoute><GroupsPage pageType="group" /></PrivateRoute>} />
          <Route path="/communities"            element={<PrivateRoute><GroupsPage pageType="community" /></PrivateRoute>} />
          <Route path="/communities/:id"        element={<PrivateRoute><GroupsPage pageType="community" /></PrivateRoute>} />
          <Route path="/analytics"              element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
          <Route path="/explore"                element={<PrivateRoute><ExplorePage /></PrivateRoute>} />
          <Route path="/settings"               element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/notifications"          element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
          <Route path="/saved"                  element={<PrivateRoute><SavedPostsPage /></PrivateRoute>} />

          {/* ── Admin ── */}
          <Route path="/admin"               element={<Navigate to="/admin/login" />} />
          <Route path="/admin/login"         element={<AdminLogin />} />
          <Route path="/admin/dashboard"     element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users"         element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/users/:id"     element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
          <Route path="/admin/mentorships"   element={<AdminRoute><AdminMentorships /></AdminRoute>} />
          <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
          <Route path="/admin/logs"          element={<AdminRoute><AdminLogs /></AdminRoute>} />
          <Route path="/admin/appeals"       element={<AdminRoute><AdminAppeals /></AdminRoute>} />
        </Routes>
      </Suspense>
    </>
  );
}
