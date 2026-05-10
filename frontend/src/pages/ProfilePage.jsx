import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import api from '../api/axios';

const TABS = ['Posts', 'Replies', 'Media', 'Likes'];

/* ── Photo lightbox ── */
function PhotoViewer({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="photo-viewer-overlay" onClick={onClose}>
      <button className="photo-viewer-close" onClick={onClose}>✕</button>
      <img src={src} alt="Profile" className="photo-viewer-img" onClick={e => e.stopPropagation()} />
    </div>
  );
}

/* ── Edit Profile Modal (Twitter/X style) ── */
function EditProfileModal({ user: u, onClose, onSaved }) {
  const avatarFileRef = useRef();
  const coverFileRef  = useRef();
  const [saving, setSaving] = useState(false);
  const [localAvatar, setLocalAvatar] = useState(u?.avatar || '');
  const [localCover,  setLocalCover]  = useState(u?.cover  || '');
  const [form, setForm] = useState({
    firstName:      u?.firstName      || '',
    lastName:       u?.lastName       || '',
    bio:            u?.bio            || '',
    industry:       u?.industry       || '',
    company:        u?.company        || '',
    designation:    u?.designation    || '',
    batch:          u?.batch          || '',
    skills:         (u?.skills || []).join(', '),
    careerGoals:    u?.careerGoals    || '',
    targetIndustry: u?.targetIndustry || '',
    location:       u?.location       || '',
    website:        u?.social?.portfolio || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const readFile = (file) => new Promise((res, rej) => {
    if (file.size > 2 * 1024 * 1024) return rej('Image must be under 2MB.');
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = () => rej('Read failed');
    r.readAsDataURL(file);
  });

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { setLocalAvatar(await readFile(file)); } catch (err) { alert(err); }
    avatarFileRef.current.value = '';
  };

  const handleCoverPick = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { setLocalCover(await readFile(file)); } catch (err) { alert(err); }
    coverFileRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload avatar if changed
      if (localAvatar !== (u?.avatar || '')) {
        if (localAvatar) await api.put('/users/avatar', { avatar: localAvatar });
        else             await api.delete('/users/avatar');
      }
      // Upload cover if changed
      if (localCover !== (u?.cover || '')) {
        if (localCover) await api.put('/users/cover', { cover: localCover });
      }
      // Save profile fields
      const payload = {
        ...form,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        social: { ...(u?.social || {}), portfolio: form.website },
      };
      delete payload.website;
      const res = await api.put('/users/me', payload);
      onSaved({ ...res.data, avatar: localAvatar, cover: localCover });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="ep-overlay" onClick={onClose}>
      <div className="ep-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="ep-header">
          <button className="ep-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="ep-title">Edit profile</span>
          <button className="ep-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Scrollable body */}
        <div className="ep-body">

          {/* Cover photo */}
          <div className="ep-cover-wrap">
            {localCover
              ? <img src={localCover} alt="cover" className="ep-cover-img" />
              : <div className="ep-cover-placeholder" />
            }
            <div className="ep-cover-actions">
              <button type="button" className="ep-img-btn" onClick={e => { e.stopPropagation(); coverFileRef.current?.click(); }} title="Add photo">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
              {localCover && (
                <button type="button" className="ep-img-btn" onClick={e => { e.stopPropagation(); setLocalCover(''); }} title="Remove">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <input ref={coverFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverPick} />

          {/* Avatar */}
          <div className="ep-av-row">
            <div className="ep-av-wrap" onClick={e => { e.stopPropagation(); avatarFileRef.current?.click(); }}>
              <Avatar user={{ ...u, avatar: localAvatar }} size={80} fontSize="1.5rem" style={{ border: '3px solid var(--bg)', boxShadow: '0 4px 20px rgba(0,0,0,.5)' }} />
              <div className="ep-av-overlay">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarPick} />
          </div>

          {/* Form fields */}
          <div className="ep-fields">

            <div className="ep-field-group">
              <label className="ep-label">Name</label>
              <div style={{ display: 'flex', gap: '.6rem' }}>
                <input className="ep-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
                <input className="ep-input" value={form.lastName}  onChange={e => set('lastName',  e.target.value)} placeholder="Last name" />
              </div>
            </div>

            <div className="ep-field-group">
              <label className="ep-label">Bio</label>
              <textarea className="ep-input ep-textarea" rows={3} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell the world about yourself" maxLength={160} />
              <div className="ep-char-count">{form.bio.length}/160</div>
            </div>

            <div className="ep-field-group">
              <label className="ep-label">Location</label>
              <input className="ep-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Where are you based?" />
            </div>

            <div className="ep-field-group">
              <label className="ep-label">Website</label>
              <input className="ep-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yoursite.com" />
            </div>

            <div className="ep-field-group">
              <label className="ep-label">Industry</label>
              <input className="ep-input" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Technology, Finance…" />
            </div>

            {u?.role === 'alumni' && (
              <>
                <div className="ep-divider"><span>Professional</span></div>

                <div className="ep-field-group">
                  <label className="ep-label">Company</label>
                  <input className="ep-input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Where do you work?" />
                </div>

                <div className="ep-field-group">
                  <label className="ep-label">Designation</label>
                  <input className="ep-input" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="Your job title" />
                </div>

                <div className="ep-field-group">
                  <label className="ep-label">Batch Year</label>
                  <input className="ep-input" value={form.batch} onChange={e => set('batch', e.target.value)} placeholder="e.g. 2020" />
                </div>

                <div className="ep-field-group">
                  <label className="ep-label">Skills <span className="ep-label-hint">(comma separated)</span></label>
                  <input className="ep-input" value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="React, Node.js, Python…" />
                </div>
              </>
            )}

            {u?.role === 'student' && (
              <>
                <div className="ep-divider"><span>Career</span></div>

                <div className="ep-field-group">
                  <label className="ep-label">Target Industry</label>
                  <input className="ep-input" value={form.targetIndustry} onChange={e => set('targetIndustry', e.target.value)} placeholder="e.g. Technology" />
                </div>

                <div className="ep-field-group">
                  <label className="ep-label">Career Goals</label>
                  <textarea className="ep-input ep-textarea" rows={3} value={form.careerGoals} onChange={e => set('careerGoals', e.target.value)} placeholder="What are you aiming for?" />
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Profile Page ── */
export default function ProfilePage() {
  const { id } = useParams(); // undefined = own profile, set = other user
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const isOwn = !id || id === String(user?._id || user?.id);

  const [tab,        setTab]       = useState('Posts');
  const [posts,      setPosts]     = useState([]);
  const [replies,    setReplies]   = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [localUser,  setLocalUser] = useState(user);
  const [viewer,     setViewer]    = useState(null);
  const [editOpen,   setEditOpen]  = useState(false);
  const [loading,    setLoading]   = useState(true);
  // Other user states
  const [following,  setFollowing] = useState(false);
  const [followReq,  setFollowReq] = useState(false);
  const [requested,  setRequested] = useState(false);
  const [requesting, setRequesting]= useState(false);

  useEffect(() => {
    if (isOwn) {
      // Own profile
      const uid = user?._id || user?.id;
      Promise.all([
        api.get('/users/me'),
        api.get(`/posts/user/${uid}`),
        api.get(`/posts/user/${uid}/replies`),
      ]).then(([meRes, postsRes, repliesRes]) => {
        setLocalUser(prev => ({ ...prev, ...meRes.data }));
        setPosts(postsRes.data);
        setReplies(repliesRes.data);
      }).catch(() => {}).finally(() => setLoading(false));
    } else {
      // Other user's profile
      Promise.all([
        api.get(`/users/${id}`),
        api.get(`/posts/user/${id}`),
        api.get(`/posts/user/${id}/replies`),
        api.get('/mentorship/my'),
        api.get('/users/me'),
      ]).then(([pRes, postsRes, repliesRes, menRes, meRes]) => {
        setProfileData(pRes.data);
        setPosts(postsRes.data);
        setReplies(repliesRes.data);
        // Check mentorship
        const already = menRes.data.find(m =>
          (m.alumni?._id === id || m.alumni === id) && ['pending','accepted'].includes(m.status)
        );
        if (already) setRequested(true);
        // Check follow
        const me = meRes.data;
        setFollowing(me.following?.map(String).includes(String(id)) || false);
        setFollowReq(pRes.data.followRequests?.map(String).includes(String(me._id)) || false);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [id, isOwn]);

  const handleSaved = (updated) => {
    const next = { ...localUser, ...updated };
    localStorage.setItem('user', JSON.stringify(next));
    setLocalUser(next);
    refreshUser();
    setEditOpen(false);
  };

  const handleFollow = async () => {
    try {
      const res = await api.post(`/users/${id}/follow`);
      if (res.data.following)  { setFollowing(true);  setFollowReq(false); }
      else if (res.data.requested) { setFollowReq(true); setFollowing(false); }
      else { setFollowing(false); setFollowReq(false); }
    } catch {}
  };

  const handleMessage = async () => {
    try {
      const res = await api.get('/mentorship');
      const mentorships = res.data;
      const existing = mentorships.find(m =>
        String(m.alumni?._id || m.alumni) === String(id) ||
        String(m.student?._id || m.student) === String(id)
      );
      if (existing) {
        navigate(`/messages/${existing._id}`);
      } else {
        navigate('/messages');
      }
    } catch {
      navigate('/messages');
    }
  };

  const sendMentorshipRequest = async () => {
    setRequesting(true);
    try {
      await api.post('/mentorship/request', {
        alumniId: id, matchScore: 0,
        message: `Hi ${profileData?.firstName}, I'd love to connect with you as my mentor!`,
      });
      setRequested(true);
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setRequesting(false); }
  };
  };

  if (loading) return <DashLayout><div className="loading-screen">Loading…</div></DashLayout>;

  // Which data to display
  const u = isOwn ? localUser : profileData;
  if (!u) return <DashLayout><div style={{ padding: '3rem', color: 'var(--muted)' }}>User not found.</div></DashLayout>;

  const joinedDate = u?.createdAt
    ? new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  const TABS = isOwn ? ['Posts', 'Replies', 'Media', 'Likes'] : ['Posts', 'Replies', 'Media'];

  return (
    <DashLayout>
      {viewer && <PhotoViewer src={viewer} onClose={() => setViewer(null)} />}
      {isOwn && editOpen && <EditProfileModal user={u} onClose={() => setEditOpen(false)} onSaved={handleSaved} />}

      <div className="xp-shell">

        {/* ── COVER ── */}
        <div className="xp-cover" onClick={() => u?.cover && setViewer(u.cover)} style={{ cursor: u?.cover ? 'zoom-in' : 'default' }}>
          {u?.cover
            ? <img src={u.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div className="xp-cover-gradient" />
          }
        </div>

        {/* ── PROFILE ROW ── */}
        <div className="xp-profile-row">
          <div className="xp-av-wrap" onClick={() => u?.avatar && setViewer(u.avatar)} style={{ cursor: u?.avatar ? 'zoom-in' : 'default' }}>
            <Avatar user={u} size={84} fontSize="1.7rem" style={{ border: '4px solid var(--bg)', boxShadow: '0 4px 20px rgba(0,0,0,.5)' }} />
          </div>
          <div className="xp-profile-actions" style={{ paddingTop: '56px' }}>
            {isOwn ? (
              <button className="xp-edit-btn" onClick={() => setEditOpen(true)}>✏️ Edit profile</button>
            ) : (
              <>
                <button className="xp-edit-btn" style={{ marginRight: '.5rem' }} onClick={handleMessage}>
                  💬 Message
                </button>
                <button
                  className={following ? 'xp-following-btn' : 'xp-follow-btn'}
                  onClick={handleFollow}
                >
                  {following ? 'Following' : followReq ? 'Requested' : 'Follow'}
                </button>
                {u?.role === 'alumni' && user?.role === 'student' && (
                  <button
                    className="xp-edit-btn"
                    style={{ marginLeft: '.5rem', background: requested ? 'rgba(74,222,128,.1)' : 'rgba(124,69,184,.2)', borderColor: requested ? 'rgba(74,222,128,.3)' : 'rgba(124,69,184,.4)', color: requested ? '#4ade80' : '#a78bfa' }}
                    onClick={sendMentorshipRequest}
                    disabled={requested || requesting}
                  >
                    {requesting ? 'Sending…' : requested ? '✓ Requested' : '🤝 Mentorship'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── USER INFO ── */}
        <div className="xp-info">
          <div className="xp-name">
            {u?.firstName} {u?.lastName}
            {u?.role === 'alumni'  && <span className="xp-role-badge xp-role-alumni">⭐ Alumni</span>}
            {u?.role === 'student' && <span className="xp-role-badge xp-role-student">🎓 Student</span>}
            {u?.role === 'faculty' && <span className="xp-role-badge xp-role-faculty">👨‍🏫 Faculty</span>}
          </div>
          <div className="xp-handle">@{u?.firstName?.toLowerCase()}{u?.lastName?.[0]?.toLowerCase()} · MRU</div>

          {u?.bio && <p className="xp-bio">{u.bio}</p>}

          <div className="xp-meta-row">
            {u?.designation && (
              <span className="xp-meta-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                {u.designation}{u.company ? ` at ${u.company}` : ''}
              </span>
            )}
            {u?.industry && (
              <span className="xp-meta-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                {u.industry}
              </span>
            )}
            {joinedDate && (
              <span className="xp-meta-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Joined {joinedDate}
              </span>
            )}
          </div>

          <div className="xp-follow-row">
            <span className="xp-follow-item"><strong>{u?.following?.length ?? 0}</strong> Following</span>
            <span className="xp-follow-item"><strong>{u?.followers?.length ?? 0}</strong> {u?.followers?.length === 1 ? 'Follower' : 'Followers'}</span>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="xp-tabs">
          {TABS.map(t => (
            <button key={t} className={`xp-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="xp-content">
          {tab === 'Posts' && (
            posts.length === 0
              ? <div className="xp-empty"><div className="xp-empty-icon">📭</div><div className="xp-empty-title">No posts yet</div></div>
              : posts.map(p => <PostCard key={p._id} post={p} onDelete={pid => setPosts(ps => ps.filter(x => x._id !== pid))} />)
          )}

          {tab === 'Replies' && (
            replies.length === 0
              ? <div className="xp-empty"><div className="xp-empty-icon">💬</div><div className="xp-empty-title">No replies yet</div></div>
              : replies.map(p => (
                  <div key={p._id} className="xp-reply-item">
                    {p.replyTo && (
                      <div className="xp-reply-context">
                        <span className="xp-reply-label">Replying to</span>
                        <span className="xp-reply-to-name">@{p.replyTo?.author?.firstName?.toLowerCase()}{p.replyTo?.author?.lastName?.[0]?.toLowerCase()}</span>
                        {p.replyTo?.text && <span className="xp-reply-to-text">"{p.replyTo.text.slice(0, 80)}{p.replyTo.text.length > 80 ? '…' : ''}"</span>}
                      </div>
                    )}
                    <PostCard post={p} onDelete={pid => setReplies(rs => rs.filter(x => x._id !== pid))} />
                  </div>
                ))
          )}

          {tab === 'Media' && (() => {
            const allMedia = posts.flatMap(p =>
              (p.media || []).filter(m => m.type === 'image').map(m => ({ url: m.url, caption: p.text }))
            );
            return allMedia.length === 0
              ? <div className="xp-empty"><div className="xp-empty-icon">🖼️</div><div className="xp-empty-title">No media yet</div></div>
              : (
                <div className="xp-media-grid">
                  {allMedia.map((m, i) => (
                    <div key={i} className="xp-media-item" onClick={() => setViewer(m.url)}>
                      <img src={m.url} alt="" />
                      {m.caption && <div className="xp-media-caption">{m.caption.slice(0, 60)}</div>}
                    </div>
                  ))}
                </div>
              );
          })()}

          {tab === 'Likes' && (
            <div className="xp-empty"><div className="xp-empty-icon">❤️</div><div className="xp-empty-title">No likes yet</div></div>
          )}
        </div>

      </div>
    </DashLayout>
  );
}
