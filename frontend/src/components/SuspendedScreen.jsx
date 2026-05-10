import { useState } from 'react';

/**
 * Full-screen overlay shown when a suspended user tries to use the app.
 * Lets them write an appeal/query which is sent to the admin panel.
 */
export default function SuspendedScreen({ user, onLogout }) {
  const [step, setStep]       = useState('info');   // 'info' | 'query' | 'sent'
  const [query, setQuery]     = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  const handleSend = async () => {
    if (!query.trim()) { setError('Please write your query before sending.'); return; }
    setSending(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5001/api/auth/appeal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: query }),
      });
      if (!res.ok) throw new Error('Failed');
      setStep('sent');
    } catch {
      setError('Failed to send. Please try again.');
    } finally { setSending(false); }
  };

  return (
    <div className="sus-overlay">
      <div className="sus-card">

        {/* Icon */}
        <div className="sus-icon">🔒</div>

        {step === 'info' && (
          <>
            <h2 className="sus-title">Account Suspended</h2>
            <p className="sus-desc">
              Your account <strong>{user?.email}</strong> has been suspended by the administrator.
              If you believe this is a mistake, you can send a query to the admin for review.
            </p>
            <div className="sus-actions">
              <button className="sus-btn sus-btn-primary" onClick={() => setStep('query')}>
                ✉️ Write a Query to Admin
              </button>
              <button className="sus-btn sus-btn-ghost" onClick={onLogout}>
                Sign Out
              </button>
            </div>
          </>
        )}

        {step === 'query' && (
          <>
            <h2 className="sus-title">Write Your Query</h2>
            <p className="sus-desc">
              Explain why you think your account should be reinstated. The admin will review and take action.
            </p>
            <textarea
              className="sus-textarea"
              placeholder="e.g. I believe my account was suspended by mistake. I have not violated any community guidelines..."
              value={query}
              onChange={e => { setQuery(e.target.value); setError(''); }}
              rows={5}
              maxLength={500}
              autoFocus
            />
            <div className="sus-char">{query.length}/500</div>
            {error && <p className="sus-error">{error}</p>}
            <div className="sus-actions">
              <button className="sus-btn sus-btn-primary" onClick={handleSend} disabled={sending}>
                {sending ? 'Sending…' : '📨 Send to Admin'}
              </button>
              <button className="sus-btn sus-btn-ghost" onClick={() => setStep('info')}>
                ← Back
              </button>
            </div>
          </>
        )}

        {step === 'sent' && (
          <>
            <div className="sus-icon">✅</div>
            <h2 className="sus-title">Query Sent!</h2>
            <p className="sus-desc">
              Your query has been sent to the admin. You will be notified once a decision is made.
              Please sign out and check back later.
            </p>
            <div className="sus-actions">
              <button className="sus-btn sus-btn-primary" onClick={onLogout}>
                Sign Out
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
