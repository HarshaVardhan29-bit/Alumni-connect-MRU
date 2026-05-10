const router = require('express').Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const pop = q => q
  .populate('author', 'firstName lastName role industry company designation batch avatar')
  .populate({ path: 'replyTo', populate: { path: 'author', select: 'firstName lastName avatar' } });

const emitNotif = async (req, notif) => {
  try {
    const saved = await Notification.create(notif);
    const populated = await Notification.findById(saved._id)
      .populate('sender', 'firstName lastName avatar')
      .populate('post', 'text');
    req.app.get('io')?.to(`user_${notif.recipient}`).emit('notification', populated);
  } catch {}
};

// GET /api/posts — feed (For You: all posts)
router.get('/', protect, async (req, res) => {
  try {
    const posts = await pop(Post.find({ replyTo: null }).sort('-createdAt').limit(50));
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/posts/following — posts from users the current user follows
router.get('/following', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('following');
    const followingIds = me.following || [];
    if (followingIds.length === 0) return res.json([]);
    const posts = await pop(
      Post.find({ author: { $in: followingIds }, replyTo: null })
        .sort('-createdAt')
        .limit(50)
    );
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/posts/trending — posts sorted by most likes
router.get('/trending', protect, async (req, res) => {
  try {
    const posts = await pop(
      Post.find({ replyTo: null })
        .sort('-createdAt')
        .limit(200)
    );
    // Sort by likes count descending
    posts.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    res.json(posts.slice(0, 50));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/posts/saved/list — MUST be before /:id
router.get('/saved/list', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedPosts',
      populate: { path: 'author', select: 'firstName lastName role industry company designation batch avatar' },
    });
    const posts = user.savedPosts || [];
    res.json(posts.slice().reverse());
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/posts/user/:userId
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const posts = await pop(Post.find({ author: req.params.userId, replyTo: null }).sort('-createdAt'));
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/posts/user/:userId/replies
router.get('/user/:userId/replies', protect, async (req, res) => {
  try {
    const replies = await pop(Post.find({ author: req.params.userId, replyTo: { $ne: null } }).sort('-createdAt').limit(50));
    res.json(replies);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/posts/:id — single post + replies
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await pop(Post.findById(req.params.id));
    if (!post) return res.status(404).json({ message: 'Not found' });
    const replies = await pop(Post.find({ replyTo: req.params.id }).sort('createdAt'));
    res.json({ post, replies });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/posts — create post or reply
router.post('/', protect, async (req, res) => {
  try {
    const { text, replyTo, media } = req.body;
    const post = await Post.create({ author: req.user._id, text, replyTo: replyTo || null, media: media || [] });
    if (replyTo) {
      await Post.findByIdAndUpdate(replyTo, { $push: { replies: post._id } });
      const parent = await Post.findById(replyTo);
      if (parent && String(parent.author) !== String(req.user._id)) {
        await emitNotif(req, {
          recipient: parent.author, sender: req.user._id,
          type: 'comment', post: replyTo,
          message: `${req.user.firstName} replied to your post`,
        });
      }
    }
    const populated = await pop(Post.findById(post._id));
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/posts/:id/save — toggle save/unsave
router.put('/:id/save', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.savedPosts) user.savedPosts = [];
    const isSaved = user.savedPosts.map(String).includes(String(req.params.id));
    if (isSaved) user.savedPosts.pull(req.params.id);
    else         user.savedPosts.push(req.params.id);
    await user.save();
    res.json({ saved: !isSaved });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/posts/:id/like
router.put('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const liked = post.likes.map(String).includes(String(req.user._id));
    if (liked) post.likes.pull(req.user._id);
    else {
      post.likes.push(req.user._id);
      if (String(post.author) !== String(req.user._id)) {
        await emitNotif(req, {
          recipient: post.author, sender: req.user._id,
          type: 'like', post: post._id,
          message: `${req.user.firstName} liked your post`,
        });
      }
    }
    await post.save();
    // Broadcast real-time like update to all connected clients
    req.app.get('io')?.emit('post:liked', {
      postId: post._id,
      likes: post.likes.length,
      liked: !liked,
      userId: req.user._id,
    });
    res.json({ likes: post.likes.length, liked: !liked });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/posts/:id/retweet
router.put('/:id/retweet', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const retweeted = post.retweets.map(String).includes(String(req.user._id));
    if (retweeted) post.retweets.pull(req.user._id);
    else {
      post.retweets.push(req.user._id);
      if (String(post.author) !== String(req.user._id)) {
        await emitNotif(req, {
          recipient: post.author, sender: req.user._id,
          type: 'retweet', post: post._id,
          message: `${req.user.firstName} reposted your post`,
        });
      }
    }
    await post.save();
    // Broadcast real-time retweet update
    req.app.get('io')?.emit('post:retweeted', {
      postId: post._id,
      retweets: post.retweets.length,
      retweeted: !retweeted,
      userId: req.user._id,
    });
    res.json({ retweets: post.retweets.length, retweeted: !retweeted });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/posts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });
    if (post.author.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    if (post.replyTo) await Post.findByIdAndUpdate(post.replyTo, { $pull: { replies: post._id } });
    await Post.deleteMany({ replyTo: post._id });
    await post.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
