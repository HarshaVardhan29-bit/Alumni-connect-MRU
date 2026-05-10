const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  admin:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  action:   { type: String, required: true }, // e.g. 'SUSPEND_USER', 'DELETE_USER'
  target:   { type: String },                 // userId or other target
  details:  { type: String },
  ip:       { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AdminLog', adminLogSchema);
