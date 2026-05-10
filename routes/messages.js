const router = require('express').Router();
const Message = require('../models/Message');
const Mentorship = require('../models/Mentorship');
const { protect } = require('../middleware/auth');
const { sendPushToUser } = require('../utils/pushNotification');

// POST /api/messages/:mentorshipId/read — mark messages as read (lightweight)
router.post('/:mentorshipId/read', protect, async (req, res) => {
  try {
    const m = await Mentorship.findById(req.params.mentorshipId);
    if (!m) return res.status(404).json({ message: 'Not found' });
    const isParty = [m.student.toString(), m.alumni.toString()].includes(req.user._id.toString());
    if (!isParty) return res.status(403).json({ message: 'Forbidden' });
    const updated = await Message.updateMany(
      { mentorship: req.params.mentorshipId, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );
    if (updated.modifiedCount > 0) {
      req.app.get('io')?.to(req.params.mentorshipId).emit('messages:read', {
        mentorshipId: req.params.mentorshipId,
        readBy: req.user._id,
      });
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/messages/:mentorshipId
router.get('/:mentorshipId', protect, async (req, res) => {
  try {
    const m = await Mentorship.findById(req.params.mentorshipId);
    if (!m) return res.status(404).json({ message: 'Not found' });
    const isParty = [m.student.toString(), m.alumni.toString()].includes(req.user._id.toString());
    if (!isParty) return res.status(403).json({ message: 'Forbidden' });
    const msgs = await Message.find({ mentorship: req.params.mentorshipId })
      .populate('sender', 'firstName lastName role avatar')
      .sort('createdAt');
    // mark as read and notify sender
    const updated = await Message.updateMany(
      { mentorship: req.params.mentorshipId, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );
    if (updated.modifiedCount > 0) {
      req.app.get('io')?.to(req.params.mentorshipId).emit('messages:read', {
        mentorshipId: req.params.mentorshipId,
        readBy: req.user._id,
      });
    }
    res.json(msgs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/messages/:id/react — add/change/remove reaction
router.put('/:id/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Not found' });

    const existing = msg.reactions.find(r => String(r.userId) === String(req.user._id));
    if (existing) {
      if (existing.emoji === emoji) {
        msg.reactions = msg.reactions.filter(r => String(r.userId) !== String(req.user._id));
      } else {
        existing.emoji = emoji;
      }
    } else {
      msg.reactions.push({ userId: req.user._id, emoji });
    }
    await msg.save();
    req.app.get('io')?.to(msg.mentorship.toString()).emit('message:reaction', {
      messageId: msg._id,
      reactions: msg.reactions,
    });
    res.json({ reactions: msg.reactions });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/messages/:mentorshipId
router.post('/:mentorshipId', protect, async (req, res) => {
  try {
    const m = await Mentorship.findById(req.params.mentorshipId);
    if (!m) return res.status(400).json({ message: 'Conversation not found' });
    if (m.status !== 'accepted') return res.status(400).json({ message: 'Mentorship not active' });
    const isParty = [m.student.toString(), m.alumni.toString()].includes(req.user._id.toString());
    if (!isParty) return res.status(403).json({ message: 'Forbidden' });

    const { text, type, attachment } = req.body;
    const msgType = type || 'text';

    const msg = await Message.create({
      mentorship: req.params.mentorshipId,
      sender: req.user._id,
      text: text || '',
      type: msgType,
      attachment: attachment || undefined,
    });
    const populated = await msg.populate('sender', 'firstName lastName role avatar');

    // ── Emit via Socket.IO (works when recipient app is open) ──
    req.app.get('io')?.to(req.params.mentorshipId).emit('receive_message', {
      ...populated.toObject(),
      mentorshipId: req.params.mentorshipId,
    });

    // ── Push notification (works when recipient app is in background/closed) ──
    const otherId = String(m.student) === String(req.user._id)
      ? String(m.alumni)
      : String(m.student);

    // Always send push — it's the only reliable delivery when socket is dead
    await sendPushToUser(otherId, {
      title: `${req.user.firstName} ${req.user.lastName}`,
      body:  msgType === 'voice' ? '🎤 Voice message'
           : msgType === 'image' ? '📷 Photo'
           : msgType === 'video' ? '🎥 Video'
           : msgType === 'file'  ? '📎 File'
           : (text || '').slice(0, 100) || '📎 Attachment',
      url:   `/messages/${req.params.mentorshipId}`,
      type:  'message',
      data:  { mentorshipId: req.params.mentorshipId },
    });

    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/messages/:mentorshipId/call — save call log + push notification for missed calls
router.post('/:mentorshipId/call', protect, async (req, res) => {
  try {
    const m = await Mentorship.findById(req.params.mentorshipId);
    if (!m) return res.status(404).json({ message: 'Not found' });
    const isParty = [m.student.toString(), m.alumni.toString()].includes(req.user._id.toString());
    if (!isParty) return res.status(403).json({ message: 'Forbidden' });

    const { callType, status, duration } = req.body;
    const label = status === 'missed' || status === 'rejected'
      ? `Missed ${callType === 'video' ? 'video' : 'voice'} call`
      : `${callType === 'video' ? 'Video' : 'Voice'} call · ${fmtDuration(duration)}`;

    const msg = await Message.create({
      mentorship: req.params.mentorshipId,
      sender: req.user._id,
      text: label,
      type: 'call',
      callMeta: { callType, status, duration: duration || 0 },
    });
    const populated = await msg.populate('sender', 'firstName lastName role avatar');
    req.app.get('io')?.to(req.params.mentorshipId).emit('receive_message', populated);

    // Push notification for missed calls so recipient knows they missed it
    if (status === 'missed' || status === 'rejected') {
      const otherId = String(m.student) === String(req.user._id)
        ? String(m.alumni)
        : String(m.student);
      await sendPushToUser(otherId, {
        title: `Missed ${callType === 'video' ? 'video' : 'voice'} call`,
        body:  `${req.user.firstName} ${req.user.lastName} called you`,
        url:   `/messages/${req.params.mentorshipId}`,
        type:  'call',
        data:  { mentorshipId: req.params.mentorshipId },
      });
    }

    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/messages/call-push — send push to wake up recipient before call connects
// Called by caller immediately when initiating a call
router.post('/call-push/:mentorshipId', protect, async (req, res) => {
  try {
    const m = await Mentorship.findById(req.params.mentorshipId);
    if (!m) return res.status(404).json({ message: 'Not found' });
    const isParty = [m.student.toString(), m.alumni.toString()].includes(req.user._id.toString());
    if (!isParty) return res.status(403).json({ message: 'Forbidden' });

    const { callType } = req.body;
    const otherId = String(m.student) === String(req.user._id)
      ? String(m.alumni)
      : String(m.student);

    // Send push to wake up the recipient's device so socket can reconnect
    await sendPushToUser(otherId, {
      title: `📞 Incoming ${callType === 'video' ? 'video' : 'voice'} call`,
      body:  `${req.user.firstName} ${req.user.lastName} is calling you`,
      url:   `/messages/${req.params.mentorshipId}`,
      type:  'call',
      requireInteraction: true,
      data:  { mentorshipId: req.params.mentorshipId, callType, callerId: String(req.user._id) },
    });

    res.json({ sent: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

function fmtDuration(s) {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

module.exports = router;
