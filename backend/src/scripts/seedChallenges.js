// ============================================================
// SPYCE - Challenge Seeder Script
// Run on Render Shell to insert challenges directly
// HOW TO RUN:
// 1. Go to render.com → spyce-api → Shell
// 2. Type: node src/scripts/seedChallenges.js
// ============================================================
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const challengeSchema = new mongoose.Schema({
  title: String, description: String, hashtag: String,
  startDate: Date, endDate: Date, isActive: Boolean,
  rewardPool: Number, rewardPerParticipant: Number, winnerReward: Number,
  participantsCount: { type: Number, default: 0 },
  submissions: [], winners: [],
}, { timestamps: true });

const Challenge = mongoose.model('Challenge', challengeSchema);

const challenges = [
  {
    title: 'Show Your Culture 🌍',
    description: 'Share something unique about your culture — food, dance, tradition, clothing, or language. Let the world see what makes your home special!',
    hashtag: 'myculture',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-12-31'),
    isActive: true,
    rewardPool: 20, rewardPerParticipant: 0.1, winnerReward: 1,
    participantsCount: 0, submissions: [], winners: [],
  },
  {
    title: 'Street Food Hunt 🍜',
    description: 'Film your favorite street food or local delicacy!',
    hashtag: 'streetfoodspyce',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-12-31'),
    isActive: false,
    rewardPool: 20, rewardPerParticipant: 0.1, winnerReward: 1,
    participantsCount: 0, submissions: [], winners: [],
  },
  {
    title: 'Talent Drop 🎤',
    description: 'Show off your hidden talent — singing, dancing, magic, anything!',
    hashtag: 'talentdrop',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-12-31'),
    isActive: false,
    rewardPool: 30, rewardPerParticipant: 0.15, winnerReward: 2,
    participantsCount: 0, submissions: [], winners: [],
  },
  {
    title: 'Pi Life Hack 💡',
    description: 'Share a life hack or clever trick that makes your daily life easier!',
    hashtag: 'spycehack',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-12-31'),
    isActive: false,
    rewardPool: 25, rewardPerParticipant: 0.1, winnerReward: 1.5,
    participantsCount: 0, submissions: [], winners: [],
  },
  {
    title: 'Morning Routine ☀️',
    description: 'Show us your first 60 seconds after waking up. Real life, no filter!',
    hashtag: 'spycemorning',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-12-31'),
    isActive: false,
    rewardPool: 15, rewardPerParticipant: 0.1, winnerReward: 1,
    participantsCount: 0, submissions: [], winners: [],
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    await Challenge.deleteMany({});
    console.log('🗑️ Cleared old challenges');
    const result = await Challenge.insertMany(challenges);
    console.log(`✅ Inserted ${result.length} challenges`);
    console.log('Active challenge:', result.find(c => c.isActive)?.title);
    await mongoose.disconnect();
    console.log('✅ Done! Challenge page will now show the active challenge.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
