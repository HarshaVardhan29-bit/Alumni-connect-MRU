import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import DashLayout from '../components/DashLayout';
import Avatar from '../components/Avatar';
import api from '../api/axios';

/* ── Icons ── */
const SendIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
const PlusIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const BackIcon  = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;
const PeopleIcon= () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>;

const fmtTime = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const GROUP_EMOJIS = ['👥','🎓','💼','🚀','💡','🌟','🏆','📚','🤝','🌐','💻','🎯','🔬','🎨','⚡'];

/* ── Create Group Modal ── */
function CreateModal({ type, onClose, onCreate }) {
  const [name, setName]   = useState('');
  const [desc, setDesc]   = useState('');
  const [emoji, setEmoji] = useState(type === 'community' ? '🎓' : '👥');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/groups', { name, description: desc, type, avatar: emoji });
      onCreate(res.data);
      onClose();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create {type === 'community' ? 'Community' : 'Group'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          {/* Emoji picker */}
          <div className="modal-emoji-row">
            {GROUP_EMOJIS.map(e => (
              <button key={e} type="button"
                className={`modal-emoji-btn${emoji === e ? ' active' : ''}`}
                onClick={() => setEmoji(e)}>{e}</button>
            ))}
          </div>
          <div className="fg">
            <label>{type === 'community' ? 'Community' : 'Group'} Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. ${type === 'community' ? 'MRU Alumni 2020' : 'Study Group'}`} required />
          </div>
          <div className="fg">
            <label>Description <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this group about?" />
          </div>
          {type === 'community' && (
            <div className="modal-note">🎓 Communities are for alumni to build professional networks. Only alumni can create them.</div>
          )}
          <button type="submit" className="modal-submit-btn" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : `Create ${type === 'community' ? 'Community' : 'Group'}`}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Group List Item ── */
function GroupItem({ group, active, onClick }) {
  return (
    <div className={`conv-item${active ? ' active' : ''}`} onClick={onClick}>
      <div className="group-av">{group.avatar || (group.type === 'community' ? '🎓' : '👥')}</div>
      <div className="conv-info">
        <div className="conv-name">{group.name}</div>
        <div className="conv-sub">
          <PeopleIcon /> {group.members?.length || 0} members
          {group.type === 'community' && <span className="group-type-badge community">Community</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Group Chat Panel ── */
function GroupChatPanel({ group, user, socketRef, onGroupUpdate }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef();
  const uid = String(user?._id || user?.id || '');
  const isAdmin = group.admins?.map(a => String(a._id || a)).includes(uid);

  useEffect(() => {
    setLoading(true);
    api.get(`/groups/${group._id}/messages`)
      .then(r => setMessages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    const socket = socketRef?.current;
    if (socket) {
      socket.emit('join_group', group._id);
      socket.on('receive_group_message', msg => {
        setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]);
      });
    }
    return () => { socketRef?.current?.off('receive_group_message'); };
  }, [group._id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/groups/${group._id}/messages`, { text, type: 'text' });
      setMessages(m => [...m, res.data]);
      socketRef?.current?.emit('send_group_message', { ...res.data, groupId: group._id });
      setText('');
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSending(false); }
  };

  const leaveGroup = async () => {
    if (!window.confirm('Leave this group?')) return;
    await api.delete(`/groups/${group._id}/leave`).catch(() => {});
    onGroupUpdate();
  };

  const grouped = messages.reduce((acc, msg) => {
    const day = new Date(msg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <>
      {/* Header */}
      <div className="chat3-header">
        <div className="group-av" style={{ fontSize: '1.5rem', width: 38, height: 38, flexShrink: 0 }}>
          {group.avatar || (group.type === 'community' ? '🎓' : '👥')}
        </div>
        <div className="chat3-header-info">
          <div className="chat3-header-name">{group.name}</div>
          <div className="chat3-header-sub">
            <PeopleIcon /> {group.members?.length || 0} members
            {group.type === 'community' && <span className="group-type-badge community" style={{ marginLeft: '.5rem' }}>Community</span>}
          </div>
        </div>
        <div className="chat3-header-actions">
          <button className="chat3-call-btn" onClick={() => setShowMembers(s => !s)} title="Members">
            <PeopleIcon />
          </button>
          <button className="chat3-call-btn" style={{ color: '#ef4444' }} onClick={leaveGroup} title="Leave group">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="chat3-body">
        {loading ? (
          <div className="chat3-empty">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="chat3-empty">
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>{group.avatar || '👥'}</div>
            <div style={{ fontWeight: 600 }}>{group.name}</div>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginTop: '.3rem' }}>No messages yet. Start the conversation!</div>
          </div>
        ) : (
          Object.entries(grouped).map(([day, msgs]) => (
            <div key={day}>
              <div className="chat3-day-divider"><span>{day}</span></div>
              {msgs.map((msg, i) => {
                const mine = uid === String(msg.sender?._id || msg.sender || '');
                if (msg.type === 'system') {
                  return <div key={msg._id || i} className="group-system-msg">{msg.text}</div>;
                }
                return (
                  <div key={msg._id || i} className={`chat3-msg-row ${mine ? 'mine' : 'theirs'}`}>
                    {!mine && (
                      <Avatar user={msg.sender} size={28} fontSize=".65rem" style={{ flexShrink: 0, alignSelf: 'flex-end' }} />
                    )}
                    <div className="chat3-msg-col">
                      {!mine && (
                        <div className="group-sender-name">
                          {msg.sender?.firstName} {msg.sender?.lastName}
                          <span className="group-sender-role">{msg.sender?.role}</span>
                        </div>
                      )}
                      <div className={`chat3-bubble ${mine ? 'mine' : 'theirs'}`}>{msg.text}</div>
                      <div className="chat3-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {mine && <span className="chat3-tick">✓✓</span>}
                      </div>
                    </div>
                    {mine && <Avatar user={user} size={28} fontSize=".65rem" style={{ flexShrink: 0, alignSelf: 'flex-end' }} />}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Members panel */}
      {showMembers && (
        <div className="group-members-panel">
          <div className="group-members-title">Members ({group.members?.length})</div>
          {group.members?.map(m => {
            const mid = String(m._id || m);
            const isAdm = group.admins?.map(a => String(a._id || a)).includes(mid);
            return (
              <div key={mid} className="group-member-row">
                <Avatar user={m} size={34} fontSize=".72rem" />
                <div className="group-member-info">
                  <div className="group-member-name">{m.firstName} {m.lastName}</div>
                  <div className="group-member-role">{m.designation || m.role}</div>
                </div>
                {isAdm && <span className="group-admin-badge">Admin</span>}
                {isAdmin && mid !== uid && (
                  <button className="group-remove-btn" onClick={async () => {
                    await api.delete(`/groups/${group._id}/members/${mid}`).catch(() => {});
                    onGroupUpdate();
                  }}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="chat3-input-area">
        <form className="chat3-input-row" onSubmit={send}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Message ${group.name}…`}
            className="chat3-input"
            disabled={sending}
            autoFocus
          />
          <button type="submit" className="chat3-send" disabled={sending || !text.trim()}>
            <SendIcon />
          </button>
        </form>
      </div>
    </>
  );
}

/* ── Discover Panel ── */
function DiscoverPanel({ type, user, onJoin }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/groups/discover?type=${type}`)
      .then(r => setGroups(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  const join = async (g) => {
    try {
      await api.post(`/groups/${g._id}/join`);
      onJoin();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="chat3-empty" style={{ padding: '2rem' }}>Loading…</div>;
  if (groups.length === 0) return (
    <div className="chat3-empty" style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔍</div>
      <div>No public {type === 'community' ? 'communities' : 'groups'} to discover</div>
    </div>
  );

  return (
    <div className="discover-list">
      <div className="discover-title">Discover {type === 'community' ? 'Communities' : 'Groups'}</div>
      {groups.map(g => (
        <div key={g._id} className="discover-item">
          <div className="group-av">{g.avatar || (g.type === 'community' ? '🎓' : '👥')}</div>
          <div className="discover-info">
            <div className="discover-name">{g.name}</div>
            {g.description && <div className="discover-desc">{g.description}</div>}
            <div className="discover-meta"><PeopleIcon /> {g.members?.length || 0} members</div>
          </div>
          <button className="discover-join-btn" onClick={() => join(g)}>Join</button>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ── */
export default function GroupsPage({ pageType = 'group' }) {
  const { id: activeId } = useParams();
  const { user }    = useAuth();
  const socketRef   = useSocket();
  const navigate    = useNavigate();

  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab]           = useState('mine'); // 'mine' | 'discover'
  const [search, setSearch]     = useState('');

  const isCommunity = pageType === 'community';
  const canCreate   = !isCommunity || user?.role === 'alumni';

  const loadGroups = () => {
    setLoading(true);
    api.get(`/groups?type=${pageType}`)
      .then(r => setGroups(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadGroups(); }, [pageType]);

  const active = groups.find(g => g._id === activeId);

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashLayout>
      <div className="chat3-shell">

        {/* LEFT: Group list */}
        <div className="chat3-list">
          <div className="chat3-list-header">
            <div className="chat3-list-title">
              {isCommunity ? '🎓 Communities' : '👥 Groups'}
            </div>
            {canCreate && (
              <button className="group-create-btn" onClick={() => setShowCreate(true)} title={`Create ${isCommunity ? 'Community' : 'Group'}`}>
                <PlusIcon />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="group-tabs">
            <button className={`group-tab${tab === 'mine' ? ' active' : ''}`} onClick={() => setTab('mine')}>Mine</button>
            <button className={`group-tab${tab === 'discover' ? ' active' : ''}`} onClick={() => setTab('discover')}>Discover</button>
          </div>

          {tab === 'mine' ? (
            <>
              <div className="chat3-search-wrap" style={{ margin: '0 .8rem .5rem' }}>
                <input
                  className="chat3-search"
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="chat3-list-body">
                {loading ? (
                  <div className="chat3-empty" style={{ padding: '2rem 1rem' }}>Loading…</div>
                ) : filtered.length === 0 ? (
                  <div className="chat3-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>{isCommunity ? '🎓' : '👥'}</div>
                    <div style={{ fontSize: '.82rem' }}>No {isCommunity ? 'communities' : 'groups'} yet</div>
                    {canCreate && (
                      <button className="chat3-view-profile" style={{ marginTop: '.8rem' }} onClick={() => setShowCreate(true)}>
                        Create one →
                      </button>
                    )}
                  </div>
                ) : (
                  filtered.map(g => (
                    <GroupItem
                      key={g._id}
                      group={g}
                      active={g._id === activeId}
                      onClick={() => navigate(`/${isCommunity ? 'communities' : 'groups'}/${g._id}`)}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="chat3-list-body">
              <DiscoverPanel type={pageType} user={user} onJoin={loadGroups} />
            </div>
          )}
        </div>

        {/* CENTER: Chat or placeholder */}
        <div className="chat3-center">
          {active ? (
            <GroupChatPanel
              group={active}
              user={user}
              socketRef={socketRef}
              onGroupUpdate={loadGroups}
            />
          ) : (
            <div className="chat3-empty" style={{ height: '100%', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '3rem' }}>{isCommunity ? '🎓' : '👥'}</div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                Select a {isCommunity ? 'community' : 'group'}
              </div>
              <div style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
                {canCreate ? `Or create a new ${isCommunity ? 'community' : 'group'} to get started` : 'Join a community to get started'}
              </div>
              {canCreate && (
                <button className="chat3-view-profile" onClick={() => setShowCreate(true)}>
                  + Create {isCommunity ? 'Community' : 'Group'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Group info (when active) */}
        {active && (
          <div className="chat3-detail">
            <div className="chat3-detail-title">
              {active.type === 'community' ? 'Community' : 'Group'} Info
            </div>
            <div className="chat3-detail-profile">
              <div className="group-av-large">{active.avatar || (active.type === 'community' ? '🎓' : '👥')}</div>
              <div className="chat3-detail-name">{active.name}</div>
              {active.description && <div className="chat3-detail-role">{active.description}</div>}
              <div className="chat3-detail-company"><PeopleIcon /> {active.members?.length} members</div>
            </div>
            <div className="chat3-detail-section">
              <div className="chat3-detail-section-title">Created by</div>
              <div className="chat3-detail-row">
                <Avatar user={active.creator} size={24} fontSize=".6rem" />
                <span>{active.creator?.firstName} {active.creator?.lastName}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          type={pageType}
          onClose={() => setShowCreate(false)}
          onCreate={(g) => {
            setGroups(prev => [g, ...prev]);
            navigate(`/${isCommunity ? 'communities' : 'groups'}/${g._id}`);
          }}
        />
      )}
    </DashLayout>
  );
}
