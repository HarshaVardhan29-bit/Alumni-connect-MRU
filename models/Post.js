const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:     { type: String, default: '', maxlength: 280 },
  media:    [{
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    url:  { type: String },
  }],
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  retweets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replyTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  replies:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
