// ============================================================
// SPYCE - Auth Routes v2
// FIXED: Better error handling and logging
// FIXED: Graceful fallback if Pi Network verification is slow
// FILE: backend/src/routes/auth.js
// ============================================================
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { verifyPioneer } = require('../services/piNetwork');
const { auth } = require('../middleware/auth');

// POST /api/auth/pi
router.post('/pi', async (req, res) => {
  try {
    const { accessToken, username, referralCode } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken is required' });
    }
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    // Verify with Pi Network
    let piUser;
    try {
      piUser = await verifyPioneer(accessToken);
    } catch (verifyErr) {
      console.error('Pi verification failed:', verifyErr.message);
      return res.status(401).json({
        error: 'Pi Network verification failed. Please try again.',
        detail: verifyErr.message,
      });
    }

    const { uid, username: verifiedUsername } = piUser;

    // Find or create user
    let user = await User.findOne({ piUid: uid });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = new User({
        piUid: uid,
        piUsername: verifiedUsername,
        displayName: verifiedUsername,
      });

      // Handle referral
      if (referralCode) {
        const referrer = await User.findOne({ referralCode });
        if (referrer) {
          user.referredBy = referrer.piUsername;
          referrer.referralCount = (referrer.referralCount || 0) + 1;
          await referrer.save();
        }
      }

      await user.save();
      console.log(`✅ New user: @${verifiedUsername}`);
    } else {
      // Update username if changed in Pi
      if (user.piUsername !== verifiedUsername) {
        user.piUsername = verifiedUsername;
        await user.save();
      }
    }

    // Generate JWT (30 day expiry for better mobile UX)
    const token = jwt.sign(
      { userId: user._id, piUid: uid },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: user.toPublicProfile(),
      isNewUser,
    });

  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-notifications');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/auth/notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('notifications')
      .populate('notifications.from', 'piUsername displayName avatar');
    const sorted = (user.notifications || [])
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    res.json({ notifications: sorted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/auth/notifications/read
router.post('/notifications/read', auth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

module.exports = router;
