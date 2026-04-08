// ============================================================
// SPYCE - Pi Payment Routes
// Implements the full Pi Network payment flow:
// Client SDK → onReadyForServerApproval → /approve
//           → onReadyForServerCompletion → /complete
// ============================================================
const express = require('express');
const router = express.Router();

const Payment = require('../models/Payment');
const User = require('../models/User');
const Video = require('../models/Video');
const { auth } = require('../middleware/auth');
const { approvePayment, completePayment, getPayment } = require('../services/piNetwork');

/**
 * POST /api/payments/approve
 * Called by frontend when Pi SDK fires onReadyForServerApproval
 * 
 * This is STEP 1 of Pi payment flow (server-side)
 * The SDK gives us paymentId — we approve it so user can submit to blockchain
 */
router.post('/approve', auth, async (req, res) => {
  try {
    const { paymentId, type, referenceId, referenceType, amount, toUserId, memo } = req.body;
    
    if (!paymentId || !type) {
      return res.status(400).json({ error: 'paymentId and type are required' });
    }
    
    // Check if payment already exists (idempotency)
    let payment = await Payment.findOne({ piPaymentId: paymentId });
    
    if (!payment) {
      // Create payment record in our DB
      const toUser = toUserId ? await User.findById(toUserId) : null;
      
      payment = new Payment({
        piPaymentId: paymentId,
        from: req.user._id,
        to: toUser?._id || req.user._id, // Default to self for challenge rewards
        amount: amount || 0,
        type,
        referenceType,
        referenceId,
        memo: memo || '',
        status: 'pending',
        metadata: { initiatedBy: req.user.piUsername }
      });
      
      await payment.save();
    }
    
    // Call Pi Network to approve
    const piPaymentDTO = await approvePayment(paymentId);
    
    // Update our record
    payment.piStatus.developer_approved = true;
    payment.status = 'approved';
    await payment.save();
    
    res.json({ 
      success: true, 
      paymentId,
      message: 'Payment approved. Awaiting blockchain confirmation.'
    });
    
  } catch (err) {
    console.error('Payment approve error:', err);
    res.status(500).json({ error: err.message || 'Failed to approve payment' });
  }
});

/**
 * POST /api/payments/complete
 * Called by frontend when Pi SDK fires onReadyForServerCompletion
 * 
 * This is STEP 2 of Pi payment flow (server-side)
 * The SDK gives us paymentId + txid — we complete it
 */
router.post('/complete', auth, async (req, res) => {
  try {
    const { paymentId, txid } = req.body;
    
    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'paymentId and txid are required' });
    }
    
    // Find our payment record
    const payment = await Payment.findOne({ piPaymentId: paymentId });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found in our system' });
    }
    
    if (payment.status === 'completed') {
      return res.json({ success: true, message: 'Payment already completed' });
    }
    
    // Call Pi Network to complete
    const piPaymentDTO = await completePayment(paymentId, txid);
    
    // Update our record
    payment.txid = txid;
    payment.piStatus.transaction_verified = true;
    payment.piStatus.developer_completed = true;
    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();
    
    // ── Post-completion actions based on payment type ─────────
    await handlePaymentCompletion(payment);
    
    res.json({ 
      success: true, 
      message: 'Payment completed successfully!',
      txid
    });
    
  } catch (err) {
    console.error('Payment complete error:', err);
    res.status(500).json({ error: err.message || 'Failed to complete payment' });
  }
});

/**
 * Handle post-payment actions (update balances, records)
 */
async function handlePaymentCompletion(payment) {
  try {
    switch (payment.type) {
      case 'tip': {
        // Update creator's earnings
        await User.findByIdAndUpdate(payment.to, {
          $inc: { piEarnings: payment.amount, piBalance: payment.amount }
        });
        // Update video tips
        if (payment.referenceId) {
          await Video.findByIdAndUpdate(payment.referenceId, {
            $inc: { tipsReceived: payment.amount }
          });
        }
        // Notify creator
        await User.findByIdAndUpdate(payment.to, {
          $push: {
            notifications: {
              type: 'payment',
              from: payment.from,
              message: `You received ${payment.amount}π tip!`
            }
          }
        });
        break;
      }
      
      case 'marketplace': {
        // Update seller earnings
        const platformFee = payment.amount * 0.05; // 5% platform fee
        const sellerEarnings = payment.amount - platformFee;
        
        await User.findByIdAndUpdate(payment.to, {
          $inc: { piEarnings: sellerEarnings, piBalance: sellerEarnings }
        });
        await User.findByIdAndUpdate(payment.from, {
          $inc: { piSpent: payment.amount }
        });
        
        // Notify seller
        await User.findByIdAndUpdate(payment.to, {
          $push: {
            notifications: {
              type: 'payment',
              from: payment.from,
              message: `Sale completed! +${sellerEarnings.toFixed(4)}π`
            }
          }
        });
        break;
      }
      
      case 'challenge_reward': {
        await User.findByIdAndUpdate(payment.to, {
          $inc: { piEarnings: payment.amount, piBalance: payment.amount }
        });
        break;
      }
    }
  } catch (err) {
    console.error('Post-payment action error:', err);
    // Don't throw — payment is already completed on Pi side
  }
}

/**
 * POST /api/payments/incomplete
 * Handle incomplete payments found during authentication
 * Called when onIncompletePaymentFound fires from Pi SDK
 */
router.post('/incomplete', auth, async (req, res) => {
  try {
    const { payment: incompletePayment } = req.body;
    
    if (!incompletePayment) {
      return res.status(400).json({ error: 'Payment data required' });
    }
    
    const { identifier: paymentId, status } = incompletePayment;
    
    // Find existing payment
    const payment = await Payment.findOne({ piPaymentId: paymentId });
    
    if (!payment) {
      // Unknown payment — cancel it
      return res.json({ action: 'cancel' });
    }
    
    if (status.developer_approved && !status.developer_completed) {
      // Was approved but not completed — try to complete it
      if (incompletePayment.transaction?.txid) {
        await completePayment(paymentId, incompletePayment.transaction.txid);
        payment.status = 'completed';
        payment.txid = incompletePayment.transaction.txid;
        await payment.save();
        await handlePaymentCompletion(payment);
      }
    }
    
    res.json({ success: true, status: payment.status });
  } catch (err) {
    console.error('Incomplete payment error:', err);
    res.status(500).json({ error: 'Failed to handle incomplete payment' });
  }
});

/**
 * GET /api/payments/history
 * User's payment history
 */
router.get('/history', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    
    const payments = await Payment.find({
      $or: [{ from: req.user._id }, { to: req.user._id }]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('from', 'piUsername displayName avatar')
      .populate('to', 'piUsername displayName avatar');
    
    res.json({ payments, page, hasMore: payments.length === limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;
