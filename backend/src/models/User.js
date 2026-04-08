// ============================================================
// SPYCE - User Model
// ============================================================
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Pi Network Identity
  piUid: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  piUsername: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },

  // Profile
  displayName: { type: String, trim: true },
  bio: { type: String, maxlength: 150, default: '' },
  avatar: { type: String, default: '' }, // Cloudinary URL
  coverPhoto: { type: String, default: '' },
  
  // Social
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  
  // Content Stats
  videosCount: { type: Number, default: 0 },
  totalLikes: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  
  // Pi Economy
  piEarnings: { type: Number, default: 0 },        // Total Pi earned lifetime
  piBalance: { type: Number, default: 0 },           // Available to withdraw
  piSpent: { type: Number, default: 0 },             // Total Pi spent in marketplace
  challengesCompleted: { type: Number, default: 0 },
  referralCode: { type: String, unique: true },
  referredBy: { type: String, default: null },       // piUsername of referrer
  referralCount: { type: Number, default: 0 },
  
  // Status
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  isCreator: { type: Boolean, default: false },      // Unlocked after 100 followers
  
  // Marketplace
  sellerRating: { type: Number, default: 0, min: 0, max: 5 },
  sellerRatingCount: { type: Number, default: 0 },
  
  // Notifications
  notifications: [{
    type: { type: String }, // 'like', 'comment', 'follow', 'payment', 'challenge'
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Settings
  settings: {
    privateAccount: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
  },
  
  lastSeen: { type: Date, default: Date.now },
  joinedAt: { type: Date, default: Date.now },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: Public profile (safe to send to clients)
userSchema.methods.toPublicProfile = function() {
  return {
    id: this._id,
    piUsername: this.piUsername,
    displayName: this.displayName || this.piUsername,
    bio: this.bio,
    avatar: this.avatar,
    coverPhoto: this.coverPhoto,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    videosCount: this.videosCount,
    totalLikes: this.totalLikes,
    isVerified: this.isVerified,
    isCreator: this.isCreator,
    sellerRating: this.sellerRating,
    sellerRatingCount: this.sellerRatingCount,
    joinedAt: this.joinedAt,
  };
};

// Generate unique referral code on creation
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = this.piUsername.slice(0, 4).toUpperCase() + 
      Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  if (!this.displayName) {
    this.displayName = this.piUsername;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
