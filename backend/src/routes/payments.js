// ============================================================
// SPYCE - Payment Routes v3
// FIXED: /approve responds instantly — no await on Pi API
// FIXED: /complete responds instantly — credits run async
// Pi SDK has a strict ~60s window; we must respond in <5s
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

// ─────────────────────────────────────────────────────────────
// POST /api/payments/approve
//
// Pi SDK calls onReadyForServerApproval with a paymentId.
// We MUST respond quickly (under ~10s) or Pi expires the payment.
// Strategy: save to DB instantly, approve Pi Network async.
// ─────────────────────────────────────────────────────────────
router.post('/approve', auth, async (req, res) => {
  const { paymentId, type, creatorId, videoId, listingId, amount } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId is required' });
  }

  // ── Step 1: Respond to client IMMEDIATELY ────────────────
  // Pi SDK is waiting. Don't make it wait for Pi Network API.
  res.json({ success: true, paymentId });

  // ── Step 2: Process async (after response sent) ──────────
  try {
    // Save payment record to DB
    const existing = await Payment.findOne({ piPaymentId: paymentId });
    if (!existing) {
      await Payment.create({
        piPaymentId: paymentId,
        from: req.user._id,
        amount: parseFloat(amount) || 0,
        type: type || 'tip',
        status: 'pending',
        referenceId: listingId || videoId || creatorId,
        metadata: { type, creatorId, videoId, listingId },
      });
    }

    // Call Pi Network to approve (can take a few seconds — ok now)
    await piNetworkService.approvePayment(paymentId);
    console.log(`✅ Payment approved: ${paymentId}`);
  } catch (err) {
    console.error(`❌ Approve background error (${paymentId}):`, err.message);
    // Non-fatal — Pi SDK already got the 200 response
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payments/complete
//
// Pi SDK calls onReadyForServerCompletion with paymentId + txid.
// Again — respond FAST, then process credits in background.
// ─────────────────────────────────────────────────────────────
router.post('/complete', auth, async (req, res) => {
  const { paymentId, txid, type, creatorId, videoId, listingId, amount } = req.body;

  if (!paymentId || !txid) {
    return res.status(400).json({ error: 'paymentId and txid are required' });
  }

  // ── Step 1: Respond instantly ────────────────────────────
  res.json({
    success: true,
    txid,
    message: type === 'marketplace' ? 'Purchase complete! 🛍️' : 'Tip sent! 🎉',
  });

  // ── Step 2: Complete on Pi Network + credit users async ──
  try {
    // Complete on Pi Network
    await piNetworkService.completePayment(paymentId, txid);

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { piPaymentId: paymentId },
      {
        status: 'completed',
        txid,
        completedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    const paymentType = type || payment?.type || 'tip';
    const tipAmount = parseFloat(amount || payment?.amount || 0);

    // ── Credit tip ────────────────────────────────────────
    if (paymentType === 'tip') {
      const targetCreatorId = creatorId || payment?.metadata?.creatorId;
      if (targetCreatorId && tipAmount > 0) {
        const creatorCut = tipAmount * 0.95;
        await User.findByIdAndUpdate(targetCreatorId, {
          $inc: {
            piEarnings: creatorCut,
            piBalance: creatorCut,
            tipsReceived: tipAmount,
          },
        });
        const targetVideoId = videoId || payment?.metadata?.videoId;
        if (targetVideoId) {
          await Video.findByIdAndUpdate(targetVideoId, {
            $inc: { tipsReceived: tipAmount },
          });
        }
        console.log(`✅ Tip credited: ${creatorCut}π to ${targetCreatorId}`);
      }
    }

    // ── Credit marketplace purchase ───────────────────────
    if (paymentType === 'marketplace') {
      const targetListingId = listingId || payment?.metadata?.listingId;
      if (targetListingId && tipAmount > 0) {
        const listing = await Listing.findById(targetListingId);
        if (listing) {
          if (listing.stock > 0) {
            await Listing.findByIdAndUpdate(targetListingId, {
              $inc: { stock: -1, salesCount: 1 },
            });
          }
          const sellerCut = tipAmount * 0.95;
          await User.findByIdAndUpdate(listing.seller, {
            $inc: { piEarnings: sellerCut, piBalance: sellerCut, salesCount: 1 },
          });
          await User.findByIdAndUpdate(req.user._id, {
            $push: {
              purchases: {
                listing: targetListingId,
                pricePaid: tipAmount,
                txid,
                purchasedAt: new Date(),
              },
            },
          });
          console.log(`✅ Purchase credited: ${sellerCut}π to seller`);
        }
      }
    }

  } catch (err) {
    console.error(`❌ Complete background error (${paymentId}):`, err.message);
    // Non-fatal — Pi SDK already got the 200 response
  }
});

// GET /api/payments/history
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
