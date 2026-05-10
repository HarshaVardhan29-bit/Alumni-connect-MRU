import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import api from '../api/axios';

const TABS = ['Posts', 'Replies', 'Media', 'Mentorship'];

function PhotoViewer({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="photo-viewer-overlay" onClick={onClose}>
      <button className="photo-viewer-close" onClick={onClose}>✕</button>
      <img src={src} alt="" className="photo-viewer-img" onClick={e => e.stopPropagation()} />
    </div>
  );
}

export default function PublicProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile,    setProfile]    = useState(null);
  const [posts,      setPosts]      = useState([]);
  const [replies,    setReplies]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('Posts');
  const [viewer,     setViewer]     = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [requested,  setRequested]  = useState(false);
  const [following,  setFollowing]  = useState(false);
  const [followReq,  setFollowReq]  = useState(false); // pending follow request

  useEffect(() => {
    if (id === user?.id || id === user?._id) { navigate('/profile'); return; }
    Promise.all([
      api.get(`/users/${id}`),
      api.get(`/posts/user/${id}`),
      api.get(`/posts/user/${id}/replies`),
      api.get('/mentorship/my'),
      api.get('/users/me'),
    ]).then(([pRes, postsRes, repliesRes, menRes, meRes]) => {
      setProfile(pRes.data);
      setPosts(postsRes.data);
      setReplies(repliesRes.data);

      // Check mentorship request
      const already = menRes.data.find(m =>
        (m.alumni?._id === id || m.alumni === id) && ['pending', 'accepted'].includes(m.status)
      );
      if (already) setRequested(true);

      // Check follow status
      const me = meRes.data;
      const isFollowing = me.following?.map(String).includes(String(id));
      const isPending   = pRes.data.followRequests?.map(String).includes(String(me._id));
      setFollowing(isFollowing);
      setFollowReq(isPending && !isFollowing);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const sendMentorshipRequest = async () => {
    setRequesting(true);
    try {
      await api.post('/mentorship/request', {
        alumniId: id, matchScore: 0,
        message: `Hi ${profile?.firstName}, I'd love to connect with you as my mentor!`,
      });
      setRequested(true);
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setRequesting(false); }
  };

  const handleFollow = async () => {
    try {
      const res = await api.post(`/users/${id}/follow`);
      if (res.data.following) { setFollowing(true); setFollowReq(false); }
      else if (res.data.requested) { setFollowReq(true); setFollowing(false); }
      else { setFollowing(false); setFollowReq(false); }
    } catch {}
  };

  if (loading) return <DashLayout><div className="loading-screen">Loading…</div></DashLayout>;
  if (!profile) return <DashLayout><div style={{ padding: '3rem', color: 'var(--muted)' }}>User not found.</div></DashLayout>;

  const joinedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  const handle = `@${profile.firstName?.toLowerCase()}${profile.lastName?.[0]?.toLowerCase()}`;
  const imageUrls = posts.flatMap(p => p.media?.filter(m => m.type === 'image').map(m => m.url) || []);

  const followBtnLabel = following ? 'Following' : followReq ? 'Requested' : profile.isPrivate ? 'Follow' : 'Follow';
  const followBtnClass = following ? 'xp-following-btn' : 'xp-follow-btn';

  return (
    <DashLayout>
      {viewer && <PhotoViewer src={viewer} onClose={() => setViewer(null)} />}

      <div className="xp-shell">

        {/* ── COVER ── */}
        <div
          className="xp-cover"
          onClick={() => profile.cover && setViewer(profile.cover)}
          style={{ cursor: profile.cover ? 'zoom-in' : 'default' }}
        >
          {profile.cover
            ? <img src={profile.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div className="xp-cover-gradient" />
          }
        </div>

        {/* ── PROFILE ROW ── */}
        <div className="xp-profile-row">
          <div
            className="xp-av-wrap"
            onClick={() => profile.avatar && setViewer(profile.avatar)}
            style={{ cursor: profile.avatar ? 'zoom-in' : 'default' }}
          >
            <Avatar user={profile} size={84} fontSize="1.7rem"
              style={{ border: '4px solid var(--bg)', boxShadow: '0 4px 20px rgba(0,0,0,.5)' }} />
          </div>

          <div className="xp-profile-actions" style={{ paddingTop: '56px' }}>
            {/* Message button */}
            <button
              className="xp-edit-btn"
              style={{ marginRight: '.5rem' }}
              onClick={() => navigate('/messages')}
            >
              💬 Message
            </button>

            {/* Follow button */}
            <button className={followBtnClass} onClick={handleFollow}>
              {followBtnLabel}
            </button>

            {/* Mentorship request for alumni */}
            {profile.role === 'alumni' && user?.role === 'student' && (
              <button
                className="xp-edit-btn"
                style={{
                  marginLeft: '.5rem',
                  background: requested ? 'rgba(74,222,128,.1)' : 'rgba(124,69,184,.2)',
                  borderColor: requested ? 'rgba(74,222,128,.3)' : 'rgba(124,69,184,.4)',
                  color: requested ? '#4ade80' : '#a78bfa',
                }}
                onClick={sendMentorshipRequest}
                disabled={requested || requesting}
              >
                {requesting ? 'Sending…' : requested ? '✓ Requested' : '🤝 Mentorship'}
              </button>
            )}
          </div>
        </div>

        {/* ── USER INFO ── */}
        <div className="xp-info">
          <div className="xp-name">
            {profile.firstName} {profile.lastName}
            {profile.role === 'alumni'  && <span className="xp-role-badge xp-role-alumni">⭐ Alumni</span>}
            {profile.role === 'student' && <span className="xp-role-badge xp-role-student">🎓 Student</span>}
            {profile.role === 'faculty' && <span className="xp-role-badge xp-role-faculty">👨‍🏫 Faculty</span>}
          </div>
          <div className="xp-handle">{handle} · MRU</div>

          {profile.bio && <p className="xp-bio">{profile.bio}</p>}

          <div className="xp-meta-row">
            {profile.designation && (
              <span className="xp-meta-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                {profile.designation}{profile.company ? ` at ${profile.company}` : ''}
              </span>
            )}
            {profile.industry && (
              <span className="xp-meta-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                {profile.industry}
              </span>
            )}
            {profile.batch && (
              <span className="xp-meta-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                Batch {profile.batch}
              </span>
            )}
            {joinedDate && (
              <span className="xp-meta-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Joined {joinedDate}
              </span>
            )}
          </div>

          {/* Social links */}
          {(profile.social?.linkedin || profile.social?.github || profile.social?.twitter || profile.social?.portfolio) && (
            <div className="xp-meta-row" style={{ marginTop: '.3rem' }}>
              {profile.social?.linkedin  && <a href={profile.social.linkedin}  target="_blank" rel="noreferrer" className="xp-social-link">LinkedIn</a>}
              {profile.social?.github    && <a href={profile.social.github}    target="_blank" rel="noreferrer" className="xp-social-link">GitHub</a>}
              {profile.social?.twitter   && <a href={profile.social.twitter}   target="_blank" rel="noreferrer" className="xp-social-link">X</a>}
              {profile.social?.portfolio && <a href={profile.social.portfolio} target="_blank" rel="noreferrer" className="xp-social-link">Website</a>}
            </div>
          )}

          <div className="xp-follow-row">
            <span className="xp-follow-item"><strong>{profile.following?.length ?? 0}</strong> Following</span>
            <span className="xp-follow-item"><strong>{profile.followers?.length ?? 0}</strong> {profile.followers?.length === 1 ? 'Follower' : 'Followers'}</span>
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
              : posts.map(p => <PostCard key={p._id} post={p} onDelete={() => {}} />)
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
                    <PostCard post={p} onDelete={() => {}} />
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

          {tab === 'Mentorship' && (
            <div style={{ padding: '1.5rem 2rem' }}>
              {profile.role === 'alumni' ? (
                <div style={{ maxWidth: 480 }}>
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-sub)', borderRadius: 14, padding: '1.4rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '.65rem', fontWeight: 700, color: '#c9a84c', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.8rem' }}>Mentorship Info</div>
                    {profile.industry && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0', borderBottom: '1px solid var(--border-sub)', fontSize: '.88rem', color: 'var(--ink-2)' }}><span style={{ color: 'var(--muted)' }}>🎯 Expertise</span><span>{profile.industry}</span></div>}
                    {profile.designation && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0', borderBottom: '1px solid var(--border-sub)', fontSize: '.88rem', color: 'var(--ink-2)' }}><span style={{ color: 'var(--muted)' }}>💼 Role</span><span>{profile.designation}{profile.company ? ` · ${profile.company}` : ''}</span></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0', fontSize: '.88rem' }}><span style={{ color: 'var(--muted)' }}>📅 Availability</span><span style={{ color: '#4ade80' }}>Open to requests</span></div>
                  </div>
                  {user?.role === 'student' && (
                    <button
                      onClick={sendMentorshipRequest}
                      disabled={requested || requesting}
                      style={{
                        width: '100%', padding: '.8rem', borderRadius: 10, border: 'none',
                        background: requested ? 'rgba(74,222,128,.12)' : 'linear-gradient(135deg,#7c45b8,#c9a84c)',
                        color: requested ? '#4ade80' : '#fff',
                        fontSize: '.9rem', fontWeight: 700, cursor: requested ? 'default' : 'pointer',
                        fontFamily: 'DM Sans,sans-serif',
                      }}
                    >
                      {requesting ? 'Sending…' : requested ? '✓ Request Sent' : '+ Request Mentorship'}
                    </button>
                  )}
                  {profile.skills?.length > 0 && (
                    <div style={{ marginTop: '1.2rem' }}>
                      <div style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '.6rem' }}>Skills</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                        {profile.skills.map(s => <span key={s} style={{ padding: '.25rem .75rem', borderRadius: 100, background: 'rgba(124,69,184,.15)', border: '1px solid rgba(124,69,184,.3)', fontSize: '.75rem', color: '#a78bfa' }}>{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="xp-empty"><div className="xp-empty-icon">🎓</div><div className="xp-empty-title">Student Profile</div><div className="xp-empty-sub">Looking for mentorship opportunities.</div></div>
              )}
            </div>
          )}

        </div>
      </div>
    </DashLayout>
  );
}
