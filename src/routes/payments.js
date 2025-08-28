const express = require('express');
const paymentController = require('../controllers/paymentController');
const { 
  authenticate,
  generalRateLimit
} = require('../middlewares');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment and subscription management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [free, premium]
 *         status:
 *           type: string
 *           enum: [active, trialing, past_due, canceled, unpaid]
 *         currentPeriodStart:
 *           type: string
 *           format: date-time
 *         currentPeriodEnd:
 *           type: string
 *           format: date-time
 *         cancelAtPeriodEnd:
 *           type: boolean
 *         trialEnd:
 *           type: string
 *           format: date-time
 *     
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         description:
 *           type: string
 *         invoiceUrl:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/payments/pricing:
 *   get:
 *     summary: Get pricing information
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Pricing information retrieved successfully
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
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         free:
 *                           type: object
 *                         premium:
 *                           type: object
 */
router.get('/pricing', 
  paymentController.getPricing
);

/**
 * @swagger
 * /api/v1/payments/checkout:
 *   post:
 *     summary: Create Stripe checkout session for premium subscription
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Stripe price ID (optional, defaults to premium price)
 *               successUrl:
 *                 type: string
 *                 description: URL to redirect after successful payment
 *               cancelUrl:
 *                 type: string
 *                 description: URL to redirect after cancelled payment
 *     responses:
 *       200:
 *         description: Checkout session created successfully
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
 *                     sessionId:
 *                       type: string
 *                     url:
 *                       type: string
 *       400:
 *         description: User already has premium subscription
 *       401:
 *         description: Authentication required
 */
router.post('/checkout',
  authenticate,
  generalRateLimit,
  paymentController.createCheckoutSession
);

/**
 * @swagger
 * /api/v1/payments/portal:
 *   post:
 *     summary: Create Stripe customer portal session
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               returnUrl:
 *                 type: string
 *                 description: URL to return to from portal
 *     responses:
 *       200:
 *         description: Portal session created successfully
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
 *                     url:
 *                       type: string
 *       400:
 *         description: No billing information found
 *       401:
 *         description: Authentication required
 */
router.post('/portal',
  authenticate,
  generalRateLimit,
  paymentController.createPortalSession
);

/**
 * @swagger
 * /api/v1/payments/subscription:
 *   get:
 *     summary: Get current subscription status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status retrieved successfully
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
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *                     user:
 *                       type: object
 *       401:
 *         description: Authentication required
 */
router.get('/subscription',
  authenticate,
  paymentController.getSubscriptionStatus
);

/**
 * @swagger
 * /api/v1/payments/subscription/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               immediately:
 *                 type: boolean
 *                 default: false
 *                 description: Cancel immediately or at period end
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       400:
 *         description: No active subscription found
 *       401:
 *         description: Authentication required
 */
router.post('/subscription/cancel',
  authenticate,
  generalRateLimit,
  paymentController.cancelSubscription
);

/**
 * @swagger
 * /api/v1/payments/subscription/reactivate:
 *   post:
 *     summary: Reactivate cancelled subscription
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription reactivated successfully
 *       400:
 *         description: No subscription found or not cancelled
 *       401:
 *         description: Authentication required
 */
router.post('/subscription/reactivate',
  authenticate,
  generalRateLimit,
  paymentController.reactivateSubscription
);

/**
 * @swagger
 * /api/v1/payments/history:
 *   get:
 *     summary: Get payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
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
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Authentication required
 */
router.get('/history',
  authenticate,
  paymentController.getPaymentHistory
);

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Payments]
 *     description: Endpoint for Stripe webhook events. Not for direct use.
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature or processing error
 */
router.post('/webhook',
  // Note: This endpoint needs raw body, so we'll handle it specially in app.js
  paymentController.handleWebhook
);

module.exports = router;