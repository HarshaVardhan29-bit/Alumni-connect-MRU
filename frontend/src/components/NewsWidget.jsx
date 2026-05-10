import { useEffect, useState } from 'react';
import api from '../api/axios';

const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const CAT_ICON = {
  world: '🌐', technology: '💻', business: '💼', science: '🔬',
};

// Fallback curated headlines shown when API key not configured
const FALLBACK = {
  world: [
    { title: 'UN Security Council holds emergency session on global ceasefire', source: 'Reuters', publishedAt: new Date(Date.now() - 3600000).toISOString(), url: 'https://reuters.com' },
    { title: 'G7 leaders agree on new climate finance framework', source: 'BBC News', publishedAt: new Date(Date.now() - 7200000).toISOString(), url: 'https://bbc.com' },
    { title: 'WHO declares end to mpox public health emergency', source: 'AP News', publishedAt: new Date(Date.now() - 10800000).toISOString(), url: 'https://apnews.com' },
    { title: 'India-US trade deal negotiations enter final stage', source: 'The Hindu', publishedAt: new Date(Date.now() - 14400000).toISOString(), url: 'https://thehindu.com' },
  ],
  technology: [
    { title: 'OpenAI releases GPT-5 with multimodal reasoning capabilities', source: 'TechCrunch', publishedAt: new Date(Date.now() - 3600000).toISOString(), url: 'https://techcrunch.com' },
    { title: 'Apple announces Vision Pro 2 with improved battery life', source: 'The Verge', publishedAt: new Date(Date.now() - 7200000).toISOString(), url: 'https://theverge.com' },
    { title: 'Google DeepMind achieves new protein folding breakthrough', source: 'Wired', publishedAt: new Date(Date.now() - 10800000).toISOString(), url: 'https://wired.com' },
    { title: 'Meta launches open-source AI model for edge devices', source: 'Ars Technica', publishedAt: new Date(Date.now() - 18000000).toISOString(), url: 'https://arstechnica.com' },
  ],
  business: [
    { title: 'Sensex crosses 82,000 mark amid strong FII inflows', source: 'Economic Times', publishedAt: new Date(Date.now() - 3600000).toISOString(), url: 'https://economictimes.com' },
    { title: 'Reliance Industries reports record quarterly profit', source: 'Mint', publishedAt: new Date(Date.now() - 7200000).toISOString(), url: 'https://livemint.com' },
    { title: 'RBI holds repo rate steady at 6.5% for third consecutive meeting', source: 'Business Standard', publishedAt: new Date(Date.now() - 10800000).toISOString(), url: 'https://business-standard.com' },
    { title: 'Startup funding in India rises 40% year-on-year in Q1 2026', source: 'Inc42', publishedAt: new Date(Date.now() - 18000000).toISOString(), url: 'https://inc42.com' },
  ],
  science: [
    { title: 'NASA Artemis crew completes first lunar surface EVA', source: 'NASA', publishedAt: new Date(Date.now() - 3600000).toISOString(), url: 'https://nasa.gov' },
    { title: 'Scientists discover new exoplanet in habitable zone of nearby star', source: 'Nature', publishedAt: new Date(Date.now() - 7200000).toISOString(), url: 'https://nature.com' },
    { title: 'ISRO successfully tests reusable launch vehicle engine', source: 'ISRO', publishedAt: new Date(Date.now() - 10800000).toISOString(), url: 'https://isro.gov.in' },
    { title: 'New CRISPR technique enables precise gene editing in living cells', source: 'Science', publishedAt: new Date(Date.now() - 18000000).toISOString(), url: 'https://science.org' },
  ],
};

export default function NewsWidget() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('world');
  const [isFallback, setIsFallback] = useState(false);

  const TABS = ['world', 'technology', 'business', 'science'];

  useEffect(() => {
    setLoading(true);
    api.get(`/news?category=${tab}`)
      .then(res => {
        if (res.data.articles?.length > 0) {
          setArticles(res.data.articles);
          setIsFallback(false);
        } else {
          // No API key or empty — use fallback
          setArticles(FALLBACK[tab]);
          setIsFallback(true);
        }
      })
      .catch(() => {
        setArticles(FALLBACK[tab]);
        setIsFallback(true);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="feed-right-card news-widget">
      <div className="feed-right-title">📰 Today's News</div>

      {/* Tabs */}
      <div className="news-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`news-tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {CAT_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="widget-loading">Loading news…</div>
      ) : (
        <div className="news-list">
          {articles.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-item"
              onClick={e => e.stopPropagation()}
            >
              {a.image && (
                <img
                  src={a.image}
                  alt=""
                  className="news-thumb"
                  onError={e => e.target.style.display = 'none'}
                />
              )}
              <div className="news-item-body">
                <div className="news-headline">{a.title}</div>
                <div className="news-meta">
                  <span className="news-source">{a.source}</span>
                  {a.publishedAt && <>
                    <span className="news-dot">·</span>
                    <span className="news-time">{timeAgo(a.publishedAt)}</span>
                  </>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="news-footer">
        {isFallback
          ? <>Add <code>NEWS_API_KEY</code> in <code>.env</code> for live news · <a href="https://newsdata.io" target="_blank" rel="noreferrer" style={{color:'#c9a84c'}}>Get free key</a></>
          : 'Live news via NewsData.io · Updates every visit'
        }
      </div>
    </div>
  );
}
