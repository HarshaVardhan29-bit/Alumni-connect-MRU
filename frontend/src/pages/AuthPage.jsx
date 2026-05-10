import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleRoleModal from '../components/GoogleRoleModal';

/* ─── Aurora canvas ─── */
function AuroraCanvas() {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Each beam: a wide diagonal stripe with rainbow-like color bands
    const beams = [
      // Top-right cluster
      { x: 0.78, angle: 38, colors: ['#00e5ff','#00bcd4','#0097a7'], width: 22, gap: 8,  speed: 0.00006, drift: 0.03 },
      { x: 0.82, angle: 38, colors: ['#7c4dff','#651fff','#aa00ff'], width: 18, gap: 6,  speed: 0.00005, drift: 0.025 },
      { x: 0.86, angle: 38, colors: ['#ffd740','#ffab00','#ff6d00'], width: 14, gap: 5,  speed: 0.00007, drift: 0.035 },
      { x: 0.90, angle: 38, colors: ['#69f0ae','#00e676','#00c853'], width: 10, gap: 4,  speed: 0.00004, drift: 0.02  },
      { x: 0.74, angle: 38, colors: ['#ff4081','#f50057','#c51162'], width: 16, gap: 6,  speed: 0.00008, drift: 0.04  },
      // Bottom-left cluster
      { x: 0.18, angle: 38, colors: ['#00e5ff','#26c6da','#00acc1'], width: 20, gap: 7,  speed: 0.00005, drift: 0.028 },
      { x: 0.13, angle: 38, colors: ['#e040fb','#ce93d8','#ab47bc'], width: 15, gap: 5,  speed: 0.00006, drift: 0.032 },
      { x: 0.22, angle: 38, colors: ['#ffca28','#ffa000','#ff8f00'], width: 12, gap: 4,  speed: 0.00007, drift: 0.038 },
      { x: 0.09, angle: 38, colors: ['#69f0ae','#00e676','#1de9b6'], width: 8,  gap: 3,  speed: 0.00004, drift: 0.018 },
    ];

    const drawBeam = (beam, time) => {
      const w = canvas.width, h = canvas.height;
      const rad = (beam.angle * Math.PI) / 180;
      // slow horizontal drift
      const offsetX = Math.sin(time * beam.speed * 1000) * beam.drift * w;
      const cx = beam.x * w + offsetX;

      // direction vector along the beam
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      // perpendicular
      const px = -dy;
      const py = dx;

      // extend beam far beyond screen
      const ext = Math.max(w, h) * 2;
      const x1 = cx - dx * ext, y1 = -dy * ext;
      const x2 = cx + dx * ext, y2 =  dy * ext;

      beam.colors.forEach((color, ci) => {
        const offset = (ci - (beam.colors.length - 1) / 2) * (beam.width + beam.gap);
        const bx1 = x1 + px * offset, by1 = y1 + py * offset;
        const bx2 = x2 + px * offset, by2 = y2 + py * offset;
        const hw = beam.width * 0.5;

        // gradient perpendicular to beam
        const gx1 = cx + px * (offset - hw);
        const gy1 = 0  + py * (offset - hw);
        const gx2 = cx + px * (offset + hw);
        const gy2 = 0  + py * (offset + hw);

        const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
        grad.addColorStop(0,    'transparent');
        grad.addColorStop(0.25, color + '55');
        grad.addColorStop(0.5,  color + 'ee');
        grad.addColorStop(0.75, color + '55');
        grad.addColorStop(1,    'transparent');

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = grad;
        ctx.lineWidth = beam.width;
        ctx.beginPath();
        ctx.moveTo(bx1, by1);
        ctx.lineTo(bx2, by2);
        ctx.stroke();
        ctx.restore();
      });
    };

    const draw = () => {
      t++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#07070f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      beams.forEach(b => drawBeam(b, t));
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />;
}

/* ─── Shared SVG icons ─── */
const EyeOff = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const EyeOn  = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const MailIcon = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const UserIcon = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

/* ─── Logo mark ─── */
const LogoMark = ({ size = 28 }) => (
  <svg viewBox="0 0 36 36" fill="none" width={size} height={size}>
    <path d="M18 2L33 10.5V25.5L18 34L3 25.5V10.5L18 2Z" fill="url(#am1)" opacity=".15"/>
    <path d="M18 2L33 10.5V25.5L18 34L3 25.5V10.5L18 2Z" stroke="url(#am1)" strokeWidth="1.2"/>
    <path d="M10 24V12L18 20L26 12V24" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="18" cy="20" r="1.5" fill="#c9a84c"/>
    <defs>
      <linearGradient id="am1" x1="3" y1="2" x2="33" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7c45b8"/><stop offset="100%" stopColor="#c9a84c"/>
      </linearGradient>
    </defs>
  </svg>
);

/* ─── Sign In form ─── */
function SignInForm({ onSwitch }) {
  const { login, googleLogin, completeGoogleLogin, pendingGoogle } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await login(form); navigate('/feed'); }
    catch(err) { setError(err.response?.data?.message||'Invalid credentials'); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError('');
    try {
      const result = await googleLogin();
      if (!result.isNewUser) navigate('/feed');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setGoogleLoading(false);
        return;
      }
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally { setGoogleLoading(false); }
  };

  return (
    <div className="auth-form-panel">
      {/* Role modal for new Google sign-ups */}
      {pendingGoogle && (
        <GoogleRoleModal
          token={pendingGoogle.token}
          onComplete={(updatedUser) => {
            completeGoogleLogin(updatedUser);
            navigate('/feed');
          }}
        />
      )}
      <div className="auth-logo-row"><LogoMark /><span className="auth-logo-name">ManavRachna</span></div>
      <h2 className="auth-heading">Welcome back</h2>
      <p className="auth-sub">Sign in to your alumni network</p>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={submit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label">Email Address</label>
          <div className="auth-input-wrap">
            <span className="auth-icon"><MailIcon /></span>
            <input type="email" className="auth-input" placeholder="you@mru.edu.in"
              value={form.email} onChange={e=>set('email',e.target.value)} required autoFocus />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label">Password</label>
          <div className="auth-input-wrap">
            <span className="auth-icon"><LockIcon /></span>
            <input type={showPw?'text':'password'} className="auth-input" placeholder="••••••••"
              value={form.password} onChange={e=>set('password',e.target.value)} required />
            <button type="button" className="auth-eye" onClick={()=>setShowPw(s=>!s)}>
              {showPw ? <EyeOff/> : <EyeOn/>}
            </button>
          </div>
        </div>

        <div className="auth-row-between">
          <label className="auth-remember"><input type="checkbox" style={{accentColor:'#c9a84c'}}/><span>Remember me</span></label>
          <Link to="/forgot-password" className="auth-forgot">Forgot password?</Link>
        </div>

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Google Sign-In via Firebase */}
      <div className="auth-divider"><span>or</span></div>
      <button className="auth-google-btn" onClick={handleGoogleLogin} disabled={googleLoading}>
        <svg viewBox="0 0 24 24" width="17" height="17">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? 'Signing in…' : 'Continue with Google'}
      </button>

      <p className="auth-switch-text">
        Don't have an account?{' '}
        <button className="auth-switch-btn" onClick={onSwitch}>Sign up</button>
      </p>

      <div className="auth-demo-hint">
        <span>Demo:</span> student@mru.edu.in · demo1234
      </div>
    </div>
  );
}

/* ─── Sign Up form ─── */
function SignUpForm({ onSwitch }) {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', role:'student', industry:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [step, setStep]       = useState(1);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async (e) => {
    e.preventDefault();
    if (step===1) { setStep(2); return; }
    setLoading(true); setError('');
    try { await register(form); navigate('/feed'); }
    catch(err) { setError(err.response?.data?.message||'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-form-panel">
      <div className="auth-logo-row"><LogoMark /><span className="auth-logo-name">ManavRachna</span></div>
      <h2 className="auth-heading">Create account</h2>
      <p className="auth-sub">Join the MRU alumni network</p>

      {/* Step dots */}
      <div className="auth-steps">
        <div className={`auth-step-dot${step>=1?' active':''}`}/>
        <div className="auth-step-line"/>
        <div className={`auth-step-dot${step>=2?' active':''}`}/>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={submit} className="auth-form">
        {step===1 ? (
          <>
            <div className="auth-row-2">
              <div className="auth-input-wrap">
                <span className="auth-icon"><UserIcon /></span>
                <input className="auth-input" placeholder="First name"
                  value={form.firstName} onChange={e=>set('firstName',e.target.value)} required autoFocus />
              </div>
              <div className="auth-input-wrap">
                <input className="auth-input" placeholder="Last name" style={{paddingLeft:'1rem'}}
                  value={form.lastName} onChange={e=>set('lastName',e.target.value)} />
              </div>
            </div>
            <div className="auth-input-wrap">
              <span className="auth-icon"><MailIcon /></span>
              <input type="email" className="auth-input" placeholder="Enter your email"
                value={form.email} onChange={e=>set('email',e.target.value)} required />
            </div>
            <div className="auth-input-wrap">
              <span className="auth-icon"><LockIcon /></span>
              <input type={showPw?'text':'password'} className="auth-input" placeholder="Create password (min 6)"
                value={form.password} onChange={e=>set('password',e.target.value)} required minLength={6} />
              <button type="button" className="auth-eye" onClick={()=>setShowPw(s=>!s)}>
                {showPw ? <EyeOff/> : <EyeOn/>}
              </button>
            </div>
            <button type="submit" className="auth-submit">Continue →</button>
          </>
        ) : (
          <>
            <div className="auth-input-wrap">
              <span className="auth-icon">👤</span>
              <select className="auth-input" value={form.role} onChange={e=>set('role',e.target.value)}>
                <option value="student">Current Student</option>
                <option value="alumni">Alumni</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
            <div className="auth-input-wrap">
              <span className="auth-icon">🏭</span>
              <input className="auth-input" placeholder="Industry (e.g. Technology, Design…)"
                value={form.industry} onChange={e=>set('industry',e.target.value)} autoFocus />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <button type="button" className="auth-back" onClick={()=>setStep(1)}>← Back</button>
          </>
        )}
      </form>

      <p className="auth-switch-text">
        Already have an account?{' '}
        <button className="auth-switch-btn" onClick={onSwitch}>Sign in</button>
      </p>
    </div>
  );
}

/* ─── Main AuthPage ─── */
export default function AuthPage() {
  const location = useLocation();
  const isRegister = location.pathname === '/register';
  const [mode, setMode]       = useState(isRegister ? 'signup' : 'signin');
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(''); // 'left' | 'right'

  const switchTo = (next) => {
    if (animating || mode === next) return;
    const dir = next === 'signup' ? 'left' : 'right';
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setMode(next);
      setDirection('');
      setAnimating(false);
    }, 380);
  };

  return (
    <div className="auth-shell">
      <AuroraCanvas />

      {/* Floating card */}
      <div className={`auth-card ${animating ? `auth-exit-${direction}` : 'auth-enter'}`}>
        {/* Tab bar */}
        <div className="auth-tab-bar">
          <button className={`auth-tab-btn${mode==='signin'?' active':''}`} onClick={()=>switchTo('signin')}>
            Sign in
          </button>
          <button className={`auth-tab-btn${mode==='signup'?' active':''}`} onClick={()=>switchTo('signup')}>
            Sign up
          </button>
        </div>

        {/* Sliding content */}
        <div className={`auth-content-wrap ${animating ? `slide-out-${direction}` : 'slide-in'}`}>
          {mode === 'signin'
            ? <SignInForm onSwitch={() => switchTo('signup')} />
            : <SignUpForm onSwitch={() => switchTo('signin')} />
          }
        </div>
      </div>
    </div>
  );
}
