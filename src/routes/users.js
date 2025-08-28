const express = require('express');
const userController = require('../controllers/userController');
const { 
  authenticate,
  validatePagination,
  validateMongoId,
  generalRateLimit
} = require('../middlewares');

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and activity management
 */

/**
 * @swagger
 * /api/v1/users/activity:
 *   get:
 *     summary: Get user activity history
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Activity history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     activities:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Authentication required
 */
router.get('/activity',
  validatePagination,
  userController.getActivity
);

/**
 * @swagger
 * /api/v1/users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 30
 *         description: Number of days for statistics
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                     activityStats:
 *                       type: array
 *                     gamification:
 *                       type: object
 */
router.get('/stats',
  userController.getStats
);

/**
 * @swagger
 * /api/v1/users/leaderboard:
 *   get:
 *     summary: Get user leaderboard
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [points, uploads, claims]
 *           default: points
 *         description: Leaderboard type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of users to return
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     leaderboard:
 *                       type: array
 *                       items:
 *                         type: object
 *                     currentUser:
 *                       type: object
 */
router.get('/leaderboard',
  userController.getLeaderboard
);

/**
 * @swagger
 * /api/v1/users/daily-bonus:
 *   post:
 *     summary: Claim daily bonus points
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily bonus claimed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     pointsEarned:
 *                       type: number
 *                     totalPoints:
 *                       type: number
 *                     level:
 *                       type: number
 *       400:
 *         description: Daily bonus already claimed
 */
router.post('/daily-bonus',
  generalRateLimit,
  userController.claimDailyBonus
);

/**
 * @swagger
 * /api/v1/users/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get('/notifications',
  validatePagination,
  userController.getNotifications
);

/**
 * @swagger
 * /api/v1/users/my-coupons:
 *   get:
 *     summary: Get user's uploaded coupons
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, suspended, reported]
 *         description: Filter by coupon status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: User coupons retrieved successfully
 */
router.get('/my-coupons',
  validatePagination,
  userController.getMyCoupons
);

/**
 * @swagger
 * /api/v1/users/claimed-coupons:
 *   get:
 *     summary: Get user's claimed coupons
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: used
 *         schema:
 *           type: boolean
 *         description: Filter by used status
 *     responses:
 *       200:
 *         description: Claimed coupons retrieved successfully
 */
router.get('/claimed-coupons',
  validatePagination,
  userController.getClaimedCoupons
);

/**
 * @swagger
 * /api/v1/users/coupons/{couponId}/mark-used:
 *   put:
 *     summary: Mark claimed coupon as used
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon marked as used successfully
 *       404:
 *         description: Coupon not found
 *       400:
 *         description: Coupon not claimed by user or already used
 */
router.put('/coupons/:couponId/mark-used',
  validateMongoId('couponId'),
  userController.markCouponAsUsed
);

/**
 * @swagger
 * /api/v1/users/delete-account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Current password for verification
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Invalid password
 */
router.delete('/delete-account',
  userController.deleteAccount
);

module.exports = router;