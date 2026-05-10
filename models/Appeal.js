const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, maxlength: 500 },
    status:  { type: String, enum: ['pending', 'reviewed'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appeal', appealSchema);
