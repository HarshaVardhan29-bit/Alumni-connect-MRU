/**
 * Like — separate collection for scalable like tracking
 * Replaces: post.likes[] array
 */
const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
}, { timestamps: true });

// Unique constraint — one like per user per post
likeSchema.index({ userId: 1, postId: 1 }, { unique: true });
likeSchema.index({ postId: 1, createdAt: -1 }); // who liked a post
likeSchema.index({ userId: 1, createdAt: -1 }); // posts a user liked

module.exports = mongoose.model('Like', likeSchema);
