// ============================================================
// SPYCE - Cloudinary Configuration
// ============================================================
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Video Upload Storage ──────────────────────────────────────
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `spyce/videos/${req.user._id}`,
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'webm', '3gp'],
    transformation: [
      { width: 720, crop: 'limit' },  // Max 720p width
      { quality: 'auto:good' },
      { format: 'mp4' }
    ],
    eager: [
      // Auto-generate thumbnail at 1 second mark
      { resource_type: 'image', format: 'jpg', start_offset: '1' }
    ],
    eager_async: true,
  }),
});

// ── Image Upload Storage (Avatar, Marketplace) ───────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `spyce/images/${req.user._id}`,
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto:good' },
      { format: 'webp' }
    ],
  }),
});

// File size limits
const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: (process.env.MAX_VIDEO_SIZE_MB || 100) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files allowed'), false);
    }
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for images
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

// Delete asset from Cloudinary
const deleteAsset = async (publicId, resourceType = 'video') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    return false;
  }
};

module.exports = { cloudinary, videoUpload, imageUpload, deleteAsset };
