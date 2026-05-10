import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from './adminApi';
import './admin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await adminApi.post('/login', form);
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminUser', JSON.stringify(res.data.admin));
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="adm-login-shell">
      <div className="adm-login-card">
        <div className="adm-login-logo">
          <div className="adm-logo-mark">MR</div>
          <div>
            <div className="adm-logo-title">Admin Panel</div>
            <div className="adm-logo-sub">MRU MentorConnect AI</div>
          </div>
        </div>

        <h2 className="adm-login-heading">Secure Access</h2>
        <p className="adm-login-sub">Authorized personnel only</p>

        {error && <div className="adm-error">{error}</div>}

        <form onSubmit={submit} className="adm-login-form">
          <div className="adm-fg">
            <label>Admin Email</label>
            <input type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="admin@mru.edu.in" required autoFocus />
          </div>
          <div className="adm-fg">
            <label>Password</label>
            <input type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••" required />
          </div>
          <button type="submit" className="adm-login-btn" disabled={loading}>
            {loading ? 'Authenticating…' : 'Access Dashboard →'}
          </button>
        </form>

        <div className="adm-login-footer">
          <span>🔒 Secured with JWT · Rate limited · Audit logged</span>
        </div>
      </div>
    </div>
  );
}
