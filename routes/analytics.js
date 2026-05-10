const router = require('express').Router();
const User = require('../models/User');
const Mentorship = require('../models/Mentorship');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// GET /api/analytics  — platform-wide + personal stats
router.get('/', protect, async (req, res) => {
  try {
    const [totalAlumni, totalStudents, totalMentorships, activeMentorships, totalMessages] = await Promise.all([
      User.countDocuments({ role: 'alumni' }),
      User.countDocuments({ role: 'student' }),
      Mentorship.countDocuments(),
      Mentorship.countDocuments({ status: 'accepted' }),
      Message.countDocuments(),
    ]);

    // Industry breakdown
    const industryBreakdown = await User.aggregate([
      { $match: { role: 'alumni', industry: { $ne: '' } } },
      { $group: { _id: '$industry', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    // Personal stats
    const field = req.user.role === 'student' ? 'student' : 'alumni';
    const myMentorships = await Mentorship.find({ [field]: req.user._id });
    const myActive = myMentorships.filter(m => m.status === 'accepted').length;
    const myPending = myMentorships.filter(m => m.status === 'pending').length;
    const mySessions = myMentorships.reduce((s, m) => s + (m.sessions || 0), 0);

    res.json({
      platform: { totalAlumni, totalStudents, totalMentorships, activeMentorships, totalMessages },
      industryBreakdown,
      personal: { total: myMentorships.length, active: myActive, pending: myPending, sessions: mySessions },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
