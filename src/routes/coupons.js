const express = require('express');
const couponController = require('../controllers/couponController');
const { 
  authenticate,
  optionalAuth,
  validate,
  validatePagination,
  validateMongoId,
  couponSchemas,
  couponCreationRateLimit,
  couponClaimRateLimit,
  generalRateLimit
} = require('../middlewares');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon management and interaction
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Coupon:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - code
 *         - discount
 *         - category
 *         - store
 *         - expiryDate
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the coupon
 *         title:
 *           type: string
 *           maxLength: 100
 *           description: Coupon title
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Coupon description
 *         code:
 *           type: string
 *           maxLength: 50
 *           description: Coupon code
 *         discount:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [percentage, fixed]
 *             value:
 *               type: number
 *               minimum: 0
 *             currency:
 *               type: string
 *               default: USD
 *         category:
 *           type: string
 *           enum: [electronics, clothing, food, travel, entertainment, health, home, sports, books, automotive, beauty, other]
 *         store:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               maxLength: 100
 *             website:
 *               type: string
 *               format: uri
 *         expiryDate:
 *           type: string
 *           format: date-time
 *         minimumPurchase:
 *           type: number
 *           minimum: 0
 *         usageLimit:
 *           type: number
 *           minimum: 1
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         views:
 *           type: number
 *         claimCount:
 *           type: number
 *         likeCount:
 *           type: number
 *         isBoosted:
 *           type: boolean
 *         uploadedBy:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/coupons:
 *   get:
 *     summary: Get all coupons with filtering and pagination
 *     tags: [Coupons]
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
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: store
 *         schema:
 *           type: string
 *         description: Filter by store name
 *       - in: query
 *         name: minDiscount
 *         schema:
 *           type: number
 *         description: Minimum discount value
 *       - in: query
 *         name: maxDiscount
 *         schema:
 *           type: number
 *         description: Maximum discount value
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: boosted
 *         schema:
 *           type: boolean
 *         description: Filter boosted coupons
 *       - in: query
 *         name: popular
 *         schema:
 *           type: boolean
 *         description: Sort by popularity
 *     responses:
 *       200:
 *         description: Coupons retrieved successfully
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
 *                     filters:
 *                       type: object
 */
router.get('/',
  optionalAuth,
  validatePagination,
  validate(couponSchemas.search, 'query'),
  couponController.getCoupons
);

/**
 * @swagger
 * /api/v1/coupons/categories:
 *   get:
 *     summary: Get coupon categories with counts
 *     tags: [Coupons]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           count:
 *                             type: number
 */
router.get('/categories',
  couponController.getCategories
);

/**
 * @swagger
 * /api/v1/coupons/trending:
 *   get:
 *     summary: Get trending coupons
 *     tags: [Coupons]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of trending coupons to return
 *     responses:
 *       200:
 *         description: Trending coupons retrieved successfully
 */
router.get('/trending',
  optionalAuth,
  couponController.getTrending
);

/**
 * @swagger
 * /api/v1/coupons:
 *   post:
 *     summary: Create a new coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - code
 *               - discount
 *               - category
 *               - store
 *               - expiryDate
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               code:
 *                 type: string
 *                 maxLength: 50
 *               discount:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [percentage, fixed]
 *                   value:
 *                     type: number
 *                     minimum: 0
 *                   currency:
 *                     type: string
 *                     default: USD
 *               category:
 *                 type: string
 *                 enum: [electronics, clothing, food, travel, entertainment, health, home, sports, books, automotive, beauty, other]
 *               store:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     maxLength: 100
 *                   website:
 *                     type: string
 *                     format: uri
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *               minimumPurchase:
 *                 type: number
 *                 minimum: 0
 *               usageLimit:
 *                 type: number
 *                 minimum: 1
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Coupon created successfully
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
 *                     coupon:
 *                       $ref: '#/components/schemas/Coupon'
 *                     pointsEarned:
 *                       type: number
 *                     totalPoints:
 *                       type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/',
  authenticate,
  couponCreationRateLimit,
  validate(couponSchemas.create),
  couponController.createCoupon
);

/**
 * @swagger
 * /api/v1/coupons/{id}:
 *   get:
 *     summary: Get a single coupon by ID
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon retrieved successfully
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
 *                     coupon:
 *                       $ref: '#/components/schemas/Coupon'
 *       404:
 *         description: Coupon not found
 */
router.get('/:id',
  optionalAuth,
  validateMongoId('id'),
  couponController.getCoupon
);

/**
 * @swagger
 * /api/v1/coupons/{id}:
 *   put:
 *     summary: Update coupon (owner or admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *               minimumPurchase:
 *                 type: number
 *                 minimum: 0
 *               usageLimit:
 *                 type: number
 *                 minimum: 1
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to update this coupon
 *       404:
 *         description: Coupon not found
 */
router.put('/:id',
  authenticate,
  validateMongoId('id'),
  validate(couponSchemas.update),
  couponController.updateCoupon
);

/**
 * @swagger
 * /api/v1/coupons/{id}:
 *   delete:
 *     summary: Delete coupon (owner or admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to delete this coupon
 *       404:
 *         description: Coupon not found
 */
router.delete('/:id',
  authenticate,
  validateMongoId('id'),
  couponController.deleteCoupon
);

/**
 * @swagger
 * /api/v1/coupons/{id}/claim:
 *   post:
 *     summary: Claim a coupon (freemium logic applies)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon claimed successfully
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
 *                     coupon:
 *                       $ref: '#/components/schemas/Coupon'
 *                     pointsSpent:
 *                       type: number
 *                     remainingPoints:
 *                       type: number
 *                     dailyClaimsRemaining:
 *                       type: string
 *       400:
 *         description: Already claimed, insufficient points, or cannot claim own coupon
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Daily claim limit reached (free users)
 *       404:
 *         description: Coupon not found
 *       429:
 *         description: Too many claim attempts
 */
router.post('/:id/claim',
  authenticate,
  couponClaimRateLimit,
  validateMongoId('id'),
  couponController.claimCoupon
);

/**
 * @swagger
 * /api/v1/coupons/{id}/like:
 *   post:
 *     summary: Like or unlike a coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon like status toggled
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
 *                     hasLiked:
 *                       type: boolean
 *                     likeCount:
 *                       type: number
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Coupon not found
 */
router.post('/:id/like',
  authenticate,
  generalRateLimit,
  validateMongoId('id'),
  couponController.toggleLike
);

/**
 * @swagger
 * /api/v1/coupons/{id}/boost:
 *   post:
 *     summary: Boost coupon visibility (costs points)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon boosted successfully
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
 *                     pointsSpent:
 *                       type: number
 *                     remainingPoints:
 *                       type: number
 *                     boostExpiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Insufficient points
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Coupon not found
 */
router.post('/:id/boost',
  authenticate,
  generalRateLimit,
  validateMongoId('id'),
  couponController.boostCoupon
);

/**
 * @swagger
 * /api/v1/coupons/{id}/report:
 *   post:
 *     summary: Report a coupon for inappropriate content
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [spam, inappropriate, fake, expired, other]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Coupon reported successfully
 *       400:
 *         description: Already reported by user or validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Coupon not found
 */
router.post('/:id/report',
  authenticate,
  validateMongoId('id'),
  validate(couponSchemas.report),
  couponController.reportCoupon
);

module.exports = router;