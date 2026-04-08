// ============================================================
// SPYCE - User Routes
// ============================================================
const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Video = require('../models/Video');
const { auth, optionalAuth } = require('../middleware/auth');
const { imageUpload } = require('../services/cloudinary');

// GET /api/users/:username — Public profile
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ piUsername: req.params.username })
      .select('-notifications -piBalance -piEarnings');

    if (!user || user.isBanned) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = req.user
      ? user.followers.includes(req.user._id)
      : false;

    res.json({ user: { ...user.toPublicProfile(), isFollowing } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/profile — Update own profile
router.put('/profile', auth, imageUpload.single('avatar'), async (req, res) => {
  try {
    const { displayName, bio } = req.body;
    const updates = {};

    if (displayName) updates.displayName = displayName.trim().slice(0, 50);
    if (bio !== undefined) updates.bio = bio.slice(0, 150);
    if (req.file) updates.avatar = req.file.path;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/users/:userId/follow — Follow/unfollow
router.post('/:userId/follow', auth, async (req, res) => {
  try {
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const isFollowing = target.followers.includes(req.user._id);

    if (isFollowing) {
      // Unfollow
      target.followers.pull(req.user._id);
      target.followersCount = Math.max(0, target.followersCount - 1);
      req.user.following.pull(target._id);
      req.user.followingCount = Math.max(0, req.user.followingCount - 1);
    } else {
      // Follow
      target.followers.push(req.user._id);
      target.followersCount += 1;
      req.user.following.push(target._id);
      req.user.followingCount += 1;

      // Check if target should become a creator
      if (target.followersCount >= 100 && !target.isCreator) {
        target.isCreator = true;
      }

      // Notify target
      target.notifications.push({
        type: 'follow',
        from: req.user._id,
        message: `${req.user.displayName} started following you`,
      });
    }

    await Promise.all([target.save(), req.user.save()]);

    res.json({
      isFollowing: !isFollowing,
      followersCount: target.followersCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update follow' });
  }
});

// GET /api/users/:userId/followers
router.get('/:userId/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'piUsername displayName avatar isVerified followersCount');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ followers: user.followers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /api/users/:userId/following
router.get('/:userId/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'piUsername displayName avatar isVerified followersCount');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ following: user.following });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

module.exports = router;
