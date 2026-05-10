const mongoose = require('mongoose');

const messageRequestSchema = new mongoose.Schema({
  from:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, trim: true },
  status:    { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
}, { timestamps: true });

// One pending request per pair
messageRequestSchema.index({ from: 1, to: 1 }, { unique: true });

module.exports = mongoose.model('MessageRequest', messageRequestSchema);
