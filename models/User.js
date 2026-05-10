const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    password:  { type: String, default: null, minlength: 6 },
    googleId:  { type: String, default: null }, // Google OAuth
    role:      { type: String, enum: ['student', 'alumni', 'faculty'], default: 'student' },
    industry:  { type: String, default: '' },
    // Alumni-specific
    batch:       { type: String, default: '' },
    company:     { type: String, default: '' },
    designation: { type: String, default: '' },
    skills:      [{ type: String }],
    bio:         { type: String, default: '' },
    // Student-specific
    careerGoals:    { type: String, default: '' },
    targetIndustry: { type: String, default: '' },
    // Matching
    matchScore: { type: Number, default: 0 },
    isActive:   { type: Boolean, default: true },
    status:     { type: String, enum: ['active', 'suspended'], default: 'active' },
    // Avatar (base64 data URL or external URL)
    avatar: { type: String, default: '' },
    // Cover photo
    cover:  { type: String, default: '' },
    // OTP for password reset
    resetOtp:        { type: String, default: null },
    resetOtpExpiry:  { type: Date,   default: null },
    // Social links
    social: {
      linkedin:  { type: String, default: '' },
      github:    { type: String, default: '' },
      twitter:   { type: String, default: '' },
      portfolio: { type: String, default: '' },
    },
    // Follow system
    following:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // pending follow requests
    // Saved posts
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    // Privacy settings
    isPrivate: { type: Boolean, default: false }, // private account requires follow approval
    allowMessageRequests: { type: Boolean, default: true }, // allow messages from non-followers
    allowTagging: { type: Boolean, default: true },
    showActivity: { type: Boolean, default: true },
    allowMessages: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true },
    // Notification settings
    notificationSettings: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true }
    },
    // Account management
    phone: { type: String, default: '' },
    username: { type: String, default: '' },
    deactivatedAt: { type: Date, default: null },
    // FCM tokens — one per device, used for push notifications
    fcmTokens: [{ type: String }],
    // Legacy Web Push subscriptions (kept for migration, no longer used)
    pushSubscriptions: [{
      endpoint:  { type: String },
      expirationTime: { type: Number, default: null },
      keys: {
        p256dh: { type: String },
        auth:   { type: String },
      },
    }],
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
