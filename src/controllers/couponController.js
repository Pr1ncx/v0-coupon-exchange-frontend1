const { Coupon, User, ActivityLog } = require('../models');
const config = require('../config');
const logger = require('../config/logger');
const { AppError, catchAsync } = require('../middlewares/errorHandler');
const { checkAchievements } = require('./userController');

/**
 * Get all coupons with filtering and pagination
 */
const getCoupons = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    store,
    minDiscount,
    maxDiscount,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    q: searchQuery,
    boosted,
    popular
  } = req.query;

  const skip = (page - 1) * limit;
  let query = { status: 'active', expiryDate: { $gt: new Date() } };
  let sort = {};

  // Apply filters
  if (category) {
    query.category = category;
  }

  if (store) {
    query['store.name'] = new RegExp(store, 'i');
  }

  if (minDiscount !== undefined) {
    query['discount.value'] = { ...query['discount.value'], $gte: parseFloat(minDiscount) };
  }

  if (maxDiscount !== undefined) {
    query['discount.value'] = { ...query['discount.value'], $lte: parseFloat(maxDiscount) };
  }

  if (searchQuery) {
    query.$text = { $search: searchQuery };
  }

  if (boosted === 'true') {
    query['boosts.expiresAt'] = { $gt: new Date() };
  }

  // Handle sorting
  if (popular === 'true') {
    sort = { views: -1, 'analytics.clickCount': -1 };
  } else {
    const order = sortOrder === 'desc' ? -1 : 1;
    sort[sortBy] = order;
  }

  const coupons = await Coupon.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('uploadedBy', 'username profile.firstName profile.lastName profile.avatar')
    .lean();

  const totalCoupons = await Coupon.countDocuments(query);

  // Add computed fields
  const couponsWithExtras = coupons.map(coupon => ({
    ...coupon,
    isExpired: coupon.expiryDate < new Date(),
    claimCount: coupon.claimedBy?.length || 0,
    likeCount: coupon.likes?.length || 0,
    isBoosted: coupon.boosts?.some(boost => boost.expiresAt > new Date()) || false,
    popularityScore: (coupon.views || 0) * 0.1 + 
                    (coupon.claimedBy?.length || 0) * 2 + 
                    (coupon.likes?.length || 0) * 1.5 + 
                    (coupon.boosts?.filter(b => b.expiresAt > new Date()).length || 0) * 3
  }));

  res.json({
    success: true,
    data: {
      coupons: couponsWithExtras,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCoupons / limit),
        totalItems: totalCoupons,
        itemsPerPage: parseInt(limit)
      },
      filters: {
        category,
        store,
        minDiscount,
        maxDiscount,
        searchQuery,
        boosted,
        popular
      }
    }
  });
});

/**
 * Get a single coupon by ID
 */
const getCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const coupon = await Coupon.findById(id)
    .populate('uploadedBy', 'username profile.firstName profile.lastName profile.avatar gamification.level gamification.badges')
    .populate('claimedBy.user', 'username profile.firstName profile.lastName');

  if (!coupon) {
    throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
  }

  // Increment view count if user is authenticated and not the owner
  if (req.user && coupon.uploadedBy._id.toString() !== req.user._id.toString()) {
    await coupon.incrementView();
  }

  // Check if current user has claimed this coupon
  let userClaim = null;
  let hasLiked = false;

  if (req.user) {
    userClaim = coupon.claimedBy.find(claim => 
      claim.user._id.toString() === req.user._id.toString()
    );
    hasLiked = coupon.likes.some(like => 
      like.user.toString() === req.user._id.toString()
    );
  }

  const couponData = coupon.toPublicJSON();
  couponData.userInteraction = {
    hasClaimed: !!userClaim,
    claimDetails: userClaim,
    hasLiked: hasLiked
  };

  res.json({
    success: true,
    data: {
      coupon: couponData
    }
  });
});

/**
 * Create a new coupon
 */
const createCoupon = catchAsync(async (req, res) => {
  const user = req.user;
  const couponData = {
    ...req.body,
    uploadedBy: user._id
  };

  // Create coupon
  const coupon = new Coupon(couponData);
  await coupon.save();

  // Award points to user
  await user.addPoints(config.POINTS_UPLOAD, 'coupon_upload');
  
  // Update user stats
  user.gamification.stats.couponsUploaded += 1;
  await user.save();

  // Check for achievements and badges
  await checkAchievements(user);

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'coupon_uploaded',
    target: { type: 'coupon', id: coupon._id },
    details: {
      points: config.POINTS_UPLOAD,
      category: coupon.category,
      store: coupon.store.name
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  await ActivityLog.logActivity({
    user: user._id,
    action: 'points_earned',
    details: {
      points: config.POINTS_UPLOAD,
      reason: 'coupon_upload'
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Coupon created', {
    userId: user._id,
    couponId: coupon._id,
    category: coupon.category,
    store: coupon.store.name
  });

  res.status(201).json({
    success: true,
    message: 'Coupon created successfully',
    data: {
      coupon: coupon.toPublicJSON(),
      pointsEarned: config.POINTS_UPLOAD,
      totalPoints: user.gamification.points
    }
  });
});

/**
 * Update coupon (only by owner or admin)
 */
const updateCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  
  const coupon = await Coupon.findById(id);
  
  if (!coupon) {
    throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
  }

  // Check ownership or admin
  if (coupon.uploadedBy.toString() !== user._id.toString() && user.role !== 'admin') {
    throw new AppError('You can only update your own coupons', 403, 'NOT_OWNER');
  }

  // Update allowed fields
  const allowedUpdates = ['title', 'description', 'expiryDate', 'minimumPurchase', 'usageLimit', 'tags'];
  const updates = {};
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  Object.assign(coupon, updates);
  await coupon.save();

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'coupon_updated',
    target: { type: 'coupon', id: coupon._id },
    details: { updatedFields: Object.keys(updates) },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Coupon updated', {
    userId: user._id,
    couponId: coupon._id,
    updatedFields: Object.keys(updates)
  });

  res.json({
    success: true,
    message: 'Coupon updated successfully',
    data: {
      coupon: coupon.toPublicJSON()
    }
  });
});

/**
 * Delete coupon (only by owner or admin)
 */
const deleteCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  
  const coupon = await Coupon.findById(id);
  
  if (!coupon) {
    throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
  }

  // Check ownership or admin
  if (coupon.uploadedBy.toString() !== user._id.toString() && user.role !== 'admin') {
    throw new AppError('You can only delete your own coupons', 403, 'NOT_OWNER');
  }

  await Coupon.findByIdAndDelete(id);

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'coupon_deleted',
    target: { type: 'coupon', id: coupon._id },
    details: {
      title: coupon.title,
      category: coupon.category
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Coupon deleted', {
    userId: user._id,
    couponId: coupon._id,
    title: coupon.title
  });

  res.json({
    success: true,
    message: 'Coupon deleted successfully'
  });
});

/**
 * Claim coupon with freemium logic
 */
const claimCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const coupon = await Coupon.findById(id).populate('uploadedBy', 'username');
  
  if (!coupon) {
    throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
  }

  // Check if user owns the coupon
  if (coupon.uploadedBy._id.toString() === user._id.toString()) {
    throw new AppError('You cannot claim your own coupon', 400, 'CANNOT_CLAIM_OWN');
  }

  // Check freemium limits
  if (!user.canClaimCoupon()) {
    throw new AppError(
      `Daily claim limit reached. Free users can claim ${config.DAILY_CLAIMS_LIMIT} coupons per day. Upgrade to premium for unlimited claims.`,
      403,
      'DAILY_LIMIT_REACHED'
    );
  }

  // Check if user has enough points
  if (user.gamification.points < config.POINTS_CLAIM) {
    throw new AppError(
      `Insufficient points. You need ${config.POINTS_CLAIM} points to claim a coupon.`,
      400,
      'INSUFFICIENT_POINTS'
    );
  }

  // Claim the coupon
  await coupon.addClaim(user._id);
  
  // Spend user points
  await user.spendPoints(config.POINTS_CLAIM);
  
  // Update user stats
  user.gamification.stats.couponsClaimed += 1;
  await user.incrementClaimCount();

  // Check for achievements and badges
  await checkAchievements(user);

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'coupon_claimed',
    target: { type: 'coupon', id: coupon._id },
    details: {
      pointsSpent: config.POINTS_CLAIM,
      store: coupon.store.name,
      category: coupon.category
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  await ActivityLog.logActivity({
    user: user._id,
    action: 'points_spent',
    details: {
      points: config.POINTS_CLAIM,
      reason: 'coupon_claim'
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Coupon claimed', {
    userId: user._id,
    couponId: coupon._id,
    pointsSpent: config.POINTS_CLAIM
  });

  res.json({
    success: true,
    message: 'Coupon claimed successfully!',
    data: {
      coupon: coupon.toPublicJSON(),
      pointsSpent: config.POINTS_CLAIM,
      remainingPoints: user.gamification.points,
      dailyClaimsRemaining: user.isPremium ? 'unlimited' : Math.max(0, config.DAILY_CLAIMS_LIMIT - user.dailyActivity.claimsToday)
    }
  });
});

/**
 * Like/unlike coupon
 */
const toggleLike = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const coupon = await Coupon.findById(id);
  
  if (!coupon) {
    throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
  }

  await coupon.addLike(user._id);
  
  const hasLiked = coupon.likes.some(like => 
    like.user.toString() === user._id.toString()
  );

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: hasLiked ? 'coupon_liked' : 'coupon_unliked',
    target: { type: 'coupon', id: coupon._id },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    message: hasLiked ? 'Coupon liked' : 'Coupon unliked',
    data: {
      hasLiked,
      likeCount: coupon.likeCount
    }
  });
});

/**
 * Boost coupon visibility
 */
const boostCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const coupon = await Coupon.findById(id);
  
  if (!coupon) {
    throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
  }

  // Check if user has enough points
  if (user.gamification.points < config.POINTS_BOOST) {
    throw new AppError(
      `Insufficient points. You need ${config.POINTS_BOOST} points to boost a coupon.`,
      400,
      'INSUFFICIENT_POINTS'
    );
  }

  // Boost the coupon
  await coupon.addBoost(user._id);
  
  // Spend user points
  await user.spendPoints(config.POINTS_BOOST);

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'coupon_boosted',
    target: { type: 'coupon', id: coupon._id },
    details: {
      pointsSpent: config.POINTS_BOOST,
      boostDuration: '24 hours'
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  await ActivityLog.logActivity({
    user: user._id,
    action: 'points_spent',
    details: {
      points: config.POINTS_BOOST,
      reason: 'coupon_boost'
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Coupon boosted', {
    userId: user._id,
    couponId: coupon._id,
    pointsSpent: config.POINTS_BOOST
  });

  res.json({
    success: true,
    message: 'Coupon boosted successfully! It will have increased visibility for 24 hours.',
    data: {
      pointsSpent: config.POINTS_BOOST,
      remainingPoints: user.gamification.points,
      boostExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
});

/**
 * Report coupon
 */
const reportCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason, description } = req.body;
  const user = req.user;

  const coupon = await Coupon.findById(id);
  
  if (!coupon) {
    throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
  }

  await coupon.addReport(user._id, reason, description);

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'coupon_reported',
    target: { type: 'coupon', id: coupon._id },
    details: {
      reason,
      description
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Coupon reported', {
    userId: user._id,
    couponId: coupon._id,
    reason,
    description
  });

  res.json({
    success: true,
    message: 'Coupon reported successfully. Our team will review it.'
  });
});

/**
 * Get coupon categories
 */
const getCategories = catchAsync(async (req, res) => {
  const categories = [
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
  ];

  // Get category counts
  const categoryCounts = await Coupon.aggregate([
    {
      $match: {
        status: 'active',
        expiryDate: { $gt: new Date() }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);

  const categoriesWithCounts = categories.map(category => {
    const categoryData = categoryCounts.find(c => c._id === category);
    return {
      name: category,
      count: categoryData ? categoryData.count : 0
    };
  });

  res.json({
    success: true,
    data: {
      categories: categoriesWithCounts
    }
  });
});

/**
 * Get trending coupons
 */
const getTrending = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;

  // Get coupons with high activity in last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const trending = await Coupon.find({
    status: 'active',
    expiryDate: { $gt: new Date() },
    createdAt: { $gte: yesterday }
  })
    .sort({ views: -1, 'analytics.clickCount': -1 })
    .limit(parseInt(limit))
    .populate('uploadedBy', 'username profile.firstName profile.lastName profile.avatar')
    .lean();

  res.json({
    success: true,
    data: {
      trending
    }
  });
});

module.exports = {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  claimCoupon,
  toggleLike,
  boostCoupon,
  reportCoupon,
  getCategories,
  getTrending
};