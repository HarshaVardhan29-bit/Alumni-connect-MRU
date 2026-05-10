import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';
import api from '../api/axios';

const ReplyIcon    = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const RetweetIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const LikeIcon     = ({ filled }) => filled
  ? <svg viewBox="0 0 24 24" width="18" height="18" fill="#f91880"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
  : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const BookmarkIcon = ({ filled }) => filled
  ? <svg viewBox="0 0 24 24" width="18" height="18" fill="#c9a84c"><path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z"/></svg>
  : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const ShareIcon    = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>;
const MoreIcon     = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
const LinkIcon     = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const ChatIcon     = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const CloseIcon    = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const ChevronIcon  = () => <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;

const fmt = n => n >= 1000 ? `${(n/1000).toFixed(1)}K` : n > 0 ? String(n) : '';

/* ── Image Lightbox ── */
function ImageLightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0));
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [images.length]);

  return (
    <div className="lb-overlay" onClick={onClose}>
      <button className="lb-close" onClick={onClose}><CloseIcon /></button>
      {idx > 0 && (
        <button className="lb-arrow lb-prev" onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}
      <img src={images[idx]} alt="" className="lb-img" onClick={e => e.stopPropagation()} />
      {idx < images.length - 1 && (
        <button className="lb-arrow lb-next" onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}>
          <ChevronIcon />
        </button>
      )}
      {images.length > 1 && (
        <div className="lb-dots">
          {images.map((_, i) => <div key={i} className={`lb-dot${i === idx ? ' active' : ''}`} />)}
        </div>
      )}
    </div>
  );
}

/* ── Share Menu ── */
function ShareMenu({ postId, onClose }) {
  const navigate = useNavigate();
  const ref = useRef();
  const postUrl = `${window.location.origin}/post/${postId}`;

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(postUrl); } catch { prompt('Copy this link:', postUrl); }
    onClose();
  };

  const shareVia = async () => {
    if (navigator.share) {
      try { await navigator.share({ url: postUrl, title: 'Check out this post' }); } catch {}
    } else { prompt('Share this link:', postUrl); }
    onClose();
  };

  return (
    <div className="share-menu" ref={ref} onClick={e => e.stopPropagation()}>
      <button className="share-item" onClick={copyLink}><LinkIcon /> Copy link</button>
      <button className="share-item" onClick={shareVia}><ShareIcon /> Share post via…</button>
      <button className="share-item" onClick={() => { navigate('/messages'); onClose(); }}><ChatIcon /> Send via Chat</button>
    </div>
  );
}

/* ── Main PostCard ── */
export default function PostCard({ post, onDelete, onReply }) {
  const { user } = useAuth();
  const { postLikeEvent, postRetweetEvent } = useSocket();
  const navigate = useNavigate();
  const uid = user?.id || user?._id;

  const [liked,      setLiked]     = useState(post.likes?.map(String).includes(String(uid)));
  const [likeCount,  setLikeCount] = useState(post.likes?.length || 0);
  const [retweeted,  setRetweeted] = useState(post.retweets?.map(String).includes(String(uid)));
  const [rtCount,    setRtCount]   = useState(post.retweets?.length || 0);
  const [replyCount, setReplyCount] = useState(post.replies?.length || 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [replying,   setReplying]  = useState(false);
  const [replyText,  setReplyText] = useState('');
  const [sending,    setSending]   = useState(false);
  const [expanded,   setExpanded]  = useState(false);
  const [lightbox,   setLightbox]  = useState(null);
  const [showShare,  setShowShare] = useState(false);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
    if (saved.includes(String(post._id))) setBookmarked(true);
  }, [post._id]);

  // Real-time like updates from other users
  useEffect(() => {
    if (!postLikeEvent) return;
    if (String(postLikeEvent.postId) !== String(post._id)) return;
    if (String(postLikeEvent.userId) === String(uid)) return; // skip own actions
    setLikeCount(postLikeEvent.likes);
  }, [postLikeEvent]);

  // Real-time retweet updates from other users
  useEffect(() => {
    if (!postRetweetEvent) return;
    if (String(postRetweetEvent.postId) !== String(post._id)) return;
    if (String(postRetweetEvent.userId) === String(uid)) return;
    setRtCount(postRetweetEvent.retweets);
  }, [postRetweetEvent]);

  const isOwn = String(post.author?._id) === String(uid);
  const TRUNCATE = 240;
  const isLong = post.text?.length > TRUNCATE;
  const displayText = isLong && !expanded ? post.text.slice(0, TRUNCATE) + '…' : post.text;

  const timeAgo = d => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handle = u => `@${(u?.firstName || '').toLowerCase()}${(u?.lastName?.[0] || '').toLowerCase()}`;

  const toggleLike = async e => {
    e.stopPropagation();
    setLiked(l => !l); setLikeCount(c => liked ? c - 1 : c + 1);
    try { const r = await api.put(`/posts/${post._id}/like`); setLiked(r.data.liked); setLikeCount(r.data.likes); } catch {}
  };

  const toggleRetweet = async e => {
    e.stopPropagation();
    setRetweeted(r => !r); setRtCount(c => retweeted ? c - 1 : c + 1);
    try { const r = await api.put(`/posts/${post._id}/retweet`); setRetweeted(r.data.retweeted); setRtCount(r.data.retweets); } catch {}
  };

  const handleDelete = async e => {
    e.stopPropagation();
    if (!window.confirm('Delete this post?')) return;
    try { await api.delete(`/posts/${post._id}`); onDelete?.(post._id); } catch {}
  };

  const submitReply = async e => {
    e.preventDefault(); e.stopPropagation();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/posts', { text: replyText, replyTo: post._id });
      onReply?.(post._id, res.data);
      setReplyCount(c => c + 1);
      setReplyText(''); setReplying(false);
    } catch {}
    finally { setSending(false); }
  };

  const toggleBookmark = async e => {
    e.stopPropagation();
    const next = !bookmarked;
    setBookmarked(next);
    // persist to localStorage immediately
    const saved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
    const updated = next
      ? [...new Set([...saved, String(post._id)])]
      : saved.filter(id => id !== String(post._id));
    localStorage.setItem('savedPosts', JSON.stringify(updated));
    try {
      await api.put(`/posts/${post._id}/save`);
    } catch {
      // revert on failure
      setBookmarked(!next);
      localStorage.setItem('savedPosts', JSON.stringify(saved));
    }
  };

  const imageUrls = post.media?.filter(m => m.type === 'image').map(m => m.url) || [];

  return (
    <>
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      <article className="xpost" onClick={() => navigate(`/post/${post._id}`)}>
        <div className="xpost-av-col">
          <Avatar
            user={post.author} size={42} className="xpost-av"
            style={{ cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); navigate(`/profile/${post.author?._id}`); }}
          />
        </div>

        <div className="xpost-content">
          <div className="xpost-header">
            <div className="xpost-meta" onClick={e => { e.stopPropagation(); navigate(`/profile/${post.author?._id}`); }}>
              <span className="xpost-name">{post.author?.firstName} {post.author?.lastName}</span>
              {post.author?.role === 'alumni'  && <span className="xp-role-badge xp-role-alumni">⭐ Alumni</span>}
              {post.author?.role === 'student' && <span className="xp-role-badge xp-role-student">🎓 Student</span>}
              {post.author?.role === 'faculty' && <span className="xp-role-badge xp-role-faculty">👨‍🏫 Faculty</span>}
              <span className="xpost-handle">{handle(post.author)}</span>
              <span className="xpost-dot">·</span>
              <span className="xpost-time">{timeAgo(post.createdAt)}</span>
            </div>
            <div className="xpost-more-wrap" onClick={e => e.stopPropagation()}>
              {isOwn && <button className="xpost-more" onClick={handleDelete} title="Delete post"><MoreIcon /></button>}
            </div>
          </div>

          {(post.author?.designation || post.author?.company) && (
            <div className="xpost-subhandle">
              {post.author.designation}{post.author.company ? ` · ${post.author.company}` : ''}
            </div>
          )}

          {post.replyTo && (
            <div className="xpost-reply-ctx">
              Replying to <span className="xpost-reply-name">@{post.replyTo?.author?.firstName?.toLowerCase()}</span>
            </div>
          )}

          <p className="xpost-body">
            {displayText}
            {isLong && (
              <button className="xpost-showmore" onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}>
                {expanded ? ' Show less' : ' Show more'}
              </button>
            )}
          </p>

          {post.location?.city && (
            <div className="xpost-location">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {post.location.city}
            </div>
          )}

          {post.media?.length > 0 && (
            <div className={`xpost-media xpost-media-${Math.min(post.media.length, 4)}`} onClick={e => e.stopPropagation()}>
              {post.media.map((m, i) => (
                m.type === 'video'
                  ? <video key={i} src={m.url} controls className="xpost-media-img" style={{ objectFit: 'cover', background: '#000' }} />
                  : <img key={i} src={m.url} alt="" className="xpost-media-img" loading="lazy"
                      style={{ cursor: 'zoom-in' }}
                      onClick={e => { e.stopPropagation(); setLightbox({ images: imageUrls, index: i }); }}
                    />
              ))}
            </div>
          )}

          <div className="xpost-actions" onClick={e => e.stopPropagation()}>
            <button className="xpost-act reply-act" onClick={e => { e.stopPropagation(); setReplying(r => !r); }}>
              <span className="xpost-act-icon"><ReplyIcon /></span>
              {replyCount > 0 && <span className="xpost-act-count">{fmt(replyCount)}</span>}
            </button>

            <button className={`xpost-act rt-act${retweeted ? ' active' : ''}`} onClick={toggleRetweet}>
              <span className="xpost-act-icon"><RetweetIcon /></span>
              {rtCount > 0 && <span className="xpost-act-count">{fmt(rtCount)}</span>}
            </button>

            <button className={`xpost-act like-act${liked ? ' active' : ''}`} onClick={toggleLike}>
              <span className="xpost-act-icon"><LikeIcon filled={liked} /></span>
              {likeCount > 0 && <span className="xpost-act-count">{fmt(likeCount)}</span>}
            </button>

            <button className={`xpost-act bookmark-act${bookmarked ? ' active' : ''}`} onClick={toggleBookmark}>
              <span className="xpost-act-icon"><BookmarkIcon filled={bookmarked} /></span>
            </button>

            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button className="xpost-act share-act" onClick={e => { e.stopPropagation(); setShowShare(s => !s); }}>
                <span className="xpost-act-icon"><ShareIcon /></span>
              </button>
              {showShare && <ShareMenu postId={post._id} onClose={() => setShowShare(false)} />}
            </div>
          </div>

          {replying && (
            <form className="xpost-reply-form" onClick={e => e.stopPropagation()} onSubmit={submitReply}>
              <input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)}
                placeholder={`Reply to ${post.author?.firstName}...`} className="xpost-reply-input" />
              <button type="submit" className="xpost-reply-btn" disabled={sending || !replyText.trim()}>
                {sending ? '…' : 'Reply'}
              </button>
            </form>
          )}
        </div>
      </article>
    </>
  );
}
