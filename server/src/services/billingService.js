/**
 * Billing Service
 *
 * Handles subscription billing for both Stripe and Razorpay.
 * Provides unified interface for:
 * - Creating customers
 * - Managing subscriptions
 * - Handling webhooks
 * - Processing plan changes
 */

const stripe = require('stripe');
const crypto = require('crypto');

// Initialize Stripe (if configured)
let stripeClient = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
}

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

/**
 * Stripe Service
 */
const StripeService = {
  /**
   * Check if Stripe is configured
   */
  isConfigured: () => !!stripeClient,

  /**
   * Create a customer in Stripe
   */
  async createCustomer(organization, user) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: organization.name,
        metadata: {
          organizationId: organization._id.toString(),
          userId: user._id.toString()
        }
      });

      return {
        customerId: customer.id,
        provider: 'stripe'
      };
    } catch (error) {
      console.error('Stripe create customer error:', error);
      throw error;
    }
  },

  /**
   * Get or create customer
   */
  async getOrCreateCustomer(organization, user) {
    if (organization.stripeCustomerId) {
      try {
        const customer = await stripeClient.customers.retrieve(organization.stripeCustomerId);
        return { customerId: customer.id, existing: true };
      } catch (error) {
        if (error.code === 'resource_missing') {
          return this.createCustomer(organization, user);
        }
        throw error;
      }
    }
    return this.createCustomer(organization, user);
  },

  /**
   * Create subscription
   */
  async createSubscription(organization, plan, billingPeriod = 'monthly') {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const priceId = billingPeriod === 'yearly'
        ? plan.yearlyStripePriceId
        : plan.monthlyStripePriceId;

      if (!priceId) {
        throw new Error(`Price ID not configured for plan ${plan.slug} (${billingPeriod})`);
      }

      const subscription = await stripeClient.subscriptions.create({
        customer: organization.stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          organizationId: organization._id.toString(),
          plan: plan.slug,
          billingPeriod
        },
        ...(organization.trialEndsAt && {
          trial_end: Math.floor(new Date(organization.trialEndsAt).getTime() / 1000)
        })
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
      };
    } catch (error) {
      console.error('Stripe create subscription error:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, cancelImmediately = false) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const subscription = cancelImmediately
        ? await stripeClient.subscriptions.cancel(subscriptionId)
        : await stripeClient.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
          });

      return {
        status: subscription.status,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };
    } catch (error) {
      console.error('Stripe cancel subscription error:', error);
      throw error;
    }
  },

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const subscription = await stripeClient.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });

      return {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      };
    } catch (error) {
      console.error('Stripe reactivate subscription error:', error);
      throw error;
    }
  },

  /**
   * Update subscription to new plan
   */
  async updateSubscription(subscriptionId, newPriceId) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      // Get current subscription
      const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);

      // Update subscription item
      const updatedSubscription = await stripeClient.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'always_invoice'
      });

      return {
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
      };
    } catch (error) {
      console.error('Stripe update subscription error:', error);
      throw error;
    }
  },

  /**
   * Get invoices
   */
  async getInvoices(customerId, limit = 10) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const invoices = await stripeClient.invoices.list({
        customer: customerId,
        limit
      });

      return invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        createdAt: new Date(invoice.created * 1000),
        paidAt: invoice.status === 'paid' ? new Date(invoice.status_transitions.paid_at * 1000) : null,
        invoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf
      }));
    } catch (error) {
      console.error('Stripe get invoices error:', error);
      throw error;
    }
  },

  /**
   * Get customer payment methods
   */
  async getPaymentMethods(customerId) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const methods = await stripeClient.customers.listPaymentMethods(customerId, {
        type: 'card'
      });

      return methods.data.map(method => ({
        id: method.id,
        type: method.type,
        last4: method.card.last4,
        brand: method.card.brand,
        expiryMonth: method.card.exp_month,
        expiryYear: method.card.exp_year,
        isDefault: false
      }));
    } catch (error) {
      console.error('Stripe get payment methods error:', error);
      throw error;
    }
  },

  /**
   * Create billing portal session
   */
  async createPortalSession(customerId, returnUrl) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const session = await stripeClient.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      return {
        url: session.url
      };
    } catch (error) {
      console.error('Stripe create portal session error:', error);
      throw error;
    }
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    if (!stripeClient) throw new Error('Stripe not configured');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      throw new Error('Invalid webhook signature');
    }
  }
};

/**
 * Razorpay Service
 */
const RazorpayService = {
  /**
   * Check if Razorpay is configured
   */
  isConfigured: () => !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),

  /**
   * Make authenticated request to Razorpay API
   */
  async request(endpoint, method = 'GET', body = null) {
    const url = `${RAZORPAY_BASE_URL}${endpoint}`;
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    const options = {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.description || 'Razorpay API error');
    }

    return data;
  },

  /**
   * Create a customer in Razorpay
   */
  async createCustomer(organization, user) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const customer = await this.request('/customers', 'POST', {
        name: organization.name,
        email: user.email,
        notes: {
          organizationId: organization._id.toString(),
          userId: user._id.toString()
        }
      });

      return {
        customerId: customer.id,
        provider: 'razorpay'
      };
    } catch (error) {
      console.error('Razorpay create customer error:', error);
      throw error;
    }
  },

  /**
   * Create subscription
   */
  async createSubscription(organization, plan, billingPeriod = 'monthly') {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const planId = billingPeriod === 'yearly'
        ? plan.yearlyRazorpayPlanId
        : plan.monthlyRazorpayPlanId;

      if (!planId) {
        throw new Error(`Razorpay plan ID not configured for ${plan.slug}`);
      }

      const subscription = await this.request('/subscriptions', 'POST', {
        plan_id: planId,
        customer_id: organization.razorpayCustomerId,
        total_count: billingPeriod === 'yearly' ? 12 : 1,
        notes: {
          organizationId: organization._id.toString(),
          plan: plan.slug,
          billingPeriod
        }
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_start * 1000),
        currentPeriodEnd: new Date(subscription.current_end * 1000)
      };
    } catch (error) {
      console.error('Razorpay create subscription error:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, cancelImmediately = false) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const subscription = await this.request(
        `/subscriptions/${subscriptionId}`,
        cancelImmediately ? 'DELETE' : 'POST',
        cancelImmediately ? null : { cancel_at_cycle_end: 1 }
      );

      return {
        status: subscription.status,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
      };
    } catch (error) {
      console.error('Razorpay cancel subscription error:', error);
      throw error;
    }
  },

  /**
   * Get invoices
   */
  async getInvoices(customerId, limit = 10) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const invoices = await this.request(
        `/invoices?customer_id=${customerId}&count=${limit}`
      );

      return (invoices.items || []).map(invoice => ({
        id: invoice.id,
        number: invoice.invoice_number,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        createdAt: new Date(invoice.created_at * 1000),
        paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : null,
        invoiceUrl: invoice.short_url,
        invoicePdf: invoice.invoice_url
      }));
    } catch (error) {
      console.error('Razorpay get invoices error:', error);
      throw error;
    }
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Razorpay webhook verification error:', error);
      return false;
    }
  }
};

/**
 * Unified Billing Service
 */
const BillingService = {
  /**
   * Get provider service
   */
  getProvider(provider) {
    if (provider === 'stripe') return StripeService;
    if (provider === 'razorpay') return RazorpayService;
    throw new Error(`Unknown provider: ${provider}`);
  },

  /**
   * Create customer (auto-select provider based on currency/region)
   */
  async createCustomer(organization, user, preferredProvider = 'stripe') {
    // Try preferred provider first
    if (preferredProvider === 'stripe' && StripeService.isConfigured()) {
      return StripeService.createCustomer(organization, user);
    }
    if (preferredProvider === 'razorpay' && RazorpayService.isConfigured()) {
      return RazorpayService.createCustomer(organization, user);
    }

    // Fallback to available provider
    if (StripeService.isConfigured()) {
      return StripeService.createCustomer(organization, user);
    }
    if (RazorpayService.isConfigured()) {
      return RazorpayService.createCustomer(organization, user);
    }

    throw new Error('No billing provider configured');
  },

  /**
   * Create subscription
   */
  async createSubscription(organization, plan, billingPeriod, provider = 'stripe') {
    const service = this.getProvider(provider);
    return service.createSubscription(organization, plan, billingPeriod);
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, provider, cancelImmediately = false) {
    const service = this.getProvider(provider);
    return service.cancelSubscription(subscriptionId, cancelImmediately);
  },

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId, provider) {
    const service = this.getProvider(provider);
    if (provider === 'stripe') {
      return service.reactivateSubscription(subscriptionId);
    }
    // Razorpay doesn't have a reactivate endpoint
    throw new Error('Razorpay does not support subscription reactivation');
  },

  /**
   * Get invoices
   */
  async getInvoices(customerId, provider, limit = 10) {
    const service = this.getProvider(provider);
    return service.getInvoices(customerId, limit);
  },

  /**
   * Get payment methods
   */
  async getPaymentMethods(customerId, provider) {
    if (provider === 'stripe') {
      return StripeService.getPaymentMethods(customerId);
    }
    // Razorpay handles payment methods differently
    throw new Error('Payment methods not supported for this provider');
  },

  /**
   * Create billing portal session (Stripe only)
   */
  async createPortalSession(customerId, returnUrl) {
    return StripeService.createPortalSession(customerId, returnUrl);
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(provider, payload, signature) {
    if (provider === 'stripe') {
      return StripeService.verifyWebhookSignature(payload, signature);
    }
    if (provider === 'razorpay') {
      return RazorpayService.verifyWebhookSignature(payload, signature);
    }
    throw new Error(`Unknown provider: ${provider}`);
  },

  /**
   * Check if billing is configured
   */
  isConfigured() {
    return StripeService.isConfigured() || RazorpayService.isConfigured();
  },

  /**
   * Get available providers
   */
  getAvailableProviders() {
    const providers = [];
    if (StripeService.isConfigured()) providers.push('stripe');
    if (RazorpayService.isConfigured()) providers.push('razorpay');
    return providers;
  }
};

module.exports = {
  BillingService,
  StripeService,
  RazorpayService
};