const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        error: 'MISSING_TOKEN'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }
    
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. User not found.',
          error: 'USER_NOT_FOUND'
        });
      }
      
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Account is deactivated.',
          error: 'ACCOUNT_DEACTIVATED'
        });
      }
      
      if (user.isLocked) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Account is locked.',
          error: 'ACCOUNT_LOCKED'
        });
      }
      
      // Update last active timestamp
      user.lastActiveAt = new Date();
      await user.save();
      
      req.user = user;
      req.token = token;
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Token has expired.',
          error: 'TOKEN_EXPIRED'
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Invalid token.',
          error: 'INVALID_TOKEN'
        });
      }
      
      throw jwtError;
    }
    
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware to authorize user roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.audit('Unauthorized access attempt', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
};

/**
 * Middleware to check premium status
 */
const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication required.',
      error: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  if (!req.user.isPremium) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Premium subscription required.',
      error: 'PREMIUM_REQUIRED',
      upgradeUrl: '/api/v1/payments/checkout'
    });
  }
  
  next();
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next();
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');
      
      if (user && user.isActive && !user.isLocked) {
        user.lastActiveAt = new Date();
        await user.save();
        req.user = user;
        req.token = token;
      }
    } catch (jwtError) {
      // Silently ignore JWT errors for optional auth
      logger.debug('Optional auth failed:', jwtError.message);
    }
    
    next();
    
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue without auth
  }
};

/**
 * Middleware to check if user owns the resource
 */
const requireOwnership = (resourceField = 'uploadedBy') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check ownership in the next middleware after resource is loaded
    req.checkOwnership = resourceField;
    next();
  };
};

/**
 * Middleware to validate ownership after resource is loaded
 */
const validateOwnership = (req, res, next) => {
  if (!req.checkOwnership) {
    return next();
  }
  
  const resource = req.coupon || req.targetUser || req.resource;
  
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found',
      error: 'RESOURCE_NOT_FOUND'
    });
  }
  
  const resourceOwnerId = resource[req.checkOwnership];
  
  if (resourceOwnerId.toString() !== req.user._id.toString()) {
    logger.audit('Ownership validation failed', {
      userId: req.user._id,
      resourceId: resource._id,
      resourceOwnerId: resourceOwnerId,
      endpoint: req.originalUrl,
      method: req.method
    });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.',
      error: 'OWNERSHIP_REQUIRED'
    });
  }
  
  next();
};

/**
 * Middleware to refresh token if it's about to expire
 */
const refreshTokenIfNeeded = async (req, res, next) => {
  if (!req.user || !req.token) {
    return next();
  }
  
  try {
    const decoded = jwt.decode(req.token);
    const now = Date.now() / 1000;
    const timeUntilExpiry = decoded.exp - now;
    
    // If token expires in less than 5 minutes, include new token in response
    if (timeUntilExpiry < 300) {
      const newToken = req.user.generateAccessToken();
      res.set('X-New-Token', newToken);
    }
    
    next();
  } catch (error) {
    logger.error('Token refresh middleware error:', error);
    next(); // Continue without refresh
  }
};

module.exports = {
  authenticate,
  authorize,
  requirePremium,
  optionalAuth,
  requireOwnership,
  validateOwnership,
  refreshTokenIfNeeded
};