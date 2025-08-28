const { User, Coupon, ActivityLog } = require('../models');
const config = require('../config');
const logger = require('../config/logger');
const { AppError, catchAsync } = require('../middlewares/errorHandler');

/**
 * Get admin dashboard overview
 */
const getDashboard = catchAsync(async (req, res) => {
  const now = new Date();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Get overview stats
  const [
    totalUsers,
    activeUsers,
    premiumUsers,
    newUsersToday,
    totalCoupons,
    activeCoupons,
    couponsToday,
    recentActivity
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastActiveAt: { $gte: yesterday } }),
    User.countDocuments({ role: 'premium' }),
    User.countDocuments({ createdAt: { $gte: yesterday } }),
    Coupon.countDocuments(),
    Coupon.countDocuments({ status: 'active', expiryDate: { $gt: now } }),
    Coupon.countDocuments({ createdAt: { $gte: yesterday } }),
    ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('user', 'username email')
      .lean()
  ]);

  // Calculate growth rates
  const usersLastWeek = await User.countDocuments({ createdAt: { $gte: lastWeek, $lt: yesterday } });
  const userGrowthRate = usersLastWeek > 0 ? ((newUsersToday / usersLastWeek) * 100).toFixed(1) : 0;

  // Get top categories
  const topCategories = await Coupon.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        users: {
          total: totalUsers,
          active: activeUsers,
          premium: premiumUsers,
          newToday: newUsersToday,
          growthRate: userGrowthRate
        },
        coupons: {
          total: totalCoupons,
          active: activeCoupons,
          newToday: couponsToday
        },
        engagement: {
          dailyActiveUsers: activeUsers,
          retentionRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0,
          premiumConversion: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : 0
        }
      },
      topCategories: topCategories,
      recentActivity: recentActivity
    }
  });
});

/**
 * Get all users with filtering and pagination
 */
const getUsers = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    role,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  let query = {};

  // Apply filters
  if (role) {
    query.role = role;
  }

  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  if (search) {
    query.$or = [
      { username: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { 'profile.firstName': new RegExp(search, 'i') },
      { 'profile.lastName': new RegExp(search, 'i') }
    ];
  }

  const [users, totalUsers] = await Promise.all([
    User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -refreshTokens')
      .lean(),
    User.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalItems: totalUsers,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * Get user details
 */
const getUserDetails = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password -refreshTokens');
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Get user statistics
  const [userCoupons, claimedCoupons, activityCount] = await Promise.all([
    Coupon.find({ uploadedBy: userId }).sort({ createdAt: -1 }).limit(10),
    Coupon.find({ 'claimedBy.user': userId }).sort({ 'claimedBy.claimedAt': -1 }).limit(10),
    ActivityLog.countDocuments({ user: userId })
  ]);

  // Get recent activity
  const recentActivity = await ActivityLog.find({ user: userId })
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();

  res.json({
    success: true,
    data: {
      user: user.toPublicJSON(),
      statistics: {
        couponsUploaded: user.gamification.stats.couponsUploaded,
        couponsClaimed: user.gamification.stats.couponsClaimed,
        totalActivity: activityCount,
        points: user.gamification.points,
        level: user.gamification.level,
        badges: user.gamification.badges.length
      },
      recentCoupons: userCoupons,
      recentClaims: claimedCoupons,
      recentActivity: recentActivity
    }
  });
});

/**
 * Update user (admin actions)
 */
const updateUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { role, isActive, reason } = req.body;

  const user = await User.findById(userId);
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const oldValues = {
    role: user.role,
    isActive: user.isActive
  };

  // Update allowed fields
  if (role !== undefined) {
    user.role = role;
  }

  if (isActive !== undefined) {
    user.isActive = isActive;
  }

  await user.save();

  // Log admin action
  await ActivityLog.logActivity({
    user: req.user._id,
    action: isActive === false ? 'admin_user_suspended' : 'admin_user_activated',
    target: { type: 'user', id: userId },
    details: {
      reason: reason,
      oldValues: oldValues,
      newValues: {
        role: user.role,
        isActive: user.isActive
      }
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Admin user update', {
    adminId: req.user._id,
    targetUserId: userId,
    changes: req.body,
    reason: reason
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: user.toPublicJSON()
    }
  });
});

/**
 * Get system analytics
 */
const getAnalytics = catchAsync(async (req, res) => {
  const { startDate, endDate, metrics } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const analytics = {};

  // User analytics
  if (!metrics || metrics.includes('users')) {
    analytics.users = await getUserAnalytics(start, end);
  }

  // Coupon analytics
  if (!metrics || metrics.includes('coupons')) {
    analytics.coupons = await getCouponAnalytics(start, end);
  }

  // Revenue analytics
  if (!metrics || metrics.includes('revenue')) {
    analytics.revenue = await getRevenueAnalytics(start, end);
  }

  // Activity analytics
  if (!metrics || metrics.includes('activity')) {
    analytics.activity = await getActivityAnalytics(start, end);
  }

  res.json({
    success: true,
    data: {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      analytics
    }
  });
});

/**
 * Get reported coupons
 */
const getReportedCoupons = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status = 'reported'
  } = req.query;

  const skip = (page - 1) * limit;

  let query = {};
  if (status === 'reported') {
    query = { 'reports.0': { $exists: true } };
  }

  const coupons = await Coupon.find(query)
    .sort({ 'reports.0.reportedAt': -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('uploadedBy', 'username email')
    .populate('reports.user', 'username')
    .lean();

  const totalCoupons = await Coupon.countDocuments(query);

  res.json({
    success: true,
    data: {
      coupons,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCoupons / limit),
        totalItems: totalCoupons,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * Moderate coupon (approve/suspend/delete)
 */
const moderateCoupon = catchAsync(async (req, res) => {
  const { couponId } = req.params;
  const { action, reason } = req.body; // action: 'verify', 'suspend', 'delete'

  const coupon = await Coupon.findById(couponId);
  
  if (!coupon) {
    throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
  }

  const oldStatus = coupon.status;

  switch (action) {
    case 'verify':
      coupon.status = 'active';
      coupon.isVerified = true;
      break;
    case 'suspend':
      coupon.status = 'suspended';
      break;
    case 'delete':
      await Coupon.findByIdAndDelete(couponId);
      break;
    default:
      throw new AppError('Invalid action', 400, 'INVALID_ACTION');
  }

  if (action !== 'delete') {
    await coupon.save();
  }

  // Log admin action
  await ActivityLog.logActivity({
    user: req.user._id,
    action: action === 'verify' ? 'admin_coupon_verified' : 'admin_coupon_suspended',
    target: { type: 'coupon', id: couponId },
    details: {
      reason: reason,
      oldStatus: oldStatus,
      newStatus: action === 'delete' ? 'deleted' : coupon.status
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Admin coupon moderation', {
    adminId: req.user._id,
    couponId: couponId,
    action: action,
    reason: reason
  });

  res.json({
    success: true,
    message: `Coupon ${action}ed successfully`,
    data: action !== 'delete' ? { coupon: coupon.toPublicJSON() } : null
  });
});

/**
 * Get system logs (admin only)
 */
const getSystemLogs = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 100,
    level,
    startDate,
    endDate,
    action
  } = req.query;

  const skip = (page - 1) * limit;
  let query = {};

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  if (action) {
    query.action = action;
  }

  const logs = await ActivityLog.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'username email')
    .lean();

  const totalLogs = await ActivityLog.countDocuments(query);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLogs / limit),
        totalItems: totalLogs,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * Helper functions for analytics
 */
async function getUserAnalytics(startDate, endDate) {
  const registrations = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const roleDistribution = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    registrations,
    roleDistribution
  };
}

async function getCouponAnalytics(startDate, endDate) {
  const uploads = await Coupon.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const categoryDistribution = await Coupon.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalViews: { $sum: '$views' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return {
    uploads,
    categoryDistribution
  };
}

async function getRevenueAnalytics(startDate, endDate) {
  const premiumUsers = await User.countDocuments({ role: 'premium' });
  const totalUsers = await User.countDocuments();
  
  return {
    premiumUsers,
    conversionRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(2) : 0,
    estimatedMRR: (premiumUsers * config.PREMIUM_SUBSCRIPTION_PRICE).toFixed(2)
  };
}

async function getActivityAnalytics(startDate, endDate) {
  const activityByAction = await ActivityLog.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const dailyActivity = await ActivityLog.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    activityByAction,
    dailyActivity
  };
}

module.exports = {
  getDashboard,
  getUsers,
  getUserDetails,
  updateUser,
  getAnalytics,
  getReportedCoupons,
  moderateCoupon,
  getSystemLogs
};