const mongoose = require('mongoose');

const mentorshipSchema = new mongoose.Schema({
  student:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  alumni:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:   { type: String, enum: ['pending', 'accepted', 'declined', 'completed'], default: 'pending' },
  message:  { type: String, default: '' },
  matchScore: { type: Number, default: 0 },
  sessions: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Mentorship', mentorshipSchema);
