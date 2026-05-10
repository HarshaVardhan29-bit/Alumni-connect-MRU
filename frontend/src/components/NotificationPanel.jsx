import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import api from '../api/axios';

const TYPE_ICON = {
  like: '❤️', comment: '💬', retweet: '🔁',
  mentorship_request: '🤝', mentorship_accepted: '✅',
  follow: '👤', missed_call: '📵',
};

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)     return `${s}s`;
  if (s < 3600)   return `${Math.floor(s / 60)}m`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const groupByDay = (notifs) => {
  const groups = {};
  notifs.forEach(n => {
    const d = new Date(n.createdAt);
    const now = new Date();
    let key;
    if (d.toDateString() === now.toDateString()) key = 'Today';
    else if (new Date(now - 86400000).toDateString() === d.toDateString()) key = 'Yesterday';
    else if (now - d < 7 * 86400000) key = 'This week';
    else key = 'This month';
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
};

export default function NotificationPanel({ open, onClose }) {
  const { user }  = useAuth();
  const socketRef = useSocket();
  const navigate  = useNavigate();
  const panelRef  = useRef();

  const [notifs,   setNotifs]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [reqLoading, setReqLoading] = useState(false);
  const [tab, setTab] = useState('all');
  const [actionMap, setActionMap] = useState({}); // userId -> 'accepted'|'declined'

  // Load notifications on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/notifications')
      .then(r => setNotifs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Load follow requests when Requests tab is active
  useEffect(() => {
    if (!open || tab !== 'requests') return;
    setReqLoading(true);
    api.get('/users/follow-requests')
      .then(r => setRequests(r.data))
      .catch(() => {})
      .finally(() => setReqLoading(false));
  }, [open, tab]);

  // Real-time notifications
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;
    const handler = (n) => setNotifs(prev => [n, ...prev]);
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socketRef?.current]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`).catch(() => {});
    setNotifs(p => p.map(x => x._id === id ? { ...x, read: true } : x));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    setNotifs(p => p.map(x => ({ ...x, read: true })));
  };

  const handleClick = (n) => {
    markRead(n._id);
    onClose();
    if (n.post) navigate(`/post/${n.post._id || n.post}`);
    else if (n.type?.includes('mentorship')) navigate('/mentorship');
    else if (n.sender?._id) navigate(`/profile/${n.sender._id}`);
  };

  const handleFollowAction = async (userId, action) => {
    try {
      await api.post(`/users/follow-requests/${userId}/${action}`);
      setActionMap(prev => ({ ...prev, [userId]: action }));
    } catch {}
  };

  const filtered = tab === 'all'
    ? notifs
    : notifs.filter(n => ['comment', 'retweet'].includes(n.type));

  const grouped = groupByDay(filtered);
  const unread  = notifs.filter(n => !n.read).length;
  const pendingRequests = requests.filter(r => !actionMap[String(r._id)]);

  return (
    <>
      {open && <div className="np-backdrop" onClick={onClose} />}

      <div ref={panelRef} className={`np-panel${open ? ' open' : ''}`}>
        {/* Header */}
        <div className="np-header">
          <h2 className="np-title">Notifications</h2>
          {tab === 'all' && unread > 0 && (
            <button className="np-mark-all" onClick={markAllRead}>Mark all read</button>
          )}
        </div>

        {/* Tabs */}
        <div className="np-tabs">
          <button className={`np-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>All</button>
          <button className={`np-tab${tab === 'comments' ? ' active' : ''}`} onClick={() => setTab('comments')}>Comments</button>
          <button className={`np-tab${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
            Requests
            {pendingRequests.length > 0 && tab !== 'requests' && (
              <span className="np-req-badge">{pendingRequests.length}</span>
            )}
          </button>
        </div>

        {/* ── REQUESTS TAB ── */}
        {tab === 'requests' && (
          <div className="np-body">
            {reqLoading ? (
              <div className="np-empty"><span>Loading…</span></div>
            ) : requests.length === 0 ? (
              <div className="np-empty">
                <span style={{ fontSize: '2rem' }}>👥</span>
                <span>No follow requests</span>
              </div>
            ) : (
              <div>
                <div className="np-day-label">Follow Requests</div>
                {requests.map(req => {
                  const uid = String(req._id);
                  const action = actionMap[uid];
                  return (
                    <div key={uid} className="np-item np-req-item">
                      {/* Avatar */}
                      <div
                        className="np-av-wrap"
                        style={{ cursor: 'pointer' }}
                        onClick={() => { onClose(); navigate(`/profile/${uid}`); }}
                      >
                        <Avatar user={req} size={44} fontSize=".88rem" />
                        <span className="np-type-badge">👤</span>
                      </div>

                      {/* Info */}
                      <div
                        className="np-item-text"
                        style={{ cursor: 'pointer' }}
                        onClick={() => { onClose(); navigate(`/profile/${uid}`); }}
                      >
                        <span className="np-sender">{req.firstName} {req.lastName}</span>
                        {' '}
                        <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
                          {req.designation || req.role}{req.company ? ` · ${req.company}` : ''}
                        </span>
                        <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.15rem' }}>
                          wants to follow you
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="np-req-actions">
                        {action === 'accept' ? (
                          <span className="np-req-done accepted">Accepted ✓</span>
                        ) : action === 'decline' ? (
                          <span className="np-req-done declined">Declined</span>
                        ) : (
                          <>
                            <button
                              className="np-req-accept"
                              onClick={e => { e.stopPropagation(); handleFollowAction(uid, 'accept'); }}
                            >
                              Accept
                            </button>
                            <button
                              className="np-req-decline"
                              onClick={e => { e.stopPropagation(); handleFollowAction(uid, 'decline'); }}
                            >
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ALL / COMMENTS TAB ── */}
        {tab !== 'requests' && (
          <div className="np-body">
            {loading ? (
              <div className="np-empty">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="np-empty">
                <span style={{ fontSize: '2rem' }}>🔔</span>
                <span>No notifications yet</span>
              </div>
            ) : (
              Object.entries(grouped).map(([day, items]) => (
                <div key={day}>
                  <div className="np-day-label">{day}</div>
                  {items.map(n => (
                    <div
                      key={n._id}
                      className={`np-item${n.read ? '' : ' unread'}`}
                      onClick={() => handleClick(n)}
                    >
                      <div className="np-av-wrap">
                        <Avatar user={n.sender} size={44} fontSize=".88rem" />
                        <span className="np-type-badge">{TYPE_ICON[n.type] || '🔔'}</span>
                      </div>

                      <div className="np-item-text">
                        <span className="np-sender">{n.sender?.firstName} {n.sender?.lastName}</span>
                        {' '}
                        <span className="np-action">
                          {n.type === 'like'                && 'liked your post'}
                          {n.type === 'comment'             && 'replied to your post'}
                          {n.type === 'retweet'             && 'reposted your post'}
                          {n.type === 'mentorship_request'  && 'sent you a mentorship request'}
                          {n.type === 'mentorship_accepted' && (n.message?.includes('accepted') ? 'accepted your request 🎉' : 'declined your request')}
                          {n.type === 'follow'              && 'started following you'}
                          {n.type === 'missed_call'         && (n.message || 'missed call')}
                        </span>
                        {' '}
                        <span className="np-time">{timeAgo(n.createdAt)}</span>

                        {n.post?.text && (
                          <div className="np-preview">
                            "{n.post.text.slice(0, 60)}{n.post.text.length > 60 ? '…' : ''}"
                          </div>
                        )}
                      </div>

                      <div className="np-item-right">
                        {n.post?.media?.[0]?.url
                          ? <img src={n.post.media[0].url} alt="" className="np-thumb" />
                          : !n.read && <div className="np-unread-dot" />
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
