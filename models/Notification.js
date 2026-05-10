const mongoose = require('mongoose');

const notifSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['like', 'comment', 'retweet', 'mentorship_request', 'mentorship_accepted', 'follow', 'missed_call'], required: true },
  post:      { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  read:      { type: Boolean, default: false },
  message:   { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notifSchema);
