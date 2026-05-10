const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type:        { type: String, enum: ['group', 'community'], default: 'group' },
  creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  avatar:      { type: String, default: '' },
  isPublic:    { type: Boolean, default: true },
  joinCode:    { type: String, default: '' },
  requireApproval: { type: Boolean, default: false },
  joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  adminOnlyMessages: { type: Boolean, default: false }, // only admins can send messages
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
