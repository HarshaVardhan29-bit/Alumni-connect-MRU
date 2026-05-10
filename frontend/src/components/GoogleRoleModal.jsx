import { useState } from 'react';
import api from '../api/axios';

/**
 * Shown only to NEW Google sign-up users.
 * Lets them pick Student / Alumni / Faculty before entering the app.
 */
export default function GoogleRoleModal({ token, onComplete }) {
  const [role, setRole]       = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const roles = [
    {
      value: 'student',
      label: 'Current Student',
      desc:  'I am currently studying at Manav Rachna',
      icon:  '🎓',
    },
    {
      value: 'alumni',
      label: 'Alumni',
      desc:  'I have graduated from Manav Rachna',
      icon:  '🏆',
    },
    {
      value: 'faculty',
      label: 'Faculty',
      desc:  'I am a faculty member at Manav Rachna',
      icon:  '👨‍🏫',
    },
  ];

  const handleConfirm = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.patch('/auth/firebase/google/role', { token, role });
      onComplete(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save role. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="grm-overlay">
      <div className="grm-card">
        {/* Header */}
        <div className="grm-header">
          <div className="grm-logo">MR</div>
          <h2 className="grm-title">Welcome to MRU Alumni Network!</h2>
          <p className="grm-sub">One last step — tell us who you are so we can personalise your experience.</p>
        </div>

        {/* Role options */}
        <div className="grm-roles">
          {roles.map(r => (
            <button
              key={r.value}
              className={`grm-role-btn${role === r.value ? ' selected' : ''}`}
              onClick={() => setRole(r.value)}
            >
              <span className="grm-role-icon">{r.icon}</span>
              <div className="grm-role-text">
                <span className="grm-role-label">{r.label}</span>
                <span className="grm-role-desc">{r.desc}</span>
              </div>
              <span className="grm-role-check">
                {role === r.value ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="grm-error">{error}</p>}

        <button
          className="grm-confirm"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Saving…' : `Continue as ${roles.find(r => r.value === role)?.label} →`}
        </button>
      </div>
    </div>
  );
}
