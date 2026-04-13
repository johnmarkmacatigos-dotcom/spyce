// ============================================================
// SPYCE - Challenge Routes
// ============================================================
const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');

// GET /api/challenges/active
router.get('/active', async (req, res) => {
  try {
    // First try date-aware active challenge
    let challenge = await Challenge.getActive();
    // Fallback: any challenge with isActive: true
    if (!challenge) {
      challenge = await Challenge.findOne({ isActive: true });
    }
    if (!challenge) {
      return res.json({ challenge: null, message: 'No active challenge right now.' });
    }
    res.json({ challenge });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

// GET /api/challenges
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const challenges = await Challenge.find()
      .sort({ startDate: -1 })
      .skip((page - 1) * 10)
      .limit(10);
    res.json({ challenges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// GET /api/challenges/:id
router.get('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate({
        path: 'submissions',
        match: { status: 'active' },
        options: { sort: { likesCount: -1 }, limit: 20 },
        populate: { path: 'creator', select: 'piUsername displayName avatar' }
      });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json({ challenge });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

module.exports = router;
