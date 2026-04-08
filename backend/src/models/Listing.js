// ============================================================
// SPYCE - Marketplace Listing Model
// ============================================================
const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  seller: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  
  // Product Info
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 1000 },
  category: { 
    type: String, 
    required: true,
    enum: [
      'digital',       // e-books, presets, templates
      'handmade',      // crafts, art
      'fashion',       // clothes, accessories
      'food',          // local food products
      'services',      // freelance, tutoring
      'gaming',        // in-game items
      'music',         // beats, sound packs
      'other'
    ]
  },
  
  // Media
  images: [{ type: String }],   // Cloudinary URLs (up to 5)
  
  // Pricing (in Pi)
  price: { type: Number, required: true, min: 0.1 },
  currency: { type: String, default: 'Pi' },
  
  // Inventory
  stock: { type: Number, default: 1 },               // -1 = unlimited (digital)
  isDigital: { type: Boolean, default: false },
  digitalFileUrl: { type: String, default: '' },     // Private download link
  
  // Shipping (for physical items)
  shipsFrom: { type: String, default: '' },
  shippingIncluded: { type: Boolean, default: false },
  shippingCost: { type: Number, default: 0 },
  
  // Stats
  views: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'sold_out', 'removed', 'pending_review'],
    default: 'active'
  },
  
  // Reviews
  reviews: [{
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 300 },
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  
  // Tags for search
  tags: [{ type: String, lowercase: true, trim: true }],
  
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ tags: 1 });

module.exports = mongoose.model('Listing', listingSchema);
