const express = require('express');
const monitoringController = require('../controllers/monitoringController');
const { 
  authenticate,
  authorize,
  adminRateLimit
} = require('../middlewares');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Monitoring
 *   description: System monitoring and analytics (Admin access required)
 */

// Health check endpoint (public)
router.get('/health', monitoringController.getHealth);

// All other monitoring endpoints require authentication
router.use(authenticate);

// Most endpoints require admin access, some allow premium users
/**
 * @swagger
 * /api/v1/monitoring/overview:
 *   get:
 *     summary: Get comprehensive system overview
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System overview retrieved successfully
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
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     health:
 *                       type: object
 *                     performance:
 *                       type: object
 *                     business:
 *                       type: object
 *                     alerts:
 *                       type: array
 *                     summary:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/overview',
  authorize('admin'),
  adminRateLimit,
  monitoringController.getOverview
);

/**
 * @swagger
 * /api/v1/monitoring/performance:
 *   get:
 *     summary: Get detailed performance metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/performance',
  authorize('admin'),
  adminRateLimit,
  monitoringController.getPerformance
);

/**
 * @swagger
 * /api/v1/monitoring/business:
 *   get:
 *     summary: Get business metrics and analytics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days for analytics
 *     responses:
 *       200:
 *         description: Business metrics retrieved successfully
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
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     period:
 *                       type: string
 *                     overview:
 *                       type: object
 *                     detailed:
 *                       type: object
 *                     insights:
 *                       type: array
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or premium access required
 */
router.get('/business',
  (req, res, next) => {
    // Allow premium users to access business metrics
    if (req.user.role === 'admin' || req.user.role === 'premium') {
      return next();
    }
    return authorize('admin')(req, res, next);
  },
  adminRateLimit,
  monitoringController.getBusiness
);

/**
 * @swagger
 * /api/v1/monitoring/alerts:
 *   get:
 *     summary: Get active system alerts
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/alerts',
  authorize('admin'),
  adminRateLimit,
  monitoringController.getAlerts
);

/**
 * @swagger
 * /api/v1/monitoring/realtime:
 *   get:
 *     summary: Get real-time dashboard metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time metrics retrieved successfully
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
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         activeUsers:
 *                           type: number
 *                         requestsPerSecond:
 *                           type: number
 *                         avgResponseTime:
 *                           type: number
 *                         errorRate:
 *                           type: number
 *                         memoryUsage:
 *                           type: string
 *                         cpuUsage:
 *                           type: string
 *                     recentActivity:
 *                       type: array
 *                     topEndpoints:
 *                       type: array
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/realtime',
  authorize('admin'),
  adminRateLimit,
  monitoringController.getRealtime
);

/**
 * @swagger
 * /api/v1/monitoring/logs:
 *   get:
 *     summary: Get filtered monitoring logs
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [debug, info, warn, error, fatal]
 *           default: info
 *         description: Minimum log level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of logs to return
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for log filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for log filtering
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for log messages
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/logs',
  authorize('admin'),
  adminRateLimit,
  monitoringController.getLogs
);

/**
 * @swagger
 * /api/v1/monitoring/export:
 *   get:
 *     summary: Export monitoring data
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [overview, performance, business, health]
 *           default: overview
 *         description: Type of data to export
 *     responses:
 *       200:
 *         description: Data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/export',
  authorize('admin'),
  adminRateLimit,
  monitoringController.exportData
);

/**
 * @swagger
 * /api/v1/monitoring/reset-stats:
 *   post:
 *     summary: Reset performance statistics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance statistics reset successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.post('/reset-stats',
  authorize('admin'),
  adminRateLimit,
  monitoringController.resetStats
);

module.exports = router;