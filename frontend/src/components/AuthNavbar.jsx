import { Link } from 'react-router-dom';

export default function AuthNavbar() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1.1rem 3rem',
      background: 'rgba(7,7,15,.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,.06)',
    }}>
      <Link to="/" style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '1.4rem', fontWeight: 600,
        color: '#fff', textDecoration: 'none',
        letterSpacing: '.03em',
      }}>
        Manav<span style={{ color: '#c9a84c' }}>Rachna</span>
      </Link>
      <div style={{ display: 'flex', gap: '.8rem', alignItems: 'center' }}>
        <Link to="/login" style={{
          fontSize: '.8rem', color: 'rgba(255,255,255,.55)',
          textDecoration: 'none', letterSpacing: '.06em',
          transition: 'color .2s',
        }}>Sign In</Link>
        <Link to="/register" style={{
          fontSize: '.8rem', background: 'linear-gradient(135deg,#5b2d8e,#7c45b8)',
          color: '#fff', padding: '.45rem 1.2rem', borderRadius: '6px',
          textDecoration: 'none', letterSpacing: '.06em', fontWeight: 500,
        }}>Register</Link>
      </div>
    </div>
  );
}
