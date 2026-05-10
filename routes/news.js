const router = require('express').Router();
const { protect } = require('../middleware/auth');

// GET /api/news?category=world
// Proxies to NewsData.io — avoids CORS on frontend
router.get('/', protect, async (req, res) => {
  const cat = req.query.category || 'world';

  // Map our tab names to newsdata.io categories
  const catMap = {
    world:      'world',
    technology: 'technology',
    business:   'business',
    science:    'science',
    health:     'health',
    sports:     'sports',
  };

  const apiCat = catMap[cat] || 'world';
  const key    = process.env.NEWS_API_KEY;

  if (!key || key.includes('3b9e3b9e')) {
    // No real key set — return placeholder so UI shows something
    return res.json({ articles: [] });
  }

  try {
    const url =
      `https://newsdata.io/api/1/news?apikey=${key}` +
      `&category=${apiCat}&language=en&size=8`;

    const response = await fetch(url);
    const data     = await response.json();

    if (data.status !== 'success') {
      return res.json({ articles: [] });
    }

    const articles = (data.results || []).map(a => ({
      title:       a.title,
      description: a.description,
      url:         a.link,
      source:      a.source_name || a.source_id,
      image:       a.image_url,
      publishedAt: a.pubDate,
      category:    a.category?.[0] || cat,
    }));

    res.json({ articles });
  } catch (err) {
    res.status(500).json({ articles: [] });
  }
});

module.exports = router;
