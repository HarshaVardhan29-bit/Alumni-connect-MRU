/**
 * Trending Score Recalculator
 * 
 * Runs every 30 minutes to update post scores for trending feed.
 * Score formula: (likes*3 + retweets*5 + replies*2 + views*0.1) * recencyDecay
 * Recency decay: exponential decay over 48 hours
 * 
 * In production: replace with a proper job queue (BullMQ/Agenda)
 */

const Post = require('../models/Post');

let recalcTimer = null;

function calcScore(post) {
  const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / 3600000;
  const recency  = Math.exp(-ageHours / 48); // half-life ~33h
  const engagement = (
    (post.likesCount    || 0) * 3 +
    (post.retweetsCount || 0) * 5 +
    (post.repliesCount  || 0) * 2 +
    (post.viewsCount    || 0) * 0.1
  );
  return engagement * recency;
}

async function recalculateScores() {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000); // last 7 days
    const posts = await Post.find({
      createdAt: { $gte: cutoff },
      replyTo: null,
      deletedAt: null,
    }).select('likesCount retweetsCount repliesCount viewsCount createdAt').lean();

    if (posts.length === 0) return;

    const bulkOps = posts.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { score: calcScore(p) } },
      }
    }));

    await Post.bulkWrite(bulkOps, { ordered: false });
    console.log(`[Score] Recalculated ${posts.length} post scores`);
  } catch (err) {
    console.error('[Score] Recalculation error:', err.message);
  }
}

function startScoreRecalculator() {
  // Run immediately on start
  recalculateScores();
  // Then every 30 minutes
  recalcTimer = setInterval(recalculateScores, 30 * 60 * 1000);
  console.log('[Score] Recalculator started (every 30 min)');
}

function stopScoreRecalculator() {
  if (recalcTimer) {
    clearInterval(recalcTimer);
    recalcTimer = null;
  }
}

module.exports = { startScoreRecalculator, stopScoreRecalculator, recalculateScores };
