// ============================================================
// SPYCE - Admin Routes
// Protected by ADMIN_SECRET env variable
// Access: /api/admin/* with header: x-admin-secret: YOUR_SECRET
//
// HOW TO SET UP:
//   Add to your Render environment variables:
//   ADMIN_SECRET=spyce-admin-2024
// ============================================================
const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Video = require('../models/Video');
const User = require('../models/User');
const Listing = require('../models/Listing');

// ── Admin auth middleware ─────────────────────────────────────
const adminAuth = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

router.use(adminAuth);

// ── Dashboard Stats ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [users, videos, listings, activeChallenge] = await Promise.all([
      User.countDocuments(),
      Video.countDocuments({ status: 'active' }),
      Listing.countDocuments({ status: 'active' }),
      Challenge.findOne({ isActive: true }),
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newVideosThisWeek = await Video.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      totals: { users, videos, listings },
      thisWeek: { newUsers: newUsersThisWeek, newVideos: newVideosThisWeek },
      activeChallenge: activeChallenge ? {
        title: activeChallenge.title,
        hashtag: activeChallenge.hashtag,
        participants: activeChallenge.participantsCount,
        endsAt: activeChallenge.endDate,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Seed Challenges ───────────────────────────────────────────
// Visit: https://spyce-api.onrender.com/api/admin/seed-challenges?secret=YOUR_ADMIN_SECRET
// This seeds the database with default challenges
router.get('/seed-challenges', async (req, res) => {
  try {
    await Challenge.deleteMany({});

    const challenges = await Challenge.insertMany([
      {
        title: 'Show Your Culture 🌍',
        description: 'Share something unique about your culture — food, dance, tradition, clothing, or language. Let the world see what makes your home special!',
        hashtag: 'myculture',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        isActive: true,
        rewardPool: 20,
        rewardPerParticipant: 0.1,
        winnerReward: 1,
        participantsCount: 0,
        submissions: [],
        winners: [],
      },
      {
        title: 'Street Food Hunt 🍜',
        description: 'Film your favorite street food or local delicacy. Show us the vendor, the food, and your reaction eating it!',
        hashtag: 'streetfoodspyce',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        isActive: false,
        rewardPool: 20,
        rewardPerParticipant: 0.1,
        winnerReward: 1,
        participantsCount: 0,
        submissions: [],
        winners: [],
      },
      {
        title: 'Talent Drop 🎤',
        description: 'Show off your hidden talent — singing, dancing, magic, beatboxing, art, cooking, anything! 60 seconds to impress.',
        hashtag: 'talentdrop',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        isActive: false,
        rewardPool: 30,
        rewardPerParticipant: 0.15,
        winnerReward: 2,
        participantsCount: 0,
        submissions: [],
        winners: [],
      },
      {
        title: 'Pi Life Hack 💡',
        description: 'Share a life hack or clever trick that makes your daily life easier. Tech, cooking, studying, saving money — anything goes!',
        hashtag: 'spycehack',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        isActive: false,
        rewardPool: 25,
        rewardPerParticipant: 0.1,
        winnerReward: 1.5,
        participantsCount: 0,
        submissions: [],
        winners: [],
      },
      {
        title: 'Morning Routine ☀️',
        description: 'Show us your first 60 seconds after waking up. Real life, no filter. We want to see the real you!',
        hashtag: 'spycemorning',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        isActive: false,
        rewardPool: 15,
        rewardPerParticipant: 0.1,
        winnerReward: 1,
        participantsCount: 0,
        submissions: [],
        winners: [],
      },
      {
        title: 'Market Day 🛒',
        description: 'Take us to your local market — wet market, night market, tiangge, bazaar. Show the products, the atmosphere, and the sellers.',
        hashtag: 'marketday',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        isActive: false,
        rewardPool: 20,
        rewardPerParticipant: 0.1,
        winnerReward: 1,
        participantsCount: 0,
        submissions: [],
        winners: [],
      },
      {
        title: 'Before and After ✨',
        description: 'Show a transformation — room makeover, outfit change, cooking result, artwork, or anything with a dramatic reveal.',
        hashtag: 'spyceglow',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        isActive: false,
        rewardPool: 20,
        rewardPerParticipant: 0.12,
        winnerReward: 1,
        participantsCount: 0,
        submissions: [],
        winners: [],
      },
    ]);

    res.json({
      success: true,
      message: `✅ Inserted ${challenges.length} challenges`,
      active: challenges.find(c => c.isActive)?.title,
      all: challenges.map(c => ({ title: c.title, isActive: c.isActive })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Challenge ──────────────────────────────────────────
router.post('/challenges', async (req, res) => {
  try {
    const {
      title, description, hashtag,
      startDate, endDate,
      rewardPerParticipant, winnerReward, rewardPool,
      bannerImage,
    } = req.body;

    if (!title || !description || !hashtag || !startDate || !endDate) {
      return res.status(400).json({ error: 'title, description, hashtag, startDate, endDate are required' });
    }

    const challenge = new Challenge({
      title, description,
      hashtag: hashtag.toLowerCase().replace(/[^a-z0-9]/g, ''),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      rewardPerParticipant: rewardPerParticipant || 0.1,
      winnerReward: winnerReward || 1,
      rewardPool: rewardPool || 10,
      bannerImage: bannerImage || '',
      isActive: new Date(startDate) <= new Date() && new Date(endDate) >= new Date(),
    });

    await challenge.save();
    res.status(201).json({ success: true, challenge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List All Challenges ───────────────────────────────────────
router.get('/challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find().sort({ startDate: -1 });
    res.json({ challenges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update Challenge ──────────────────────────────────────────
router.put('/challenges/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, challenge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Remove Video (Moderation) ─────────────────────────────────
router.delete('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    video.status = 'removed';
    await video.save();
    res.json({ success: true, message: `Video ${req.params.id} removed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Ban User ──────────────────────────────────────────────────
router.post('/users/:id/ban', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: req.body.ban !== false },
      { new: true }
    );
    res.json({ success: true, isBanned: user.isBanned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Verify User ───────────────────────────────────────────────
router.post('/users/:id/verify', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );
    res.json({ success: true, isVerified: user.isVerified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Recent Users ──────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select('piUsername displayName isVerified isBanned createdAt videosCount piEarnings');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;