/**
 * Messages API — Production Grade
 * 
 * ORDERING GUARANTEE: All responses return messages in chronological order
 * (oldest first, newest last) — same as WhatsApp/Telegram.
 * 
 * Pagination:
 *   ?before=<messageId>  → load older messages (prepend to top)
 *   ?after=<messageId>   → load newer messages (reconnect sync)
 *   No params            → load most recent N messages
 * 
 * CRITICAL: sort({ createdAt: 1, _id: 1 }) is the ONLY sort used.
 * For "before" queries we fetch DESC then reverse in JS (safe copy).
 */

const router      = require('express').Router();
const Message     = require('../models/Message');
const Mentorship  = require('../models/Mentorship');
const mongoose    = require('mongoose');
const { protect } = require('../middleware/auth');
const { sendPushToUser } = require('../utils/pushNotification');

const PAGE_SIZE = 30;

// ── Safe ObjectId validation ──────────────────────────────────────
function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}

// ── Helper: verify conversation access ───────────────────────────
async function getConversation(convId, userId) {
  if (!isValidObjectId(convId)) return null;
  try {
    const conv = await Mentorship.findById(convId);
    if (!conv) return null;
    const isParty = [conv.student.toString(), conv.alumni.toString()].includes(userId.toString());
    return isParty ? conv : null;
  } catch {
    return null;
  }
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

// ── Base query: supports both old 'mentorship' and new 'conversationId' fields ──
function baseQuery(convId, userId) {
  return {
    $or: [
      { conversationId: convId },
      { mentorship: convId },
    ],
    deletedFor: { $ne: userId },
  };
}

// ── GET /api/messages/:convId ─────────────────────────────────────
// Returns messages in CHRONOLOGICAL ORDER (oldest → newest)
// ?before=<msgId>  load older messages (for infinite scroll up)
// ?after=<msgId>   load newer messages (for reconnect sync)
// ?limit=N
router.get('/:convId', protect, async (req, res) => {
  try {
    const { convId } = req.params;

    // Validate convId
    if (!isValidObjectId(convId)) {
      return res.status(400).json({ message: 'Invalid conversation ID', messages: [], hasMore: false, nextCursor: null });
    }

    const conv = await getConversation(convId, req.user._id);
    if (!conv) {
      return res.status(403).json({ message: 'Forbidden', messages: [], hasMore: false, nextCursor: null });
    }

    const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 100);
    const before = req.query.before; // load messages OLDER than this ID
    const after  = req.query.after;  // load messages NEWER than this ID

    const query = baseQuery(convId, req.user._id);

    if (before) {
      // Validate cursor
      if (!isValidObjectId(before)) {
        console.warn(`[Messages] Invalid 'before' cursor: ${before}`);
        // Return empty rather than crash
        return res.json({ messages: [], hasMore: false, nextCursor: null });
      }
      const pivot = await Message.findById(before).select('createdAt _id').lean();
      if (!pivot) {
        console.warn(`[Messages] 'before' cursor not found: ${before}`);
        return res.json({ messages: [], hasMore: false, nextCursor: null });
      }
      // Fetch messages older than pivot — sort DESC to get the N most recent ones before pivot
      // then reverse to get chronological order
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { createdAt: { $lt: pivot.createdAt } },
            { createdAt: pivot.createdAt, _id: { $lt: pivot._id } },
          ]
        }
      ];
      delete query.$or;

      const msgs = await Message.find(query)
        .sort({ createdAt: -1, _id: -1 }) // DESC to get N most recent before pivot
        .limit(limit)
        .populate('sender', 'firstName lastName role avatar')
        .populate({ path: 'replyTo', select: 'text type sender', populate: { path: 'sender', select: 'firstName lastName' } })
        .lean();

      // Reverse to chronological order (oldest first) — safe copy, no mutation
      const chronological = [...msgs].reverse();

      return res.json({
        messages:   chronological,
        hasMore:    msgs.length === limit,
        nextCursor: chronological.length > 0 ? chronological[0]._id : null, // oldest in batch
      });
    }

    if (after) {
      // Validate cursor
      if (!isValidObjectId(after)) {
        console.warn(`[Messages] Invalid 'after' cursor: ${after}`);
        return res.json({ messages: [], hasMore: false, nextCursor: null });
      }
      const pivot = await Message.findById(after).select('createdAt _id').lean();
      if (!pivot) {
        console.warn(`[Messages] 'after' cursor not found: ${after}`);
        return res.json({ messages: [], hasMore: false, nextCursor: null });
      }
      // Fetch messages newer than pivot — already in chronological order
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { createdAt: { $gt: pivot.createdAt } },
            { createdAt: pivot.createdAt, _id: { $gt: pivot._id } },
          ]
        }
      ];
      delete query.$or;

      const msgs = await Message.find(query)
        .sort({ createdAt: 1, _id: 1 }) // ASC — chronological
        .limit(limit)
        .populate('sender', 'firstName lastName role avatar')
        .populate({ path: 'replyTo', select: 'text type sender', populate: { path: 'sender', select: 'firstName lastName' } })
        .lean();

      return res.json({
        messages:   msgs,
        hasMore:    msgs.length === limit,
        nextCursor: msgs.length > 0 ? msgs[msgs.length - 1]._id : null,
      });
    }

    // ── No cursor: load most recent N messages in chronological order ──
    const msgs = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 }) // DESC to get most recent
      .limit(limit)
      .populate('sender', 'firstName lastName role avatar')
      .populate({ path: 'replyTo', select: 'text type sender', populate: { path: 'sender', select: 'firstName lastName' } })
      .lean();

    // Reverse to chronological (oldest first, newest last) — safe copy
    const chronological = [...msgs].reverse();

    // Mark as delivered
    const convQuery = {
      $or: [
        { conversationId: convId },
        { mentorship: convId },
      ],
      sender: { $ne: req.user._id },
      status: 'sent',
    };
    await Message.updateMany(convQuery, { status: 'delivered' }).catch(() => {});

    // Notify sender of delivery
    const otherId = getOtherId(conv, req.user._id);
    const io = req.app.get('io');
    if (io && chronological.length > 0) {
      io.to(`user_${otherId}`).emit('msg:status', {
        conversationId: convId,
        status: 'delivered',
        deliveredTo: req.user._id,
      });
    }

    return res.json({
      messages:   chronological,
      hasMore:    msgs.length === limit,
      nextCursor: chronological.length > 0 ? chronological[0]._id : null, // oldest msg ID for "load more"
    });

  } catch (err) {
    console.error('[Messages GET] Error:', err.message, err.stack);
    return res.status(500).json({ message: 'Server error', messages: [], hasMore: false, nextCursor: null });
  }
});

// ── POST /api/messages/:convId — send message ────────────────────
router.post('/:convId', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.convId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conv = await getConversation(req.params.convId, req.user._id);
    if (!conv) return res.status(403).json({ message: 'Forbidden' });
    if (conv.status !== 'accepted') return res.status(400).json({ message: 'Conversation not active' });

    const { text, type, attachment, replyToId, clientMsgId } = req.body;

    // Deduplication — if clientMsgId already exists, return existing message
    if (clientMsgId) {
      const existing = await Message.findOne({ clientMsgId })
        .populate('sender', 'firstName lastName role avatar').lean();
      if (existing) return res.status(200).json(existing);
    }

    const msg = await Message.create({
      conversationId: req.params.convId,
      sender:         req.user._id,
      text:           text || '',
      type:           type || 'text',
      attachment:     attachment || undefined,
      replyTo:        replyToId && isValidObjectId(replyToId) ? replyToId : null,
      clientMsgId:    clientMsgId || undefined,
      status:         'sent',
    });

    const populated = await Message.findById(msg._id)
      .populate('sender', 'firstName lastName role avatar')
      .populate({ path: 'replyTo', select: 'text type sender', populate: { path: 'sender', select: 'firstName lastName' } })
      .lean();

    const otherId = getOtherId(conv, req.user._id);
    const io = req.app.get('io');

    // Update conversation sidebar state
    await Mentorship.findByIdAndUpdate(req.params.convId, {
      lastMessage: {
        _id:       msg._id,
        text:      msgPreview(msg),
        type:      msg.type,
        sender:    req.user._id,
        createdAt: msg.createdAt,
      },
      updatedAt: new Date(),
      [`unreadCounts.${otherId}`]: (conv.unreadCounts?.get(otherId) || 0) + 1,
    });

    if (io) {
      // Send to recipient
      io.to(`user_${otherId}`).emit('receive_message', {
        ...populated,
        conversationId: req.params.convId,
      });

      // ACK to sender
      io.to(`user_${req.user._id}`).emit('msg:ack', {
        clientMsgId,
        messageId:      msg._id,
        conversationId: req.params.convId,
        status:         'sent',
        createdAt:      msg.createdAt,
      });

      // Sidebar update
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

    // Always send push — socket handles delivery if truly active,
    // FCM handles it if screen is off / app is backgrounded on mobile.
    // Do NOT gate on isUserOnline: mobile sockets stay "connected" even
    // when the screen is off, causing push to be silently skipped.
    sendPushToUser(otherId, {
      title: `${req.user.firstName} ${req.user.lastName}`,
      body:  msgPreview(msg),
      url:   `/messages/${req.params.convId}`,
      type:  'message',
      data:  { conversationId: req.params.convId, messageId: String(msg._id) },
    }).catch(() => {}); // fire-and-forget, don't block response

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate clientMsgId
      try {
        const existing = await Message.findOne({ clientMsgId: req.body.clientMsgId })
          .populate('sender', 'firstName lastName role avatar').lean();
        if (existing) return res.status(200).json(existing);
      } catch {}
    }
    console.error('[Messages POST] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/messages/:convId/seen ──────────────────────────────
router.post('/:convId/seen', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.convId)) {
      return res.json({ ok: true, updated: 0 });
    }

    const conv = await getConversation(req.params.convId, req.user._id);
    if (!conv) return res.json({ ok: true, updated: 0 });

    const result = await Message.updateMany(
      {
        $or: [
          { conversationId: req.params.convId },
          { mentorship: req.params.convId },
        ],
        sender: { $ne: req.user._id },
        status: { $in: ['sent', 'delivered'] },
      },
      { status: 'seen' }
    );

    await Mentorship.findByIdAndUpdate(req.params.convId, {
      [`unreadCounts.${req.user._id}`]: 0,
    });

    if (result.modifiedCount > 0) {
      const otherId = getOtherId(conv, req.user._id);
      req.app.get('io')?.to(`user_${otherId}`).emit('msg:status', {
        conversationId: req.params.convId,
        status: 'seen',
        seenBy: req.user._id,
      });
    }

    res.json({ ok: true, updated: result.modifiedCount });
  } catch (err) {
    console.error('[Messages SEEN] Error:', err.message);
    res.json({ ok: true, updated: 0 }); // never crash on seen
  }
});

// ── POST /api/messages/:convId/read — legacy alias ───────────────
router.post('/:convId/read', protect, (req, res, next) => {
  req.url = `/${req.params.convId}/seen`;
  next();
});

// ── PUT /api/messages/:msgId/react ───────────────────────────────
router.put('/:msgId/react', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.msgId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

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

    const convId = msg.conversationId || msg.mentorship;
    const conv = convId ? await Mentorship.findById(convId) : null;
    if (conv) {
      const otherId = getOtherId(conv, req.user._id);
      req.app.get('io')?.to(`user_${otherId}`).emit('msg:reaction', {
        messageId:      msg._id,
        conversationId: String(convId),
        reactions:      msg.reactions,
      });
    }

    res.json({ reactions: msg.reactions });
  } catch (err) {
    console.error('[Messages REACT] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/messages/:msgId ───────────────────────────────────
router.delete('/:msgId', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.msgId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const msg = await Message.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Not found' });

    const isOwn = String(msg.sender) === String(req.user._id);
    const { forEveryone } = req.query;

    if (isOwn && forEveryone === 'true') {
      msg.deletedAt = new Date();
      msg.text = '';
      msg.attachment = undefined;
      await msg.save();

      const convId = msg.conversationId || msg.mentorship;
      const conv = convId ? await Mentorship.findById(convId) : null;
      if (conv) {
        const otherId = getOtherId(conv, req.user._id);
        req.app.get('io')?.to(`user_${otherId}`).emit('msg:deleted', {
          messageId:      msg._id,
          conversationId: String(convId),
        });
      }
    } else {
      if (!msg.deletedFor.includes(req.user._id)) {
        msg.deletedFor.push(req.user._id);
        await msg.save();
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Messages DELETE] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/messages/:convId/call ──────────────────────────────
router.post('/:convId/call', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.convId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

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

    req.app.get('io')?.to(`user_${otherId}`).emit('receive_message', {
      ...populated.toObject(),
      conversationId: req.params.convId,
    });

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
  } catch (err) {
    console.error('[Messages CALL] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/messages/call-push/:convId ─────────────────────────
router.post('/call-push/:convId', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.convId)) {
      return res.json({ sent: false });
    }

    const conv = await getConversation(req.params.convId, req.user._id);
    if (!conv) return res.json({ sent: false });

    const { callType } = req.body;
    const otherId = getOtherId(conv, req.user._id);

    // Always send push — don't gate on isUserOnline.
    // Mobile sockets disconnect when screen is off, so gating silently drops
    // the push for backgrounded users. FCM will wake the device.
    sendPushToUser(otherId, {
      title: `📞 Incoming ${callType === 'video' ? 'video' : 'voice'} call`,
      body:  `${req.user.firstName} ${req.user.lastName} is calling you`,
      url:   `/messages/${req.params.convId}`,
      type:  'call',
      requireInteraction: true,
      data:  { conversationId: req.params.convId, callType, callerId: String(req.user._id) },
    }).catch(() => {});

    res.json({ sent: true });
  } catch (err) {
    console.error('[Messages CALL-PUSH] Error:', err.message);
    res.json({ sent: false });
  }
});

function fmtDuration(s) {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

module.exports = router;
