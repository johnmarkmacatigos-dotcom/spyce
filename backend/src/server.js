// ============================================================
// SPYCE Backend - Main Server Entry Point
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const app = express();

// ── Security Middleware ──────────────────────────────────────
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://*.vercel.app', // Allow all vercel preview URLs
  ],
  credentials: true,
}));

// Rate limiting — prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter limit for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
});

// ── Body Parser ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Database Connection ──────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Check your MONGODB_URI in .env file');
    process.exit(1);
  });

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/videos',     require('./routes/videos'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/marketplace',require('./routes/marketplace'));
app.use('/api/payments',   paymentLimiter, require('./routes/payments'));
app.use('/api/feed',       require('./routes/feed'));
app.use('/api/earnings',   require('./routes/earnings'));
app.use('/api/admin',      require('./routes/admin'));
// Music search proxy — avoids CORS issues in Pi Browser
app.use('/api/music',      require('./routes/music'));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    app: 'SPYCE API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SPYCE API running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;