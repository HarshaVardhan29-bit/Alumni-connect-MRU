import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', role: 'student', industry: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true); setError('');
    try {
      await register(form);
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const ROLES = [
    { value: 'student', label: 'Student' },
    { value: 'alumni',  label: 'Alumni'  },
    { value: 'faculty', label: 'Faculty' },
  ];

  return (
    <div className="al-shell">

      {/* ── LEFT PANEL ── */}
      <div className="al-left">
        <div className="al-img-overlay" />
        <div className="al-gradient-overlay" />

        <Link to="/" className="al-back-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Home
        </Link>

        <div className="al-left-content">
          <div className="al-left-logo">
            <div className="al-logo-emblem">MR</div>
            <div>
              <div className="al-logo-title">Manav Rachna</div>
              <div className="al-logo-sub">Alumni Network</div>
            </div>
          </div>

          <div className="al-left-body">
            <h2 className="al-left-heading">
              Join a Network<br />Built for Growth
            </h2>
            <p className="al-left-desc">
              Whether you're a student seeking guidance or an alumnus ready to give back — your journey starts here.
            </p>
          </div>

          <div className="al-left-stats">
            <div className="al-stat"><div className="al-stat-num">2,400+</div><div className="al-stat-lbl">Alumni</div></div>
            <div className="al-stat-sep" />
            <div className="al-stat"><div className="al-stat-num">AI</div><div className="al-stat-lbl">Matching</div></div>
            <div className="al-stat-sep" />
            <div className="al-stat"><div className="al-stat-num">Free</div><div className="al-stat-lbl">Forever</div></div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="al-right">
        <div className="al-form-wrap">

          {/* Mobile-only back button */}
          <Link to="/" className="al-mobile-back">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </Link>

          <div className="al-form-header">
            <h1 className="al-heading">Create Account</h1>
            <p className="al-sub">Join the Manav Rachna Alumni Network today.</p>
          </div>

          {/* Role tabs */}
          <div className="al-role-tabs">
            {ROLES.map(r => (
              <button
                key={r.value}
                className={`al-role-tab${form.role === r.value ? ' active' : ''}`}
                onClick={() => set('role', r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {error && <div className="al-error">{error}</div>}

          <form onSubmit={handleSubmit} className="al-form">
            <div className="al-row-2">
              <div className="al-fg">
                <label className="al-label">First Name</label>
                <input className="al-input" placeholder="Arjun" value={form.firstName}
                  onChange={e => set('firstName', e.target.value)} required />
              </div>
              <div className="al-fg">
                <label className="al-label">Last Name</label>
                <input className="al-input" placeholder="Sharma" value={form.lastName}
                  onChange={e => set('lastName', e.target.value)} />
              </div>
            </div>

            <div className="al-fg">
              <label className="al-label">University Email</label>
              <input type="email" className="al-input" placeholder="name@mru.edu.in"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            <div className="al-fg">
              <label className="al-label">Password</label>
              <div className="al-pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="al-input"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                />
                <button type="button" className="al-eye" onClick={() => setShowPw(s => !s)}>
                  {showPw
                    ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <div className="al-fg">
              <label className="al-label">Industry / Domain</label>
              <input className="al-input" placeholder="e.g. Technology, Finance, Design"
                value={form.industry} onChange={e => set('industry', e.target.value)} />
            </div>

            <button type="submit" className="al-submit" disabled={loading}>
              {loading ? 'Creating Account…' : 'Create Account'}
              {!loading && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              )}
            </button>
          </form>

          <div className="al-divider"><span>or continue with</span></div>

          <a href="http://localhost:5001/api/auth/google" className="al-google-btn">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>

          <p className="al-switch">
            Already have an account? <Link to="/login" className="al-switch-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
