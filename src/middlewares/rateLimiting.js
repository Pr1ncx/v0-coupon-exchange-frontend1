const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const config = require('../config');
const logger = require('../config/logger');

// Store for tracking rate limits
const rateLimitStore = new Map();

/**
 * Custom store for rate limiting with user-based differentiation
 */
class CustomRateLimitStore {
  constructor() {
    this.store = new Map();
  }
  
  incr(key, cb) {
    const current = this.store.get(key) || { count: 0, resetTime: Date.now() + 60000 };
    
    if (Date.now() > current.resetTime) {
      current.count = 1;
      current.resetTime = Date.now() + 60000;
    } else {
      current.count++;
    }
    
    this.store.set(key, current);
    cb(null, current.count, current.resetTime);
  }
  
  decrement(key) {
    const current = this.store.get(key);
    if (current && current.count > 0) {
      current.count--;
      this.store.set(key, current);
    }
  }
  
  resetKey(key) {
    this.store.delete(key);
  }
  
  resetAll() {
    this.store.clear();
  }
}

const customStore = new CustomRateLimitStore();

/**
 * Key generator that considers user premium status
 */
const premiumAwareKeyGenerator = (req) => {
  const baseKey = req.ip;
  const userId = req.user?._id;
  const isPremium = req.user?.isPremium;
  
  if (userId) {
    return `${baseKey}:${userId}:${isPremium ? 'premium' : 'free'}`;
  }
  
  return baseKey;
};

/**
 * Skip function for premium users on certain endpoints
 */
const skipPremiumUsers = (req) => {
  return req.user?.isPremium === true;
};

/**
 * Rate limit handler with detailed logging
 */
const rateLimitHandler = (req, res) => {
  const userId = req.user?._id;
  const isPremium = req.user?.isPremium;
  
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userId: userId,
    isPremium: isPremium,
    endpoint: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent')
  });
  
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(60), // seconds
    upgradeInfo: !isPremium ? {
      message: 'Upgrade to premium for higher rate limits',
      upgradeUrl: '/api/v1/payments/checkout'
    } : undefined
  });
};

/**
 * General API rate limiting
 */
const generalRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW * 60 * 1000, // 15 minutes
  max: (req) => {
    if (req.user?.role === 'admin') return 1000;
    if (req.user?.isPremium) return config.RATE_LIMIT_MAX * 2;
    return config.RATE_LIMIT_MAX;
  },
  keyGenerator: premiumAwareKeyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  store: customStore
});

/**
 * Authentication endpoints rate limiting (stricter)
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.AUTH_RATE_LIMIT_MAX,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      endpoint: req.originalUrl,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      error: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(15 * 60) // 15 minutes
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * File upload rate limiting
 */
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req) => {
    if (req.user?.role === 'admin') return 200;
    if (req.user?.isPremium) return 100;
    return 20; // Free users
  },
  keyGenerator: (req) => req.user?._id || req.ip,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      userId: req.user?._id,
      ip: req.ip,
      isPremium: req.user?.isPremium
    });
    
    res.status(429).json({
      success: false,
      message: 'Upload limit exceeded. Please try again later.',
      error: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      upgradeInfo: !req.user?.isPremium ? {
        message: 'Upgrade to premium for higher upload limits',
        upgradeUrl: '/api/v1/payments/checkout'
      } : undefined
    });
  }
});

/**
 * Coupon creation rate limiting
 */
const couponCreationRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: (req) => {
    if (req.user?.role === 'admin') return 1000;
    if (req.user?.isPremium) return 50;
    return 10; // Free users
  },
  keyGenerator: (req) => req.user?._id,
  handler: (req, res) => {
    logger.warn('Coupon creation rate limit exceeded', {
      userId: req.user._id,
      isPremium: req.user.isPremium
    });
    
    res.status(429).json({
      success: false,
      message: 'Daily coupon creation limit exceeded.',
      error: 'COUPON_CREATION_LIMIT_EXCEEDED',
      upgradeInfo: !req.user.isPremium ? {
        message: 'Upgrade to premium to create more coupons daily',
        upgradeUrl: '/api/v1/payments/checkout'
      } : undefined
    });
  }
});

/**
 * Coupon claiming rate limiting (in addition to business logic)
 */
const couponClaimRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    if (req.user?.role === 'admin') return 100;
    if (req.user?.isPremium) return 30;
    return 10; // Free users
  },
  keyGenerator: (req) => req.user?._id,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many claim attempts. Please slow down.',
      error: 'CLAIM_RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Admin endpoints rate limiting
 */
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  keyGenerator: (req) => req.user._id,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Admin rate limit exceeded.',
      error: 'ADMIN_RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Slow down middleware for heavy operations
 */
const heavyOperationSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5,
  delayMs: 500,
  maxDelayMs: 20000,
  keyGenerator: premiumAwareKeyGenerator,
  skip: skipPremiumUsers
});

/**
 * Search endpoint slow down
 */
const searchSlowDown = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 10,
  delayMs: 100,
  maxDelayMs: 5000,
  keyGenerator: premiumAwareKeyGenerator,
  skip: (req) => req.user?.isPremium === true
});

/**
 * Middleware to log rate limit hits
 */
const logRateLimitHit = (req, res, next) => {
  const remaining = res.get('X-RateLimit-Remaining');
  const limit = res.get('X-RateLimit-Limit');
  
  if (remaining && parseInt(remaining) < parseInt(limit) * 0.1) {
    logger.warn('Rate limit approaching', {
      userId: req.user?._id,
      ip: req.ip,
      remaining: remaining,
      limit: limit,
      endpoint: req.originalUrl
    });
  }
  
  next();
};

/**
 * Custom rate limiting for specific endpoints
 */
const customRateLimit = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    keyGenerator: options.keyGenerator || premiumAwareKeyGenerator,
    handler: options.handler || rateLimitHandler,
    skip: options.skip,
    store: customStore,
    standardHeaders: true,
    legacyHeaders: false
  });
};

module.exports = {
  generalRateLimit,
  authRateLimit,
  uploadRateLimit,
  couponCreationRateLimit,
  couponClaimRateLimit,
  adminRateLimit,
  heavyOperationSlowDown,
  searchSlowDown,
  logRateLimitHit,
  customRateLimit,
  CustomRateLimitStore
};