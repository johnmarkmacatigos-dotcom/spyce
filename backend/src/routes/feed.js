// ============================================================
// SPYCE - Feed Routes (Algorithm + Following)
// ============================================================
const express = require('express');
const router = express.Router();

const Video = require('../models/Video');
const { optionalAuth } = require('../middleware/auth');

/**
 * GET /api/feed
 * Main For You Page (FYP) feed
 * 
 * Algorithm factors:
 * - Recent videos (last 7 days weighted higher)
 * - Engagement score (likes × 2, comments × 3, shares × 4)
 * - Following boost (videos from people you follow score 20% higher)
 * - Diversity (don't show same creator twice in a row)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const seenIds = req.query.seen ? req.query.seen.split(',') : [];
    
    // Get following list if authenticated
    let followingIds = [];
    if (req.user) {
      const User = require('../models/User');
      const user = await User.findById(req.user._id).select('following');
      followingIds = user.following.map(id => id.toString());
    }
    
    // Build query
    const query = {
      status: 'active',
      isPublic: true,
    };
    
    // Exclude already-seen videos
    if (seenIds.length > 0) {
      query._id = { $nin: seenIds };
    }
    
    // Get recent videos (last 7 days) with score
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: sevenDaysAgo };
    
    let videos = await Video.find(query)
      .sort({ algorithmScore: -1, createdAt: -1 })
      .limit(limit * 3) // Fetch more for deduplication
      .populate('creator', 'piUsername displayName avatar isVerified followersCount')
      .populate('challenge', 'title hashtag')
      .lean();
    
    // Boost following videos
    if (followingIds.length > 0) {
      videos = videos.map(v => ({
        ...v,
        _boostScore: followingIds.includes(v.creator._id.toString()) 
          ? (v.algorithmScore * 1.2) 
          : v.algorithmScore
      }));
      videos.sort((a, b) => b._boostScore - a._boostScore);
    }
    
    // Remove creator duplicates (diversity)
    const seenCreators = new Set();
    const diverseFeed = [];
    for (const video of videos) {
      const creatorId = video.creator._id.toString();
      if (!seenCreators.has(creatorId) || diverseFeed.length < 3) {
        diverseFeed.push(video);
        seenCreators.add(creatorId);
      }
      if (diverseFeed.length >= limit) break;
    }
    
    // If not enough recent content, fill with older content
    if (diverseFeed.length < limit) {
      const olderVideos = await Video.find({
        status: 'active',
        isPublic: true,
        _id: { $nin: [...seenIds, ...diverseFeed.map(v => v._id)] },
      })
        .sort({ algorithmScore: -1 })
        .limit(limit - diverseFeed.length)
        .populate('creator', 'piUsername displayName avatar isVerified')
        .lean();
      
      diverseFeed.push(...olderVideos);
    }
    
    // Add isLiked flag for authenticated users
    const feedVideos = diverseFeed.map(video => ({
      id: video._id,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      description: video.description,
      hashtags: video.hashtags,
      audioTrack: video.audioTrack,
      duration: video.duration,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      sharesCount: video.sharesCount,
      viewsCount: video.viewsCount,
      tipsReceived: video.tipsReceived,
      creator: video.creator,
      challenge: video.challenge,
      challengeSubmission: video.challengeSubmission,
      createdAt: video.createdAt,
      isLiked: req.user 
        ? (video.likes || []).some(id => id.toString() === req.user._id.toString())
        : false,
    }));
    
    res.json({ 
      videos: feedVideos,
      page,
      hasMore: feedVideos.length === limit
    });
    
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Failed to load feed' });
  }
});

/**
 * GET /api/feed/following
 * Feed from people you follow only
 */
router.get('/following', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Login to see following feed' });
    }
    
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('following');
    
    if (!user.following.length) {
      return res.json({ videos: [], message: 'Follow some creators to see their videos here!' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    
    const videos = await Video.find({
      creator: { $in: user.following },
      status: 'active',
      isPublic: true,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('creator', 'piUsername displayName avatar isVerified')
      .lean();
    
    res.json({ videos, page, hasMore: videos.length === limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load following feed' });
  }
});

/**
 * GET /api/feed/trending
 * Trending videos (last 24hrs, highest engagement)
 */
router.get('/trending', async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const videos = await Video.find({
      status: 'active',
      isPublic: true,
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ algorithmScore: -1 })
      .limit(20)
      .populate('creator', 'piUsername displayName avatar isVerified')
      .lean();
    
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load trending' });
  }
});

/**
 * GET /api/feed/search
 * Search videos by hashtag or keyword
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query required' });
    
    const query = q.toLowerCase().replace('#', '');
    const limit = 20;
    
    const [byHashtag, byTitle] = await Promise.all([
      Video.find({
        status: 'active',
        hashtags: { $in: [query] }
      }).limit(limit).populate('creator', 'piUsername displayName avatar'),
      
      Video.find({
        status: 'active',
        title: { $regex: q, $options: 'i' }
      }).limit(limit).populate('creator', 'piUsername displayName avatar'),
    ]);
    
    // Merge and deduplicate
    const seen = new Set();
    const results = [];
    for (const v of [...byHashtag, ...byTitle]) {
      if (!seen.has(v._id.toString())) {
        seen.add(v._id.toString());
        results.push(v);
      }
    }
    
    res.json({ videos: results.slice(0, limit), query });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
