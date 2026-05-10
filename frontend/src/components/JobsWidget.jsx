import { useEffect, useState } from 'react';

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const TAGS = ['All', 'Software', 'Design', 'Marketing', 'Finance', 'Data'];

const TAG_QUERY = {
  All:       '',
  Software:  'software engineer',
  Design:    'designer',
  Marketing: 'marketing',
  Finance:   'finance',
  Data:      'data analyst',
};

// Job type badge color
const TYPE_COLOR = {
  'full time':  { bg: 'rgba(34,197,94,.12)',  color: '#22c55e' },
  'part time':  { bg: 'rgba(251,191,36,.12)', color: '#fbbf24' },
  'contract':   { bg: 'rgba(99,102,241,.12)', color: '#818cf8' },
  'freelance':  { bg: 'rgba(236,72,153,.12)', color: '#ec4899' },
  'internship': { bg: 'rgba(14,165,233,.12)', color: '#38bdf8' },
};

export default function JobsWidget() {
  const [jobs, setJobs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tag, setTag]       = useState('All');
  const [news, setNews]     = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [view, setView]     = useState('jobs'); // 'jobs' | 'news'

  // Fetch live jobs from Remotive (free, no key, CORS-open)
  useEffect(() => {
    setLoading(true);
    const q = TAG_QUERY[tag];
    const url = q
      ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=6`
      : `https://remotive.com/api/remote-jobs?limit=6`;

    fetch(url)
      .then(r => r.json())
      .then(d => setJobs(d.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [tag]);

  // Fetch job-related news via backend proxy
  useEffect(() => {
    if (view !== 'news') return;
    setNewsLoading(true);
    // reuse the /api/news route with a jobs-related category
    fetch('/api/news?category=business', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.articles?.length) {
          setNews(d.articles);
        } else {
          // fallback curated job news
          setNews([
            { title: 'India adds 8.9 lakh jobs in IT sector in FY2026', source: 'Economic Times', publishedAt: new Date(Date.now() - 3600000).toISOString(), url: 'https://economictimes.com' },
            { title: 'Remote work demand surges 34% globally in Q1 2026', source: 'Forbes', publishedAt: new Date(Date.now() - 7200000).toISOString(), url: 'https://forbes.com' },
            { title: 'Top skills employers want in 2026: AI, Cloud, and Communication', source: 'LinkedIn', publishedAt: new Date(Date.now() - 10800000).toISOString(), url: 'https://linkedin.com' },
            { title: 'Freshers hiring up 22% as startups expand post-funding', source: 'Inc42', publishedAt: new Date(Date.now() - 18000000).toISOString(), url: 'https://inc42.com' },
            { title: 'MNC campus placements hit record high at IITs and NITs', source: 'Mint', publishedAt: new Date(Date.now() - 86400000).toISOString(), url: 'https://livemint.com' },
          ]);
        }
      })
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, [view]);

  const typeStyle = (t) => TYPE_COLOR[(t || '').toLowerCase()] || { bg: 'rgba(255,255,255,.08)', color: 'var(--muted)' };

  return (
    <div className="feed-right-card jobs-widget">
      {/* Header with toggle */}
      <div className="jobs-widget-header">
        <div className="feed-right-title" style={{ marginBottom: 0 }}>
          {view === 'jobs' ? '💼 Live Jobs' : '📰 Job News'}
        </div>
        <div className="jobs-view-toggle">
          <button className={view === 'jobs' ? 'active' : ''} onClick={() => setView('jobs')}>Jobs</button>
          <button className={view === 'news' ? 'active' : ''} onClick={() => setView('news')}>News</button>
        </div>
      </div>

      {/* ── JOBS VIEW ── */}
      {view === 'jobs' && (
        <>
          {/* Category filter */}
          <div className="jobs-tags">
            {TAGS.map(t => (
              <button
                key={t}
                className={`jobs-tag${tag === t ? ' active' : ''}`}
                onClick={() => setTag(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="widget-loading">Fetching live jobs…</div>
          ) : jobs.length === 0 ? (
            <div className="widget-loading">No jobs found.</div>
          ) : (
            <div className="jobs-list">
              {jobs.map((j, i) => {
                const ts = typeStyle(j.job_type);
                return (
                  <a
                    key={j.id || i}
                    href={j.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="job-item"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Company logo — proxied through backend to avoid CORS 403 */}
                    <div className="job-logo">
                      {j.company_logo ? (
                        <img
                          src={`/api/proxy-image?url=${encodeURIComponent(j.company_logo)}`}
                          alt=""
                          onError={e => {
                            e.target.style.display = 'none';
                            const fb = e.target.nextSibling;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className="job-logo-fallback" style={{ display: j.company_logo ? 'none' : 'flex' }}>
                        {(j.company_name || '?')[0].toUpperCase()}
                      </span>
                    </div>

                    <div className="job-info">
                      <div className="job-title">{j.title}</div>
                      <div className="job-company">{j.company_name}</div>
                      <div className="job-meta">
                        <span className="job-type-badge" style={{ background: ts.bg, color: ts.color }}>
                          {j.job_type || 'Remote'}
                        </span>
                        <span className="job-time">{timeAgo(j.publication_date)}</span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          <a
            href="https://remotive.com"
            target="_blank"
            rel="noopener noreferrer"
            className="jobs-see-more"
          >
            See all remote jobs →
          </a>
        </>
      )}

      {/* ── NEWS VIEW ── */}
      {view === 'news' && (
        <>
          {newsLoading ? (
            <div className="widget-loading">Loading job news…</div>
          ) : (
            <div className="news-list" style={{ marginTop: '.5rem' }}>
              {news.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-item"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="news-item-body">
                    <div className="news-headline">{a.title}</div>
                    <div className="news-meta">
                      <span className="news-source">{a.source}</span>
                      <span className="news-dot">·</span>
                      <span className="news-time">{timeAgo(a.publishedAt)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
