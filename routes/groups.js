const router   = require('express').Router();
const Group    = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const { protect } = require('../middleware/auth');
const { sendPushToUsers } = require('../utils/pushNotification');

const pop = q => q.populate('members', 'firstName lastName role designation company avatar')
                  .populate('admins',  'firstName lastName role')
                  .populate('creator', 'firstName lastName role');

// GET /api/groups — my groups
router.get('/', protect, async (req, res) => {
  try {
    const type = req.query.type;
    const filter = { members: req.user._id };
    if (type) filter.type = type;
    const groups = await pop(Group.find(filter).sort('-updatedAt'));
    res.json(groups);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/groups/discover — all public communities/groups (not yet joined)
router.get('/discover', protect, async (req, res) => {
  try {
    const type = req.query.type;
    const filter = { isPublic: true };
    if (type) filter.type = type;
    const groups = await pop(Group.find(filter).sort('-createdAt').limit(50));
    res.json(groups);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/groups — create
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, type, isPublic, avatar } = req.body;
    if (type === 'community' && req.user.role !== 'alumni') {
      return res.status(403).json({ message: 'Only alumni can create communities.' });
    }
    const group = await Group.create({
      name, description, type: type || 'group',
      creator: req.user._id,
      members: [req.user._id],
      admins:  [req.user._id],
      isPublic: isPublic !== false,
      avatar: avatar || '',
      // Communities always require approval by default
      requireApproval: type === 'community' ? true : false,
    });
    const populated = await pop(Group.findById(group._id));
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/groups/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await pop(Group.findById(req.params.id));
    if (!group) return res.status(404).json({ message: 'Not found' });
    res.json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/groups/:id — update (admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    const { name, description, avatar, isPublic } = req.body;
    if (name)        group.name = name;
    if (description !== undefined) group.description = description;
    if (avatar !== undefined)      group.avatar = avatar;
    if (isPublic !== undefined)    group.isPublic = isPublic;
    await group.save();
    const populated = await pop(Group.findById(group._id));
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/groups/:id — creator only
router.delete('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    if (String(group.creator) !== String(req.user._id)) return res.status(403).json({ message: 'Creator only' });
    await GroupMessage.deleteMany({ group: group._id });
    await group.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/groups/:id/join — join public group
router.post('/:id/join', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    if (!group.isPublic) return res.status(403).json({ message: 'Private group — invite only' });
    const uid = String(req.user._id);
    if (group.members.map(String).includes(uid)) {
      return res.json(await pop(Group.findById(group._id)));
    }

    // Communities ALWAYS require approval — no exceptions
    const needsApproval = group.type === 'community' || group.requireApproval;

    if (needsApproval) {
      if (!group.joinRequests.map(String).includes(uid)) {
        group.joinRequests.push(req.user._id);
        await group.save();
      }
      return res.json({ pending: true, message: 'Join request sent — waiting for admin approval' });
    }

    group.members.push(req.user._id);
    await group.save();
    await GroupMessage.create({ group: group._id, sender: req.user._id, text: `${req.user.firstName} joined the group`, type: 'system' });
    const populated = await pop(Group.findById(group._id));
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/groups/:id/join-code — join via invite code
router.post('/:id/join-code', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    if (group.joinCode !== code) return res.status(403).json({ message: 'Invalid invite code' });
    const uid = String(req.user._id);
    if (group.members.map(String).includes(uid)) {
      return res.json(await pop(Group.findById(group._id)));
    }
    if (group.requireApproval) {
      if (!group.joinRequests.map(String).includes(uid)) {
        group.joinRequests.push(req.user._id);
        await group.save();
      }
      return res.json({ pending: true, message: 'Join request sent — waiting for admin approval' });
    }
    group.members.push(req.user._id);
    await group.save();
    await GroupMessage.create({ group: group._id, sender: req.user._id, text: `${req.user.firstName} joined via invite link`, type: 'system' });
    const populated = await pop(Group.findById(group._id));
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/groups/:id/generate-code — generate invite code (admin only)
router.post('/:id/generate-code', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    group.joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    await group.save();
    res.json({ joinCode: group.joinCode });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/groups/:id/settings — toggle requireApproval / adminOnlyMessages (admin only)
router.put('/:id/settings', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    if (req.body.requireApproval !== undefined) group.requireApproval = req.body.requireApproval;
    if (req.body.adminOnlyMessages !== undefined) group.adminOnlyMessages = req.body.adminOnlyMessages;
    await group.save();
    const populated = await pop(Group.findById(group._id));
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/groups/:id/admins/:userId — make admin (admin only)
router.post('/:id/admins/:userId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    if (!group.members.map(String).includes(req.params.userId))
      return res.status(400).json({ message: 'User is not a member' });
    if (!group.admins.map(String).includes(req.params.userId)) {
      group.admins.push(req.params.userId);
      await group.save();
    }
    const populated = await pop(Group.findById(group._id));
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/groups/:id/admins/:userId — remove admin (creator only)
router.delete('/:id/admins/:userId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    if (String(group.creator) !== String(req.user._id))
      return res.status(403).json({ message: 'Only creator can remove admins' });
    if (req.params.userId === String(group.creator))
      return res.status(400).json({ message: 'Cannot remove creator from admins' });
    group.admins = group.admins.filter(a => String(a) !== req.params.userId);
    await group.save();
    const populated = await pop(Group.findById(group._id));
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/groups/:id/requests — pending join requests (admin only)
router.get('/:id/requests', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('joinRequests', 'firstName lastName role designation company avatar');
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    res.json(group.joinRequests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/groups/:id/requests/:userId/approve — approve join request (admin only)
router.post('/:id/requests/:userId/approve', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    group.joinRequests = group.joinRequests.filter(r => String(r) !== req.params.userId);
    if (!group.members.map(String).includes(req.params.userId)) {
      group.members.push(req.params.userId);
    }
    await group.save();
    const populated = await pop(Group.findById(group._id));
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/groups/:id/requests/:userId — reject join request (admin only)
router.delete('/:id/requests/:userId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    group.joinRequests = group.joinRequests.filter(r => String(r) !== req.params.userId);
    await group.save();
    res.json({ message: 'Rejected' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/groups/:id/leave
router.delete('/:id/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    group.members = group.members.filter(m => String(m) !== String(req.user._id));
    group.admins  = group.admins.filter(a => String(a) !== String(req.user._id));
    await group.save();
    res.json({ message: 'Left group' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/groups/:id/members — add member (admin only)
router.post('/:id/members', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    const { userId } = req.body;
    if (!group.members.map(String).includes(userId)) {
      group.members.push(userId);
      await group.save();
    }
    const populated = await pop(Group.findById(group._id));
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/groups/:id/members/:userId — remove member (admin only)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    group.members = group.members.filter(m => String(m) !== req.params.userId);
    group.admins  = group.admins.filter(a => String(a) !== req.params.userId);
    await group.save();
    const populated = await pop(Group.findById(group._id));
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/groups/:id/messages
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isMember = group.members.map(String).includes(String(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Not a member' });
    const msgs = await GroupMessage.find({ group: req.params.id })
      .populate('sender', 'firstName lastName role designation company avatar')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'firstName lastName avatar' } })
      .sort('createdAt');
    res.json(msgs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/groups/:id/messages
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isMember = group.members.map(String).includes(String(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Not a member' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (group.adminOnlyMessages && !isAdmin) {
      return res.status(403).json({ message: 'Only admins can send messages in this community' });
    }
    const { text, type, attachment, replyTo } = req.body;
    const msg = await GroupMessage.create({
      group: req.params.id, sender: req.user._id,
      text: text || '', type: type || 'text',
      attachment: attachment || undefined,
      replyTo: replyTo || null,
    });
    const populated = await GroupMessage.findById(msg._id)
      .populate('sender', 'firstName lastName role designation company avatar')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'firstName lastName avatar' } });
    req.app.get('io')?.to(`group_${req.params.id}`).emit('receive_group_message', populated);
    await Group.findByIdAndUpdate(req.params.id, { updatedAt: new Date() });
    
    // ── Push notification to all group members except sender ──
    const recipientIds = group.members
      .map(String)
      .filter(id => id !== String(req.user._id));
    
    if (recipientIds.length > 0) {
      await sendPushToUsers(recipientIds, {
        title: `${group.name}`,
        body: `${req.user.firstName}: ${(text || '').slice(0, 100) || '📎 Attachment'}`,
        url: `/groups/${req.params.id}`,
        type: 'message',
        data: { groupId: req.params.id, messageId: msg._id },
      });
    }
    
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/groups/:id/messages/:msgId/react — react to group message
router.put('/:id/messages/:msgId/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await GroupMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Not found' });
    const existing = msg.reactions.find(r => String(r.userId) === String(req.user._id));
    if (existing) {
      if (existing.emoji === emoji) msg.reactions = msg.reactions.filter(r => String(r.userId) !== String(req.user._id));
      else existing.emoji = emoji;
    } else {
      msg.reactions.push({ userId: req.user._id, emoji });
    }
    await msg.save();
    req.app.get('io')?.to(`group_${req.params.id}`).emit('group_message:reaction', { messageId: msg._id, reactions: msg.reactions });
    res.json({ reactions: msg.reactions });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/groups/:id/messages/:msgId — delete message
router.delete('/:id/messages/:msgId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const msg = await GroupMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group?.admins.map(String).includes(String(req.user._id));
    const isOwn = String(msg.sender) === String(req.user._id);
    if (!isOwn && !isAdmin) return res.status(403).json({ message: 'Not allowed' });
    await msg.deleteOne();
    req.app.get('io')?.to(`group_${req.params.id}`).emit('group_message:deleted', { messageId: req.params.msgId });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/groups/:id/messages/:msgId/pin — pin/unpin message (admin only)
router.put('/:id/messages/:msgId/pin', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isAdmin = group.admins.map(String).includes(String(req.user._id));
    if (!isAdmin) return res.status(403).json({ message: 'Admins only' });
    const msg = await GroupMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Not found' });
    msg.pinned = !msg.pinned;
    await msg.save();
    req.app.get('io')?.to(`group_${req.params.id}`).emit('group_message:pinned', { messageId: msg._id, pinned: msg.pinned, text: msg.text });
    res.json({ pinned: msg.pinned });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/groups/:id/pinned — get pinned messages
router.get('/:id/pinned', protect, async (req, res) => {
  try {
    const msgs = await GroupMessage.find({ group: req.params.id, pinned: true })
      .populate('sender', 'firstName lastName avatar')
      .sort('-createdAt').limit(10);
    res.json(msgs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/groups/:id/media — get all media messages
router.get('/:id/media', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const isMember = group.members.map(String).includes(String(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Not a member' });
    const msgs = await GroupMessage.find({ group: req.params.id, type: { $in: ['image', 'video', 'file'] } })
      .populate('sender', 'firstName lastName avatar')
      .sort('-createdAt').limit(50);
    res.json(msgs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
