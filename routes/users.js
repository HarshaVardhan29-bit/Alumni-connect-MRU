const router = require('express').Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/users/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// PUT /api/users/avatar — upload profile picture (base64)
router.put('/avatar', protect, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ message: 'No avatar provided' });
    if (avatar.length > 1.4 * 1024 * 1024) return res.status(400).json({ message: 'Image too large. Max 1MB.' });
    const updated = await User.findByIdAndUpdate(req.user._id, { avatar }, { new: true }).select('-password');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/users/avatar — remove profile picture
router.delete('/avatar', protect, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.user._id, { avatar: '' }, { new: true }).select('-password');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/cover — upload cover photo
router.put('/cover', protect, async (req, res) => {
  try {
    const { cover } = req.body;
    if (!cover) return res.status(400).json({ message: 'No cover provided' });
    if (cover.length > 2 * 1024 * 1024) return res.status(400).json({ message: 'Image too large. Max 2MB.' });
    const updated = await User.findByIdAndUpdate(req.user._id, { cover }, { new: true }).select('-password');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/profile  — update own profile (alias)
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['firstName','lastName','designation','company','industry','bio','batch','skills','careerGoals','targetIndustry','social'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const updated = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true }).select('-password');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/me
router.put('/me', protect, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true, runValidators: true,
    }).select('-password');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/:id/follow — follow or unfollow (handles private accounts)
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id))
      return res.status(400).json({ message: "Can't follow yourself" });

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const myId = String(req.user._id);
    const targetId = String(req.params.id);
    const alreadyFollowing = req.user.following?.map(String).includes(targetId);
    const requestPending = target.followRequests?.map(String).includes(myId);

    if (alreadyFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(myId,    { $pull: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $pull: { followers: myId } });
      return res.json({ following: false, requested: false });
    }

    if (requestPending) {
      // Cancel follow request
      await User.findByIdAndUpdate(targetId, { $pull: { followRequests: myId } });
      return res.json({ following: false, requested: false });
    }

    if (target.isPrivate) {
      // Send follow request
      await User.findByIdAndUpdate(targetId, { $addToSet: { followRequests: myId } });
      return res.json({ following: false, requested: true });
    }

    // Public account — follow directly
    await User.findByIdAndUpdate(myId,    { $addToSet: { following: targetId } });
    await User.findByIdAndUpdate(targetId, { $addToSet: { followers: myId } });
    return res.json({ following: true, requested: false });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/follow-requests — get my pending follow requests
router.get('/follow-requests', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate('followRequests', 'firstName lastName avatar role designation company');
    res.json(me.followRequests || []);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users/follow-requests/:userId/accept
router.post('/follow-requests/:userId/accept', protect, async (req, res) => {
  try {
    const myId = String(req.user._id);
    const requesterId = req.params.userId;
    await User.findByIdAndUpdate(myId, { $pull: { followRequests: requesterId } });
    await User.findByIdAndUpdate(myId,       { $addToSet: { followers: requesterId } });
    await User.findByIdAndUpdate(requesterId, { $addToSet: { following: myId } });
    res.json({ message: 'Accepted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users/follow-requests/:userId/decline
router.post('/follow-requests/:userId/decline', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { followRequests: req.params.userId } });
    res.json({ message: 'Declined' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/privacy — toggle private/public
router.put('/privacy', protect, async (req, res) => {
  try {
    const { isPrivate } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { isPrivate: !!isPrivate },
      { new: true }
    ).select('-password');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/privacy-settings — update privacy settings
router.put('/privacy-settings', protect, async (req, res) => {
  try {
    const allowed = ['isPrivate', 'allowTagging', 'showActivity', 'allowMessages', 'showOnlineStatus'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true }
    ).select('-password');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/notification-settings — update notification settings
router.put('/notification-settings', protect, async (req, res) => {
  try {
    const allowed = ['email', 'push', 'mentions', 'messages', 'follows', 'likes', 'comments'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[`notificationSettings.${k}`] = req.body[k]; });
    
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true }
    ).select('-password');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users/deactivate — deactivate account
router.post('/deactivate', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isActive: false,
      deactivatedAt: new Date()
    });
    res.json({ message: 'Account deactivated successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users/request-data — request data archive
router.post('/request-data', protect, async (req, res) => {
  try {
    // In a real app, this would trigger a background job to generate the archive
    // For now, we'll just log the request
    console.log(`Data archive requested by user ${req.user._id}`);
    res.json({ message: 'Data archive request received. You will receive an email when it\'s ready.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/search?q=name — search users by name
router.get('/search', protect, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);
    const regex = new RegExp(q, 'i');
    const users = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }],
      _id: { $ne: req.user._id },
      isActive: true,
    }).select('firstName lastName role designation company avatar').limit(15);
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/alumni  — list all alumni
router.get('/alumni', protect, async (req, res) => {
  try {
    const alumni = await User.find({ role: 'alumni', isActive: true }).select('-password');
    res.json(alumni);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/:id  — public profile
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
