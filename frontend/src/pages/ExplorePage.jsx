import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashLayout from '../components/DashLayout';
import Avatar from '../components/Avatar';
import api from '../api/axios';

export default function ExplorePage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/alumni')
      .then(r => { setPeople(r.data); setFiltered(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(
      people.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.designation || '').toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.industry || '').toLowerCase().includes(q) ||
        (p.skills || []).some(s => s.toLowerCase().includes(q))
      )
    );
  }, [query, people]);

  const initials = p => `${p?.firstName?.[0] || ''}${p?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <DashLayout>
      <div className="explore-wrap">
        <div className="explore-header">
          <h2 className="feed-page-title">Explore Alumni</h2>
          <p className="explore-sub">Discover and connect with MRU alumni</p>
        </div>

        <div className="explore-search-row">
          <div className="explore-search-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, color: 'var(--muted)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="explore-search"
              placeholder="Search by name, role, company, or skill..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="feed-loading">Loading alumni...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div className="explore-grid">
            {filtered.map(p => (
              <div key={p._id} className="explore-card" onClick={() => navigate(`/profile/${p._id}`)}>
                <div className="explore-card-top">
                  <div className="explore-av">{initials(p)}</div>
                  <div className="explore-card-info">
                    <div className="explore-name">{p.firstName} {p.lastName}</div>
                    <div className="explore-role">
                      {p.designation || 'Alumni'}
                      {p.company ? ` · ${p.company}` : ''}
                    </div>
                    {p.industry && <div className="explore-industry">{p.industry}</div>}
                  </div>
                </div>
                {p.skills?.length > 0 && (
                  <div className="explore-skills">
                    {p.skills.slice(0, 3).map((s, i) => (
                      <span key={i} className="skill-tag">{s}</span>
                    ))}
                  </div>
                )}
                <button className="explore-btn" onClick={e => { e.stopPropagation(); navigate(`/profile/${p._id}`); }}>
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashLayout>
  );
}
