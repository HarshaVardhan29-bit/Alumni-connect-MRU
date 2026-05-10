const mongoose = require('mongoose');

// Production conversation schema — maintains sidebar state server-side
const mentorshipSchema = new mongoose.Schema({
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  alumni:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:     { type: String, enum: ['pending', 'accepted', 'declined', 'completed'], default: 'pending' },
  message:    { type: String, default: '' },
  matchScore: { type: Number, default: 0 },
  sessions:   { type: Number, default: 0 },
  isDirect:   { type: Boolean, default: false },

  // ── Sidebar state (maintained by backend) ──
  lastMessage: {
    _id:       { type: mongoose.Schema.Types.ObjectId },
    text:      { type: String, default: '' },
    type:      { type: String, default: 'text' },
    sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date },
  },

  // Per-user unread counts — backend is source of truth
  unreadCounts: {
    type: Map,
    of: Number,
    default: {},
  },

  // Pinned / archived per user
  pinnedBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });

// Indexes for efficient queries
mentorshipSchema.index({ student: 1, status: 1 });
mentorshipSchema.index({ alumni: 1, status: 1 });
mentorshipSchema.index({ updatedAt: -1 });
mentorshipSchema.index({ student: 1, alumni: 1 }, { unique: true });

module.exports = mongoose.model('Mentorship', mentorshipSchema);
