const stripeService = require('../services/stripeService');
const config = require('../config');
const logger = require('../config/logger');
const { AppError, catchAsync } = require('../middlewares/errorHandler');

/**
 * Create checkout session for premium subscription
 */
const createCheckoutSession = catchAsync(async (req, res) => {
  const user = req.user;
  const { priceId, successUrl, cancelUrl } = req.body;

  // Check if user is already premium
  if (user.isPremium) {
    throw new AppError('User already has premium subscription', 400, 'ALREADY_PREMIUM');
  }

  const session = await stripeService.createCheckoutSession(user, {
    priceId,
    successUrl,
    cancelUrl
  });

  logger.audit('Checkout session created', {
    userId: user._id,
    sessionId: session.id
  });

  res.json({
    success: true,
    data: {
      sessionId: session.id,
      url: session.url
    }
  });
});

/**
 * Create customer portal session
 */
const createPortalSession = catchAsync(async (req, res) => {
  const user = req.user;
  const { returnUrl } = req.body;

  if (!user.subscription.stripeCustomerId) {
    throw new AppError('No billing information found', 400, 'NO_BILLING_INFO');
  }

  const session = await stripeService.createPortalSession(user, returnUrl);

  logger.audit('Portal session created', {
    userId: user._id,
    sessionId: session.id
  });

  res.json({
    success: true,
    data: {
      url: session.url
    }
  });
});

/**
 * Get subscription status
 */
const getSubscriptionStatus = catchAsync(async (req, res) => {
  const user = req.user;

  const subscriptionDetails = await stripeService.getSubscriptionDetails(user);

  res.json({
    success: true,
    data: {
      subscription: subscriptionDetails,
      user: {
        isPremium: user.isPremium,
        role: user.role,
        dailyClaimsRemaining: user.isPremium ? 'unlimited' : 
          Math.max(0, config.DAILY_CLAIMS_LIMIT - user.dailyActivity.claimsToday)
      }
    }
  });
});

/**
 * Cancel subscription
 */
const cancelSubscription = catchAsync(async (req, res) => {
  const user = req.user;
  const { immediately = false } = req.body;

  if (!user.subscription.stripeSubscriptionId) {
    throw new AppError('No active subscription found', 400, 'NO_SUBSCRIPTION');
  }

  await stripeService.cancelSubscription(user, immediately);

  logger.audit('Subscription cancellation requested', {
    userId: user._id,
    immediately: immediately
  });

  res.json({
    success: true,
    message: immediately ? 
      'Subscription cancelled immediately' : 
      'Subscription will be cancelled at the end of the current billing period'
  });
});

/**
 * Reactivate cancelled subscription
 */
const reactivateSubscription = catchAsync(async (req, res) => {
  const user = req.user;

  if (!user.subscription.stripeSubscriptionId) {
    throw new AppError('No subscription found', 400, 'NO_SUBSCRIPTION');
  }

  if (!user.subscription.cancelAtPeriodEnd) {
    throw new AppError('Subscription is not cancelled', 400, 'NOT_CANCELLED');
  }

  await stripeService.reactivateSubscription(user);

  res.json({
    success: true,
    message: 'Subscription reactivated successfully'
  });
});

/**
 * Handle Stripe webhooks
 */
const handleWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    throw new AppError('Missing Stripe signature', 400, 'MISSING_SIGNATURE');
  }

  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body, signature);
  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    throw new AppError('Invalid webhook signature', 400, 'INVALID_SIGNATURE');
  }

  logger.info('Webhook received', {
    type: event.type,
    id: event.id
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await stripeService.handleSubscriptionSuccess(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await stripeService.handleSubscriptionDeletion(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        if (event.data.object.billing_reason === 'subscription_cycle') {
          const subscription = await stripeService.stripe.subscriptions.retrieve(
            event.data.object.subscription
          );
          await stripeService.handleSubscriptionRenewal(subscription);
        }
        break;

      case 'invoice.payment_failed':
        await stripeService.handlePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      default:
        logger.info('Unhandled webhook event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle completed checkout session
 */
const handleCheckoutCompleted = async (session) => {
  try {
    if (session.mode === 'subscription') {
      // Subscription will be handled by subscription.created webhook
      logger.info('Checkout completed for subscription', {
        sessionId: session.id,
        customerId: session.customer
      });
    } else {
      // Handle one-time payments if needed
      logger.info('Checkout completed for one-time payment', {
        sessionId: session.id,
        customerId: session.customer
      });
    }
  } catch (error) {
    logger.error('Error handling checkout completion:', error);
    throw error;
  }
};

/**
 * Handle trial will end notification
 */
const handleTrialWillEnd = async (subscription) => {
  try {
    const userId = subscription.metadata.userId;
    logger.info('Trial will end soon', {
      subscriptionId: subscription.id,
      userId: userId,
      trialEnd: subscription.trial_end
    });

    // TODO: Send email notification about trial ending
  } catch (error) {
    logger.error('Error handling trial will end:', error);
    throw error;
  }
};

/**
 * Get pricing information
 */
const getPricing = catchAsync(async (req, res) => {
  // This would typically come from Stripe or your database
  const pricing = {
    free: {
      name: 'Free',
      price: 0,
      currency: 'USD',
      interval: null,
      features: [
        `${config.DAILY_CLAIMS_LIMIT} coupon claims per day`,
        'Basic points system',
        'Community access',
        'Basic badges'
      ]
    },
    premium: {
      name: 'Premium',
      price: config.PREMIUM_SUBSCRIPTION_PRICE,
      currency: 'USD',
      interval: 'month',
      features: [
        'Unlimited coupon claims',
        'Advanced gamification',
        'Priority support',
        'Exclusive badges',
        'Early access to new features',
        'Analytics dashboard'
      ],
      stripePriceId: config.STRIPE_PREMIUM_PRICE_ID
    }
  };

  res.json({
    success: true,
    data: {
      pricing
    }
  });
});

/**
 * Get payment history
 */
const getPaymentHistory = catchAsync(async (req, res) => {
  const user = req.user;

  if (!user.subscription.stripeCustomerId) {
    return res.json({
      success: true,
      data: {
        payments: []
      }
    });
  }

  try {
    const invoices = await stripeService.stripe.invoices.list({
      customer: user.subscription.stripeCustomerId,
      limit: 100
    });

    const payments = invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      date: new Date(invoice.created * 1000),
      description: invoice.description || 'Premium subscription',
      invoiceUrl: invoice.hosted_invoice_url
    }));

    res.json({
      success: true,
      data: {
        payments
      }
    });
  } catch (error) {
    logger.error('Error fetching payment history:', error);
    throw new AppError('Failed to fetch payment history', 500, 'PAYMENT_HISTORY_ERROR');
  }
});

module.exports = {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  cancelSubscription,
  reactivateSubscription,
  handleWebhook,
  getPricing,
  getPaymentHistory
};