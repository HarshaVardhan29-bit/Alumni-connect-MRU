import { useEffect, useState } from 'react';
import DashLayout from '../components/DashLayout';
import PostCard from '../components/PostCard';
import api from '../api/axios';

export default function SavedPostsPage() {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor,  setCursor]  = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (cur = null) => {
    try {
      const url = cur ? `/posts/bookmarks?cursor=${cur}&limit=20` : '/posts/bookmarks?limit=20';
      const r = await api.get(url);
      const data = r.data;
      // Handle both old array format and new {posts, nextCursor} format
      const newPosts = data.posts || data || [];
      if (cur) setPosts(p => [...p, ...newPosts]);
      else setPosts(newPosts);
      setCursor(data.nextCursor || null);
      setHasMore(data.hasMore || false);
    } catch {}
  };

  useEffect(() => {
    load(null).finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    await load(cursor);
    setLoadingMore(false);
  };

  const handleUnsave = (pid) => setPosts(ps => ps.filter(p => p._id !== pid));

  return (
    <DashLayout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-sub)', paddingBottom: '1rem' }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', fontWeight: 600, color: 'var(--ink)' }}>
            Saved Posts
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)', fontSize: '1rem' }}>
            Loading saved posts…
          </div>
        ) : posts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 2rem', gap: '1rem', color: 'var(--muted)' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".4">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>No saved posts yet</div>
            <div style={{ fontSize: '.9rem' }}>Tap the bookmark icon on any post to save it here.</div>
          </div>
        ) : (
          <>
            {posts.map(p => (
              <PostCard key={p._id} post={p} onDelete={handleUnsave} />
            ))}
            {hasMore && (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{ fontSize: '.82rem', color: '#a78bfa', background: 'rgba(124,69,184,.1)', border: '1px solid rgba(124,69,184,.2)', borderRadius: 20, padding: '.4rem 1.2rem', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', fontSize: '.75rem', color: 'var(--muted)' }}>
                All saved posts loaded ✓
              </div>
            )}
          </>
        )}
      </div>
    </DashLayout>
  );
}
