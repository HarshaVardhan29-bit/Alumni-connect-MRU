import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import NotificationPanel from './NotificationPanel';
import CallManager from './CallManager';

const NAV_ITEMS = [
  { path: '/feed',        label: 'Home',          icon: 'home' },
  { path: '/explore',     label: 'Explore',       icon: 'explore' },
  { path: '/messages',    label: 'Messages',      icon: 'messages' },
  { path: '/notifications', label: 'Notifications', icon: 'notif', badge: true },
  { path: '/mentorship',  label: 'Mentorship',    icon: 'mentor' },
  { path: '/saved',       label: 'Saved',         icon: 'saved' },
];

// Bottom nav items for mobile (Twitter-style — 5 items max)
const MOBILE_NAV = [
  { path: '/feed',          label: 'Home',    icon: 'home' },
  { path: '/explore',       label: 'Explore', icon: 'explore' },
  { path: '/messages',      label: 'Messages',icon: 'messages' },
  { path: '/notifications', label: 'Notifs',  icon: 'notif', badge: true },
  { path: '/profile',       label: 'Profile', icon: 'profile' },
];

const Icon = ({ name, size = 24 }) => {
  const s = { width: size, height: size };
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':     return <svg viewBox="0 0 24 24" {...s}><path {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/><path {...p} d="M9 21V12h6v9"/></svg>;
    case 'explore':  return <svg viewBox="0 0 24 24" {...s}><circle {...p} cx="11" cy="11" r="8"/><line {...p} x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'messages': return <svg viewBox="0 0 24 24" {...s}><path {...p} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'notif':    return <svg viewBox="0 0 24 24" {...s}><path {...p} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path {...p} d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case 'mentor':   return <svg viewBox="0 0 24 24" {...s}><path {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle {...p} cx="9" cy="7" r="4"/><path {...p} d="M23 21v-2a4 4 0 0 0-3-3.87"/><path {...p} d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'connect':  return <svg viewBox="0 0 24 24" {...s}><circle {...p} cx="18" cy="5" r="3"/><circle {...p} cx="6" cy="12" r="3"/><circle {...p} cx="18" cy="19" r="3"/><line {...p} x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line {...p} x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
    case 'analytics':return <svg viewBox="0 0 24 24" {...s}><line {...p} x1="18" y1="20" x2="18" y2="10"/><line {...p} x1="12" y1="20" x2="12" y2="4"/><line {...p} x1="6" y1="20" x2="6" y2="14"/></svg>;
    case 'groups':   return <svg viewBox="0 0 24 24" {...s}><path {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle {...p} cx="9" cy="7" r="4"/><path {...p} d="M23 21v-2a4 4 0 0 0-3-3.87"/><path {...p} d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'community':return <svg viewBox="0 0 24 24" {...s}><path {...p} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline {...p} points="9 22 9 12 15 12 15 22"/></svg>;
    case 'settings': return <svg viewBox="0 0 24 24" {...s}><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'logout':   return <svg viewBox="0 0 24 24" {...s}><path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline {...p} points="16 17 21 12 16 7"/><line {...p} x1="21" y1="12" x2="9" y2="12"/></svg>;
    case 'saved':    return <svg viewBox="0 0 24 24" {...s}><path {...p} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
    case 'profile':  return <svg viewBox="0 0 24 24" {...s}><path {...p} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle {...p} cx="12" cy="7" r="4"/></svg>;
    default: return null;
  }
};

/* Premium gradient logo */
const LogoMark = () => (
  <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
    <defs>
      <linearGradient id="lg1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7c45b8"/>
        <stop offset="50%" stopColor="#a855f7"/>
        <stop offset="100%" stopColor="#c9a84c"/>
      </linearGradient>
      <linearGradient id="lg2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c9a84c"/>
        <stop offset="100%" stopColor="#7c45b8"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="36" height="36" rx="10" stroke="url(#lg1)" strokeWidth="2" fill="none"/>
    <path d="M12 28V14l8 8 8-8v14" stroke="url(#lg2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="20" cy="22" r="2" fill="url(#lg1)"/>
  </svg>
);

function NavItem({ item, location }) {
  const isActive = location.pathname === item.path ||
    (item.path !== '/feed' && location.pathname.startsWith(item.path));
  return (
    <Link to={item.path} className={`sb2-item${isActive ? ' active' : ''}`}>
      <span className="sb2-icon">
        <Icon name={item.icon} />
        {item.badge && <span className="sb2-dot" />}
      </span>
      <span className="sb2-label">{item.label}</span>
    </Link>
  );
}

/* Mobile bottom navigation bar — Twitter/X style */
function MobileBottomNav({ location, user, onNotifClick, notifOpen }) {
  return (
    <nav className="mobile-bottom-nav">
      {MOBILE_NAV.map(item => {
        if (item.path === '/notifications') {
          const isActive = notifOpen;
          return (
            <button
              key="notif"
              className={`mbn-item${isActive ? ' active' : ''}`}
              onClick={onNotifClick}
            >
              <span className="mbn-icon">
                <Icon name="notif" size={26} />
                {item.badge && <span className="mbn-dot" />}
              </span>
            </button>
          );
        }
        if (item.path === '/profile') {
          const isActive = location.pathname === '/profile' || location.pathname.startsWith('/profile/');
          return (
            <Link key="/profile" to="/profile" className={`mbn-item${isActive ? ' active' : ''}`}>
              <span className="mbn-icon mbn-av-wrap">
                <Avatar user={user} size={26} fontSize=".55rem" />
              </span>
            </Link>
          );
        }
        const isActive = location.pathname === item.path ||
          (item.path !== '/feed' && location.pathname.startsWith(item.path));
        return (
          <Link key={item.path} to={item.path} className={`mbn-item${isActive ? ' active' : ''}`}>
            <span className="mbn-icon">
              <Icon name={item.icon} size={26} />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="ig-shell">
      {/* ── INSTAGRAM-STYLE SIDEBAR (desktop) ── */}
      <aside className="sb2">

        {/* Logo */}
        <Link to="/feed" className="sb2-logo">
          <LogoMark />
          <span className="sb2-logo-text">Manav Rachna</span>
        </Link>

        {/* Main nav */}
        <nav className="sb2-nav">
          {NAV_ITEMS.map(item =>
            item.path === '/notifications'
              ? (
                <button
                  key="notif"
                  className={`sb2-item${notifOpen ? ' active' : ''}`}
                  onClick={() => setNotifOpen(o => !o)}
                >
                  <span className="sb2-icon">
                    <Icon name="notif" />
                    {item.badge && <span className="sb2-dot" />}
                  </span>
                  <span className="sb2-label">Notifications</span>
                </button>
              )
              : <NavItem key={item.path} item={item} location={location} />
          )}
        </nav>

        {/* Bottom section */}
        <div className="sb2-bottom">
          <Link
            to="/settings"
            className={`sb2-item${location.pathname === '/settings' ? ' active' : ''}`}
          >
            <span className="sb2-icon"><Icon name="settings" /></span>
            <span className="sb2-label">Settings</span>
          </Link>

          <Link to="/profile" className="sb2-item sb2-profile-item">
            <span className="sb2-icon sb2-av-wrap">
              <Avatar user={user} size={28} fontSize=".65rem" />
            </span>
            <span className="sb2-label">{user?.firstName} {user?.lastName}</span>
          </Link>

          <button
            className="sb2-item sb2-logout"
            onClick={() => { logout(); navigate('/'); }}
          >
            <span className="sb2-icon"><Icon name="logout" /></span>
            <span className="sb2-label">Log out</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP HEADER ── */}
      <header className="mobile-top-header">
        <LogoMark />
        <span className="mobile-top-title">Manav Rachna</span>
        <Link to="/settings" className="mobile-top-settings">
          <Icon name="settings" size={22} />
        </Link>
      </header>

      {/* ── MAIN ── */}
      <main className="ig-main">
        {children}
        <NotificationBell />
        <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        <CallManager />
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <MobileBottomNav
        location={location}
        user={user}
        notifOpen={notifOpen}
        onNotifClick={() => setNotifOpen(o => !o)}
      />
    </div>
  );
}
