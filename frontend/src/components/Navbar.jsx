import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onJoinClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav>
      <Link to="/" className="logo">Manav<span>Rachna</span></Link>

      {/* Desktop nav links */}
      <ul className="nav-links">
        <li><a href="#problem">Problem</a></li>
        <li><a href="#solution">Solution</a></li>
        <li><a href="#preview">Preview</a></li>
        <li><a href="#implementation">How It Works</a></li>
        <li><a href="#impact">Impact</a></li>
      </ul>

      {/* Desktop CTA */}
      <div className="nav-right">
        {user ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link to="/dashboard" className="nav-cta">Dashboard</Link>
            <button className="nav-cta" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.3)' }} onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <Link to="/login" className="nav-cta">Connect</Link>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        className={`nav-hamburger${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Menu"
      >
        <span /><span /><span />
      </button>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="nav-mobile-menu" onClick={() => setMenuOpen(false)}>
          <a href="#problem">Problem</a>
          <a href="#solution">Solution</a>
          <a href="#preview">Preview</a>
          <a href="#implementation">How It Works</a>
          <a href="#impact">Impact</a>
          <div className="nav-mobile-divider" />
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login">Connect →</Link>
          )}
        </div>
      )}
    </nav>
  );
}
