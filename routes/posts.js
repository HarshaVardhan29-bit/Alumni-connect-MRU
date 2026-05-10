/**
 * Posts API — Production Grade
 * 
 * Architecture:
 * - Separate Like/Retweet/Bookmark collections (no arrays in Post)
 * - Atomic counter updates ($inc)
 * - Cursor pagination (no skip/offset)
 * - Targeted socket events (post author only, not broadcast)
 * - Feed ranking with engagement score
 * - No io.emit() — only io.to('user_X').emit()
 */

const router       = require('express').Router();
const Post         = require('../models/Post');
const Like         = require('../models/Like');
const Retweet      = require('../models/Retweet');
const Bookmark     = require('../models/Bookmark');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const { protect }  = require('../middleware/auth');
const { sendPushToUser } = require('../utils/pushNotification');
const { isUserOnline }   = require('../utils/socketManager');

const PAGE_SIZE = 20;

// ── Author population ─────────────────────────────────────────────
const authorSelect = 'firstName lastName role industry company designation batch avatar';
const pop = q => q
  .populate('author', authorSelect)
  .populate({ path: 'replyTo', select: 'text author', populate: { path: 'author', select: 'firstName lastName avatar' } });

// ── Enrich posts with viewer's like/retweet/bookmark status ──────
async function enrichPosts(posts, userId) {
  if (!posts.length) return posts;
  const postIds = posts.map(p => p._id || p);

  const [likes, retweets, bookmarks] = await Promise.all([
    Like.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
    Retweet.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
    Bookmark.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
  ]);

  const likedSet     = new Set(likes.map(l => String(l.postId)));
  const retweetedSet = new Set(retweets.map(r => String(r.postId)));
  const bookmarkedSet= new Set(bookmarks.map(b => String(b.postId)));

  return posts.map(p => {
    const id = String(p._id);
    return {
      ...p.toObject ? p.toObject() : p,
      liked:      likedSet.has(id),
      retweeted:  retweetedSet.has(id),
      bookmarked: bookmarkedSet.has(id),
      // Legacy compat fields for PostCard
      likes:    { length: p.likesCount || 0 },
      retweets: { length: p.retweetsCount || 0 },
      replies:  { length: p.repliesCount || 0 },
    };
  });
}

// ── Notification helper (targeted — no broadcast) ────────────────
async function emitNotif(req, notif) {
  try {
    const saved = await Notification.create(notif);
    const populated = await Notification.findById(saved._id)
      .populate('sender', 'firstName lastName avatar')
      .populate('post', 'text');

    // Only emit to the recipient's personal room
    req.app.get('io')?.to(`user_${notif.recipient}`).emit('notification', populated);

    // Push only if offline
    if (!isUserOnline(notif.recipient)) {
      const urlMap = {
        like:    `/post/${notif.post}`,
        comment: `/post/${notif.post}`,
        retweet: `/post/${notif.post}`,
        follow:  `/profile/${notif.sender}`,
      };
      await sendPushToUser(notif.recipient, {
        title: 'MRU Connect',
        body:  notif.message,
        url:   urlMap[notif.type] || '/feed',
        type:  notif.type,
      });
    }
  } catch {}
}

// ── Recalculate post score ────────────────────────────────────────
function calcScore(post) {
  const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / 3600000;
  const recency  = Math.exp(-ageHours / 48); // decay over 48h
  return (
    (post.likesCount    || 0) * 3 +
    (post.retweetsCount || 0) * 5 +
    (post.repliesCount  || 0) * 2 +
    (post.viewsCount    || 0) * 0.1
  ) * recency;
}

// ── GET /api/posts — For You feed (cursor paginated) ─────────────
// ?cursor=<postId>  — load posts older than this ID
// ?limit=20
router.get('/', protect, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
    const cursor = req.query.cursor;

    let query = { replyTo: null };
    if (cursor) {
      const pivot = await Post.findById(cursor).select('createdAt').lean();
      if (pivot) query.createdAt = { $lt: pivot.createdAt };
    }

    const posts = await pop(Post.find(query).sort({ createdAt: -1 }).limit(limit));
    const enriched = await enrichPosts(posts, req.user._id);

    res.json({
      posts: enriched,
      nextCursor: enriched.length === limit ? enriched[enriched.length - 1]._id : null,
      hasMore: enriched.length === limit,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/posts/following — Following feed ────────────────────
router.get('/following', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('following').lean();
    const followingIds = me.following || [];
    if (followingIds.length === 0) return res.json({ posts: [], nextCursor: null, hasMore: false });

    const limit  = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
    const cursor = req.query.cursor;

    let query = { author: { $in: followingIds }, replyTo: null };
    if (cursor) {
      const pivot = await Post.findById(cursor).select('createdAt').lean();
      if (pivot) query.createdAt = { $lt: pivot.createdAt };
    }

    const posts = await pop(Post.find(query).sort({ createdAt: -1 }).limit(limit));
    const enriched = await enrichPosts(posts, req.user._id);

    res.json({
      posts: enriched,
      nextCursor: enriched.length === limit ? enriched[enriched.length - 1]._id : null,
      hasMore: enriched.length === limit,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/posts/trending — Trending feed (by score) ───────────
router.get('/trending', protect, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
    const cursor = req.query.cursor;

    // Use pre-calculated score field — no expensive in-memory sort
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000); // last 7 days
    let query = { replyTo: null, createdAt: { $gte: cutoff } };

    if (cursor) {
      const pivot = await Post.findById(cursor).select('score').lean();
      if (pivot) query.score = { $lt: pivot.score };
    }

    const posts = await pop(Post.find(query).sort({ score: -1, createdAt: -1 }).limit(limit));
    const enriched = await enrichPosts(posts, req.user._id);

    res.json({
      posts: enriched,
      nextCursor: enriched.length === limit ? enriched[enriched.length - 1]._id : null,
      hasMore: enriched.length === limit,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/posts/bookmarks — User's bookmarks ──────────────────
router.get('/bookmarks', protect, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
    const cursor = req.query.cursor;

    let bmQuery = { userId: req.user._id };
    if (cursor) {
      const pivot = await Bookmark.findById(cursor).select('createdAt').lean();
      if (pivot) bmQuery.createdAt = { $lt: pivot.createdAt };
    }

    const bookmarks = await Bookmark.find(bmQuery).sort({ createdAt: -1 }).limit(limit).lean();
    const postIds = bookmarks.map(b => b.postId);
    const posts = await pop(Post.find({ _id: { $in: postIds } }));

    // Maintain bookmark order
    const postMap = new Map(posts.map(p => [String(p._id), p]));
    const ordered = postIds.map(id => postMap.get(String(id))).filter(Boolean);
    const enriched = await enrichPosts(ordered, req.user._id);

    res.json({
      posts: enriched,
      nextCursor: bookmarks.length === limit ? bookmarks[bookmarks.length - 1]._id : null,
      hasMore: bookmarks.length === limit,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/posts/saved/list — legacy alias ─────────────────────
router.get('/saved/list', protect, async (req, res) => {
  req.url = '/bookmarks';
  return router.handle(req, res, () => {});
});

// ── GET /api/posts/user/:userId — user's posts ───────────────────
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
    const cursor = req.query.cursor;

    let query = { author: req.params.userId, replyTo: null };
    if (cursor) {
      const pivot = await Post.findById(cursor).select('createdAt').lean();
      if (pivot) query.createdAt = { $lt: pivot.createdAt };
    }

    const posts = await pop(Post.find(query).sort({ createdAt: -1 }).limit(limit));
    const enriched = await enrichPosts(posts, req.user._id);

    res.json({
      posts: enriched,
      nextCursor: enriched.length === limit ? enriched[enriched.length - 1]._id : null,
      hasMore: enriched.length === limit,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/posts/user/:userId/replies ──────────────────────────
router.get('/user/:userId/replies', protect, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
    const cursor = req.query.cursor;

    let query = { author: req.params.userId, replyTo: { $ne: null } };
    if (cursor) {
      const pivot = await Post.findById(cursor).select('createdAt').lean();
      if (pivot) query.createdAt = { $lt: pivot.createdAt };
    }

    const posts = await pop(Post.find(query).sort({ createdAt: -1 }).limit(limit));
    const enriched = await enrichPosts(posts, req.user._id);

    res.json({
      posts: enriched,
      nextCursor: enriched.length === limit ? enriched[enriched.length - 1]._id : null,
      hasMore: enriched.length === limit,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/posts/:id — single post + replies ───────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await pop(Post.findById(req.params.id));
    if (!post) return res.status(404).json({ message: 'Not found' });

    // Increment view count (fire and forget)
    Post.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } }).exec();

    const replies = await pop(
      Post.find({ replyTo: req.params.id }).sort({ createdAt: 1 }).limit(50)
    );

    const [enrichedPost, enrichedReplies] = await Promise.all([
      enrichPosts([post], req.user._id),
      enrichPosts(replies, req.user._id),
    ]);

    res.json({ post: enrichedPost[0], replies: enrichedReplies });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/posts — create post or reply ───────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { text, replyTo, media, location } = req.body;

    const post = await Post.create({
      author:   req.user._id,
      text:     text || '',
      replyTo:  replyTo || null,
      media:    media || [],
      location: location || undefined,
    });

    // If reply — increment parent's repliesCount atomically
    if (replyTo) {
      await Post.findByIdAndUpdate(replyTo, { $inc: { repliesCount: 1 } });
      const parent = await Post.findById(replyTo).select('author').lean();
      if (parent && String(parent.author) !== String(req.user._id)) {
        await emitNotif(req, {
          recipient: parent.author,
          sender:    req.user._id,
          type:      'comment',
          post:      replyTo,
          message:   `${req.user.firstName} replied to your post`,
        });
      }
    }

    const populated = await pop(Post.findById(post._id));
    const enriched  = await enrichPosts([populated], req.user._id);

    // Emit new post to author's followers (targeted, not broadcast)
    // In production this would be a background job (fanout)
    const io = req.app.get('io');
    if (io && !replyTo) {
      const me = await User.findById(req.user._id).select('followers').lean();
      (me.followers || []).forEach(followerId => {
        io.to(`user_${followerId}`).emit('post:new', enriched[0]);
      });
    }

    res.status(201).json(enriched[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT /api/posts/:id/like — toggle like ────────────────────────
router.put('/:id/like', protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    // Check existing like
    const existing = await Like.findOne({ userId, postId });

    if (existing) {
      // Unlike
      await existing.deleteOne();
      await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
      return res.json({ liked: false, likes: await Post.findById(postId).select('likesCount').then(p => p?.likesCount || 0) });
    }

    // Like — upsert to prevent race conditions
    await Like.create({ userId, postId });
    const updated = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).select('likesCount author');

    // Notify post author (targeted — NOT broadcast)
    if (updated && String(updated.author) !== String(userId)) {
      await emitNotif(req, {
        recipient: updated.author,
        sender:    userId,
        type:      'like',
        post:      postId,
        message:   `${req.user.firstName} liked your post`,
      });
    }

    // Emit counter update ONLY to users currently viewing this post
    // (via optional post viewer room — not global broadcast)
    req.app.get('io')?.to(`post_${postId}`).emit('post:liked', {
      postId,
      likes:  updated?.likesCount || 0,
      userId: String(userId),
    });

    res.json({ liked: true, likes: updated?.likesCount || 0 });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate — already liked
      const post = await Post.findById(req.params.id).select('likesCount').lean();
      return res.json({ liked: true, likes: post?.likesCount || 0 });
    }
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/posts/:id/retweet — toggle retweet ──────────────────
router.put('/:id/retweet', protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { quote } = req.body;

    const existing = await Retweet.findOne({ userId, postId });

    if (existing) {
      await existing.deleteOne();
      await Post.findByIdAndUpdate(postId, { $inc: { retweetsCount: -1 } });
      return res.json({ retweeted: false, retweets: await Post.findById(postId).select('retweetsCount').then(p => p?.retweetsCount || 0) });
    }

    await Retweet.create({ userId, postId, quote: quote || '' });
    const updated = await Post.findByIdAndUpdate(
      postId,
      { $inc: { retweetsCount: 1 } },
      { new: true }
    ).select('retweetsCount author');

    if (updated && String(updated.author) !== String(userId)) {
      await emitNotif(req, {
        recipient: updated.author,
        sender:    userId,
        type:      'retweet',
        post:      postId,
        message:   `${req.user.firstName} reposted your post`,
      });
    }

    req.app.get('io')?.to(`post_${postId}`).emit('post:retweeted', {
      postId,
      retweets: updated?.retweetsCount || 0,
      userId:   String(userId),
    });

    res.json({ retweeted: true, retweets: updated?.retweetsCount || 0 });
  } catch (err) {
    if (err.code === 11000) {
      const post = await Post.findById(req.params.id).select('retweetsCount').lean();
      return res.json({ retweeted: true, retweets: post?.retweetsCount || 0 });
    }
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/posts/:id/save — toggle bookmark ────────────────────
router.put('/:id/save', protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const existing = await Bookmark.findOne({ userId, postId });

    if (existing) {
      await existing.deleteOne();
      await Post.findByIdAndUpdate(postId, { $inc: { bookmarksCount: -1 } });
      return res.json({ saved: false });
    }

    await Bookmark.create({ userId, postId });
    await Post.findByIdAndUpdate(postId, { $inc: { bookmarksCount: 1 } });
    res.json({ saved: true });
  } catch (err) {
    if (err.code === 11000) return res.json({ saved: true });
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/posts/:id ────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });
    if (String(post.author) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    // Soft delete
    await Post.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });

    // Decrement parent's reply count
    if (post.replyTo) {
      await Post.findByIdAndUpdate(post.replyTo, { $inc: { repliesCount: -1 } });
    }

    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/posts/:id/view — track view ────────────────────────
router.post('/:id/view', protect, async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
});

// ── Background: recalculate trending scores ──────────────────────
// Called by a cron job or on-demand
router.post('/admin/recalculate-scores', protect, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const posts = await Post.find({ createdAt: { $gte: cutoff }, replyTo: null })
      .select('likesCount retweetsCount repliesCount viewsCount createdAt')
      .lean();

    const bulkOps = posts.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { score: calcScore(p) } },
      }
    }));

    if (bulkOps.length > 0) await Post.bulkWrite(bulkOps);
    res.json({ updated: bulkOps.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
