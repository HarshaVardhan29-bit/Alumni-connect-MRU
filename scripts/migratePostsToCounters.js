/**
 * Migration: Convert Post arrays to counter fields + separate collections
 * 
 * Run once: node scripts/migratePostsToCounters.js
 * 
 * What it does:
 * 1. For each post with likes[] array → create Like documents + set likesCount
 * 2. For each post with retweets[] array → create Retweet documents + set retweetsCount
 * 3. For each post with replies[] array → set repliesCount from array length
 * 4. For each user with savedPosts[] → create Bookmark documents
 * 5. Recalculate scores for all posts
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Migration] Connected to MongoDB');

  const Post     = require('../models/Post');
  const Like     = require('../models/Like');
  const Retweet  = require('../models/Retweet');
  const Bookmark = require('../models/Bookmark');
  const User     = require('../models/User');

  // ── 1. Migrate likes ──────────────────────────────────────────
  console.log('[Migration] Migrating likes...');
  const postsWithLikes = await mongoose.connection.db.collection('posts')
    .find({ likes: { $exists: true, $not: { $size: 0 } } })
    .toArray();

  let likeCount = 0;
  for (const post of postsWithLikes) {
    const likes = post.likes || [];
    if (likes.length === 0) continue;

    const likeDocs = likes.map(userId => ({
      userId: new mongoose.Types.ObjectId(userId),
      postId: post._id,
      createdAt: post.createdAt || new Date(),
      updatedAt: post.createdAt || new Date(),
    }));

    try {
      await Like.insertMany(likeDocs, { ordered: false });
    } catch (e) {
      // Ignore duplicate key errors
      if (e.code !== 11000) console.error('Like insert error:', e.message);
    }

    await Post.findByIdAndUpdate(post._id, { likesCount: likes.length });
    likeCount += likes.length;
  }
  console.log(`[Migration] Migrated ${likeCount} likes`);

  // ── 2. Migrate retweets ───────────────────────────────────────
  console.log('[Migration] Migrating retweets...');
  const postsWithRetweets = await mongoose.connection.db.collection('posts')
    .find({ retweets: { $exists: true, $not: { $size: 0 } } })
    .toArray();

  let rtCount = 0;
  for (const post of postsWithRetweets) {
    const retweets = post.retweets || [];
    if (retweets.length === 0) continue;

    const rtDocs = retweets.map(userId => ({
      userId: new mongoose.Types.ObjectId(userId),
      postId: post._id,
      createdAt: post.createdAt || new Date(),
      updatedAt: post.createdAt || new Date(),
    }));

    try {
      await Retweet.insertMany(rtDocs, { ordered: false });
    } catch (e) {
      if (e.code !== 11000) console.error('Retweet insert error:', e.message);
    }

    await Post.findByIdAndUpdate(post._id, { retweetsCount: retweets.length });
    rtCount += retweets.length;
  }
  console.log(`[Migration] Migrated ${rtCount} retweets`);

  // ── 3. Migrate reply counts ───────────────────────────────────
  console.log('[Migration] Migrating reply counts...');
  const postsWithReplies = await mongoose.connection.db.collection('posts')
    .find({ replies: { $exists: true, $not: { $size: 0 } } })
    .toArray();

  for (const post of postsWithReplies) {
    await Post.findByIdAndUpdate(post._id, { repliesCount: (post.replies || []).length });
  }
  console.log(`[Migration] Updated ${postsWithReplies.length} reply counts`);

  // ── 4. Migrate bookmarks from User.savedPosts ─────────────────
  console.log('[Migration] Migrating bookmarks...');
  const usersWithSaved = await mongoose.connection.db.collection('users')
    .find({ savedPosts: { $exists: true, $not: { $size: 0 } } })
    .toArray();

  let bmCount = 0;
  for (const user of usersWithSaved) {
    const saved = user.savedPosts || [];
    if (saved.length === 0) continue;

    const bmDocs = saved.map(postId => ({
      userId: user._id,
      postId: new mongoose.Types.ObjectId(postId),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    try {
      await Bookmark.insertMany(bmDocs, { ordered: false });
    } catch (e) {
      if (e.code !== 11000) console.error('Bookmark insert error:', e.message);
    }
    bmCount += saved.length;
  }
  console.log(`[Migration] Migrated ${bmCount} bookmarks`);

  // ── 5. Recalculate scores ─────────────────────────────────────
  console.log('[Migration] Recalculating scores...');
  const { recalculateScores } = require('../utils/scoreRecalculator');
  await recalculateScores();
  console.log('[Migration] Scores recalculated');

  // ── 6. Create indexes ─────────────────────────────────────────
  console.log('[Migration] Ensuring indexes...');
  await Like.createIndexes();
  await Retweet.createIndexes();
  await Bookmark.createIndexes();
  await Post.createIndexes();
  console.log('[Migration] Indexes created');

  console.log('[Migration] ✅ Complete!');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('[Migration] Fatal error:', err);
  process.exit(1);
});
