import { useEffect, useState } from 'react';
import DashLayout from '../components/DashLayout';
import PostCard from '../components/PostCard';
import api from '../api/axios';

export default function SavedPostsPage() {
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/saved/list')
      .then(r => {
        setPosts(r.data);
        // sync localStorage so PostCard bookmark icons are accurate
        const ids = r.data.map(p => String(p._id));
        localStorage.setItem('savedPosts', JSON.stringify(ids));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          posts.map(p => (
            <PostCard
              key={p._id}
              post={p}
              onDelete={handleUnsave}
            />
          ))
        )}
      </div>
    </DashLayout>
  );
}
