import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleRoleModal from '../components/GoogleRoleModal';

export default function LoginPage() {
  const { login, googleLogin, completeGoogleLogin, pendingGoogle, user } = useAuth();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();

  const [role, setRole]         = useState('student');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState(params.get('error') ? 'Google sign-in failed. Please try again.' : '');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If user is already logged in (e.g. after Google redirect), go to feed
  useEffect(() => {
    if (user) navigate('/feed');
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login({ email, password });
      navigate('/feed');
    } catch (err) {
      const s = err.response?.status;
      if (!err.response) setError('Cannot connect to server. Please check your connection.');
      else if (s === 401) setError('Incorrect password. Please try again.');
      else if (s === 404) setError('No account found with this email.');
      else setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError('');
    try {
      const result = await googleLogin();
      if (result && !result.isNewUser) navigate('/feed');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setGoogleLoading(false);
        return;
      }
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally { setGoogleLoading(false); }
  };

  return (
    <div className="al-shell">
      {/* Role selection modal for new Google sign-ups */}
      {pendingGoogle && (
        <GoogleRoleModal
          token={pendingGoogle.token}
          onComplete={(updatedUser) => {
            completeGoogleLogin(updatedUser);
            navigate('/feed');
          }}
        />
      )}

      {/* ── LEFT PANEL ── */}
      <div className="al-left">
        {/* College image overlay */}
        <div className="al-img-overlay" />
        <div className="al-gradient-overlay" />

        {/* Back to home */}
        <Link to="/" className="al-back-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Home
        </Link>

        {/* Content */}
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
              Where Alumni<br />Shape Futures
            </h2>
            <p className="al-left-desc">
              Connect with 2,400+ alumni across industries. Get mentored, find opportunities, and give back to the community that shaped you.
            </p>
          </div>

          {/* Stats */}
          <div className="al-left-stats">
            <div className="al-stat">
              <div className="al-stat-num">2,400+</div>
              <div className="al-stat-lbl">Alumni</div>
            </div>
            <div className="al-stat-sep" />
            <div className="al-stat">
              <div className="al-stat-num">850+</div>
              <div className="al-stat-lbl">Students</div>
            </div>
            <div className="al-stat-sep" />
            <div className="al-stat">
              <div className="al-stat-num">1,200+</div>
              <div className="al-stat-lbl">Mentorships</div>
            </div>
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
            <h1 className="al-heading">Welcome Back</h1>
            <p className="al-sub">Sign in to your Manav Rachna Alumni Network account.</p>
          </div>

          {/* Role tabs */}
          <div className="al-role-tabs">
            <button
              className={`al-role-tab${role === 'alumni' ? ' active' : ''}`}
              onClick={() => setRole('alumni')}
            >
              Alumni
            </button>
            <button
              className={`al-role-tab${role === 'student' ? ' active' : ''}`}
              onClick={() => setRole('student')}
            >
              Student
            </button>
            <button
              className={`al-role-tab${role === 'faculty' ? ' active' : ''}`}
              onClick={() => setRole('faculty')}
            >
              Faculty
            </button>
          </div>

          {error && <div className="al-error">{error}</div>}

          <form onSubmit={handleSubmit} className="al-form">
            <div className="al-fg">
              <label className="al-label">University Email</label>
              <input
                type="email"
                className="al-input"
                placeholder="name@mru.edu.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="al-fg">
              <div className="al-label-row">
                <label className="al-label">Password</label>
                <Link to="/forgot-password" className="al-forgot">Forgot password?</Link>
              </div>
              <div className="al-pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="al-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

            <label className="al-remember">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              Keep me signed in for 30 days
            </label>

            <button type="submit" className="al-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Access Portal'}
              {!loading && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              )}
            </button>
          </form>

          <div className="al-divider"><span>or continue with</span></div>

          <button onClick={handleGoogleLogin} className="al-google-btn" disabled={googleLoading}>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Signing in…' : 'Sign in with Google'}
          </button>

          <p className="al-switch">
            New to the network? <Link to="/register" className="al-switch-link">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
