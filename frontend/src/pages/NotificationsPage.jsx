import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashLayout from '../components/DashLayout';
import Avatar from '../components/Avatar';
import api from '../api/axios';

const TYPE_ICON = {
  like:                '❤️',
  comment:             '💬',
  retweet:             '🔁',
  mentorship_request:  '🤝',
  mentorship_accepted: '✅',
  follow:              '👤',
};

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 172800) return 'Yesterday';
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
    else key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then(r => setNotifs(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifs(n => n.map(x => ({ ...x, read: true })));
  };

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifs(n => n.map(x => x._id === id ? { ...x, read: true } : x));
  };

  const handleView = (n) => {
    markRead(n._id);
    if (n.post) navigate(`/post/${n.post._id || n.post}`);
    else if (n.type === 'mentorship_request' || n.type === 'mentorship_accepted') navigate('/mentorship');
    else if (n.sender?._id) navigate(`/profile/${n.sender._id}`);
  };

  const unread = notifs.filter(n => !n.read).length;
  const grouped = groupByDay(notifs);

  return (
    <DashLayout>
      <div className="notif-page">
        {/* Header */}
        <div className="notif-header">
          <div>
            <h2 className="notif-title">Notifications</h2>
            {unread > 0 && (
              <p className="notif-sub">
                You have <span className="notif-count-text">{unread}</span> notification{unread !== 1 ? 's' : ''} to go through
              </p>
            )}
          </div>
          {unread > 0 && (
            <button className="notif-mark-all" onClick={markAllRead}>Mark all as Read</button>
          )}
        </div>

        {loading ? (
          <div className="feed-loading">Loading notifications…</div>
        ) : notifs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <h3>All caught up</h3>
            <p>No notifications yet. Interact with posts to get started.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([day, items]) => (
            <div key={day} className="notif-group">
              <div className="notif-group-label">{day}</div>
              <div className="notif-list">
                {items.map(n => (
                  <div
                    key={n._id}
                    className={`notif-row${n.read ? '' : ' unread'}`}
                    onClick={() => handleView(n)}
                  >
                    {/* Avatar + type icon */}
                    <div className="notif-av-wrap">
                      <Avatar user={n.sender} size={44} fontSize=".88rem" />
                      <span className="notif-type-icon">{TYPE_ICON[n.type] || '🔔'}</span>
                    </div>

                    {/* Content */}
                    <div className="notif-content">
                      <div className="notif-msg">
                        <span className="notif-sender">{n.sender?.firstName} {n.sender?.lastName}</span>
                        {' '}
                        <span className="notif-action">
                          {n.type === 'like'                && 'liked your post'}
                          {n.type === 'comment'             && 'replied to your post'}
                          {n.type === 'retweet'             && 'reposted your post'}
                          {n.type === 'mentorship_request'  && 'sent you a mentorship request'}
                          {n.type === 'mentorship_accepted' && (n.message?.includes('accepted') ? 'accepted your mentorship request 🎉' : 'declined your mentorship request')}
                          {n.type === 'follow'              && 'started following you'}
                        </span>
                      </div>
                      {n.post?.text && (
                        <div className="notif-post-preview">
                          "{n.post.text.slice(0, 80)}{n.post.text.length > 80 ? '…' : ''}"
                        </div>
                      )}
                      <div className="notif-time">{timeAgo(n.createdAt)}</div>
                    </div>

                    {/* View button */}
                    <button className="notif-view-btn" onClick={e => { e.stopPropagation(); handleView(n); }}>
                      View
                    </button>

                    {/* Unread dot */}
                    {!n.read && <div className="notif-dot" />}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </DashLayout>
  );
}
