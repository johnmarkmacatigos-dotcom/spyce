// ============================================================
// SPYCE - Marketplace Routes
// ============================================================
const express = require('express');
const router = express.Router();

const Listing = require('../models/Listing');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { auth, optionalAuth } = require('../middleware/auth');
const { imageUpload } = require('../services/cloudinary');

// GET /api/marketplace — Browse listings
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, minPrice, maxPrice, q, page = 1 } = req.query;
    const limit = 20;
    const query = { status: 'active' };

    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { tags: { $in: [q.toLowerCase()] } }
      ];
    }

    const listings = await Listing.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seller', 'piUsername displayName avatar isVerified sellerRating');

    const total = await Listing.countDocuments(query);

    res.json({ listings, total, page: parseInt(page), hasMore: listings.length === limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/marketplace/:id — Single listing
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'piUsername displayName avatar isVerified sellerRating sellerRatingCount');
    if (!listing || listing.status === 'removed') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    listing.views += 1;
    await listing.save();
    res.json({ listing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/marketplace — Create listing
router.post('/', auth, imageUpload.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, price, stock, isDigital, shipsFrom, tags } = req.body;

    if (!title || !description || !category || !price) {
      return res.status(400).json({ error: 'title, description, category, and price are required' });
    }

    const images = req.files ? req.files.map(f => f.path) : [];
    const parsedTags = tags ? tags.split(',').map(t => t.trim().toLowerCase()) : [];

    const listing = new Listing({
      seller: req.user._id,
      title,
      description,
      category,
      price: parseFloat(price),
      images,
      stock: parseInt(stock) || 1,
      isDigital: isDigital === 'true',
      shipsFrom: shipsFrom || '',
      tags: parsedTags,
    });

    await listing.save();
    res.status(201).json({ success: true, listing });
  } catch (err) {
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

    const { title, description, price, stock, status } = req.body;
    if (title) listing.title = title;
    if (description) listing.description = description;
    if (price) listing.price = parseFloat(price);
    if (stock !== undefined) listing.stock = parseInt(stock);
    if (status) listing.status = status;

    await listing.save();
    res.json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// POST /api/marketplace/:id/review — Add review after purchase
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    // Check they purchased it
    const purchase = await Payment.findOne({
      from: req.user._id,
      referenceId: listing._id,
      type: 'marketplace',
      status: 'completed'
    });
    if (!purchase) {
      return res.status(403).json({ error: 'You must purchase this item before reviewing' });
    }

    listing.reviews.push({ buyer: req.user._id, rating, comment });
    const total = listing.reviews.reduce((sum, r) => sum + r.rating, 0);
    listing.averageRating = total / listing.reviews.length;
    await listing.save();

    // Update seller's overall rating
    const seller = await User.findById(listing.seller);
    if (seller) {
      const allListings = await Listing.find({ seller: listing.seller });
      const allRatings = allListings.flatMap(l => l.reviews.map(r => r.rating));
      seller.sellerRating = allRatings.length
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
      seller.sellerRatingCount = allRatings.length;
      await seller.save();
    }

    res.json({ success: true, averageRating: listing.averageRating });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add review' });
  }
});

module.exports = router;
