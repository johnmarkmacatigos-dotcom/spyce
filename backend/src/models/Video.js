// ============================================================
// SPYCE - Video Model
// ============================================================
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 200 },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const videoSchema = new mongoose.Schema({
  creator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  
  // Content
  title: { type: String, maxlength: 100, default: '' },
  description: { type: String, maxlength: 500, default: '' },
  hashtags: [{ type: String, trim: true, lowercase: true }],
  
  // Media (Cloudinary)
  videoUrl: { type: String, required: true },       // Cloudinary video URL
  thumbnailUrl: { type: String, default: '' },       // Auto-generated thumbnail
  cloudinaryPublicId: { type: String },              // For deletion
  duration: { type: Number, default: 0 },            // Seconds
  
  // Engagement
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },
  comments: [commentSchema],
  commentsCount: { type: Number, default: 0 },
  
  // Pi Economy
  tipsReceived: { type: Number, default: 0 },        // Total Pi tips from viewers
  earningsFromChallenge: { type: Number, default: 0 },
  
  // Challenge Link
  challenge: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Challenge', 
    default: null 
  },
  challengeSubmission: { type: Boolean, default: false },
  
  // Feed Algorithm Score
  algorithmScore: { type: Number, default: 0 },
  
  // Status
  status: { 
    type: String, 
    enum: ['processing', 'active', 'removed', 'flagged'], 
    default: 'processing' 
  },
  isPublic: { type: Boolean, default: true },
  
  // Audio
  audioTrack: { type: String, default: '' },         // Song/audio name
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for feed queries
videoSchema.index({ createdAt: -1, algorithmScore: -1 });
videoSchema.index({ hashtags: 1 });
videoSchema.index({ creator: 1, status: 1 });

// Update algorithm score when engagement changes
videoSchema.methods.updateAlgorithmScore = function() {
  const age = (Date.now() - this.createdAt) / (1000 * 60 * 60); // hours old
  const decay = Math.max(0, 1 - (age / 72)); // decays over 72 hours
  
  this.algorithmScore = (
    (this.likesCount * 2) +
    (this.commentsCount * 3) +
    (this.sharesCount * 4) +
    (this.viewsCount * 0.1) +
    (this.tipsReceived * 10)
  ) * decay;
};

module.exports = mongoose.model('Video', videoSchema);
