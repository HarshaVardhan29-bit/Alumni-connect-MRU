const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  body:     { type: String, required: true },
  target:   { type: String, enum: ['all', 'student', 'alumni'], default: 'all' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  active:   { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
