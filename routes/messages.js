/**
 * Messages API — Production Grade
 * 
 * Message lifecycle: pending → sent → delivered → seen
 * Unread counts maintained server-side
 * Pagination: cursor-based (before/after messageId)
 * No base64 — URLs only
 */

const router      = require('express').Router();
const Message     = require('../models/Message');
const Mentorship  = require('../models/Mentorship');
const { protect } = require('../middleware/auth');
const { sendPushToUser } = require('../utils/pushNotification');
const { isUserOnline }   = require('../utils/socketManager');

const PAGE_SIZE = 30;

// ── Helper: verify conversation access ───────────────────────────
async function getConversation(convId, userId) {
  const conv = await Mentorship.findById(convId);
  if (!conv) return null;
  const isParty = [conv.student.toString(), conv.alumni.toString()].includes(userId.toString());
  return isParty ? conv : null;
}

// ── Helper: get other participant ────────────────────────────────
function getOtherId(conv, myId) {
  return String(conv.student) === String(myId)
    ? String(conv.alumni)
    : String(conv.student);
}

// ── Helper: format message preview ───────────────────────────────
function msgPreview(msg) {
  if (!msg) return '';
  switch (msg.type) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Video';
    case 'voice': return '🎤 Voice message';
    case 'file':  return `📎 ${msg.attachment?.name || 'File'}`;
    case 'call':  return msg.text || '📞 Call';
    default:      return (msg.text || '').slice(0, 100);
  }
}

// ── GET /api/messages/:convId — paginated messages ───────────────
// Supports: ?before=<messageId>  (load older)
//           ?after=<messageId>   (load newer / sync after reconnect)
//           ?limit=30
router.get('/:convId', protect, async (req, res) => {
  try {
    const conv = await getConversation(req.params.convId, req.user._id);
    if (!conv) return res.status(403).json({ message: 'Forbidden' });

    const limit  = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 100);
    const before = req.query.before; // messageId — load older messages
    const after  = req.query.after;  // messageId — load newer messages (reconnect sync)

    let query = {
      // Support both old 'mentorship' field and new 'conversationId' field
      $or: [
        { conversationId: req.params.convId },
        { mentorship: req.params.convId },
      ],
      deletedFor: { $ne: req.user._id },
    };

    let sort = { createdAt: -1 };

    if (before) {
      const pivot = await Message.findById(before).select('createdAt').lean();
      if (pivot) query.createdAt = { $lt: pivot.createdAt };
    } else if (after) {
      const pivot = await Message.findById(after).select('createdAt').lean();
      if (pivot) { query.createdAt = { $gt: pivot.createdAt }; sort = { createdAt: 1 }; }
    }

    const messages = await Message.find(query)
      .sort(sort)
      .limit(limit)
      .populate('sender', 'firstName lastName role avatar')
      .populate({ path: 'replyTo', select: 'text type sender', populate: { path: 'sender', select: 'firstName lastName' } })
      .lean();

    // Return in chronological order
    const ordered = before ? messages.reverse() : messages;

    // Mark as delivered (not seen — seen happens when user opens chat)
    await Message.updateMany(
      { conversationId: req.params.convId, sender: { $ne: req.user._id }, status: 'sent' },
      { status: 'delivered' }
    );

    // Emit delivery status to sender
    const otherId = getOtherId(conv, req.user._id);
    const io = req.app.get('io');
    if (io && ordered.length > 0) {
      io.to(`user_${otherId}`).emit('msg:status', {
        conversationId: req.params.convId,
        status: 'delivered',
        deliveredTo: req.user._id,
      });
    }

    res.json({
      messages: ordered,
      hasMore: messages.length === limit,
      nextCursor: ordered.length > 0 ? ordered[0]._id : null,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/messages/:convId — send message ────────────────────
router.post('/:convId', protect, async (req, res) => {
  try {
    const conv = await getConversation(req.params.convId, req.user._id);
    if (!conv) return res.status(403).json({ message: 'Forbidden' });
    if (conv.status !== 'accepted') return res.status(400).json({ message: 'Conversation not active' });

    const { text, type, attachment, replyToId, clientMsgId } = req.body;

    // Deduplication — if clientMsgId already exists, return existing message
    if (clientMsgId) {
      const existing = await Message.findOne({ clientMsgId }).populate('sender', 'firstName lastName role avatar').lean();
      if (existing) return res.status(200).json(existing);
    }

    const msg = await Message.create({
      conversationId: req.params.convId,
      sender:         req.user._id,
      text:           text || '',
      type:           type || 'text',
      attachment:     attachment || undefined,
      replyTo:        replyToId || null,
      clientMsgId:    clientMsgId || undefined,
      status:         'sent',
    });

    const populated = await Message.findById(msg._id)
      .populate('sender', 'firstName lastName role avatar')
      .populate({ path: 'replyTo', select: 'text type sender', populate: { path: 'sender', select: 'firstName lastName' } })
      .lean();

    const otherId = getOtherId(conv, req.user._id);
    const io = req.app.get('io');

    // ── Update conversation sidebar state ──
    await Mentorship.findByIdAndUpdate(req.params.convId, {
      lastMessage: {
        _id:       msg._id,
        text:      msgPreview(msg),
        type:      msg.type,
        sender:    req.user._id,
        createdAt: msg.createdAt,
      },
      updatedAt: new Date(),
      // Increment unread for recipient only
      [`unreadCounts.${otherId}`]: (conv.unreadCounts?.get(otherId) || 0) + 1,
    });

    // ── Emit to recipient via their user room ──
    const recipientOnline = isUserOnline(otherId);

    if (io) {
      // Send to recipient
      io.to(`user_${otherId}`).emit('receive_message', {
        ...populated,
        conversationId: req.params.convId,
      });

      // Send ACK back to sender (status: sent)
      io.to(`user_${req.user._id}`).emit('msg:ack', {
        clientMsgId,
        messageId:      msg._id,
        conversationId: req.params.convId,
        status:         'sent',
        createdAt:      msg.createdAt,
      });

      // Sidebar update for both users
      const sidebarUpdate = {
        conversationId: req.params.convId,
        lastMessage: {
          _id:       msg._id,
          text:      msgPreview(msg),
          type:      msg.type,
          sender:    { _id: req.user._id, firstName: req.user.firstName },
          createdAt: msg.createdAt,
        },
        updatedAt: new Date(),
      };
      io.to(`user_${otherId}`).emit('conv:updated', {
        ...sidebarUpdate,
        unreadCount: (conv.unreadCounts?.get(otherId) || 0) + 1,
      });
      io.to(`user_${req.user._id}`).emit('conv:updated', {
        ...sidebarUpdate,
        unreadCount: 0,
      });
    }

    // ── Push notification — ONLY if recipient is offline ──
    if (!recipientOnline) {
      await sendPushToUser(otherId, {
        title: `${req.user.firstName} ${req.user.lastName}`,
        body:  msgPreview(msg),
        url:   `/messages/${req.params.convId}`,
        type:  'message',
        data:  { conversationId: req.params.convId, messageId: String(msg._id) },
      });
    }

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate clientMsgId — return existing
      const existing = await Message.findOne({ clientMsgId: req.body.clientMsgId })
        .populate('sender', 'firstName lastName role avatar').lean();
      return res.status(200).json(existing);
    }
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/messages/:convId/seen — mark messages as seen ──────
router.post('/:convId/seen', protect, async (req, res) => {
  try {
    const conv = await getConversation(req.params.convId, req.user._id);
    if (!conv) return res.status(403).json({ message: 'Forbidden' });

    // Update message statuses
    const result = await Message.updateMany(
      {
        conversationId: req.params.convId,
        sender: { $ne: req.user._id },
        status: { $in: ['sent', 'delivered'] },
      },
      { status: 'seen' }
    );

    // Reset unread count for this user
    await Mentorship.findByIdAndUpdate(req.params.convId, {
      [`unreadCounts.${req.user._id}`]: 0,
    });

    // Notify sender of seen status
    if (result.modifiedCount > 0) {
      const otherId = getOtherId(conv, req.user._id);
      const io = req.app.get('io');
      io?.to(`user_${otherId}`).emit('msg:status', {
        conversationId: req.params.convId,
        status: 'seen',
        seenBy: req.user._id,
      });
    }

    res.json({ ok: true, updated: result.modifiedCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/messages/:convId/read — legacy alias for seen ──────
router.post('/:convId/read', protect, async (req, res) => {
  req.url = `/${req.params.convId}/seen`;
  return router.handle(req, res, () => {});
});

// ── PUT /api/messages/:msgId/react — add/toggle reaction ─────────
router.put('/:msgId/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await Message.findById(req.params.msgId);
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

    const io = req.app.get('io');
    // Get conversation to find other participant
    const conv = await Mentorship.findById(msg.conversationId);
    if (conv && io) {
      const otherId = getOtherId(conv, req.user._id);
      io.to(`user_${otherId}`).emit('msg:reaction', {
        messageId:      msg._id,
        conversationId: msg.conversationId,
        reactions:      msg.reactions,
      });
    }

    res.json({ reactions: msg.reactions });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/messages/:msgId — delete message ─────────────────
router.delete('/:msgId', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Not found' });

    const isOwn = String(msg.sender) === String(req.user._id);
    const { forEveryone } = req.query;

    if (isOwn && forEveryone === 'true') {
      // Delete for everyone
      msg.deletedAt = new Date();
      msg.text = '';
      msg.attachment = undefined;
      await msg.save();

      const io = req.app.get('io');
      const conv = await Mentorship.findById(msg.conversationId);
      if (conv && io) {
        const otherId = getOtherId(conv, req.user._id);
        io.to(`user_${otherId}`).emit('msg:deleted', {
          messageId:      msg._id,
          conversationId: msg.conversationId,
        });
      }
    } else {
      // Delete for me only
      if (!msg.deletedFor.includes(req.user._id)) {
        msg.deletedFor.push(req.user._id);
        await msg.save();
      }
    }

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/messages/:convId/call — save call log ──────────────
router.post('/:convId/call', protect, async (req, res) => {
  try {
    const conv = await getConversation(req.params.convId, req.user._id);
    if (!conv) return res.status(404).json({ message: 'Not found' });

    const { callType, status, duration } = req.body;
    const isMissed = status === 'missed' || status === 'rejected';

    const label = isMissed
      ? `Missed ${callType === 'video' ? 'video' : 'voice'} call`
      : `${callType === 'video' ? 'Video' : 'Voice'} call · ${fmtDuration(duration)}`;

    const msg = await Message.create({
      conversationId: req.params.convId,
      sender:         req.user._id,
      text:           label,
      type:           'call',
      callMeta:       { callType, status, duration: duration || 0 },
      status:         'sent',
    });

    const populated = await msg.populate('sender', 'firstName lastName role avatar');
    const otherId = getOtherId(conv, req.user._id);
    const io = req.app.get('io');

    io?.to(`user_${otherId}`).emit('receive_message', {
      ...populated.toObject(),
      conversationId: req.params.convId,
    });

    // Push for missed calls
    if (isMissed) {
      await sendPushToUser(otherId, {
        title: `Missed ${callType === 'video' ? 'video' : 'voice'} call`,
        body:  `${req.user.firstName} ${req.user.lastName} called you`,
        url:   `/messages/${req.params.convId}`,
        type:  'call',
        data:  { conversationId: req.params.convId },
      });
    }

    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/messages/call-push/:convId — wake up recipient ─────
router.post('/call-push/:convId', protect, async (req, res) => {
  try {
    const conv = await getConversation(req.params.convId, req.user._id);
    if (!conv) return res.status(404).json({ message: 'Not found' });

    const { callType } = req.body;
    const otherId = getOtherId(conv, req.user._id);

    // Only send push if recipient is offline
    if (!isUserOnline(otherId)) {
      await sendPushToUser(otherId, {
        title: `📞 Incoming ${callType === 'video' ? 'video' : 'voice'} call`,
        body:  `${req.user.firstName} ${req.user.lastName} is calling you`,
        url:   `/messages/${req.params.convId}`,
        type:  'call',
        requireInteraction: true,
        data:  { conversationId: req.params.convId, callType, callerId: String(req.user._id) },
      });
    }

    res.json({ sent: !isUserOnline(otherId) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

function fmtDuration(s) {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

module.exports = router;
