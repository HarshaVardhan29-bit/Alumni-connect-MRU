import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterModal({ onClose }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'student', industry: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.password) {
      setError('Please fill all required fields'); return;
    }
    setLoading(true); setError('');
    try {
      await register(form);
      onClose();
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const goToLogin = () => { onClose(); navigate('/login'); };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ color: '#0d0d14' }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title" style={{ color: '#0d0d14' }}>Join AlumniAI</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="fg-row">
          <div className="fg"><label style={{ color: '#6b6780' }}>First Name *</label><input style={{ background: '#fff', color: '#0d0d14', borderColor: 'rgba(91,45,142,.2)' }} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Arjun" /></div>
          <div className="fg"><label style={{ color: '#6b6780' }}>Last Name</label><input style={{ background: '#fff', color: '#0d0d14', borderColor: 'rgba(91,45,142,.2)' }} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Sharma" /></div>
        </div>
        <div className="fg"><label style={{ color: '#6b6780' }}>Email Address *</label><input style={{ background: '#fff', color: '#0d0d14', borderColor: 'rgba(91,45,142,.2)' }} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="arjun@mru.edu.in" /></div>
        <div className="fg"><label style={{ color: '#6b6780' }}>Password *</label><input style={{ background: '#fff', color: '#0d0d14', borderColor: 'rgba(91,45,142,.2)' }} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" /></div>
        <div className="fg"><label style={{ color: '#6b6780' }}>I am a</label>
          <select style={{ background: '#fff', color: '#0d0d14', borderColor: 'rgba(91,45,142,.2)' }} value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="student">Current Student</option>
            <option value="alumni">Alumni</option>
            <option value="faculty">Faculty</option>
          </select>
        </div>
        <div className="fg"><label style={{ color: '#6b6780' }}>Industry / Domain</label><input style={{ background: '#fff', color: '#0d0d14', borderColor: 'rgba(91,45,142,.2)' }} value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Technology, Finance, Design..." /></div>
        <button className="modal-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account →'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.85rem', color: '#6b6780' }}>
          Already have an account?{' '}
          <button onClick={goToLogin} style={{ background: 'none', border: 'none', color: '#7c45b8', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem' }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
