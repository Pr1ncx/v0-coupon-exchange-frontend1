const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const couponRoutes = require('./coupons');
const paymentRoutes = require('./payments');
const uploadRoutes = require('./upload');
const monitoringRoutes = require('./monitoring');
const adminRoutes = require('./admin');

const router = express.Router();

/**
 * @swagger
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: Authentication information is missing or invalid
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Access denied. No token provided."
 *               error:
 *                 type: string
 *                 example: "MISSING_TOKEN"
 *     
 *     ForbiddenError:
 *       description: Insufficient permissions
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Access denied. Insufficient permissions."
 *               error:
 *                 type: string
 *                 example: "INSUFFICIENT_PERMISSIONS"
 *     
 *     NotFoundError:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Resource not found"
 *               error:
 *                 type: string
 *                 example: "NOT_FOUND"
 *     
 *     ValidationError:
 *       description: Request validation failed
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Validation failed"
 *               errors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                     message:
 *                       type: string
 *                     value:
 *                       type: string
 *     
 *     RateLimitError:
 *       description: Rate limit exceeded
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Too many requests. Please try again later."
 *               error:
 *                 type: string
 *                 example: "RATE_LIMIT_EXCEEDED"
 *               retryAfter:
 *                 type: number
 *                 example: 60
 *               upgradeInfo:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                   upgradeUrl:
 *                     type: string
 *     
 *     InternalServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Something went wrong!"
 *               error:
 *                 type: string
 *                 example: "INTERNAL_ERROR"
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: API status and information
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Coupon Exchange API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 documentation:
 *                   type: string
 *                   example: "/api-docs"
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Coupon Exchange SaaS API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api-docs',
    features: [
      'User Authentication & Authorization',
      'Coupon Management with Freemium Model',
      'Gamification System',
      'Stripe Payment Integration',
      'File Upload & Processing',
      'Real-time Monitoring & Analytics',
      'Admin Dashboard',
      'Rate Limiting & Security'
    ],
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      coupons: '/api/v1/coupons',
      payments: '/api/v1/payments',
      upload: '/api/v1/upload',
      monitoring: '/api/v1/monitoring',
      admin: '/api/v1/admin'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/coupons', couponRoutes);
router.use('/payments', paymentRoutes);
router.use('/upload', uploadRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/admin', adminRoutes);

module.exports = router;