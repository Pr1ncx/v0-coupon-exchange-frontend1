const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Coupon title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Coupon description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    trim: true,
    uppercase: true,
    maxlength: [50, 'Coupon code cannot exceed 50 characters']
  },
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'electronics',
      'clothing',
      'food',
      'travel',
      'entertainment',
      'health',
      'home',
      'sports',
      'books',
      'automotive',
      'beauty',
      'other'
    ]
  },
  store: {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      maxlength: [100, 'Store name cannot exceed 100 characters']
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL']
    },
    logo: String
  },
  
  // Coupon Details
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Expiry date must be in the future'
    }
  },
  minimumPurchase: {
    type: Number,
    min: 0,
    default: 0
  },
  usageLimit: {
    type: Number,
    min: 1,
    default: null // null means unlimited
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Media
  images: [{
    url: String,
    filename: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // User Relations
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  claimedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    claimedAt: {
      type: Date,
      default: Date.now
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],
  
  // Gamification & Engagement
  boosts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    boostedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      }
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status & Moderation
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'reported'],
    default: 'active'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'fake', 'expired', 'other']
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics
  analytics: {
    clickCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    }
  },
  
  // Tags and Search
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  searchKeywords: {
    type: String,
    lowercase: true
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
couponSchema.index({ category: 1, status: 1 });
couponSchema.index({ store: 1 });
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ uploadedBy: 1 });
couponSchema.index({ createdAt: -1 });
couponSchema.index({ views: -1 });
couponSchema.index({ 'analytics.clickCount': -1 });
couponSchema.index({ tags: 1 });
couponSchema.index({ searchKeywords: 'text', title: 'text', description: 'text' });

// Compound indexes
couponSchema.index({ status: 1, expiryDate: 1, category: 1 });
couponSchema.index({ uploadedBy: 1, createdAt: -1 });

// Virtual properties
couponSchema.virtual('isExpired').get(function() {
  return this.expiryDate < new Date();
});

couponSchema.virtual('isActive').get(function() {
  return this.status === 'active' && !this.isExpired;
});

couponSchema.virtual('claimCount').get(function() {
  return this.claimedBy.length;
});

couponSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

couponSchema.virtual('boostCount').get(function() {
  return this.boosts.filter(boost => boost.expiresAt > new Date()).length;
});

couponSchema.virtual('isBoosted').get(function() {
  return this.boosts.some(boost => boost.expiresAt > new Date());
});

couponSchema.virtual('usageRemaining').get(function() {
  if (!this.usageLimit) return null;
  return Math.max(0, this.usageLimit - this.usageCount);
});

couponSchema.virtual('isUsageLimitReached').get(function() {
  if (!this.usageLimit) return false;
  return this.usageCount >= this.usageLimit;
});

couponSchema.virtual('popularityScore').get(function() {
  const views = this.views || 0;
  const claims = this.claimCount || 0;
  const likes = this.likeCount || 0;
  const boosts = this.boostCount || 0;
  
  // Weighted popularity score
  return (views * 0.1) + (claims * 2) + (likes * 1.5) + (boosts * 3);
});

// Pre-save middleware
couponSchema.pre('save', function(next) {
  // Update search keywords
  this.searchKeywords = `${this.title} ${this.description} ${this.store.name} ${this.category} ${this.tags.join(' ')}`.toLowerCase();
  
  // Update status based on expiry
  if (this.expiryDate < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  
  // Update timestamps
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  
  next();
});

// Instance methods
couponSchema.methods.incrementView = function() {
  this.views += 1;
  this.analytics.clickCount += 1;
  return this.save();
};

couponSchema.methods.addClaim = function(userId) {
  // Check if user already claimed
  const existingClaim = this.claimedBy.find(claim => 
    claim.user.toString() === userId.toString()
  );
  
  if (existingClaim) {
    throw new Error('User has already claimed this coupon');
  }
  
  // Check usage limit
  if (this.isUsageLimitReached) {
    throw new Error('Coupon usage limit reached');
  }
  
  // Check if coupon is active
  if (!this.isActive) {
    throw new Error('Coupon is not active or has expired');
  }
  
  this.claimedBy.push({ user: userId });
  this.usageCount += 1;
  
  return this.save();
};

couponSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => 
    like.user.toString() === userId.toString()
  );
  
  if (existingLike) {
    // Remove like (unlike)
    this.likes = this.likes.filter(like => 
      like.user.toString() !== userId.toString()
    );
  } else {
    // Add like
    this.likes.push({ user: userId });
  }
  
  return this.save();
};

couponSchema.methods.addBoost = function(userId) {
  // Remove any existing boost from the same user
  this.boosts = this.boosts.filter(boost => 
    boost.user.toString() !== userId.toString()
  );
  
  // Add new boost
  this.boosts.push({
    user: userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });
  
  return this.save();
};

couponSchema.methods.addReport = function(userId, reason, description) {
  const existingReport = this.reports.find(report => 
    report.user.toString() === userId.toString()
  );
  
  if (existingReport) {
    throw new Error('User has already reported this coupon');
  }
  
  this.reports.push({
    user: userId,
    reason,
    description
  });
  
  // Auto-suspend if multiple reports
  if (this.reports.length >= 5) {
    this.status = 'suspended';
  }
  
  return this.save();
};

couponSchema.methods.markAsUsed = function(userId) {
  const claim = this.claimedBy.find(claim => 
    claim.user.toString() === userId.toString()
  );
  
  if (!claim) {
    throw new Error('User has not claimed this coupon');
  }
  
  if (claim.used) {
    throw new Error('Coupon has already been marked as used');
  }
  
  claim.used = true;
  claim.usedAt = new Date();
  
  // Update analytics
  this.analytics.conversionRate = (
    this.claimedBy.filter(c => c.used).length / this.claimedBy.length
  ) * 100;
  
  return this.save();
};

couponSchema.methods.updateAnalytics = function() {
  const totalClaims = this.claimedBy.length;
  const usedClaims = this.claimedBy.filter(claim => claim.used).length;
  
  this.analytics.conversionRate = totalClaims > 0 ? (usedClaims / totalClaims) * 100 : 0;
  
  return this.save();
};

couponSchema.methods.toPublicJSON = function() {
  const coupon = this.toObject();
  
  // Remove sensitive information
  if (coupon.reports) {
    coupon.reportCount = coupon.reports.length;
    delete coupon.reports;
  }
  
  return coupon;
};

// Static methods
couponSchema.statics.findActive = function() {
  return this.find({
    status: 'active',
    expiryDate: { $gt: new Date() }
  });
};

couponSchema.statics.findByCategory = function(category) {
  return this.findActive().where({ category });
};

couponSchema.statics.findByStore = function(storeName) {
  return this.findActive().where({ 'store.name': new RegExp(storeName, 'i') });
};

couponSchema.statics.findPopular = function(limit = 10) {
  return this.findActive()
    .sort({ views: -1, 'analytics.clickCount': -1, createdAt: -1 })
    .limit(limit);
};

couponSchema.statics.findBoosted = function(limit = 10) {
  return this.findActive()
    .where({
      'boosts.expiresAt': { $gt: new Date() }
    })
    .sort({ 'boosts.boostedAt': -1 })
    .limit(limit);
};

couponSchema.statics.search = function(query, options = {}) {
  const {
    category,
    store,
    minDiscount,
    maxDiscount,
    sortBy = 'createdAt',
    sortOrder = -1,
    limit = 20,
    skip = 0
  } = options;
  
  let searchQuery = this.findActive();
  
  if (query) {
    searchQuery = searchQuery.where({
      $text: { $search: query }
    });
  }
  
  if (category) {
    searchQuery = searchQuery.where({ category });
  }
  
  if (store) {
    searchQuery = searchQuery.where({
      'store.name': new RegExp(store, 'i')
    });
  }
  
  if (minDiscount !== undefined) {
    searchQuery = searchQuery.where({
      'discount.value': { $gte: minDiscount }
    });
  }
  
  if (maxDiscount !== undefined) {
    searchQuery = searchQuery.where({
      'discount.value': { $lte: maxDiscount }
    });
  }
  
  return searchQuery
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'username profile.avatar')
    .lean();
};

module.exports = mongoose.model('Coupon', couponSchema);