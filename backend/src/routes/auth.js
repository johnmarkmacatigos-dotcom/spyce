// ============================================================
// SPYCE - Auth Routes
// Pi Network is the ONLY auth method — no passwords needed
// ============================================================
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const { verifyPioneer } = require('../services/piNetwork');
const { auth } = require('../middleware/auth');

/**
 * POST /api/auth/pi
 * Authenticate with Pi Network access token
 * 
 * Body: { accessToken: string, username: string }
 * 
 * Flow:
 * 1. Frontend calls Pi.authenticate() → gets accessToken + username
 * 2. Frontend sends accessToken + username to this endpoint
 * 3. We verify with Pi /me endpoint
 * 4. Create or update user in DB
 * 5. Return our JWT for subsequent API calls
 */
router.post('/pi', async (req, res) => {
  try {
    const { accessToken, username } = req.body;
    
    if (!accessToken || !username) {
      return res.status(400).json({ error: 'accessToken and username are required' });
    }
    
    // CRITICAL: Verify with Pi Network — don't trust client-provided data alone
    let piUser;
    try {
      piUser = await verifyPioneer(accessToken);
    } catch (err) {
      return res.status(401).json({ error: 'Pi Network verification failed. Please try again.' });
    }
    
    // piUser = { uid: string, username: string }
    const { uid, username: verifiedUsername } = piUser;
    
    // Find or create user
    let user = await User.findOne({ piUid: uid });
    
    if (!user) {
      // New user — register
      user = new User({
        piUid: uid,
        piUsername: verifiedUsername,
        displayName: verifiedUsername,
      });
      
      // Handle referral code if provided
      if (req.body.referralCode) {
        const referrer = await User.findOne({ referralCode: req.body.referralCode });
        if (referrer) {
          user.referredBy = referrer.piUsername;
          referrer.referralCount += 1;
          // TODO: Trigger referral reward payment when they complete first challenge
          await referrer.save();
        }
      }
      
      await user.save();
      console.log(`✅ New user registered: ${verifiedUsername}`);
    } else {
      // Existing user — update username if changed in Pi
      if (user.piUsername !== verifiedUsername) {
        user.piUsername = verifiedUsername;
        await user.save();
      }
    }
    
    // Generate our JWT (7 day expiry)
    const token = jwt.sign(
      { userId: user._id, piUid: uid },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: user.toPublicProfile(),
      isNewUser: !user.createdAt || 
        (Date.now() - user.createdAt.getTime()) < 5000
    });
    
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user's full profile
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-notifications');
    res.json({ user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/auth/notifications
 * Get user's notifications (unread first)
 */
router.get('/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('notifications')
      .populate('notifications.from', 'piUsername displayName avatar');
    
    const sorted = user.notifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    
    res.json({ notifications: sorted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/auth/notifications/read
 * Mark all notifications as read
 */
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
