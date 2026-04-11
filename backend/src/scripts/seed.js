require('dotenv').config();
const mongoose = require('mongoose');

const Challenge = require('./src/models/Challenge');

const CHALLENGES = [
  { title: 'Show Your Culture', description: 'Share something unique about your culture — food, dance, tradition, or language.', hashtag: 'myculture', rewardPerParticipant: 0.1, winnerReward: 1, rewardPool: 20 },
  { title: 'Street Food Hunt', description: 'Film your favorite street food or local delicacy. Show us the vendor and your reaction!', hashtag: 'streetfoodspyce', rewardPerParticipant: 0.1, winnerReward: 1, rewardPool: 20 },
  { title: 'Talent Drop', description: 'Show off your hidden talent — singing, dancing, magic, art, cooking, anything!', hashtag: 'talentdrop', rewardPerParticipant: 0.15, winnerReward: 2, rewardPool: 30 },
  { title: 'Morning Routine', description: 'Show us your first 60 seconds after waking up. Real life, no filter.', hashtag: 'spycemorning', rewardPerParticipant: 0.1, winnerReward: 1, rewardPool: 15 },
  { title: 'Pi Life Hack', description: 'Share a life hack or clever trick that makes your daily life easier.', hashtag: 'spycehack', rewardPerParticipant: 0.1, winnerReward: 1.5, rewardPool: 25 },
  { title: 'Market Day', description: 'Take us to your local market. Show the products, atmosphere, and sellers.', hashtag: 'marketday', rewardPerParticipant: 0.1, winnerReward: 1, rewardPool: 20 },
  { title: 'Before and After', description: 'Show a transformation — room makeover, outfit change, cooking result, or artwork.', hashtag: 'spyceglow', rewardPerParticipant: 0.12, winnerReward: 1, rewardPool: 20 },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  const existing = await Challenge.countDocuments();
  if (existing > 0) { console.log('Challenges already exist. Skipping.'); process.exit(0); }
  const now = new Date(); now.setHours(0,0,0,0);
  const docs = CHALLENGES.map((c, i) => {
    const start = new Date(now); start.setDate(start.getDate() + i);
    const end = new Date(start); end.setDate(end.getDate() + 1); end.setHours(23,59,59,999);
    return { ...c, startDate: start, endDate: end, isActive: i === 0 };
  });
  await Challenge.insertMany(docs);
  console.log('Seeded ' + docs.length + ' challenges!');
  process.exit(0);
}
seed().catch(e => { console.error(e); process.exit(1); });
