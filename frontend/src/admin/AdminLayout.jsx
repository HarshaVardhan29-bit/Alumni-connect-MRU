import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './admin.css';

const NAV = [
  { path: '/admin/dashboard',     label: 'Dashboard',    icon: '📊' },
  { path: '/admin/users',         label: 'Users',        icon: '👥' },
  { path: '/admin/mentorships',   label: 'Mentorships',  icon: '🤝' },
  { path: '/admin/announcements', label: 'Announcements',icon: '📢' },
  { path: '/admin/appeals',       label: 'Appeals',      icon: '📩' },
  { path: '/admin/logs',          label: 'Audit Logs',   icon: '📋' },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const admin     = JSON.parse(localStorage.getItem('adminUser') || '{}');
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('adminTheme') || 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  return (
    <div className="adm-shell">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">
          <div className="adm-logo-mark">MR</div>
          <div>
            <div className="adm-logo-title">Admin</div>
            <div className="adm-logo-sub">MentorConnect</div>
          </div>
        </div>

        <nav className="adm-nav">
          {NAV.map(n => (
            <Link
              key={n.path}
              to={n.path}
              className={`adm-nav-item${location.pathname === n.path ? ' active' : ''}`}
            >
              <span className="adm-nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="adm-sidebar-bottom">
          {/* Theme Toggle */}
          <button className="adm-theme-toggle" onClick={toggleTheme}>
            <span className="adm-theme-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className="adm-admin-info">
            <div className="adm-admin-av">{admin.name?.[0] || 'A'}</div>
            <div>
              <div className="adm-admin-name">{admin.name || 'Admin'}</div>
              <div className="adm-admin-email">{admin.email}</div>
            </div>
          </div>
          <button className="adm-logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="adm-main">
        {children}
      </main>
    </div>
  );
}
