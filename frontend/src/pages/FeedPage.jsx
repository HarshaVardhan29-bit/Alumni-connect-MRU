import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import WeatherWidget from '../components/WeatherWidget';
import NewsWidget from '../components/NewsWidget';
import JobsWidget from '../components/JobsWidget';
import api from '../api/axios';


// SVG toolbar icons
const ImgIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const GifIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><text x="5" y="16" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">GIF</text></svg>;
const EmojiIcon= () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const PollIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const LocIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;

// Emoji list
const EMOJIS = ['😀','😂','🥰','😎','🤔','👍','🔥','💡','🎉','🚀','💪','🙌','✨','💯','🎯','🤝','📚','💼','🌟','❤️'];

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="emoji-picker" onClick={e => e.stopPropagation()}>
      {EMOJIS.map(e => (
        <button key={e} className="emoji-btn" onClick={() => { onSelect(e); onClose(); }}>{e}</button>
      ))}
    </div>
  );
}

// Character ring
function CharRing({ used, max }) {
  const pct = Math.min(used / max, 1);
  const r = 10, c = 2 * Math.PI * r;
  const remaining = max - used;
  const danger = remaining <= 20;
  const color = danger ? '#e53e3e' : '#c9a84c';
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="2.5"/>
      <circle cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 14 14)"
        style={{ transition: 'stroke-dashoffset .2s' }}
      />
      {danger && <text x="14" y="18" textAnchor="middle" fontSize="7" fill={color} fontFamily="Space Mono">{remaining}</text>}
    </svg>
  );
}


function WhoToConnect() {
  const { user } = useAuth();
  const [people, setPeople]     = useState([]);
  const [followed, setFollowed] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/users/all'),
      api.get('/users/me'),
    ]).then(([allRes, meRes]) => {
      const myFollowing = new Set((meRes.data.following || []).map(String));
      const myId = String(user?._id || user?.id || '');
      const suggestions = allRes.data
        .filter(p => !myFollowing.has(String(p._id)) && String(p._id) !== myId)
        .slice(0, 3);
      setPeople(suggestions);
      setFollowed(myFollowing);
    }).catch(() => {
      api.get('/users/all').then(r => {
        const myId = String(user?._id || user?.id || '');
        setPeople(r.data.filter(p => String(p._id) !== myId).slice(0, 3));
      }).catch(() => {});
    });
  }, []);

  const handleFollow = async (e, pid) => {
    e.stopPropagation();
    try {
      await api.post(`/users/${pid}/follow`);
      // Remove from suggestions after following
      setPeople(prev => prev.filter(p => String(p._id) !== String(pid)));
    } catch {}
  };

  const initials = u => `${u?.firstName?.[0] || ''}${u?.lastName?.[0] || ''}`.toUpperCase();

  if (people.length === 0) return null;

  return (
    <div className="feed-right-card" style={{ marginTop: '1rem' }}>
      <div className="feed-right-title">Who to connect</div>
      {people.map(p => (
        <div key={p._id} className="wtf-row" onClick={() => navigate(`/profile/${p._id}`)}>
          <Avatar user={p} size={36} fontSize=".75rem" style={{ flexShrink: 0 }} />
          <div className="wtf-info">
            <div className="wtf-name">{p.firstName} {p.lastName}</div>
            <div className="wtf-sub">{p.designation || 'Alumni'}{p.company ? ` · ${p.company}` : ''}</div>
          </div>
          <button className="wtf-follow-btn" onClick={e => handleFollow(e, p._id)}>Follow</button>
        </div>
      ))}
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [allPosts, setAllPosts]           = useState([]);
  const [followingPosts, setFollowingPosts] = useState([]);
  const [trendingPosts, setTrendingPosts]   = useState([]);
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [tab, setTab]         = useState('for-you');
  const [showEmoji, setShowEmoji] = useState(false);
  const [images, setImages]   = useState([]);
  const [focused, setFocused] = useState(false);
  const fileRef = useRef();
  const MAX = 280;

  // Load "For You" on mount
  useEffect(() => {
    api.get('/posts').then(r => setAllPosts(r.data)).catch(console.error).finally(() => setLoading(false));
    const close = () => setShowEmoji(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // Load tab data on switch (lazy — only fetch once)
  useEffect(() => {
    if (tab === 'following' && followingPosts.length === 0) {
      setTabLoading(true);
      api.get('/posts/following')
        .then(r => setFollowingPosts(r.data))
        .catch(console.error)
        .finally(() => setTabLoading(false));
    }
    if (tab === 'trending' && trendingPosts.length === 0) {
      setTabLoading(true);
      api.get('/posts/trending')
        .then(r => setTrendingPosts(r.data))
        .catch(console.error)
        .finally(() => setTabLoading(false));
    }
  }, [tab]);

  // Derive the active post list
  const activePosts = tab === 'for-you' ? allPosts : tab === 'following' ? followingPosts : trendingPosts;
  const isLoading   = loading || tabLoading;

  const handleImagePick = (e) => {
    const files = Array.from(e.target.files).slice(0, 4 - images.length);
    files.forEach(f => {
      if (f.size > 2 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = ev => setImages(prev => [...prev, ev.target.result].slice(0, 4));
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() && images.length === 0) return;
    if (text.length > MAX) return;
    setPosting(true);
    try {
      const media = images.map(url => ({ type: 'image', url }));
      const res = await api.post('/posts', { text, media });
      // Prepend to all-posts and switch to For You
      setAllPosts(p => [res.data, ...p]);
      setTab('for-you');
      setText(''); setImages([]);
    } catch (err) { alert(err.response?.data?.message || 'Failed to post'); }
    finally { setPosting(false); }
  };

  const handleDelete = (id) => {
    setAllPosts(p => p.filter(x => x._id !== id));
    setFollowingPosts(p => p.filter(x => x._id !== id));
    setTrendingPosts(p => p.filter(x => x._id !== id));
  };

  const handleReply = (postId, reply) => {
    const updater = p => p.map(x => x._id === postId ? { ...x, replies: [...(x.replies||[]), reply] } : x);
    setAllPosts(updater);
    setFollowingPosts(updater);
    setTrendingPosts(updater);
  };

  return (
    <DashLayout>
      <div className="feed-wrap">
        <div className="feed-col">
          <div className="feed-header-row">
            <div className="feed-tabs">
              {['for-you','following','trending'].map(t => (
                <button key={t} className={`feed-tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
                  {t==='for-you'?'For You':t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* ── Compose Box ── */}
          <div className={`compose-box${focused?' focused':''}`}>
            <Avatar user={user} size={40} fontSize=".8rem" style={{ flexShrink: 0, marginTop: '.1rem' }} />
            <form className="compose-form" onSubmit={submit}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="What's happening?"
                className="compose-textarea"
                rows={focused || text ? 3 : 1}
              />

              {/* Image previews */}
              {images.length > 0 && (
                <div className={`compose-img-grid compose-img-${images.length}`}>
                  {images.map((src, i) => (
                    <div key={i} className="compose-img-wrap">
                      <img src={src} alt="" className="compose-img-preview" />
                      <button type="button" className="compose-img-remove" onClick={() => removeImage(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Toolbar */}
              <div className="compose-toolbar">
                <div className="compose-tools">
                  {/* Image */}
                  <button type="button" className="compose-tool" title="Add image" onClick={() => fileRef.current?.click()}>
                    <ImgIcon />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleImagePick} />

                  {/* GIF — visual only */}
                  <button type="button" className="compose-tool" title="Add GIF">
                    <GifIcon />
                  </button>

                  {/* Poll — visual only */}
                  <button type="button" className="compose-tool" title="Add poll">
                    <PollIcon />
                  </button>

                  {/* Emoji */}
                  <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button type="button" className="compose-tool" title="Add emoji" onClick={() => setShowEmoji(s => !s)}>
                      <EmojiIcon />
                    </button>
                    {showEmoji && (
                      <EmojiPicker
                        onSelect={e => setText(t => t + e)}
                        onClose={() => setShowEmoji(false)}
                      />
                    )}
                  </div>

                  {/* Location — visual only */}
                  <button type="button" className="compose-tool" title="Add location">
                    <LocIcon />
                  </button>
                </div>

                <div className="compose-right">
                  {text.length > 0 && <CharRing used={text.length} max={MAX} />}
                  <button
                    type="submit"
                    className="compose-post-btn"
                    disabled={posting || (!text.trim() && images.length === 0) || text.length > MAX}
                  >
                    {posting ? '...' : 'Post'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Posts */}
          {isLoading ? (
            <div className="feed-loading">Loading feed...</div>
          ) : activePosts.length === 0 ? (
            tab === 'following' ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No posts yet</h3>
                <p>Follow more alumni to see their posts here.</p>
              </div>
            ) : tab === 'trending' ? (
              <div className="empty-state">
                <div className="empty-icon">🔥</div>
                <h3>Nothing trending yet</h3>
                <p>Check back soon as the community grows.</p>
              </div>
            ) : (
              <div className="empty-state"><div className="empty-icon">📭</div><h3>No posts yet</h3><p>Be the first to share something.</p></div>
            )
          ) : (
            activePosts.map(post => <PostCard key={post._id} post={post} onDelete={handleDelete} onReply={handleReply} />)
          )}
        </div>

        <div className="feed-sidebar-col">
          <WeatherWidget />
          <NewsWidget />
          <JobsWidget />
          <WhoToConnect />
        </div>
      </div>
    </DashLayout>
  );
}
