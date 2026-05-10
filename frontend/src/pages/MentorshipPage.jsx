import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';
import api from '../api/axios';

const STATUS_COLORS = {
  pending:   { bg: 'rgba(201,168,76,.15)',  color: '#c9a84c' },
  accepted:  { bg: 'rgba(74,222,128,.15)',  color: '#16a34a' },
  declined:  { bg: 'rgba(239,68,68,.12)',   color: '#dc2626' },
  completed: { bg: 'rgba(91,45,142,.15)',   color: '#5b2d8e' },
};

export default function MentorshipPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    api.get('/mentorship/my')
      .then(r => setList(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    setUpdating(u => ({ ...u, [id]: true }));
    try {
      const res = await api.put(`/mentorship/${id}/status`, { status });
      setList(l => l.map(m => m._id === id ? { ...m, status: res.data.status } : m));
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setUpdating(u => ({ ...u, [id]: false })); }
  };

  const logSession = async (id) => {
    try {
      const res = await api.put(`/mentorship/${id}/session`);
      setList(l => l.map(m => m._id === id ? { ...m, sessions: res.data.sessions } : m));
    } catch (e) { alert('Failed to log session'); }
  };

  const initials = u => `${u?.firstName?.[0] || ''}${u?.lastName?.[0] || ''}`.toUpperCase();
  const other = m => user?.role === 'student' ? m.alumni : m.student;

  return (
    <DashLayout>
      <div className="dash-content">
        <h1 className="dash-welcome">My <em>Mentorships</em></h1>
        <p className="dash-sub">
          {user?.role === 'student'
            ? 'Track your mentorship requests and active connections.'
            : 'Review incoming requests and manage your mentees.'}
        </p>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: 'auto', padding: '4rem 0' }}>Loading...</div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤝</div>
            <h3>No mentorships yet</h3>
            <p>{user?.role === 'student' ? 'Go to Dashboard and request a mentor.' : 'Mentorship requests will appear here.'}</p>
          </div>
        ) : (
          <div className="mentorship-list">
            {list.map(m => {
              const person = other(m);
              const sc = STATUS_COLORS[m.status] || STATUS_COLORS.pending;
              return (
                <div className="mentorship-card" key={m._id}>
                  <div className="mentorship-card-top">
                    <div className="match-av">{initials(person)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="match-name">{person?.firstName} {person?.lastName}</div>
                      <div className="match-role">
                        {user?.role === 'student'
                          ? `${person?.designation || ''} ${person?.company ? '· ' + person.company : ''}`
                          : `${person?.targetIndustry || person?.industry || ''}`}
                      </div>
                    </div>
                    <span className="status-badge" style={{ background: sc.bg, color: sc.color }}>
                      {m.status}
                    </span>
                  </div>

                  {m.message && (
                    <div className="mentorship-msg">"{m.message}"</div>
                  )}

                  <div className="mentorship-meta">
                    {m.matchScore > 0 && <span>🎯 {m.matchScore}% match</span>}
                    <span>📅 {new Date(m.createdAt).toLocaleDateString()}</span>
                    {m.sessions > 0 && <span>✅ {m.sessions} session{m.sessions > 1 ? 's' : ''}</span>}
                  </div>

                  <div className="mentorship-actions">
                    {/* Alumni actions */}
                    {user?.role === 'alumni' && m.status === 'pending' && (
                      <>
                        <button className="action-btn action-accept" onClick={() => updateStatus(m._id, 'accepted')} disabled={updating[m._id]}>
                          ✓ Accept
                        </button>
                        <button className="action-btn action-decline" onClick={() => updateStatus(m._id, 'declined')} disabled={updating[m._id]}>
                          ✕ Decline
                        </button>
                      </>
                    )}
                    {/* Message button for accepted */}
                    {m.status === 'accepted' && (
                      <>
                        <button className="action-btn action-msg" onClick={() => navigate(`/messages/${m._id}`)}>
                          💬 Message
                        </button>
                        <button className="action-btn action-session" onClick={() => logSession(m._id)}>
                          + Log Session
                        </button>
                        {user?.role === 'alumni' && (
                          <button className="action-btn action-complete" onClick={() => updateStatus(m._id, 'completed')} disabled={updating[m._id]}>
                            ✓ Complete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashLayout>
  );
}
