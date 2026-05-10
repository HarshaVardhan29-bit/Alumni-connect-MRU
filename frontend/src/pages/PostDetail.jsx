import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashLayout from '../components/DashLayout';
import PostCard from '../components/PostCard';
import api from '../api/axios';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(r => setData(r.data))
      .catch(() => navigate('/feed'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => navigate('/feed');
  const handleReply = (postId, newReply) => {
    setData(d => {
      if (!d) return d;
      // If reply to the main post
      if (String(postId) === String(d.post?._id)) {
        return {
          ...d,
          post: { ...d.post, repliesCount: (d.post.repliesCount || 0) + 1 },
          replies: newReply ? [...d.replies, newReply] : d.replies,
        };
      }
      return d;
    });
  };
  const handleDeleteReply = (rid) => {
    setData(d => d ? {
      ...d,
      post: { ...d.post, repliesCount: Math.max(0, (d.post.repliesCount || 1) - 1) },
      replies: d.replies.filter(r => r._id !== rid),
    } : d);
  };

  return (
    <DashLayout>
      <div className="dash-content">
        <button className="back-btn" onClick={() => navigate('/feed')} style={{ marginBottom: '1.5rem' }}>
          ← Back to Feed
        </button>

        {loading ? (
          <div className="feed-loading">Loading...</div>
        ) : data ? (
          <>
            <PostCard post={data.post} onDelete={handleDelete} onReply={handleReply} />

            {data.replies.length > 0 && (
              <div className="replies-section">
                <div className="replies-header">
                  💬 {data.replies.length} Repl{data.replies.length > 1 ? 'ies' : 'y'}
                </div>
                <div className="replies-thread">
                  {data.replies.map(r => (
                    <PostCard
                      key={r._id}
                      post={r}
                      onDelete={handleDeleteReply}
                      onReply={handleReply}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </DashLayout>
  );
}
