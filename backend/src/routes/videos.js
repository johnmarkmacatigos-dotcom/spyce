// ============================================================
// SPYCE - Video Routes
// ============================================================
const express = require('express');
const router = express.Router();

const Video = require('../models/Video');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const { auth, optionalAuth } = require('../middleware/auth');
const { videoUpload, imageUpload, deleteAsset } = require('../services/cloudinary');

/**
 * POST /api/videos/upload
 * Upload a new video
 */
router.post('/upload', auth, videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }
    
    const { title, description, hashtags, challengeId, audioTrack } = req.body;
    
    // Parse hashtags from comma-separated string or JSON array
    let parsedHashtags = [];
    if (hashtags) {
      try {
        parsedHashtags = JSON.parse(hashtags);
      } catch {
        parsedHashtags = hashtags.split(',').map(h => h.trim().toLowerCase().replace('#', ''));
      }
    }
    
    // Get thumbnail URL from Cloudinary eager transformation
    const thumbnailUrl = req.file.eager?.[0]?.secure_url || 
      req.file.path.replace('/upload/', '/upload/so_1,f_jpg/');
    
    const video = new Video({
      creator: req.user._id,
      title: title || '',
      description: description || '',
      hashtags: parsedHashtags,
      videoUrl: req.file.path,
      thumbnailUrl,
      cloudinaryPublicId: req.file.filename,
      duration: req.file.duration || 0,
      audioTrack: audioTrack || '',
      status: 'active',
    });
    
    // Link to challenge if submitted for one
    if (challengeId) {
      const challenge = await Challenge.findById(challengeId);
      if (challenge && challenge.isActive) {
        video.challenge = challengeId;
        video.challengeSubmission = true;
        
        // Add challenge hashtag if not already there
        if (!parsedHashtags.includes(challenge.hashtag)) {
          video.hashtags.push(challenge.hashtag);
        }
        
        challenge.submissions.push(video._id);
        challenge.participantsCount += 1;
        await challenge.save();
        
        // Award participation reward
        req.user.piEarnings += challenge.rewardPerParticipant;
        req.user.piBalance += challenge.rewardPerParticipant;
        req.user.challengesCompleted += 1;
      }
    }
    
    await video.save();
    
    // Update user stats
    req.user.videosCount += 1;
    await req.user.save();
    
    res.status(201).json({ 
      success: true, 
      video: {
        id: video._id,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        title: video.title,
        hashtags: video.hashtags,
      }
    });
    
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed. Please try again.' });
  }
});

/**
 * GET /api/videos/:videoId
 * Get single video details
 */
router.get('/:videoId', optionalAuth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId)
      .populate('creator', 'piUsername displayName avatar isVerified')
      .populate('challenge', 'title hashtag');
    
    if (!video || video.status === 'removed') {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Increment view count
    video.viewsCount += 1;
    video.updateAlgorithmScore();
    await video.save();
    
    // Check if current user liked it
    const isLiked = req.user ? video.likes.includes(req.user._id) : false;
    
    res.json({
      video: {
        ...video.toObject(),
        isLiked,
        likes: undefined, // Don't send the full likes array
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

/**
 * POST /api/videos/:videoId/like
 * Toggle like on a video
 */
router.post('/:videoId/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    const userId = req.user._id;
    const likeIndex = video.likes.indexOf(userId);
    
    if (likeIndex === -1) {
      // Like
      video.likes.push(userId);
      video.likesCount += 1;
      
      // Update creator's total likes
      await User.findByIdAndUpdate(video.creator, { $inc: { totalLikes: 1 } });
      
      // Send notification to creator (if not self-like)
      if (video.creator.toString() !== userId.toString()) {
        await User.findByIdAndUpdate(video.creator, {
          $push: {
            notifications: {
              type: 'like',
              from: userId,
              message: `${req.user.displayName} liked your video`,
            }
          }
        });
      }
    } else {
      // Unlike
      video.likes.splice(likeIndex, 1);
      video.likesCount = Math.max(0, video.likesCount - 1);
      await User.findByIdAndUpdate(video.creator, { $inc: { totalLikes: -1 } });
    }
    
    video.updateAlgorithmScore();
    await video.save();
    
    res.json({ 
      isLiked: likeIndex === -1, 
      likesCount: video.likesCount 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update like' });
  }
});

/**
 * POST /api/videos/:videoId/comment
 * Add a comment
 */
router.post('/:videoId/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }
    
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    const comment = {
      user: req.user._id,
      text: text.trim().slice(0, 200),
    };
    
    video.comments.push(comment);
    video.commentsCount += 1;
    video.updateAlgorithmScore();
    await video.save();
    
    // Notify creator
    if (video.creator.toString() !== req.user._id.toString()) {
      await User.findByIdAndUpdate(video.creator, {
        $push: {
          notifications: {
            type: 'comment',
            from: req.user._id,
            message: `${req.user.displayName} commented: "${text.slice(0, 50)}"`,
          }
        }
      });
    }
    
    const newComment = video.comments[video.comments.length - 1];
    
    res.status(201).json({ 
      comment: {
        ...newComment.toObject(),
        user: {
          _id: req.user._id,
          piUsername: req.user.piUsername,
          displayName: req.user.displayName,
          avatar: req.user.avatar,
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * GET /api/videos/:videoId/comments
 * Get comments for a video
 */
router.get('/:videoId/comments', async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId)
      .select('comments')
      .populate('comments.user', 'piUsername displayName avatar');
    
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    const comments = video.comments
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * DELETE /api/videos/:videoId
 * Delete own video
 */
router.delete('/:videoId', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    if (video.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }
    
    // Delete from Cloudinary
    if (video.cloudinaryPublicId) {
      await deleteAsset(video.cloudinaryPublicId, 'video');
    }
    
    video.status = 'removed';
    await video.save();
    
    await User.findByIdAndUpdate(req.user._id, { $inc: { videosCount: -1 } });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

/**
 * GET /api/videos/user/:userId
 * Get all videos from a specific user
 */
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    
    const videos = await Video.find({
      creator: req.params.userId,
      status: 'active',
      isPublic: { type: Boolean, default: true }
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('creator', 'piUsername displayName avatar');
    
    res.json({ videos, page, hasMore: videos.length === limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user videos' });
  }
});

// POST /api/videos/save — Save video metadata after direct Cloudinary upload
router.post('/save', auth, async (req, res) => {
  try {
    const {
      videoUrl, thumbnailUrl, cloudinaryPublicId,
      duration, description, hashtags, audioTrack,
      audioTrackUrl, challengeId, trimStart, trimEnd,
      videoVolume, musicVolume
    } = req.body;

    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });

    let parsedHashtags = [];
    if (hashtags) {
      try { parsedHashtags = JSON.parse(hashtags); }
      catch { parsedHashtags = hashtags.split(',').map(h => h.trim().toLowerCase().replace('#', '')).filter(Boolean); }
    }

    const video = new Video({
      creator: req.user._id,
      title: '',
      description: description || '',
      hashtags: parsedHashtags,
      videoUrl,
      thumbnailUrl: thumbnailUrl || '',
      cloudinaryPublicId: cloudinaryPublicId || '',
      duration: parseFloat(duration) || 0,
      audioTrack: audioTrack || '',
      status: 'active',
    });

    if (challengeId) {
      const Challenge = require('../models/Challenge');
      const challenge = await Challenge.findById(challengeId);
      if (challenge && challenge.isActive) {
        video.challenge = challengeId;
        video.challengeSubmission = true;
        if (!parsedHashtags.includes(challenge.hashtag)) video.hashtags.push(challenge.hashtag);
        challenge.submissions.push(video._id);
        challenge.participantsCount += 1;
        await challenge.save();
        req.user.piEarnings += challenge.rewardPerParticipant;
        req.user.piBalance += challenge.rewardPerParticipant;
        req.user.challengesCompleted += 1;
      }
    }

    await video.save();
    req.user.videosCount += 1;
    await req.user.save();

    res.status(201).json({ success: true, video: { id: video._id, videoUrl: video.videoUrl } });
  } catch (err) {
    console.error('Save video error:', err);
    res.status(500).json({ error: err.message || 'Failed to save video' });
  }
});

module.exports = router;
