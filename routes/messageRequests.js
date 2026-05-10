const router = require('express').Router();
const MessageRequest = require('../models/MessageRequest');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// POST /api/message-requests — send a message request
router.post('/', protect, async (req, res) => {
  try {
    const { to, text } = req.body;
    if (!to || !text?.trim()) return res.status(400).json({ message: 'Recipient and message required' });
    if (String(to) === String(req.user._id)) return res.status(400).json({ message: "Can't message yourself" });

    const target = await User.findById(to);
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Check if already following — if so, no request needed
    const isFollowing = target.followers?.map(String).includes(String(req.user._id));
    if (isFollowing) return res.status(400).json({ message: 'Already following — send direct message' });

    // Upsert request
    const existing = await MessageRequest.findOne({ from: req.user._id, to });
    if (existing) {
      if (existing.status === 'pending') return res.status(400).json({ message: 'Request already sent' });
      if (existing.status === 'declined') return res.status(403).json({ message: 'Your request was declined' });
    }

    const request = await MessageRequest.create({ from: req.user._id, to, text });
    const populated = await MessageRequest.findById(request._id)
      .populate('from', 'firstName lastName avatar role');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/message-requests/inbox — get my pending message requests
router.get('/inbox', protect, async (req, res) => {
  try {
    const requests = await MessageRequest.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'firstName lastName avatar role designation company')
      .sort('-createdAt');
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/message-requests/count — count of pending requests
router.get('/count', protect, async (req, res) => {
  try {
    const count = await MessageRequest.countDocuments({ to: req.user._id, status: 'pending' });
    res.json({ count });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/message-requests/:id/accept
router.post('/:id/accept', protect, async (req, res) => {
  try {
    const request = await MessageRequest.findById(req.params.id);
    if (!request || String(request.to) !== String(req.user._id))
      return res.status(404).json({ message: 'Not found' });
    request.status = 'accepted';
    await request.save();
    res.json({ message: 'Accepted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/message-requests/:id/decline
router.post('/:id/decline', protect, async (req, res) => {
  try {
    const request = await MessageRequest.findById(req.params.id);
    if (!request || String(request.to) !== String(req.user._id))
      return res.status(404).json({ message: 'Not found' });
    request.status = 'declined';
    await request.save();
    res.json({ message: 'Declined' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
