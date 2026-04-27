// ============================================================
// SPYCE - Payment Routes v2
// FIXED: Handles both tip and marketplace payment completion
// FILE: backend/src/routes/payments.js
// ============================================================
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Video = require('../models/Video');
const Listing = require('../models/Listing');
const piNetworkService = require('../services/piNetwork');

// POST /api/payments/approve
router.post('/approve', auth, async (req, res) => {
  try {
    const { paymentId, type, creatorId, videoId, listingId, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required' });
    }

    // Verify with Pi Network
    const piPayment = await piNetworkService.getPayment(paymentId);

    if (!piPayment) {
      return res.status(404).json({ error: 'Payment not found on Pi Network' });
    }

    // Create or update payment record
    const existingPayment = await Payment.findOne({ piPaymentId: paymentId });
    if (!existingPayment) {
      await Payment.create({
        piPaymentId: paymentId,
        from: req.user._id,
        amount: amount || piPayment.amount,
        type: type || 'tip',
        status: 'pending',
        referenceId: listingId || videoId || creatorId,
        metadata: { type, creatorId, videoId, listingId },
      });
    }

    // Approve on Pi Network
    await piNetworkService.approvePayment(paymentId);

    res.json({ success: true, paymentId });
  } catch (err) {
    console.error('Payment approve error:', err.message);
    // Still return 200 so Pi SDK continues — log the error
    res.json({ success: true, paymentId: req.body.paymentId, warning: err.message });
  }
});

// POST /api/payments/complete
router.post('/complete', auth, async (req, res) => {
  try {
    const { paymentId, txid, type, creatorId, videoId, listingId, amount } = req.body;

    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'paymentId and txid are required' });
    }

    // Complete on Pi Network
    await piNetworkService.completePayment(paymentId, txid);

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { piPaymentId: paymentId },
      { status: 'completed', txid, completedAt: new Date() },
      { new: true, upsert: true }
    );

    const paymentType = type || payment?.type || 'tip';

    // ── Handle Tip ──────────────────────────────────────────
    if (paymentType === 'tip') {
      const targetCreatorId = creatorId || payment?.metadata?.creatorId;
      const tipAmount = parseFloat(amount || payment?.amount || 0);

      if (targetCreatorId && tipAmount > 0) {
        // Credit creator
        await User.findByIdAndUpdate(targetCreatorId, {
          $inc: {
            piEarnings: tipAmount * 0.95, // 5% platform fee
            piBalance: tipAmount * 0.95,
            tipsReceived: tipAmount,
          },
        });

        // Update video tip count
        const targetVideoId = videoId || payment?.metadata?.videoId;
        if (targetVideoId) {
          await Video.findByIdAndUpdate(targetVideoId, {
            $inc: { tipsReceived: tipAmount },
          });
        }
      }
    }

    // ── Handle Marketplace Purchase ─────────────────────────
    if (paymentType === 'marketplace') {
      const targetListingId = listingId || payment?.metadata?.listingId;
      const purchaseAmount = parseFloat(amount || payment?.amount || 0);

      if (targetListingId) {
        const listing = await Listing.findById(targetListingId);

        if (listing) {
          // Update listing stock
          if (listing.stock > 0) {
            await Listing.findByIdAndUpdate(targetListingId, {
              $inc: { stock: -1, salesCount: 1 },
            });
          }

          // Credit seller (95% after 5% platform fee)
          const sellerEarnings = purchaseAmount * 0.95;
          await User.findByIdAndUpdate(listing.seller, {
            $inc: {
              piEarnings: sellerEarnings,
              piBalance: sellerEarnings,
              salesCount: 1,
            },
          });

          // Add to buyer's purchases
          await User.findByIdAndUpdate(req.user._id, {
            $push: {
              purchases: {
                listing: targetListingId,
                pricePaid: purchaseAmount,
                txid,
                purchasedAt: new Date(),
              },
            },
          });
        }
      }
    }

    res.json({
      success: true,
      txid,
      type: paymentType,
      message: paymentType === 'tip' ? 'Tip sent! 🎉' : 'Purchase complete! 🛍️',
    });

  } catch (err) {
    console.error('Payment complete error:', err.message);
    // Return 200 with warning — don't block the Pi SDK flow
    res.json({
      success: true,
      txid: req.body.txid,
      warning: err.message,
    });
  }
});

// GET /api/payments/history — User's payment history
router.get('/history', auth, async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ from: req.user._id }, { to: req.user._id }],
      status: 'completed',
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;
