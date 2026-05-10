/**
 * Retweet — separate collection
 * Replaces: post.retweets[] array
 */
const mongoose = require('mongoose');

const retweetSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  quote:   { type: String, default: '' }, // for quote retweets
}, { timestamps: true });

retweetSchema.index({ userId: 1, postId: 1 }, { unique: true });
retweetSchema.index({ postId: 1, createdAt: -1 });
retweetSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Retweet', retweetSchema);
