import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import PageLoader from './components/PageLoader';
import NetworkStatus from './components/NetworkStatus';
import ConnectionStatus from './components/ConnectionStatus';
import LandingPage    from './pages/LandingPage';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import Dashboard      from './pages/Dashboard';
import FeedPage       from './pages/FeedPage';
import PostDetail     from './pages/PostDetail';
import ProfilePage    from './pages/ProfilePage';
import MentorshipPage from './pages/MentorshipPage';
import MessagesInbox  from './pages/MessagesInbox';
import AnalyticsPage  from './pages/AnalyticsPage';
import ExplorePage    from './pages/ExplorePage';
import SettingsPage        from './pages/SettingsPage';
import ForgotPasswordPage  from './pages/ForgotPasswordPage';
import NotificationsPage   from './pages/NotificationsPage';
import GroupsPage          from './pages/GroupsPage';
import GoogleAuthSuccess   from './pages/GoogleAuthSuccess';
import SavedPostsPage      from './pages/SavedPostsPage';
import AdminLogin          from './admin/AdminLogin';
import AdminDashboard      from './admin/AdminDashboard';
import AdminUsers          from './admin/AdminUsers';
import AdminUserDetail     from './admin/AdminUserDetail';
import AdminMentorships    from './admin/AdminMentorships';
import AdminAnnouncements  from './admin/AdminAnnouncements';
import AdminLogs           from './admin/AdminLogs';
import AdminAppeals        from './admin/AdminAppeals';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

// Redirect logged-in users away from public pages
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // don't flash anything
  return user ? <Navigate to="/feed" replace /> : children;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/admin/login" />;
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <NetworkStatus />
      {user && <ConnectionStatus />}
      {!loaded && <PageLoader onDone={() => setLoaded(true)} />}
      <Routes>
        <Route path="/"                        element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/login"                   element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"                element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/dashboard"               element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/feed"                    element={<PrivateRoute><FeedPage /></PrivateRoute>} />
        <Route path="/post/:id"                element={<PrivateRoute><PostDetail /></PrivateRoute>} />
        <Route path="/profile"                 element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/profile/:id"             element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/mentorship"              element={<PrivateRoute><MentorshipPage /></PrivateRoute>} />
        <Route path="/mentorship/connections"  element={<PrivateRoute><MentorshipPage /></PrivateRoute>} />
        <Route path="/messages"                element={<PrivateRoute><MessagesInbox /></PrivateRoute>} />
        <Route path="/messages/:id"            element={<PrivateRoute><MessagesInbox /></PrivateRoute>} />
        <Route path="/groups"                  element={<PrivateRoute><GroupsPage pageType="group" /></PrivateRoute>} />
        <Route path="/groups/:id"              element={<PrivateRoute><GroupsPage pageType="group" /></PrivateRoute>} />
        <Route path="/communities"             element={<PrivateRoute><GroupsPage pageType="community" /></PrivateRoute>} />
        <Route path="/communities/:id"         element={<PrivateRoute><GroupsPage pageType="community" /></PrivateRoute>} />
        <Route path="/analytics"               element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
        <Route path="/explore"                 element={<PrivateRoute><ExplorePage /></PrivateRoute>} />
        <Route path="/settings"                element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/notifications"           element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        <Route path="/saved"                   element={<PrivateRoute><SavedPostsPage /></PrivateRoute>} />
      <Route path="/forgot-password"         element={<ForgotPasswordPage />} />
      <Route path="/auth/google/success"     element={<GoogleAuthSuccess />} />
      {/* Admin routes — completely separate, no user auth required */}
      <Route path="/admin"                   element={<Navigate to="/admin/login" />} />
      <Route path="/admin/login"             element={<AdminLogin />} />
      <Route path="/admin/dashboard"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/users"             element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/users/:id"         element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
      <Route path="/admin/mentorships"       element={<AdminRoute><AdminMentorships /></AdminRoute>} />
      <Route path="/admin/announcements"     element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
      <Route path="/admin/logs"              element={<AdminRoute><AdminLogs /></AdminRoute>} />
      <Route path="/admin/appeals"           element={<AdminRoute><AdminAppeals /></AdminRoute>} />
      </Routes>
    </>
  );
}
