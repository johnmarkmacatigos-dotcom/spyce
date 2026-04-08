// ============================================================
// SPYCE - Challenge Model (Daily Challenge Engine)
// ============================================================
const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 80 },
  description: { type: String, required: true, maxlength: 500 },
  hashtag: { type: String, required: true, unique: true, lowercase: true },
  
  // Timing
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  
  // Rewards (in Pi)
  rewardPool: { type: Number, default: 10 },          // Total Pi pool
  rewardPerParticipant: { type: Number, default: 0.1 }, // Guaranteed per submission
  winnerReward: { type: Number, default: 1 },          // Top video reward
  
  // Sponsor (optional — for marketplace integration)
  sponsor: {
    name: { type: String, default: '' },
    logo: { type: String, default: '' },
    piContribution: { type: Number, default: 0 }
  },
  
  // Stats
  participantsCount: { type: Number, default: 0 },
  submissions: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Video' 
  }],
  
  // Winners (selected at end)
  winners: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    rank: Number,
    reward: Number,
    paid: { type: Boolean, default: false }
  }],
  
  // Thumbnail/Banner
  bannerImage: { type: String, default: '' },
  
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Get today's active challenge
challengeSchema.statics.getActive = function() {
  const now = new Date();
  return this.findOne({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  });
};

module.exports = mongoose.model('Challenge', challengeSchema);
