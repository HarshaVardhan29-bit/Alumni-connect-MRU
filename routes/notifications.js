const router = require('express').Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// GET /api/notifications — get my notifications
router.get('/', protect, async (req, res) => {
  try {
    const notifs = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'firstName lastName avatar')
      .populate('post', 'text')
      .sort('-createdAt')
      .limit(50);
    res.json(notifs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/notifications/missed-call — create missed call notification
router.post('/missed-call', protect, async (req, res) => {
  try {
    const { to, callType } = req.body;
    const notif = await Notification.create({
      recipient: to,
      sender: req.user._id,
      type: 'missed_call',
      message: `Missed ${callType === 'video' ? 'video' : 'voice'} call from ${req.user.firstName}`,
      read: false,
    });
    const populated = await Notification.findById(notif._id)
      .populate('sender', 'firstName lastName avatar');
    // emit real-time
    req.app.get('io')?.to(`user_${to}`).emit('notification', populated);
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
