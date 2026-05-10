import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import api from '../api/axios';

const BellIcon = ({ ringing }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"
    style={{ animation: ringing ? 'bellRing .5s ease 3' : 'none', transformOrigin: 'top center' }}>
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
  </svg>
);

const TYPE_ICON = {
  like: '❤️', comment: '💬', retweet: '🔁',
  mentorship_request: '🤝', mentorship_accepted: '✅', follow: '👤',
  missed_call: '📵',
};

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function NotificationBell() {
  const { user }    = useAuth();
  const socketRef   = useSocket();
  const navigate    = useNavigate();
  const [open, setOpen]     = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [ringing, setRinging] = useState(false);
  const panelRef = useRef();

  // Load initial notifications
  useEffect(() => {
    api.get('/notifications').then(r => {
      setNotifs(r.data.slice(0, 8));
      setUnread(r.data.filter(n => !n.read).length);
    }).catch(() => {});
  }, []);

  // Real-time socket
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;
    const uid = user?._id || user?.id;
    if (uid) socket.emit('join_user', uid);
    const handler = (n) => {
      setNotifs(prev => [n, ...prev].slice(0, 8));
      setUnread(c => c + 1);
      setRinging(true);
      setTimeout(() => setRinging(false), 2000);
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socketRef?.current]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    setUnread(0);
  };

  const handleClick = async (n) => {
    setOpen(false);
    if (!n.read) {
      await api.put(`/notifications/${n._id}/read`).catch(() => {});
      setNotifs(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
      setUnread(c => Math.max(0, c - 1));
    }
    if (n.post) navigate(`/post/${n.post._id || n.post}`);
    else if (n.type?.includes('mentorship')) navigate('/mentorship');
    else if (n.sender?._id) navigate(`/profile/${n.sender._id}`);
  };

  return (
    <div className="nb-wrap" ref={panelRef}>
      {/* Floating bell button */}
      <button
        className={`nb-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <BellIcon ringing={ringing} />
        {unread > 0 && (
          <span className="nb-badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="nb-panel">
          <div className="nb-panel-header">
            <span className="nb-panel-title">Notifications</span>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              {unread > 0 && (
                <button className="nb-mark-all" onClick={markAllRead}>Mark all read</button>
              )}
              <button className="nb-see-all" onClick={() => { setOpen(false); navigate('/notifications'); }}>
                See all →
              </button>
            </div>
          </div>

          <div className="nb-list">
            {notifs.length === 0 ? (
              <div className="nb-empty">
                <span style={{ fontSize: '1.8rem' }}>🔔</span>
                <span>No notifications yet</span>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n._id}
                  className={`nb-item${n.read ? '' : ' unread'}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="nb-av-wrap">
                    <Avatar user={n.sender} size={38} fontSize=".78rem" />
                    <span className="nb-type-icon">{TYPE_ICON[n.type] || '🔔'}</span>
                  </div>
                  <div className="nb-item-content">
                    <div className="nb-item-msg">
                      <strong>{n.sender?.firstName}</strong>{' '}
                      {n.type === 'like'                && 'liked your post'}
                      {n.type === 'comment'             && 'replied to your post'}
                      {n.type === 'retweet'             && 'reposted your post'}
                      {n.type === 'mentorship_request'  && 'sent a mentorship request'}
                      {n.type === 'mentorship_accepted' && (n.message?.includes('accepted') ? 'accepted your request 🎉' : 'declined your request')}
                      {n.type === 'follow'              && 'started following you'}
                      {n.type === 'missed_call'         && (n.message || 'missed call 📵')}
                    </div>
                    {n.post?.text && (
                      <div className="nb-item-preview">
                        "{n.post.text.slice(0, 60)}{n.post.text.length > 60 ? '…' : ''}"
                      </div>
                    )}
                    <div className="nb-item-time">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && <div className="nb-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
