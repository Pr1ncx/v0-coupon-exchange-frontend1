const { User, ActivityLog, Coupon } = require('../models');
const config = require('../config');
const logger = require('../config/logger');
const { AppError, catchAsync } = require('../middlewares/errorHandler');

/**
 * Get user activity history
 */
const getActivity = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, action, startDate, endDate } = req.query;
  
  const skip = (page - 1) * limit;
  
  const activities = await ActivityLog.getUserActivity(userId, {
    limit: parseInt(limit),
    skip: skip,
    action,
    startDate,
    endDate
  });
  
  const totalActivities = await ActivityLog.countDocuments({
    user: userId,
    ...(action && { action }),
    ...(startDate || endDate) && {
      timestamp: {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && { $lte: new Date(endDate) })
      }
    }
  });
  
  res.json({
    success: true,
    data: {
      activities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalActivities / limit),
        totalItems: totalActivities,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * Get user statistics
 */
const getStats = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { days = 30 } = req.query;
  
  // Get activity stats
  const activityStats = await ActivityLog.getActivityStats(userId, parseInt(days));
  
  // Get user's coupons
  const userCoupons = await Coupon.find({ uploadedBy: userId });
  const activeCoupons = userCoupons.filter(coupon => coupon.isActive).length;
  const expiredCoupons = userCoupons.filter(coupon => coupon.isExpired).length;
  
  // Calculate total views and claims
  const totalViews = userCoupons.reduce((sum, coupon) => sum + coupon.views, 0);
  const totalClaims = userCoupons.reduce((sum, coupon) => sum + coupon.claimCount, 0);
  
  // Get claimed coupons
  const claimedCoupons = await Coupon.find({
    'claimedBy.user': userId
  });
  
  res.json({
    success: true,
    data: {
      overview: {
        couponsUploaded: userCoupons.length,
        activeCoupons,
        expiredCoupons,
        couponsClaimed: claimedCoupons.length,
        totalViews,
        totalClaims,
        points: req.user.gamification.points,
        level: req.user.gamification.level,
        badges: req.user.gamification.badges.length
      },
      activityStats,
      gamification: req.user.gamification
    }
  });
});

/**
 * Get user leaderboard position
 */
const getLeaderboard = catchAsync(async (req, res) => {
  const { type = 'points', limit = 50 } = req.query;
  
  let sortField;
  switch (type) {
    case 'points':
      sortField = { 'gamification.points': -1 };
      break;
    case 'uploads':
      sortField = { 'gamification.stats.couponsUploaded': -1 };
      break;
    case 'claims':
      sortField = { 'gamification.stats.couponsClaimed': -1 };
      break;
    default:
      sortField = { 'gamification.points': -1 };
  }
  
  const leaderboard = await User.find({ isActive: true })
    .select('username profile.firstName profile.lastName profile.avatar gamification')
    .sort(sortField)
    .limit(parseInt(limit))
    .lean();
  
  // Find current user's position
  const userPosition = await User.countDocuments({
    isActive: true,
    'gamification.points': { $gt: req.user.gamification.points }
  }) + 1;
  
  res.json({
    success: true,
    data: {
      leaderboard: leaderboard.map((user, index) => ({
        rank: index + 1,
        userId: user._id,
        username: user.username,
        displayName: user.profile?.firstName || user.username,
        avatar: user.profile?.avatar,
        points: user.gamification.points,
        level: user.gamification.level,
        badges: user.gamification.badges.length,
        stats: user.gamification.stats
      })),
      currentUser: {
        position: userPosition,
        points: req.user.gamification.points,
        level: req.user.gamification.level
      }
    }
  });
});

/**
 * Claim daily bonus points
 */
const claimDailyBonus = catchAsync(async (req, res) => {
  const user = req.user;
  
  // Check if user already claimed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastBonus = await ActivityLog.findOne({
    user: user._id,
    action: 'points_earned',
    'details.reason': 'daily_bonus',
    timestamp: { $gte: today }
  });
  
  if (lastBonus) {
    throw new AppError('Daily bonus already claimed today', 400, 'BONUS_ALREADY_CLAIMED');
  }
  
  // Award daily bonus
  const bonusPoints = 10; // Daily bonus points
  await user.addPoints(bonusPoints, 'daily_bonus');
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'points_earned',
    details: {
      points: bonusPoints,
      reason: 'daily_bonus'
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('Daily bonus claimed', {
    userId: user._id,
    points: bonusPoints
  });
  
  res.json({
    success: true,
    message: 'Daily bonus claimed successfully!',
    data: {
      pointsEarned: bonusPoints,
      totalPoints: user.gamification.points,
      level: user.gamification.level
    }
  });
});

/**
 * Check and award achievements
 */
const checkAchievements = async (user) => {
  const achievements = [];
  
  // Points-based achievements
  const pointMilestones = [
    { points: 100, name: 'First Century', description: 'Earned 100 points' },
    { points: 500, name: 'Point Master', description: 'Earned 500 points' },
    { points: 1000, name: 'Point Legend', description: 'Earned 1000 points' },
    { points: 5000, name: 'Point God', description: 'Earned 5000 points' }
  ];
  
  for (const milestone of pointMilestones) {
    if (user.gamification.points >= milestone.points) {
      const hasAchievement = user.gamification.achievements.find(
        a => a.name === milestone.name
      );
      
      if (!hasAchievement) {
        user.gamification.achievements.push({
          name: milestone.name,
          description: milestone.description,
          points: milestone.points
        });
        achievements.push(milestone);
      }
    }
  }
  
  // Upload-based badges
  const uploadCount = user.gamification.stats.couponsUploaded;
  const uploadBadges = [
    { count: 5, name: 'uploader', description: 'Uploaded 5 coupons' },
    { count: 25, name: 'content_creator', description: 'Uploaded 25 coupons' },
    { count: 100, name: 'coupon_master', description: 'Uploaded 100 coupons' }
  ];
  
  for (const badge of uploadBadges) {
    if (uploadCount >= badge.count) {
      const hasBadge = user.gamification.badges.find(b => b.name === badge.name);
      if (!hasBadge) {
        await user.awardBadge(badge.name, badge.description);
      }
    }
  }
  
  // Claim-based badges
  const claimCount = user.gamification.stats.couponsClaimed;
  const claimBadges = [
    { count: 10, name: 'claimer', description: 'Claimed 10 coupons' },
    { count: 50, name: 'savings_hunter', description: 'Claimed 50 coupons' },
    { count: 100, name: 'deal_finder', description: 'Claimed 100 coupons' }
  ];
  
  for (const badge of claimBadges) {
    if (claimCount >= badge.count) {
      const hasBadge = user.gamification.badges.find(b => b.name === badge.name);
      if (!hasBadge) {
        await user.awardBadge(badge.name, badge.description);
      }
    }
  }
  
  if (achievements.length > 0) {
    await user.save();
    
    // Log achievements
    for (const achievement of achievements) {
      await ActivityLog.logActivity({
        user: user._id,
        action: 'achievement_unlocked',
        details: {
          achievement: achievement.name,
          description: achievement.description
        }
      });
    }
  }
  
  return achievements;
};

/**
 * Get user notifications (achievements, level ups, etc.)
 */
const getNotifications = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20 } = req.query;
  
  const skip = (page - 1) * limit;
  
  // Get recent achievements and level ups
  const notifications = await ActivityLog.find({
    user: userId,
    action: { $in: ['achievement_unlocked', 'level_up', 'badge_earned'] }
  })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  
  const totalNotifications = await ActivityLog.countDocuments({
    user: userId,
    action: { $in: ['achievement_unlocked', 'level_up', 'badge_earned'] }
  });
  
  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalNotifications / limit),
        totalItems: totalNotifications,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * Get user's uploaded coupons
 */
const getMyCoupons = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { 
    page = 1, 
    limit = 20, 
    status, 
    category,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;
  
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  
  let query = { uploadedBy: userId };
  
  if (status) {
    query.status = status;
  }
  
  if (category) {
    query.category = category;
  }
  
  const coupons = await Coupon.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('claimedBy.user', 'username')
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
 * Get user's claimed coupons
 */
const getClaimedCoupons = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, used } = req.query;
  
  const skip = (page - 1) * limit;
  
  let matchQuery = { 'claimedBy.user': userId };
  
  if (used !== undefined) {
    matchQuery['claimedBy.used'] = used === 'true';
  }
  
  const coupons = await Coupon.find(matchQuery)
    .sort({ 'claimedBy.claimedAt': -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('uploadedBy', 'username profile.firstName profile.lastName')
    .lean();
  
  const totalCoupons = await Coupon.countDocuments(matchQuery);
  
  // Add claim details to each coupon
  const couponsWithClaimDetails = coupons.map(coupon => {
    const userClaim = coupon.claimedBy.find(claim => 
      claim.user.toString() === userId.toString()
    );
    
    return {
      ...coupon,
      claimDetails: userClaim
    };
  });
  
  res.json({
    success: true,
    data: {
      coupons: couponsWithClaimDetails,
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
 * Mark claimed coupon as used
 */
const markCouponAsUsed = catchAsync(async (req, res) => {
  const { couponId } = req.params;
  const userId = req.user._id;
  
  const coupon = await Coupon.findById(couponId);
  
  if (!coupon) {
    throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
  }
  
  await coupon.markAsUsed(userId);
  
  // Log activity
  await ActivityLog.logActivity({
    user: userId,
    action: 'coupon_used',
    target: { type: 'coupon', id: couponId },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: 'Coupon marked as used successfully'
  });
});

/**
 * Delete user account
 */
const deleteAccount = catchAsync(async (req, res) => {
  const user = req.user;
  const { password } = req.body;
  
  // Verify password
  const userWithPassword = await User.findById(user._id).select('+password');
  const isValidPassword = await userWithPassword.comparePassword(password);
  
  if (!isValidPassword) {
    throw new AppError('Password is incorrect', 400, 'INVALID_PASSWORD');
  }
  
  // Deactivate instead of hard delete to preserve data integrity
  user.isActive = false;
  user.email = `deleted_${Date.now()}_${user.email}`;
  user.username = `deleted_${Date.now()}_${user.username}`;
  await user.save();
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'user_account_deleted',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('User account deleted', {
    userId: user._id,
    email: user.email,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
});

module.exports = {
  getActivity,
  getStats,
  getLeaderboard,
  claimDailyBonus,
  checkAchievements,
  getNotifications,
  getMyCoupons,
  getClaimedCoupons,
  markCouponAsUsed,
  deleteAccount
};