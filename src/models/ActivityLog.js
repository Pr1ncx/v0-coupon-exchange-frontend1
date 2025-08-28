const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'user_registered',
      'user_login',
      'user_logout',
      'user_profile_updated',
      'user_subscription_upgraded',
      'user_subscription_cancelled',
      
      // Coupon actions
      'coupon_uploaded',
      'coupon_claimed',
      'coupon_liked',
      'coupon_unliked',
      'coupon_boosted',
      'coupon_viewed',
      'coupon_shared',
      'coupon_reported',
      'coupon_deleted',
      'coupon_updated',
      
      // Points and gamification
      'points_earned',
      'points_spent',
      'badge_earned',
      'achievement_unlocked',
      'level_up',
      
      // Admin actions
      'admin_user_suspended',
      'admin_user_activated',
      'admin_coupon_verified',
      'admin_coupon_suspended',
      
      // System actions
      'daily_reset',
      'subscription_renewed',
      'subscription_expired'
    ]
  },
  target: {
    type: {
      type: String,
      enum: ['user', 'coupon', 'system', 'subscription']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  details: {
    // Flexible object to store action-specific data
    points: Number,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    reason: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // We use custom timestamp field
});

// Indexes for performance
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ 'target.type': 1, 'target.id': 1 });
activityLogSchema.index({ timestamp: -1 });

// TTL index to automatically delete old logs (90 days)
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static methods
activityLogSchema.statics.logActivity = function(activityData) {
  const log = new this(activityData);
  return log.save();
};

activityLogSchema.statics.getUserActivity = function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    action,
    startDate,
    endDate
  } = options;
  
  let query = { user: userId };
  
  if (action) {
    query.action = action;
  }
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('target.id', 'title code store.name')
    .lean();
};

activityLogSchema.statics.getSystemActivity = function(options = {}) {
  const {
    limit = 100,
    skip = 0,
    action,
    startDate,
    endDate
  } = options;
  
  let query = {};
  
  if (action) {
    query.action = action;
  }
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username email')
    .populate('target.id', 'title code store.name email')
    .lean();
};

activityLogSchema.statics.getActivityStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

activityLogSchema.statics.getDailyActivity = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timestamp'
            }
          },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        activities: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

activityLogSchema.statics.getPopularActions = function(limit = 10) {
  return this.aggregate([
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);