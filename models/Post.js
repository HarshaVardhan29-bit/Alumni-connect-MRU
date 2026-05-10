const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:     { type: String, default: '', maxlength: 280 },
  media:    [{
    type: { type: String, enum: ['image', 'video', 'gif'], default: 'image' },
    url:  { type: String },
  }],
  location: {
    city: { type: String },
    lat:  { type: Number },
    lon:  { type: Number },
  },
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  retweets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replyTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  replies:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
