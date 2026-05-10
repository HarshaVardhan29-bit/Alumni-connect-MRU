const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require('../utils/passport');
const User = require('../models/User');
const Appeal = require('../models/Appeal');
const { sendOtp } = require('../utils/mailer');
const admin = require('../utils/firebaseAdmin');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// ── GOOGLE OAUTH ──

// Step 1: Redirect to Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/login?error=google_failed` }),
  (req, res) => {
    const user = req.user;
    const token = signToken(user._id);
    const payload = encodeURIComponent(JSON.stringify({
      token,
      user: {
        _id: user._id, id: user._id,
        firstName: user.firstName, lastName: user.lastName,
        email: user.email, role: user.role,
        avatar: user.avatar || '',
      },
    }));
    // Redirect to frontend with token in query param
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/auth/google/success?data=${payload}`);
  }
);

// ── FIREBASE GOOGLE AUTH ──
// POST /api/auth/firebase/google
// Frontend sends a Firebase ID token; we verify it, upsert the user, return our JWT.
router.post('/firebase/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Firebase ID token is required.' });

    // 1. Verify the token with Firebase Admin
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired Firebase token.' });
    }

    const { uid, email, name, picture } = decoded;
    if (!email) return res.status(400).json({ message: 'No email associated with this Google account.' });

    const nameParts = (name || 'User').split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName  = nameParts.slice(1).join(' ') || '';

    // 2. Find existing user by googleId (Firebase UID) or email
    let user = await User.findOne({ $or: [{ googleId: uid }, { email: email.toLowerCase() }] });
    let isNewUser = false;

    if (user) {
      // Link Firebase UID if they previously registered with email/password
      if (!user.googleId) {
        user.googleId = uid;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save({ validateBeforeSave: false });
      }
      // Block suspended accounts
      if (user.isActive === false || user.status === 'suspended') {
        return res.status(403).json({
          message: 'Your account has been suspended. Please contact support.',
          suspended: true,
        });
      }
    } else {
      // New user — create with default role "student" (frontend will update via /role endpoint)
      isNewUser = true;
      user = await User.create({
        googleId:  uid,
        firstName,
        lastName,
        email:     email.toLowerCase(),
        avatar:    picture || '',
        role:      'student',
        password:  null,
      });
    }

    // 3. Issue our own JWT (same shape as email/password login)
    const token = signToken(user._id);
    res.json({
      token,
      isNewUser,
      user: {
        _id:       user._id,
        id:        user._id,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        role:      user.role,
        avatar:    user.avatar || '',
      },
    });
  } catch (err) {
    console.error('Firebase Google auth error:', err.message);
    res.status(500).json({ message: 'Server error during Google sign-in.' });
  }
});

// PATCH /api/auth/firebase/google/role
// Called after new Google sign-up to save the chosen role
router.patch('/firebase/google/role', async (req, res) => {
  try {
    const { token, role } = req.body;
    if (!token || !role) return res.status(400).json({ message: 'Token and role are required.' });
    if (!['student', 'alumni', 'faculty'].includes(role))
      return res.status(400).json({ message: 'Invalid role.' });

    // Verify our own JWT to get userId
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ message: 'Invalid token.' }); }

    const user = await User.findByIdAndUpdate(
      decoded.id,
      { role },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json({
      user: {
        _id: user._id, id: user._id,
        firstName: user.firstName, lastName: user.lastName,
        email: user.email, role: user.role, avatar: user.avatar || '',
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, industry } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ firstName, lastName, email, password, role, industry });
    res.status(201).json({
      token: signToken(user._id),
      user: { _id: user._id, id: user._id, firstName, lastName, email, role, industry, avatar: user.avatar || '' },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with this email.' });
    if (!(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });

    // Block suspended accounts at login
    if (user.isActive === false || user.status === 'suspended') {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact support.',
        suspended: true,
      });
    }

    // Role check — if a role was specified, verify it matches the account
    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as ${user.role === 'alumni' ? 'an Alumni' : 'a Student'}. Please select the correct role to login.`
      });
    }

    res.json({
      token: signToken(user._id),
      user: { _id: user._id, id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, avatar: user.avatar || '' },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// POST /api/auth/forgot-password — send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with this email.' });

    const otp = genOtp();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save({ validateBeforeSave: false });

    await sendOtp(email, otp);
    res.json({ message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Check server email config.' });
  }
});

// POST /api/auth/verify-otp — verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !user.resetOtp) return res.status(400).json({ message: 'No OTP requested.' });
    if (user.resetOtp !== otp) return res.status(400).json({ message: 'Invalid OTP.' });
    if (new Date() > user.resetOtpExpiry) return res.status(400).json({ message: 'OTP expired. Request a new one.' });
    res.json({ message: 'OTP verified.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password — set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !user.resetOtp) return res.status(400).json({ message: 'No OTP requested.' });
    if (user.resetOtp !== otp) return res.status(400).json({ message: 'Invalid OTP.' });
    if (new Date() > user.resetOtpExpiry) return res.status(400).json({ message: 'OTP expired.' });

    user.password = password;   // pre-save hook will hash it
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/appeal
// Suspended users send a query/appeal to admin.
// Uses a raw JWT decode (no protect middleware) since suspended users are blocked by protect.
router.post('/appeal', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized.' });

    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ message: 'Invalid token.' }); }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Only suspended users can submit an appeal
    if (user.isActive !== false && user.status !== 'suspended') {
      return res.status(400).json({ message: 'Your account is not suspended.' });
    }

    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required.' });

    // Prevent duplicate pending appeals
    const existing = await Appeal.findOne({ user: user._id, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'You already have a pending appeal.' });

    await Appeal.create({ user: user._id, message: message.trim() });
    res.json({ message: 'Appeal submitted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
