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
  const navigate = useNavigate();

  useEffect(() => {
    const myId = String(user?._id || user?.id || '');
    const myFollowing = new Set((user?.following || []).map(String));
    api.get('/users/all').then(r => {
      const suggestions = r.data
        .filter(p => !myFollowing.has(String(p._id)) && String(p._id) !== myId)
        .slice(0, 3);
      setPeople(suggestions);
    }).catch(() => {});
  }, [user?._id || user?.id]);

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
  const [allPosts,       setAllPosts]       = useState([]);
  const [followingPosts, setFollowingPosts] = useState([]);
  const [trendingPosts,  setTrendingPosts]  = useState([]);
  const [cursors,        setCursors]        = useState({ 'for-you': null, following: null, trending: null });
  const [hasMore,        setHasMore]        = useState({ 'for-you': true, following: true, trending: true });
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const [tabLoading,setTabLoading]= useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const [posting,   setPosting]   = useState(false);
  const [tab,       setTab]       = useState('for-you');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif,   setShowGif]   = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs,      setGifs]      = useState([]);
  const [gifLoading,setGifLoading]= useState(false);
  const [showLocation,setShowLocation]=useState(false);
  const [location,  setLocation]  = useState(null);
  const [locLoading,setLocLoading]= useState(false);
  const [images,    setImages]    = useState([]);
  const [focused,   setFocused]   = useState(false);
  const fileRef     = useRef();
  const videoRef    = useRef();
  const gifInputRef = useRef();
  const loaderRef   = useRef(); // intersection observer target
  const MAX = 280;

  // ── Feed URL map ──
  const feedUrl = (t, cursor) => {
    const base = t === 'for-you' ? '/posts' : t === 'following' ? '/posts/following' : '/posts/trending';
    return cursor ? `${base}?cursor=${cursor}&limit=20` : `${base}?limit=20`;
  };

  // ── Extract posts from response (handles both old array and new {posts, nextCursor} format) ──
  const extractPosts = (data) => {
    if (Array.isArray(data)) return { posts: data, nextCursor: null, hasMore: false };
    return { posts: data.posts || [], nextCursor: data.nextCursor || null, hasMore: data.hasMore || false };
  };

  // ── Initial load ──
  useEffect(() => {
    setLoading(true);
    api.get(feedUrl('for-you', null))
      .then(r => {
        const { posts, nextCursor, hasMore: hm } = extractPosts(r.data);
        setAllPosts(posts);
        setCursors(c => ({ ...c, 'for-you': nextCursor }));
        setHasMore(h => ({ ...h, 'for-you': hm }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    const close = () => { setShowEmoji(false); setShowGif(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Tab switch — load if not loaded yet ──
  useEffect(() => {
    if (tab === 'for-you') return;
    const posts = tab === 'following' ? followingPosts : trendingPosts;
    if (posts.length > 0) return; // already loaded
    setTabLoading(true);
    api.get(feedUrl(tab, null))
      .then(r => {
        const { posts: p, nextCursor, hasMore: hm } = extractPosts(r.data);
        if (tab === 'following') setFollowingPosts(p);
        else setTrendingPosts(p);
        setCursors(c => ({ ...c, [tab]: nextCursor }));
        setHasMore(h => ({ ...h, [tab]: hm }));
      })
      .catch(console.error)
      .finally(() => setTabLoading(false));
  }, [tab]);

  // ── Infinite scroll — load more ──
  const loadMore = async () => {
    if (loadingMore || !hasMore[tab] || !cursors[tab]) return;
    setLoadingMore(true);
    try {
      const r = await api.get(feedUrl(tab, cursors[tab]));
      const { posts: newPosts, nextCursor, hasMore: hm } = extractPosts(r.data);
      if (tab === 'for-you')    setAllPosts(p => [...p, ...newPosts]);
      if (tab === 'following')  setFollowingPosts(p => [...p, ...newPosts]);
      if (tab === 'trending')   setTrendingPosts(p => [...p, ...newPosts]);
      setCursors(c => ({ ...c, [tab]: nextCursor }));
      setHasMore(h => ({ ...h, [tab]: hm }));
    } catch {}
    setLoadingMore(false);
  };

  // ── Intersection Observer for infinite scroll ──
  // rootMargin: preload 300px before reaching bottom (smooth experience)
  // threshold: 0 = trigger as soon as 1px is visible
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0, rootMargin: '0px 0px 300px 0px' }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
    // Only re-create observer when tab/cursor/hasMore changes — NOT on every render
  }, [tab, cursors[tab], hasMore[tab]]);

  const activePosts = tab === 'for-you' ? allPosts : tab === 'following' ? followingPosts : trendingPosts;
  const isLoading   = loading || tabLoading;

  // ── Media handlers ──
  const handleImagePick = (e) => {
    const files = Array.from(e.target.files).slice(0, 4 - images.length);
    files.forEach(f => {
      if (f.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = ev => setImages(prev => [...prev, { type: 'image', url: ev.target.result }].slice(0, 4));
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const handleVideoPick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { alert('Video too large. Max 50MB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setImages([{ type: 'video', url: ev.target.result, name: f.name }]);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const removeMedia = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  // ── GIF search via Tenor (free, no key needed for basic) ──
  const searchGifs = async (q) => {
    if (!q.trim()) { setGifs([]); return; }
    setGifLoading(true);
    try {
      const r = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=AIzaSyAyimkuYQYF_FXVALexPzkcsvZpe5LHs8A&limit=12&media_filter=gif`);
      const d = await r.json();
      setGifs(d.results || []);
    } catch { setGifs([]); }
    finally { setGifLoading(false); }
  };

  const pickGif = (gif) => {
    const url = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
    if (url) setImages([{ type: 'gif', url }]);
    setShowGif(false);
    setGifs([]);
    setGifSearch('');
  };

  // ── Location ──
  const getLocation = () => {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`);
          const d = await r.json();
          const city = d.address?.city || d.address?.town || d.address?.village || d.display_name?.split(',')[0];
          setLocation({ lat: coords.latitude, lon: coords.longitude, city });
        } catch {
          setLocation({ lat: coords.latitude, lon: coords.longitude, city: `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}` });
        }
        setLocLoading(false);
        setShowLocation(false);
      },
      () => { alert('Location access denied.'); setLocLoading(false); }
    );
  };

  // ── Submit ──
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() && images.length === 0) return;
    if (text.length > MAX) return;
    setPosting(true);
    try {
      const media = images.map(m => ({ type: m.type, url: m.url }));
      const payload = { text, media };
      if (location) payload.location = location;
      const res = await api.post('/posts', payload);
      setAllPosts(p => [res.data, ...p]);
      setTab('for-you');
      setText(''); setImages([]); setLocation(null);
    } catch (err) { alert(err.response?.data?.message || 'Failed to post'); }
    finally { setPosting(false); }
  };

  const handleDelete = (id) => {
    setAllPosts(p => p.filter(x => x._id !== id));
    setFollowingPosts(p => p.filter(x => x._id !== id));
    setTrendingPosts(p => p.filter(x => x._id !== id));
  };

  const handleReply = (postId) => {
    const updater = p => p.map(x => x._id === postId
      ? { ...x, repliesCount: (x.repliesCount || 0) + 1 }
      : x
    );
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

              {/* Media previews */}
              {images.length > 0 && (
                <div className={`compose-img-grid compose-img-${images.length}`}>
                  {images.map((m, i) => (
                    <div key={i} className="compose-img-wrap">
                      {m.type === 'video'
                        ? <video src={m.url} className="compose-img-preview" controls style={{ objectFit: 'cover' }} />
                        : <img src={m.url} alt="" className="compose-img-preview" />
                      }
                      <button type="button" className="compose-img-remove" onClick={() => removeMedia(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Location tag */}
              {location && (
                <div className="compose-location-tag">
                  <LocIcon /> {location.city}
                  <button type="button" onClick={() => setLocation(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginLeft: '.4rem' }}>✕</button>
                </div>
              )}

              {/* GIF picker */}
              {showGif && (
                <div className="compose-gif-picker" onClick={e => e.stopPropagation()}>
                  <input
                    ref={gifInputRef}
                    className="compose-gif-search"
                    placeholder="Search GIFs..."
                    value={gifSearch}
                    onChange={e => { setGifSearch(e.target.value); searchGifs(e.target.value); }}
                    autoFocus
                  />
                  {gifLoading && <div style={{ padding: '.5rem', color: 'var(--muted)', fontSize: '.8rem' }}>Searching...</div>}
                  <div className="compose-gif-grid">
                    {gifs.map((g, i) => (
                      <img
                        key={i}
                        src={g.media_formats?.tinygif?.url}
                        alt={g.content_description}
                        className="compose-gif-item"
                        onClick={() => pickGif(g)}
                      />
                    ))}
                  </div>
                  {!gifLoading && gifs.length === 0 && gifSearch && (
                    <div style={{ padding: '.5rem', color: 'var(--muted)', fontSize: '.8rem' }}>No GIFs found</div>
                  )}
                </div>
              )}

              {/* Toolbar */}
              <div className="compose-toolbar">
                <div className="compose-tools">
                  {/* Image */}
                  <button type="button" className="compose-tool" title="Add image/video" onClick={() => fileRef.current?.click()}>
                    <ImgIcon />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleImagePick} />

                  {/* Video */}
                  <button type="button" className="compose-tool" title="Add video" onClick={() => videoRef.current?.click()}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </button>
                  <input ref={videoRef} type="file" accept="video/*" style={{ display:'none' }} onChange={handleVideoPick} />

                  {/* GIF */}
                  <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button type="button" className="compose-tool" title="Add GIF" onClick={() => { setShowGif(s => !s); setShowEmoji(false); }}>
                      <GifIcon />
                    </button>
                  </div>

                  {/* Poll — visual only */}
                  <button type="button" className="compose-tool" title="Add poll">
                    <PollIcon />
                  </button>

                  {/* Emoji */}
                  <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button type="button" className="compose-tool" title="Add emoji" onClick={() => { setShowEmoji(s => !s); setShowGif(false); }}>
                      <EmojiIcon />
                    </button>
                    {showEmoji && (
                      <EmojiPicker
                        onSelect={e => setText(t => t + e)}
                        onClose={() => setShowEmoji(false)}
                      />
                    )}
                  </div>

                  {/* Location */}
                  <button
                    type="button"
                    className={`compose-tool${location ? ' compose-tool-active' : ''}`}
                    title="Add location"
                    onClick={() => { if (location) setLocation(null); else getLocation(); }}
                    disabled={locLoading}
                  >
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
            <>
              {activePosts.map(post => <PostCard key={post._id} post={post} onDelete={handleDelete} onReply={handleReply} />)}
              {/* Infinite scroll trigger */}
              <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loadingMore && <div className="feed-loading" style={{ padding: '.5rem' }}>Loading more…</div>}
                {!hasMore[tab] && activePosts.length > 0 && (
                  <div style={{ fontSize: '.75rem', color: 'var(--muted)', padding: '1rem' }}>You're all caught up ✓</div>
                )}
              </div>
            </>
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
