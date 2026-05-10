import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';
import api from '../api/axios';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState({});
  const [requested, setRequested] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, aRes, menRes] = await Promise.all([
          user?.role === 'student' ? api.get('/matches') : api.get('/users/alumni'),
          api.get('/analytics'),
          api.get('/mentorship/my'),
        ]);
        setMatches(mRes.data);
        setAnalytics(aRes.data);
        setMentorships(menRes.data);
        // track already-requested alumni
        const done = {};
        menRes.data.forEach(m => { done[m.alumni?._id || m.alumni] = m.status; });
        setRequested(done);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const sendRequest = async (alumniId, matchScore) => {
    setRequesting(r => ({ ...r, [alumniId]: true }));
    try {
      await api.post('/mentorship/request', { alumniId, matchScore, message: 'Hi, I would love to connect with you as my mentor!' });
      setRequested(r => ({ ...r, [alumniId]: 'pending' }));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to send request');
    } finally {
      setRequesting(r => ({ ...r, [alumniId]: false }));
    }
  };

  const initials = u => `${u?.firstName?.[0] || ''}${u?.lastName?.[0] || ''}`.toUpperCase();

  const pendingCount = mentorships.filter(m => m.status === 'pending').length;
  const activeCount  = mentorships.filter(m => m.status === 'accepted').length;

  return (
    <DashLayout>
      <div className="dash-content">
        <div className="dash-header">
          <div>
            <h1 className="dash-welcome">Welcome back, <em>{user?.firstName}</em></h1>
            <p className="dash-sub">
              {user?.role === 'student'
                ? 'Your AI-matched mentors are ready. Start a conversation.'
                : 'Manage your mentorship requests and help students grow.'}
            </p>
          </div>
          <div className="dash-header-stats">
            <div className="hstat"><span className="hstat-num">{analytics?.personal?.active ?? 0}</span><span className="hstat-lbl">Active</span></div>
            <div className="hstat"><span className="hstat-num">{analytics?.personal?.pending ?? 0}</span><span className="hstat-lbl">Pending</span></div>
            <div className="hstat"><span className="hstat-num">{analytics?.personal?.sessions ?? 0}</span><span className="hstat-lbl">Sessions</span></div>
          </div>
        </div>

        {pendingCount > 0 && user?.role === 'alumni' && (
          <div className="dash-alert" onClick={() => navigate('/mentorship')}>
            🔔 You have <strong>{pendingCount}</strong> pending mentorship request{pendingCount > 1 ? 's' : ''} — <span>Review now →</span>
          </div>
        )}

        <div className="section-label">
          {user?.role === 'student' ? '🧠 AI-Matched Mentors' : '👥 Alumni Network'}
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: 'auto', padding: '4rem 0' }}>Loading...</div>
        ) : (
          <div className="match-grid">
            {matches.map(a => (
              <div className="match-card" key={a._id}>
                <div className="match-card-top">
                  <div className="match-av">{initials(a)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="match-name">{a.firstName} {a.lastName}</div>
                    <div className="match-role">
                      {a.designation || a.role}{a.company ? ` · ${a.company}` : ''}{a.batch ? ` · ${a.batch}` : ''}
                    </div>
                  </div>
                  {a.matchScore && <div className="match-score-badge">{a.matchScore}%</div>}
                </div>

                <div className="match-industry">🏢 {a.industry || 'Industry not specified'}</div>

                {a.matchScore && (
                  <div className="match-track">
                    <div className="match-fill" style={{ width: `${a.matchScore}%` }} />
                  </div>
                )}

                {a.skills?.length > 0 && (
                  <div className="match-skills">
                    {a.skills.slice(0, 3).map(s => <span key={s} className="skill-tag">{s}</span>)}
                  </div>
                )}

                {a.bio && (
                  <p className="match-bio">{a.bio.slice(0, 90)}{a.bio.length > 90 ? '...' : ''}</p>
                )}

                {user?.role === 'student' && (
                  <button
                    className={`match-btn${requested[a._id] ? ' match-btn-done' : ''}`}
                    onClick={() => !requested[a._id] && sendRequest(a._id, a.matchScore)}
                    disabled={!!requested[a._id] || requesting[a._id]}
                  >
                    {requesting[a._id] ? 'Sending...'
                      : requested[a._id] === 'accepted' ? '✓ Connected'
                      : requested[a._id] === 'pending'  ? '⏳ Requested'
                      : 'Request Mentorship'}
                  </button>
                )}
              </div>
            ))}
            {matches.length === 0 && (
              <p style={{ color: 'var(--muted)', gridColumn: '1/-1', padding: '2rem 0' }}>
                No matches yet. Complete your profile to improve AI matching.
              </p>
            )}
          </div>
        )}
      </div>
    </DashLayout>
  );
}
