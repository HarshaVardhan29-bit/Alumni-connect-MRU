/**
 * Bookmark — separate collection
 * Replaces: user.savedPosts[] array
 */
const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
}, { timestamps: true });

bookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 }); // user's bookmarks feed

module.exports = mongoose.model('Bookmark', bookmarkSchema);
