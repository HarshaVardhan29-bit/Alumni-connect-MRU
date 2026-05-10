const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  mentorship: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentorship', required: true },
  sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:       { type: String, default: '', trim: true },
  type:       { type: String, enum: ['text', 'call', 'file', 'voice', 'image', 'video'], default: 'text' },
  // For file/image/video/voice attachments — stored as base64 or URL
  attachment: {
    url:      { type: String },   // base64 data URL or hosted URL
    name:     { type: String },   // original filename
    size:     { type: Number },   // bytes
    mimeType: { type: String },
    duration: { type: Number },   // for voice/video in seconds
  },
  callMeta: {
    callType: { type: String, enum: ['audio', 'video'] },
    status:   { type: String, enum: ['ended', 'missed', 'rejected'] },
    duration: { type: Number, default: 0 },
  },
  read: { type: Boolean, default: false },
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji:  { type: String },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
