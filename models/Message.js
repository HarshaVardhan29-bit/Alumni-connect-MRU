const mongoose = require('mongoose');

// Production-grade message schema with status lifecycle
// pending → sent → delivered → seen
const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentorship', required: true, index: true },
  sender:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text:           { type: String, default: '', trim: true, maxlength: 4000 },
  type:           { type: String, enum: ['text', 'call', 'file', 'voice', 'image', 'video', 'system'], default: 'text' },

  // WhatsApp-style message status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'seen'],
    default: 'sent',
    index: true,
  },

  // Attachment — URL only (no base64 in DB)
  attachment: {
    url:          { type: String },
    thumbnailUrl: { type: String },   // for images/videos
    name:         { type: String },
    size:         { type: Number },
    mimeType:     { type: String },
    duration:     { type: Number },   // voice/video seconds
    width:        { type: Number },   // image/video dimensions
    height:       { type: Number },
  },

  // Call metadata
  callMeta: {
    callType: { type: String, enum: ['audio', 'video'] },
    status:   { type: String, enum: ['ended', 'missed', 'rejected', 'busy'] },
    duration: { type: Number, default: 0 },
  },

  // Reply threading
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

  // Reactions
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji:  { type: String },
    _id: false,
  }],

  // Soft delete
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedAt:  { type: Date, default: null },

  // Client-generated ID for deduplication
  clientMsgId: { type: String, index: true, sparse: true },

}, { timestamps: true });

// Compound indexes for efficient pagination
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, _id: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ clientMsgId: 1 }, { unique: true, sparse: true });

// Backward compat alias
messageSchema.virtual('mentorship').get(function() { return this.conversationId; });

module.exports = mongoose.model('Message', messageSchema);
