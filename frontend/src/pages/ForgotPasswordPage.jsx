import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

/* ── Shared left panel ── */
function AuthLeft({ step }) {
  const steps = ['Email', 'Verify OTP', 'New Password'];
  return (
    <div className="al-left">
      <div className="al-img-overlay" />
      <div className="al-gradient-overlay" />

      <Link to="/login" className="al-back-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Login
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
            Recover Your<br />Account Access
          </h2>
          <p className="al-left-desc">
            Follow the steps to securely reset your password and regain access to your alumni network account.
          </p>

          {/* Step progress */}
          <div className="fp-left-steps">
            {steps.map((s, i) => (
              <div key={s} className={`fp-left-step${i + 1 <= step ? ' done' : ''}${i + 1 === step ? ' current' : ''}`}>
                <div className="fp-left-step-num">
                  {i + 1 < step ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : i + 1}
                </div>
                <div className="fp-left-step-label">{s}</div>
                {i < steps.length - 1 && <div className="fp-left-step-line" />}
              </div>
            ))}
          </div>
        </div>

        <div className="al-left-stats">
          <div className="al-stat"><div className="al-stat-num">256-bit</div><div className="al-stat-lbl">Encryption</div></div>
          <div className="al-stat-sep" />
          <div className="al-stat"><div className="al-stat-num">OTP</div><div className="al-stat-lbl">Verified</div></div>
          <div className="al-stat-sep" />
          <div className="al-stat"><div className="al-stat-num">Secure</div><div className="al-stat-lbl">Reset</div></div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Email ── */
function StepEmail({ onNext }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      await api.post('/auth/forgot-password', { email });
      onNext(email);
    } catch (e) { setErr(e.response?.data?.message || 'Failed to send OTP.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="al-form-wrap">
      <div className="al-form-header">
        <h1 className="al-heading">Forgot Password</h1>
        <p className="al-sub">Enter your registered email and we'll send you a 6-digit OTP.</p>
      </div>
      {err && <div className="al-error">{err}</div>}
      <form onSubmit={submit} className="al-form">
        <div className="al-fg">
          <label className="al-label">University Email</label>
          <input
            type="email"
            className="al-input"
            placeholder="you@mru.edu.in"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required autoFocus
          />
        </div>
        <button type="submit" className="al-submit" disabled={loading}>
          {loading ? 'Sending OTP…' : 'Send OTP'}
          {!loading && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          )}
        </button>
      </form>
      <p className="al-switch">
        Remember your password? <Link to="/login" className="al-switch-link">Sign in</Link>
      </p>
    </div>
  );
}

/* ── Step 2: OTP ── */
function StepOtp({ email, onNext, onBack }) {
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) { setOtp(paste.split('')); inputs.current[5]?.focus(); }
  };

  const resend = async () => {
    setResending(true); setErr('');
    try {
      await api.post('/auth/forgot-password', { email });
      setCountdown(60); setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (e) { setErr(e.response?.data?.message || 'Failed.'); }
    finally { setResending(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return setErr('Enter all 6 digits.');
    setLoading(true); setErr('');
    try {
      await api.post('/auth/verify-otp', { email, otp: code });
      onNext(code);
    } catch (e) { setErr(e.response?.data?.message || 'Invalid OTP.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="al-form-wrap">
      <div className="al-form-header">
        <h1 className="al-heading">Enter OTP</h1>
        <p className="al-sub">We sent a 6-digit code to <strong style={{ color: '#c9a84c' }}>{email}</strong></p>
      </div>
      {err && <div className="al-error">{err}</div>}
      <form onSubmit={submit}>
        <div className="fp-otp-row" onPaste={handlePaste}>
          {otp.map((d, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              className="fp-otp-input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
            />
          ))}
        </div>
        <button type="submit" className="al-submit" disabled={loading || otp.join('').length < 6} style={{ marginTop: '1.5rem' }}>
          {loading ? 'Verifying…' : 'Verify OTP'}
          {!loading && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          )}
        </button>
      </form>
      <div className="fp-resend-row">
        {countdown > 0
          ? <span>Resend OTP in <strong style={{ color: '#c9a84c' }}>{countdown}s</strong></span>
          : <button className="fp-resend-btn" onClick={resend} disabled={resending}>{resending ? 'Sending…' : 'Resend OTP'}</button>
        }
      </div>
      <p className="al-switch">
        Wrong email? <button className="al-switch-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }} onClick={onBack}>Change email</button>
      </p>
    </div>
  );
}

/* ── Step 3: New Password ── */
function StepReset({ email, otp, onDone }) {
  const [form, setForm]   = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');
  const [show, setShow]   = useState(false);

  const strength = (p) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const s = strength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][s];
  const strengthColor = ['', '#ef4444', '#f97316', '#c9a84c', '#4ade80', '#22c55e'][s];

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setErr('Passwords do not match.');
    if (form.password.length < 6) return setErr('Minimum 6 characters.');
    setLoading(true); setErr('');
    try {
      await api.post('/auth/reset-password', { email, otp, password: form.password });
      onDone();
    } catch (e) { setErr(e.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="al-form-wrap">
      <div className="al-form-header">
        <h1 className="al-heading">New Password</h1>
        <p className="al-sub">Choose a strong password for your account.</p>
      </div>
      {err && <div className="al-error">{err}</div>}
      <form onSubmit={submit} className="al-form">
        <div className="al-fg">
          <label className="al-label">New Password</label>
          <div className="al-pw-wrap">
            <input
              type={show ? 'text' : 'password'}
              className="al-input"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required autoFocus
            />
            <button type="button" className="al-eye" onClick={() => setShow(s => !s)}>
              {show
                ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
          {form.password && (
            <div className="fp-strength-row">
              <div className="fp-strength-bar">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="fp-strength-seg" style={{ background: i <= s ? strengthColor : 'rgba(255,255,255,.1)' }} />
                ))}
              </div>
              <span style={{ color: strengthColor, fontSize: '.72rem', fontWeight: 600 }}>{strengthLabel}</span>
            </div>
          )}
        </div>

        <div className="al-fg">
          <label className="al-label">Confirm Password</label>
          <input
            type={show ? 'text' : 'password'}
            className="al-input"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            required
          />
          {form.confirm && form.password !== form.confirm && (
            <span style={{ fontSize: '.75rem', color: '#ef4444', marginTop: '.3rem', display: 'block' }}>Passwords don't match</span>
          )}
        </div>

        <button type="submit" className="al-submit" disabled={loading || form.password !== form.confirm}>
          {loading ? 'Resetting…' : 'Reset Password'}
          {!loading && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

/* ── Step 4: Success ── */
function StepSuccess() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate('/login'), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="al-form-wrap" style={{ textAlign: 'center' }}>
      <div className="fp-success-circle">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h1 className="al-heading" style={{ marginTop: '1.5rem' }}>Password Reset!</h1>
      <p className="al-sub">Your password has been updated successfully.<br />Redirecting to login in 3 seconds…</p>
      <Link to="/login" className="al-submit" style={{ display: 'flex', marginTop: '2rem', textDecoration: 'none' }}>
        Go to Login
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </Link>
    </div>
  );
}

/* ── Main ── */
export default function ForgotPasswordPage() {
  const [step, setStep]   = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp]     = useState('');

  return (
    <div className="al-shell">
      <AuthLeft step={step} />
      <div className="al-right">
        {/* Mobile-only back button */}
        <Link to="/login" className="al-mobile-back" style={{ marginBottom: '1rem' }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Login
        </Link>
        {step === 1 && <StepEmail onNext={(e) => { setEmail(e); setStep(2); }} />}
        {step === 2 && <StepOtp email={email} onNext={(o) => { setOtp(o); setStep(3); }} onBack={() => setStep(1)} />}
        {step === 3 && <StepReset email={email} otp={otp} onDone={() => setStep(4)} />}
        {step === 4 && <StepSuccess />}
      </div>
    </div>
  );
}
