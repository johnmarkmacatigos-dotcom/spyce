// ============================================================
// SPYCE - Payment / Transaction Model
// ============================================================
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Pi Network identifiers
  piPaymentId: { type: String, unique: true, sparse: true },
  txid: { type: String, default: null },
  
  // Parties
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Amount
  amount: { type: Number, required: true, min: 0.001 },
  currency: { type: String, default: 'Pi' },
  
  // Payment Type
  type: {
    type: String,
    enum: [
      'tip',           // Viewer tips a creator
      'marketplace',   // Purchase in marketplace
      'challenge_reward', // Won a challenge
      'referral',      // Referral bonus
      'subscription',  // Creator subscription (future)
    ],
    required: true
  },
  
  // Reference (what was purchased/tipped)
  referenceType: { type: String, enum: ['Video', 'Listing', 'Challenge', 'User'] },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  
  // Status tracking (mirrors Pi Network payment flow)
  status: {
    type: String,
    enum: [
      'pending',           // Created, waiting server approval
      'approved',          // Server approved, waiting blockchain
      'completed',         // Blockchain confirmed + server completed
      'cancelled',         // Cancelled by user or system
      'failed'             // Failed
    ],
    default: 'pending'
  },
  
  // Pi Network status flags
  piStatus: {
    developer_approved: { type: Boolean, default: false },
    transaction_verified: { type: Boolean, default: false },
    developer_completed: { type: Boolean, default: false },
    canceled: { type: Boolean, default: false },
  },
  
  // Metadata
  memo: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

paymentSchema.index({ from: 1, createdAt: -1 });
paymentSchema.index({ to: 1, createdAt: -1 });
paymentSchema.index({ piPaymentId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
