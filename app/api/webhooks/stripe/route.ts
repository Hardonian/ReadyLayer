/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for subscription management
 * Requires Node runtime for signature verification and raw body access
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { metrics } from '../../../../observability/metrics';
import Stripe from 'stripe';

// Webhook routes must use Node runtime for signature verification and raw body access
export const runtime = 'nodejs';

// Initialize Stripe client
let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required. Please configure Stripe in your environment.');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    });
  }
  return stripe;
}

/**
 * Check if Stripe is configured
 */
function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
}

/**
 * Verify Stripe webhook signature
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Stripe.Event | null {
  try {
    const stripe = getStripeClient();
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    logger.error({ error }, 'Stripe webhook signature verification failed');
    return null;
  }
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhooks
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `stripe_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      log.warn('Stripe webhook received but Stripe is not configured');
      return NextResponse.json(
        {
          error: {
            code: 'STRIPE_NOT_CONFIGURED',
            message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET environment variables.',
          },
        },
        { status: 503 }
      );
    }

    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required headers: stripe-signature or STRIPE_WEBHOOK_SECRET not configured',
          },
        },
        { status: 400 }
      );
    }

    // Get raw body for signature verification
    const payload = await request.text();

    // Verify signature
    const event = verifySignature(payload, signature, webhookSecret);
    if (!event) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature',
          },
        },
        { status: 400 }
      );
    }

    log.info({ eventType: event.type }, 'Received Stripe webhook');

    // Handle event based on type
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        log.warn({ eventType: event.type }, 'Unhandled Stripe webhook event type');
    }

    metrics.increment('webhooks.received', { provider: 'stripe', event: event.type });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error(error, 'Stripe webhook handling failed');
    metrics.increment('webhooks.failed', { provider: 'stripe' });

    return NextResponse.json(
      {
        error: {
          code: 'WEBHOOK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  const log = logger.child({ subscriptionId: subscription.id });

  try {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    // Find organization by Stripe customer ID
    const org = await prisma.organization.findFirst({
      where: {
        subscriptions: {
          some: {
            stripeCustomerId: customerId,
          },
        },
      },
      include: {
        subscriptions: true,
      },
    });

    if (!org) {
      log.warn({ customerId }, 'Organization not found for Stripe customer');
      return;
    }

    // Determine plan from subscription metadata or price ID
    let plan: 'starter' | 'growth' | 'scale' = 'starter';
    if (subscription.items.data.length > 0) {
      // Map Stripe price IDs to plans (configure in Stripe dashboard)
      // For now, use metadata or price lookup
      const priceMetadata = subscription.items.data[0].price.metadata;
      if (priceMetadata?.plan) {
        plan = priceMetadata.plan as 'starter' | 'growth' | 'scale';
      }
    }

    // Update or create subscription
    const existingSubscription = org.subscriptions[0];

    if (existingSubscription) {
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan,
          status: mapStripeStatus(subscription.status),
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          updatedAt: new Date(),
        },
      });
    } else {
      // Get user ID from organization (use first owner/admin)
      const owner = await prisma.organizationMember.findFirst({
        where: {
          organizationId: org.id,
          role: { in: ['owner', 'admin'] },
        },
      });

      if (!owner) {
        log.warn({ organizationId: org.id }, 'No owner/admin found for organization');
        return;
      }

      await prisma.subscription.create({
        data: {
          organizationId: org.id,
          userId: owner.userId,
          plan,
          status: mapStripeStatus(subscription.status),
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        },
      });
    }

    // Update organization plan
    await prisma.organization.update({
      where: { id: org.id },
      data: { plan },
    });

    log.info({ organizationId: org.id, plan }, 'Subscription updated');
  } catch (error) {
    log.error(error, 'Failed to handle subscription change');
    throw error;
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const log = logger.child({ subscriptionId: subscription.id });

  try {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    // Find and update subscription
    const dbSubscription = await prisma.subscription.findFirst({
      where: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
      },
      include: {
        organization: true,
      },
    });

    if (!dbSubscription) {
      log.warn({ subscriptionId: subscription.id }, 'Subscription not found');
      return;
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    // Downgrade organization to starter
    await prisma.organization.update({
      where: { id: dbSubscription.organizationId },
      data: { plan: 'starter' },
    });

    log.info({ organizationId: dbSubscription.organizationId }, 'Subscription cancelled, downgraded to starter');
  } catch (error) {
    log.error(error, 'Failed to handle subscription deletion');
    throw error;
  }
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const log = logger.child({ invoiceId: invoice.id });

  try {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer.id;

    // Find subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        stripeCustomerId: customerId,
      },
    });

    if (subscription) {
      // Update subscription period if needed
      if (invoice.subscription && typeof invoice.subscription !== 'string') {
        const stripeSubscription = invoice.subscription as Stripe.Subscription;
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            status: 'active',
            updatedAt: new Date(),
          },
        });
      }

      log.info({ subscriptionId: subscription.id }, 'Invoice payment succeeded');
    }
  } catch (error) {
    log.error(error, 'Failed to handle invoice payment succeeded');
    // Don't throw - payment succeeded, just logging failed
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const log = logger.child({ invoiceId: invoice.id });

  try {
    if (!invoice.customer) {
      log.warn({ invoiceId: invoice.id }, 'Invoice has no customer');
      return;
    }
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer.id;

    // Find subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        stripeCustomerId: customerId,
      },
    });

    if (subscription) {
      // Update subscription status
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'expired',
          updatedAt: new Date(),
        },
      });

      // Downgrade organization to starter
      await prisma.organization.update({
        where: { id: subscription.organizationId },
        data: { plan: 'starter' },
      });

      log.info({ subscriptionId: subscription.id }, 'Invoice payment failed, downgraded to starter');
    }
  } catch (error) {
    log.error(error, 'Failed to handle invoice payment failed');
    // Don't throw - payment failed is expected, just logging failed
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const log = logger.child({ sessionId: session.id });

  try {
    if (session.mode !== 'subscription' || !session.subscription) {
      log.warn({ mode: session.mode }, 'Checkout session is not a subscription');
      return;
    }

    const customerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;

    if (!customerId) {
      log.warn({ sessionId: session.id }, 'No customer ID in checkout session');
      return;
    }

    // Get organization ID from metadata
    const organizationId = session.metadata?.organizationId;
    if (!organizationId) {
      log.warn({ sessionId: session.id }, 'No organizationId in checkout session metadata');
      return;
    }

    // Get subscription from Stripe
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(
      typeof session.subscription === 'string' ? session.subscription : session.subscription.id
    );

    // Handle subscription creation
    await handleSubscriptionChange(subscription);

    log.info({ organizationId, subscriptionId: subscription.id }, 'Checkout completed, subscription created');
  } catch (error) {
    log.error(error, 'Failed to handle checkout completed');
    throw error;
  }
}

/**
 * Map Stripe subscription status to internal status
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): 'active' | 'cancelled' | 'expired' | 'trialing' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'canceled':
    case 'unpaid':
      return 'cancelled';
    case 'past_due':
    case 'incomplete_expired':
      return 'expired';
    case 'trialing':
      return 'trialing';
    default:
      return 'active'; // Default to active for unknown statuses
  }
}
