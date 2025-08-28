const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const config = require('../config');
const logger = require('../config/logger');
const { User, ActivityLog } = require('../models');

/**
 * Stripe service for handling payments and subscriptions
 */
class StripeService {
  constructor() {
    this.stripe = stripe;
    this.webhookSecret = config.STRIPE_WEBHOOK_SECRET;
    this.premiumPriceId = config.STRIPE_PREMIUM_PRICE_ID;
  }

  /**
   * Create or retrieve Stripe customer
   */
  async createOrGetCustomer(user) {
    try {
      // Check if user already has a Stripe customer ID
      if (user.subscription.stripeCustomerId) {
        try {
          const customer = await this.stripe.customers.retrieve(user.subscription.stripeCustomerId);
          if (!customer.deleted) {
            return customer;
          }
        } catch (error) {
          logger.warn('Stripe customer not found, creating new one', {
            userId: user._id,
            oldCustomerId: user.subscription.stripeCustomerId
          });
        }
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.profile.fullName || user.username,
        metadata: {
          userId: user._id.toString(),
          username: user.username
        }
      });

      // Update user with customer ID
      user.subscription.stripeCustomerId = customer.id;
      await user.save();

      logger.audit('Stripe customer created', {
        userId: user._id,
        customerId: customer.id
      });

      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create payment customer');
    }
  }

  /**
   * Create checkout session for premium subscription
   */
  async createCheckoutSession(user, options = {}) {
    try {
      const customer = await this.createOrGetCustomer(user);

      const {
        successUrl = `${config.CORS_ORIGIN}/premium/success`,
        cancelUrl = `${config.CORS_ORIGIN}/premium/cancel`,
        mode = 'subscription',
        priceId = this.premiumPriceId
      } = options;

      const sessionData = {
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: mode,
        success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl,
        metadata: {
          userId: user._id.toString(),
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        tax_id_collection: {
          enabled: true,
        }
      };

      // Add subscription-specific settings
      if (mode === 'subscription') {
        sessionData.subscription_data = {
          metadata: {
            userId: user._id.toString(),
          },
          trial_period_days: 7, // 7-day free trial
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionData);

      logger.audit('Checkout session created', {
        userId: user._id,
        sessionId: session.id,
        customerId: customer.id,
        mode: mode
      });

      return session;
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw new Error('Failed to create payment session');
    }
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(user, returnUrl) {
    try {
      if (!user.subscription.stripeCustomerId) {
        throw new Error('No Stripe customer found');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: user.subscription.stripeCustomerId,
        return_url: returnUrl || `${config.CORS_ORIGIN}/account/billing`,
      });

      return session;
    } catch (error) {
      logger.error('Error creating portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  /**
   * Handle successful subscription
   */
  async handleSubscriptionSuccess(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);

      if (!user) {
        logger.error('User not found for subscription:', { subscriptionId: subscription.id });
        return;
      }

      // Update user subscription
      user.subscription = {
        ...user.subscription,
        type: 'premium',
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };

      // Update role if not admin
      if (user.role !== 'admin') {
        user.role = 'premium';
      }

      await user.save();

      // Log activity
      await ActivityLog.logActivity({
        user: user._id,
        action: 'user_subscription_upgraded',
        details: {
          subscriptionId: subscription.id,
          plan: 'premium',
          periodStart: user.subscription.currentPeriodStart,
          periodEnd: user.subscription.currentPeriodEnd
        }
      });

      logger.audit('Subscription activated', {
        userId: user._id,
        subscriptionId: subscription.id,
        plan: 'premium'
      });

      return user;
    } catch (error) {
      logger.error('Error handling subscription success:', error);
      throw error;
    }
  }

  /**
   * Handle subscription cancellation
   */
  async handleSubscriptionCancellation(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);

      if (!user) {
        logger.error('User not found for subscription:', { subscriptionId: subscription.id });
        return;
      }

      // Update subscription status but keep premium until period end
      user.subscription.cancelAtPeriodEnd = true;
      await user.save();

      // Log activity
      await ActivityLog.logActivity({
        user: user._id,
        action: 'user_subscription_cancelled',
        details: {
          subscriptionId: subscription.id,
          willExpireAt: user.subscription.currentPeriodEnd
        }
      });

      logger.audit('Subscription cancelled', {
        userId: user._id,
        subscriptionId: subscription.id,
        expiresAt: user.subscription.currentPeriodEnd
      });

      return user;
    } catch (error) {
      logger.error('Error handling subscription cancellation:', error);
      throw error;
    }
  }

  /**
   * Handle subscription deletion/expiration
   */
  async handleSubscriptionDeletion(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);

      if (!user) {
        logger.error('User not found for subscription:', { subscriptionId: subscription.id });
        return;
      }

      // Downgrade user to free tier
      user.subscription = {
        type: 'free',
        stripeCustomerId: user.subscription.stripeCustomerId, // Keep customer ID
        stripeSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      };

      // Update role if was premium
      if (user.role === 'premium') {
        user.role = 'user';
      }

      await user.save();

      // Log activity
      await ActivityLog.logActivity({
        user: user._id,
        action: 'user_subscription_expired',
        details: {
          subscriptionId: subscription.id,
          downgradedTo: 'free'
        }
      });

      logger.audit('Subscription expired', {
        userId: user._id,
        subscriptionId: subscription.id,
        downgradedTo: 'free'
      });

      return user;
    } catch (error) {
      logger.error('Error handling subscription deletion:', error);
      throw error;
    }
  }

  /**
   * Handle subscription renewal
   */
  async handleSubscriptionRenewal(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);

      if (!user) {
        logger.error('User not found for subscription:', { subscriptionId: subscription.id });
        return;
      }

      // Update subscription period
      user.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;

      await user.save();

      // Log activity
      await ActivityLog.logActivity({
        user: user._id,
        action: 'subscription_renewed',
        details: {
          subscriptionId: subscription.id,
          periodStart: user.subscription.currentPeriodStart,
          periodEnd: user.subscription.currentPeriodEnd
        }
      });

      logger.audit('Subscription renewed', {
        userId: user._id,
        subscriptionId: subscription.id,
        newPeriodEnd: user.subscription.currentPeriodEnd
      });

      return user;
    } catch (error) {
      logger.error('Error handling subscription renewal:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(invoice) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);

      if (!user) {
        logger.error('User not found for failed payment:', { invoiceId: invoice.id });
        return;
      }

      // Log activity
      await ActivityLog.logActivity({
        user: user._id,
        action: 'payment_failed',
        details: {
          invoiceId: invoice.id,
          subscriptionId: subscription.id,
          amount: invoice.amount_due,
          currency: invoice.currency
        }
      });

      logger.audit('Payment failed', {
        userId: user._id,
        invoiceId: invoice.id,
        amount: invoice.amount_due
      });

      // TODO: Send email notification about failed payment

      return user;
    } catch (error) {
      logger.error('Error handling failed payment:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(user) {
    try {
      if (!user.subscription.stripeSubscriptionId) {
        return {
          type: 'free',
          status: 'active',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false
        };
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        user.subscription.stripeSubscriptionId
      );

      return {
        type: 'premium',
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      };
    } catch (error) {
      logger.error('Error getting subscription details:', error);
      throw new Error('Failed to retrieve subscription details');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(user, immediately = false) {
    try {
      if (!user.subscription.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      const subscription = await this.stripe.subscriptions.update(
        user.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: !immediately
        }
      );

      if (immediately) {
        await this.stripe.subscriptions.del(user.subscription.stripeSubscriptionId);
        await this.handleSubscriptionDeletion(subscription);
      } else {
        await this.handleSubscriptionCancellation(subscription);
      }

      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(user) {
    try {
      if (!user.subscription.stripeSubscriptionId) {
        throw new Error('No subscription found');
      }

      const subscription = await this.stripe.subscriptions.update(
        user.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: false
        }
      );

      user.subscription.cancelAtPeriodEnd = false;
      await user.save();

      // Log activity
      await ActivityLog.logActivity({
        user: user._id,
        action: 'subscription_reactivated',
        details: {
          subscriptionId: subscription.id
        }
      });

      logger.audit('Subscription reactivated', {
        userId: user._id,
        subscriptionId: subscription.id
      });

      return subscription;
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  /**
   * Construct webhook event
   */
  constructWebhookEvent(body, signature) {
    try {
      return this.stripe.webhooks.constructEvent(body, signature, this.webhookSecret);
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }
}

module.exports = new StripeService();