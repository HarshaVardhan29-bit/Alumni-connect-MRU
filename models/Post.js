/**
 * Post Schema — Production Grade
 * 
 * Key changes from naive schema:
 * - NO likes[], retweets[], replies[] arrays (unbounded growth)
 * - Counter fields instead (likesCount, retweetsCount, repliesCount)
 * - Engagement score for feed ranking
 * - Cursor pagination support via _id + createdAt indexes
 * - Soft delete support
 */
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text:     { type: String, default: '', maxlength: 500, trim: true },
  media:    [{
    type:         { type: String, enum: ['image', 'video', 'gif'], default: 'image' },
    url:          { type: String },
    thumbnailUrl: { type: String },
    width:        { type: Number },
    height:       { type: Number },
    duration:     { type: Number }, // video seconds
  }],
  location: {
    city: { type: String },
    lat:  { type: Number },
    lon:  { type: Number },
  },

  // ── Counter fields (no arrays) ──
  likesCount:     { type: Number, default: 0, min: 0 },
  retweetsCount:  { type: Number, default: 0, min: 0 },
  repliesCount:   { type: Number, default: 0, min: 0 },
  bookmarksCount: { type: Number, default: 0, min: 0 },
  viewsCount:     { type: Number, default: 0, min: 0 },

  // ── Feed ranking score (recalculated periodically) ──
  // score = (likes*3 + retweets*5 + replies*2 + views*0.1) * recencyDecay
  score: { type: Number, default: 0, index: true },

  // ── Reply threading ──
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null, index: true },

  // ── Visibility ──
  visibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },

  // ── Soft delete ──
  deletedAt: { type: Date, default: null },

}, { timestamps: true });

// ── Indexes for efficient queries ──
postSchema.index({ author: 1, createdAt: -1 });           // profile posts
postSchema.index({ replyTo: 1, createdAt: 1 });           // replies to a post
postSchema.index({ createdAt: -1 });                       // chronological feed
postSchema.index({ score: -1, createdAt: -1 });            // ranked feed
postSchema.index({ deletedAt: 1 });                        // filter deleted
postSchema.index({ author: 1, replyTo: 1, createdAt: -1 }); // user replies

// Text index for search
postSchema.index({ text: 'text' });

// Filter deleted posts by default
postSchema.pre(/^find/, function() {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
});

module.exports = mongoose.model('Post', postSchema);
