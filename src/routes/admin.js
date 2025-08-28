const express = require('express');
const adminController = require('../controllers/adminController');
const { 
  authenticate,
  authorize,
  validatePagination,
  validateMongoId,
  adminRateLimit,
  adminSchemas,
  validate
} = require('../middlewares');

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));
router.use(adminRateLimit);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative functions (Admin access required)
 */

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard overview
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                       properties:
 *                         users:
 *                           type: object
 *                         coupons:
 *                           type: object
 *                         engagement:
 *                           type: object
 *                     topCategories:
 *                       type: array
 *                     recentActivity:
 *                       type: array
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users with filtering and pagination
 *     tags: [Admin]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, premium, admin]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in username, email, or name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/users',
  validatePagination,
  adminController.getUsers
);

/**
 * @swagger
 * /api/v1/admin/users/{userId}:
 *   get:
 *     summary: Get detailed user information
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     statistics:
 *                       type: object
 *                     recentCoupons:
 *                       type: array
 *                     recentClaims:
 *                       type: array
 *                     recentActivity:
 *                       type: array
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/users/:userId',
  validateMongoId('userId'),
  adminController.getUserDetails
);

/**
 * @swagger
 * /api/v1/admin/users/{userId}:
 *   put:
 *     summary: Update user (admin actions)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, premium, admin]
 *               isActive:
 *                 type: boolean
 *               reason:
 *                 type: string
 *                 description: Reason for the change (for audit log)
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.put('/users/:userId',
  validateMongoId('userId'),
  validate(adminSchemas.userUpdate),
  adminController.updateUser
);

/**
 * @swagger
 * /api/v1/admin/analytics:
 *   get:
 *     summary: Get system analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [users, coupons, revenue, activity]
 *         style: form
 *         explode: false
 *         description: Specific metrics to include
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
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
 *                     period:
 *                       type: object
 *                     analytics:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/analytics',
  validate(adminSchemas.analytics, 'query'),
  adminController.getAnalytics
);

/**
 * @swagger
 * /api/v1/admin/reported-coupons:
 *   get:
 *     summary: Get reported coupons for moderation
 *     tags: [Admin]
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
 *           enum: [reported, suspended]
 *           default: reported
 *     responses:
 *       200:
 *         description: Reported coupons retrieved successfully
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
 *                     coupons:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Coupon'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/reported-coupons',
  validatePagination,
  adminController.getReportedCoupons
);

/**
 * @swagger
 * /api/v1/admin/coupons/{couponId}/moderate:
 *   put:
 *     summary: Moderate coupon (approve/suspend/delete)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [verify, suspend, delete]
 *                 description: Moderation action to take
 *               reason:
 *                 type: string
 *                 description: Reason for the action (for audit log)
 *     responses:
 *       200:
 *         description: Coupon moderated successfully
 *       400:
 *         description: Invalid action or validation error
 *       404:
 *         description: Coupon not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.put('/coupons/:couponId/moderate',
  validateMongoId('couponId'),
  adminController.moderateCoupon
);

/**
 * @swagger
 * /api/v1/admin/logs:
 *   get:
 *     summary: Get system activity logs
 *     tags: [Admin]
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
 *           maximum: 1000
 *           default: 100
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [debug, info, warn, error, fatal]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by specific action type
 *     responses:
 *       200:
 *         description: System logs retrieved successfully
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
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/logs',
  validatePagination,
  adminController.getSystemLogs
);

module.exports = router;