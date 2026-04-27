// ============================================================
// SPYCE - Marketplace Routes v2
// FIXED: sellerId filter for "My Listings"
// FIXED: Accept JSON body (no multipart required)
// FILE: backend/src/routes/marketplace.js
// ============================================================
const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { auth, optionalAuth } = require('../middleware/auth');

// GET /api/marketplace — Browse listings
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, minPrice, maxPrice, q, page = 1, sellerId } = req.query;
    const limit = 20;
    const query = { status: 'active' };

    if (category) query.category = category;
    if (sellerId) query.seller = sellerId;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [q.toLowerCase()] } },
      ];
    }

    const listings = await Listing.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * limit)
      .limit(limit)
      .populate('seller', 'piUsername displayName avatar isVerified sellerRating salesCount');

    const total = await Listing.countDocuments(query);

    res.json({
      listings,
      total,
      page: parseInt(page),
      hasMore: listings.length === limit,
    });
  } catch (err) {
    console.error('Marketplace fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/marketplace/:id — Single listing
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'piUsername displayName avatar isVerified sellerRating sellerRatingCount salesCount');

    if (!listing || listing.status === 'removed') {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Increment views
    await Listing.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({ listing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/marketplace — Create listing
// Accepts JSON body with images array (URLs from Cloudinary)
router.post('/', auth, async (req, res) => {
  try {
    const {
      title, description, category, price,
      stock, isDigital, shipsFrom, tags, images,
    } = req.body;

    if (!title || !description || !category || !price) {
      return res.status(400).json({
        error: 'title, description, category, and price are required',
      });
    }

    if (parseFloat(price) < 0.1) {
      return res.status(400).json({ error: 'Minimum price is 0.1π' });
    }

    const parsedTags = tags
      ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const listing = new Listing({
      seller: req.user._id,
      title: title.trim(),
      description: description.trim(),
      category,
      price: parseFloat(price),
      images: images || [],
      stock: parseInt(stock) || 1,
      isDigital: isDigital === true || isDigital === 'true',
      shipsFrom: shipsFrom || '',
      tags: parsedTags,
      status: 'active',
    });

    await listing.save();

    res.status(201).json({ success: true, listing });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: err.message || 'Failed to create listing' });
  }
});

// PUT /api/marketplace/:id — Update listing
router.put('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, price, stock, status, images } = req.body;
    if (title) listing.title = title;
    if (description) listing.description = description;
    if (price) listing.price = parseFloat(price);
    if (stock !== undefined) listing.stock = parseInt(stock);
    if (status) listing.status = status;
    if (images) listing.images = images;

    await listing.save();
    res.json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// POST /api/marketplace/:id/review
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    // Check purchase
    const purchase = await Payment.findOne({
      from: req.user._id,
      referenceId: listing._id,
      type: 'marketplace',
      status: 'completed',
    });
    if (!purchase) {
      return res.status(403).json({ error: 'Purchase this item before reviewing' });
    }

    listing.reviews.push({
      buyer: req.user._id,
      rating: parseInt(rating),
      comment: comment || '',
    });

    const total = listing.reviews.reduce((s, r) => s + r.rating, 0);
    listing.averageRating = total / listing.reviews.length;
    await listing.save();

    // Update seller rating
    const allListings = await Listing.find({ seller: listing.seller });
    const allRatings = allListings.flatMap(l => l.reviews.map(r => r.rating));
    if (allRatings.length) {
      const avg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
      await User.findByIdAndUpdate(listing.seller, {
        sellerRating: avg,
        sellerRatingCount: allRatings.length,
      });
    }

    res.json({ success: true, averageRating: listing.averageRating });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add review' });
  }
});

module.exports = router;
