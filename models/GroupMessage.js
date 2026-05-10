const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  group:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:   { type: String, default: '' },
  type:   { type: String, enum: ['text', 'file', 'voice', 'image', 'video', 'system'], default: 'text' },
  attachment: {
    url:      { type: String },
    name:     { type: String },
    size:     { type: Number },
    mimeType: { type: String },
    duration: { type: Number },
  },
  replyTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'GroupMessage', default: null },
  reactions: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
  pinned:   { type: Boolean, default: false },
  edited:   { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
