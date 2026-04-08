// ============================================================
// SPYCE - Authentication Middleware
// ============================================================
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }
    
    const token = authHeader.split(' ')[1];
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
    
    const user = await User.findById(decoded.userId).select('-notifications');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    
    if (user.isBanned) {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }
    
    // Update last seen
    user.lastSeen = new Date();
    await user.save();
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication error.' });
  }
};

// Optional auth — attaches user if token present, but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { auth, optionalAuth };
