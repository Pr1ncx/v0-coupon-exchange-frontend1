const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'premium', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Profile Information
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    location: {
      type: String,
      maxlength: [100, 'Location cannot exceed 100 characters']
    }
  },

  // Gamification System
  gamification: {
    points: {
      type: Number,
      default: config.STARTING_POINTS,
      min: 0
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    badges: [{
      name: {
        type: String,
        enum: ['uploader', 'content_creator', 'coupon_master', 'claimer', 'savings_hunter', 'deal_finder']
      },
      earnedAt: {
        type: Date,
        default: Date.now
      },
      description: String
    }],
    achievements: [{
      name: String,
      description: String,
      earnedAt: {
        type: Date,
        default: Date.now
      },
      points: Number
    }],
    stats: {
      couponsUploaded: {
        type: Number,
        default: 0
      },
      couponsClaimed: {
        type: Number,
        default: 0
      },
      couponsShared: {
        type: Number,
        default: 0
      },
      pointsEarned: {
        type: Number,
        default: 0
      },
      pointsSpent: {
        type: Number,
        default: 0
      }
    }
  },

  // Freemium System
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    }
  },

  // Daily Activity Tracking
  dailyActivity: {
    lastClaimDate: Date,
    claimsToday: {
      type: Number,
      default: 0
    },
    lastResetDate: Date
  },

  // Security
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d'
    }
  }],
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,

  // Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },

  // Metadata
  lastLoginAt: Date,
  lastActiveAt: Date,
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
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'subscription.stripeCustomerId': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ 'gamification.points': -1 });

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.profile.lastName || this.username;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for premium status
userSchema.virtual('isPremium').get(function() {
  return this.role === 'premium' || this.role === 'admin' || 
         (this.subscription.type === 'premium' && 
          this.subscription.currentPeriodEnd && 
          this.subscription.currentPeriodEnd > new Date());
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, config.BCRYPT_ROUNDS);
  }

  // Update timestamps
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }

  // Reset daily claims if it's a new day
  if (this.dailyActivity.lastResetDate) {
    const today = new Date();
    const lastReset = new Date(this.dailyActivity.lastResetDate);
    
    if (today.toDateString() !== lastReset.toDateString()) {
      this.dailyActivity.claimsToday = 0;
      this.dailyActivity.lastResetDate = today;
    }
  } else {
    this.dailyActivity.lastResetDate = new Date();
  }

  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { 
      userId: this._id, 
      email: this.email, 
      role: this.role,
      isPremium: this.isPremium
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function() {
  const refreshToken = jwt.sign(
    { userId: this._id, type: 'refresh' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRY }
  );
  
  // Store refresh token
  this.refreshTokens.push({ token: refreshToken });
  
  // Limit stored refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return refreshToken;
};

userSchema.methods.revokeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
};

userSchema.methods.revokeAllRefreshTokens = function() {
  this.refreshTokens = [];
};

userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

userSchema.methods.canClaimCoupon = function() {
  if (this.isPremium) return true;
  
  const today = new Date().toDateString();
  const lastClaimDate = this.dailyActivity.lastClaimDate;
  
  // Reset if it's a new day
  if (!lastClaimDate || lastClaimDate.toDateString() !== today) {
    return true;
  }
  
  return this.dailyActivity.claimsToday < config.DAILY_CLAIMS_LIMIT;
};

userSchema.methods.incrementClaimCount = function() {
  const today = new Date();
  const lastClaimDate = this.dailyActivity.lastClaimDate;
  
  // Reset if it's a new day
  if (!lastClaimDate || lastClaimDate.toDateString() !== today.toDateString()) {
    this.dailyActivity.claimsToday = 1;
  } else {
    this.dailyActivity.claimsToday += 1;
  }
  
  this.dailyActivity.lastClaimDate = today;
  return this.save();
};

userSchema.methods.addPoints = function(points, reason) {
  this.gamification.points += points;
  this.gamification.stats.pointsEarned += points;
  
  // Check for level up (100 points per level)
  const newLevel = Math.floor(this.gamification.points / 100) + 1;
  if (newLevel > this.gamification.level) {
    this.gamification.level = newLevel;
  }
  
  return this.save();
};

userSchema.methods.spendPoints = function(points) {
  if (this.gamification.points < points) {
    throw new Error('Insufficient points');
  }
  
  this.gamification.points -= points;
  this.gamification.stats.pointsSpent += points;
  return this.save();
};

userSchema.methods.awardBadge = function(badgeName, description) {
  const existingBadge = this.gamification.badges.find(badge => badge.name === badgeName);
  if (!existingBadge) {
    this.gamification.badges.push({
      name: badgeName,
      description: description || badgeName
    });
    return this.save();
  }
  return Promise.resolve(this);
};

userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  
  // Remove sensitive fields
  delete user.password;
  delete user.refreshTokens;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  
  return user;
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: new RegExp(`^${username}$`, 'i') });
};

module.exports = mongoose.model('User', userSchema);