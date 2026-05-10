const router = require('express').Router();
const Mentorship = require('../models/Mentorship');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const emitNotif = async (req, notif) => {
  try {
    const saved = await Notification.create(notif);
    const populated = await Notification.findById(saved._id).populate('sender', 'firstName lastName avatar');
    req.app.get('io')?.to(`user_${notif.recipient}`).emit('notification', populated);
  } catch {}
};

// POST /api/mentorship/request  — student sends request to alumni
router.post('/request', protect, async (req, res) => {
  try {
    const { alumniId, message, matchScore } = req.body;
    const exists = await Mentorship.findOne({ student: req.user._id, alumni: alumniId, status: { $in: ['pending', 'accepted'] } });
    if (exists) return res.status(400).json({ message: 'Request already sent' });
    const m = await Mentorship.create({ student: req.user._id, alumni: alumniId, message, matchScore });
    // notify alumni
    await emitNotif(req, {
      recipient: alumniId,
      sender: req.user._id,
      type: 'mentorship_request',
      message: `${req.user.firstName} sent you a mentorship request`,
    });
    res.status(201).json(m);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/mentorship/my  — get all mentorships for current user
router.get('/my', protect, async (req, res) => {
  try {
    // Query by either side so both student and alumni get full data
    const list = await Mentorship.find({
      $or: [{ student: req.user._id }, { alumni: req.user._id }]
    })
      .populate('student', 'firstName lastName email industry careerGoals targetIndustry avatar')
      .populate('alumni',  'firstName lastName email industry company designation batch skills bio avatar')
      .sort('-createdAt');
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/mentorship/:id/status  — alumni accepts/declines
router.put('/:id/status', protect, async (req, res) => {
  try {
    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Not found' });

    const isAlumni = m.alumni.toString() === req.user._id.toString();

    if (!isAlumni) return res.status(403).json({ message: 'Only the alumni can update this request' });

    m.status = req.body.status;
    await m.save();
    // notify student when accepted/declined
    if (['accepted', 'declined'].includes(req.body.status)) {
      await emitNotif(req, {
        recipient: m.student,
        sender: req.user._id,
        type: 'mentorship_accepted',
        message: `${req.user.firstName} ${req.body.status} your mentorship request`,
      });
    }
    res.json(m);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/mentorship/:id/session  — increment session count
router.put('/:id/session', protect, async (req, res) => {
  try {
    const m = await Mentorship.findByIdAndUpdate(req.params.id, { $inc: { sessions: 1 } }, { new: true });
    res.json(m);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
