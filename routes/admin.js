const router      = require('express').Router();
const jwt         = require('jsonwebtoken');
const rateLimit   = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const Admin        = require('../models/Admin');
const User         = require('../models/User');
const Mentorship   = require('../models/Mentorship');
const Message      = require('../models/Message');
const Post         = require('../models/Post');
const AdminLog     = require('../models/AdminLog');
const Announcement = require('../models/Announcement');
const Appeal       = require('../models/Appeal');
const { adminProtect } = require('../middleware/adminAuth');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + '_admin';

const signAdminToken = (id) =>
  jwt.sign({ id, role: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: '8h' });

// Log helper
const log = (adminId, action, target, details, ip) =>
  AdminLog.create({ admin: adminId, action, target, details, ip }).catch(() => {});

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
});

/* ═══════════════════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════════════════ */

// POST /api/admin/login
router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input' });

  const { email, password } = req.body;

  // Only allow predefined admin emails
  const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (allowedEmails.length && !allowedEmails.includes(email.toLowerCase())) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    admin.lastLogin = new Date();
    await admin.save();
    res.json({
      token: signAdminToken(admin._id),
      admin: { _id: admin._id, email: admin.email, name: admin.name },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/me
router.get('/me', adminProtect, (req, res) => res.json(req.admin));

/* ═══════════════════════════════════════════════════════════
   DASHBOARD STATS
   ═══════════════════════════════════════════════════════════ */
router.get('/stats', adminProtect, async (req, res) => {
  try {
    const [totalUsers, students, alumni, activeMentorships, pendingMentorships,
           totalPosts, totalMessages, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'alumni' }),
      Mentorship.countDocuments({ status: 'accepted' }),
      Mentorship.countDocuments({ status: 'pending' }),
      Post.countDocuments(),
      Message.countDocuments(),
      User.find().sort('-createdAt').limit(5).select('firstName lastName email role createdAt avatar'),
    ]);

    // New registrations per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const dailyReg = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Mentorship by month (last 6 months)
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000);
    const mentorshipTrend = await Mentorship.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalUsers, students, alumni,
      activeMentorships, pendingMentorships,
      totalPosts, totalMessages,
      recentUsers, dailyReg, mentorshipTrend,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ═══════════════════════════════════════════════════════════
   USER MANAGEMENT
   ═══════════════════════════════════════════════════════════ */

// GET /api/admin/users?role=&status=&search=&page=&limit=
router.get('/users', adminProtect, async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role)   filter.role = role;
    if (status) filter.status = status;
    if (search) filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
    ];
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort('-createdAt')
        .skip((page - 1) * limit).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/users/:id — full profile
router.get('/users/:id', adminProtect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const [mentorships, posts] = await Promise.all([
      Mentorship.find({ $or: [{ student: user._id }, { alumni: user._id }] })
        .populate('student alumni', 'firstName lastName email role'),
      Post.find({ author: user._id }).sort('-createdAt').limit(10),
    ]);
    res.json({ user, mentorships, posts });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', adminProtect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, status: 'suspended' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    log(req.admin._id, 'SUSPEND_USER', req.params.id, `Suspended ${user.email}`, req.ip);
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/users/:id/activate
router.put('/users/:id/activate', adminProtect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true, status: 'active' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    log(req.admin._id, 'ACTIVATE_USER', req.params.id, `Activated ${user.email}`, req.ip);
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminProtect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await User.findByIdAndDelete(req.params.id);
    log(req.admin._id, 'DELETE_USER', req.params.id, `Deleted ${user.email}`, req.ip);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ═══════════════════════════════════════════════════════════
   MENTORSHIP MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
router.get('/mentorships', adminProtect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const [mentorships, total] = await Promise.all([
      Mentorship.find(filter)
        .populate('student alumni', 'firstName lastName email role avatar designation company')
        .sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
      Mentorship.countDocuments(filter),
    ]);
    res.json({ mentorships, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/mentorships/:id/approve', adminProtect, async (req, res) => {
  try {
    const m = await Mentorship.findByIdAndUpdate(req.params.id, { status: 'accepted' }, { new: true });
    log(req.admin._id, 'APPROVE_MENTORSHIP', req.params.id, '', req.ip);
    res.json(m);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/mentorships/:id/reject', adminProtect, async (req, res) => {
  try {
    const m = await Mentorship.findByIdAndUpdate(req.params.id, { status: 'declined' }, { new: true });
    log(req.admin._id, 'REJECT_MENTORSHIP', req.params.id, '', req.ip);
    res.json(m);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/mentorships/:id', adminProtect, async (req, res) => {
  try {
    await Mentorship.findByIdAndDelete(req.params.id);
    log(req.admin._id, 'DELETE_MENTORSHIP', req.params.id, '', req.ip);
    res.json({ message: 'Removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ═══════════════════════════════════════════════════════════
   ANNOUNCEMENTS
   ═══════════════════════════════════════════════════════════ */
router.get('/announcements', adminProtect, async (req, res) => {
  try {
    const list = await Announcement.find().sort('-createdAt').populate('postedBy', 'name email');
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/announcements', adminProtect, [
  body('title').trim().notEmpty(),
  body('body').trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Title and body required' });
  try {
    const ann = await Announcement.create({
      title: req.body.title, body: req.body.body,
      target: req.body.target || 'all', postedBy: req.admin._id,
    });
    // Broadcast via socket
    req.app.get('io')?.emit('announcement', ann);
    log(req.admin._id, 'POST_ANNOUNCEMENT', ann._id, ann.title, req.ip);
    res.status(201).json(ann);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/announcements/:id', adminProtect, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    log(req.admin._id, 'DELETE_ANNOUNCEMENT', req.params.id, '', req.ip);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ═══════════════════════════════════════════════════════════
   AUDIT LOGS
   ═══════════════════════════════════════════════════════════ */
router.get('/logs', adminProtect, async (req, res) => {
  try {
    const logs = await AdminLog.find().sort('-createdAt').limit(100)
      .populate('admin', 'name email');
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ═══════════════════════════════════════════════════════════
   APPEALS
   ═══════════════════════════════════════════════════════════ */

// GET /api/admin/appeals — list all pending appeals
router.get('/appeals', adminProtect, async (req, res) => {
  try {
    const appeals = await Appeal.find()
      .sort('-createdAt')
      .populate('user', 'firstName lastName email role avatar');
    res.json(appeals);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/appeals/:id/reinstate — approve appeal, activate user
router.put('/appeals/:id/reinstate', adminProtect, async (req, res) => {
  try {
    const appeal = await Appeal.findById(req.params.id).populate('user');
    if (!appeal) return res.status(404).json({ message: 'Appeal not found.' });

    await User.findByIdAndUpdate(appeal.user._id, { isActive: true, status: 'active' });
    appeal.status = 'reviewed';
    await appeal.save();

    log(req.admin._id, 'REINSTATE_USER', appeal.user._id, `Reinstated ${appeal.user.email}`, req.ip);
    res.json({ message: 'User reinstated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/appeals/:id/reject — reject appeal, keep suspended
router.put('/appeals/:id/reject', adminProtect, async (req, res) => {
  try {
    const appeal = await Appeal.findById(req.params.id);
    if (!appeal) return res.status(404).json({ message: 'Appeal not found.' });
    appeal.status = 'reviewed';
    await appeal.save();
    log(req.admin._id, 'REJECT_APPEAL', appeal.user, '', req.ip);
    res.json({ message: 'Appeal rejected.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
