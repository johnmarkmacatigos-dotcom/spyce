// ============================================================
// SPYCE - Earnings Routes
// ============================================================
const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Payment = require('../models/Payment');
const Video = require('../models/Video');
const { auth } = require('../middleware/auth');

// GET /api/earnings — Full earnings dashboard data
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Last 30 days of completed incoming payments
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [incomingPayments, topVideos, user] = await Promise.all([
      Payment.find({
        to: userId,
        status: 'completed',
        createdAt: { $gte: thirtyDaysAgo }
      }).sort({ createdAt: -1 }).limit(50),

      Video.find({ creator: userId, status: 'active' })
        .sort({ tipsReceived: -1, likesCount: -1 })
        .limit(5)
        .select('title thumbnailUrl likesCount viewsCount tipsReceived'),

      User.findById(userId).select('piBalance piEarnings piSpent challengesCompleted referralCount'),
    ]);

    // Calculate breakdown by type
    const breakdown = incomingPayments.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + p.amount;
      return acc;
    }, {});

    // Daily earnings for chart (last 7 days)
    const dailyEarnings = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayPayments = incomingPayments.filter(p =>
        p.createdAt >= day && p.createdAt < nextDay
      );
      const total = dayPayments.reduce((sum, p) => sum + p.amount, 0);

      dailyEarnings.push({
        date: day.toLocaleDateString('en-US', { weekday: 'short' }),
        amount: parseFloat(total.toFixed(4))
      });
    }

    res.json({
      balance: user.piBalance,
      totalEarned: user.piEarnings,
      totalSpent: user.piSpent,
      challengesCompleted: user.challengesCompleted,
      referralCount: user.referralCount,
      breakdown,
      dailyEarnings,
      topVideos,
      recentPayments: incomingPayments.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch earnings data' });
  }
});

module.exports = router;
