/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe webhook events for billing operations:
 * - Subscription updates (upgrades, downgrades, cancellations)
 * - Payment success/failure tracking
 * - Invoice generation and tracking
 * - Seat management (user additions)
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export interface StripeWebhookPayload {
  id: string;
  object: string;
  api_version?: string;
  created: number;
  data: {
    object: Record<string, any>;
    previous_attributes?: Record<string, any>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id?: string;
    idempotency_key?: string;
  };
  type: string;
}

/**
 * Handle customer.subscription.updated events
 */
export async function handleSubscriptionUpdated(
  event: StripeWebhookPayload
): Promise<void> {
  const subscription = event.data.object;
  const previousAttributes = event.data.previous_attributes || {};

  logger.info(
    {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      previousStatus: previousAttributes.status,
    },
    'Processing subscription update'
  );

  try {
    const organization = await prisma.organizations.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true, plan: true },
    });

    if (!organization) {
      logger.warn(
        { subscriptionId: subscription.id },
        'Subscription not found in database'
      );
      return;
    }

    // Update subscription status
    if (previousAttributes.status !== subscription.status) {
      logger.info(
        {
          organizationId: organization.id,
          status: subscription.status,
        },
        'Subscription status changed'
      );

      await prisma.organizations.update({
        where: { id: organization.id },
        data: {
          stripeSubscriptionStatus: subscription.status,
          updatedAt: new Date(),
        },
      });

      // Handle status-specific logic
      switch (subscription.status) {
        case 'active':
          await handleSubscriptionActive(organization.id, subscription);
          break;
        case 'past_due':
          await handleSubscriptionPastDue(organization.id, subscription);
          break;
        case 'canceled':
          await handleSubscriptionCanceled(organization.id, subscription);
          break;
      }
    }

    // Handle plan change
    if (previousAttributes.items !== subscription.items) {
      await handlePlanChange(organization.id, subscription);
    }

    metrics.increment('stripe_subscription_updated', {
      status: subscription.status,
    });
  } catch (error) {
    logger.error(
      {
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error processing subscription update'
    );
    metrics.increment('stripe_webhook_error', { eventType: 'subscription.updated' });
    throw error;
  }
}

/**
 * Handle subscription activation
 */
async function handleSubscriptionActive(
  organizationId: string,
  subscription: any
): Promise<void> {
  logger.info(
    { organizationId, subscriptionId: subscription.id },
    'Subscription activated'
  );

  // Unlock features for active subscription
  await prisma.organizations.update({
    where: { id: organizationId },
    data: {
      settings: {
        aiEnabled: true,
        testExecutionEnabled: true,
        customPoliciesEnabled: true,
      },
    },
  });

  metrics.increment('subscription_activated');
}

/**
 * Handle subscription past due
 */
async function handleSubscriptionPastDue(
  organizationId: string,
  subscription: any
): Promise<void> {
  logger.warn(
    { organizationId, subscriptionId: subscription.id },
    'Subscription past due'
  );

  // Send notification (would integrate with email service)
  // For now, just log the event
  metrics.increment('subscription_past_due');
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(
  organizationId: string,
  subscription: any
): Promise<void> {
  logger.info(
    { organizationId, subscriptionId: subscription.id },
    'Subscription canceled'
  );

  // Downgrade to free plan
  await prisma.organizations.update({
    where: { id: organizationId },
    data: {
      plan: 'free',
      settings: {
        aiEnabled: false,
        testExecutionEnabled: false,
        customPoliciesEnabled: false,
      },
    },
  });

  metrics.increment('subscription_canceled');
}

/**
 * Handle plan changes (upgrades/downgrades)
 */
async function handlePlanChange(
  organizationId: string,
  subscription: any
): Promise<void> {
  const priceId = subscription.items?.data?.[0]?.price?.id;

  logger.info(
    { organizationId, subscriptionId: subscription.id, priceId },
    'Plan changed'
  );

  if (!priceId) return;

  // Map price ID to plan
  const planMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_ID_GROWTH || 'price_growth']: 'growth',
    [process.env.STRIPE_PRICE_ID_SCALE || 'price_scale']: 'scale',
  };

  const newPlan = planMap[priceId];
  if (!newPlan) {
    logger.warn({ priceId }, 'Unknown price ID');
    return;
  }

  // Update organization plan
  await prisma.organizations.update({
    where: { id: organizationId },
    data: {
      plan: newPlan,
      updatedAt: new Date(),
    },
  });

  metrics.increment('plan_changed', { newPlan });
}

/**
 * Handle invoice.payment_succeeded events
 */
export async function handlePaymentSucceeded(
  event: StripeWebhookPayload
): Promise<void> {
  const invoice = event.data.object;

  logger.info(
    {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
    },
    'Payment succeeded'
  );

  try {
    const organization = await prisma.organizations.findUnique({
      where: { stripeCustomerId: invoice.customer },
      select: { id: true },
    });

    if (!organization) {
      logger.warn(
        { customerId: invoice.customer },
        'Customer not found in database'
      );
      return;
    }

    // Record payment
    await prisma.billingEvents.create({
      data: {
        organizationId: organization.id,
        type: 'payment_succeeded',
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_paid,
        metadata: {
          invoiceNumber: invoice.number,
          paidAt: new Date(invoice.paid_at * 1000).toISOString(),
        },
      },
    });

    metrics.increment('payment_succeeded', {
      amount: (invoice.amount_paid / 100).toString(),
    });
  } catch (error) {
    logger.error(
      {
        invoiceId: invoice.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error processing payment succeeded'
    );
    metrics.increment('stripe_webhook_error', { eventType: 'invoice.payment_succeeded' });
    throw error;
  }
}

/**
 * Handle invoice.payment_failed events
 */
export async function handlePaymentFailed(
  event: StripeWebhookPayload
): Promise<void> {
  const invoice = event.data.object;

  logger.warn(
    {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      attemptCount: invoice.attempt_count,
    },
    'Payment failed'
  );

  try {
    const organization = await prisma.organizations.findUnique({
      where: { stripeCustomerId: invoice.customer },
      select: { id: true },
    });

    if (!organization) return;

    // Record failed payment
    await prisma.billingEvents.create({
      data: {
        organizationId: organization.id,
        type: 'payment_failed',
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_due,
        metadata: {
          invoiceNumber: invoice.number,
          attemptCount: invoice.attempt_count,
          failureCode: invoice.last_payment_error?.code,
        },
      },
    });

    // Pause organization if payment failed multiple times
    if (invoice.attempt_count >= 3) {
      logger.error(
        { organizationId: organization.id },
        'Pausing organization after 3 failed payment attempts'
      );

      await prisma.organizations.update({
        where: { id: organization.id },
        data: {
          status: 'paused',
          settings: {
            aiEnabled: false,
            testExecutionEnabled: false,
          },
        },
      });
    }

    metrics.increment('payment_failed', {
      attemptCount: invoice.attempt_count.toString(),
    });
  } catch (error) {
    logger.error(
      {
        invoiceId: invoice.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error processing payment failed'
    );
    metrics.increment('stripe_webhook_error', { eventType: 'invoice.payment_failed' });
    throw error;
  }
}

/**
 * Handle customer.created events (new signups)
 */
export async function handleCustomerCreated(
  event: StripeWebhookPayload
): Promise<void> {
  const customer = event.data.object;

  logger.info(
    {
      customerId: customer.id,
      email: customer.email,
    },
    'New customer created in Stripe'
  );

  metrics.increment('stripe_customer_created');
}

/**
 * Route webhook event to appropriate handler
 */
export async function handleStripeWebhookEvent(
  event: StripeWebhookPayload
): Promise<void> {
  logger.debug({ eventType: event.type }, 'Processing Stripe webhook');

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;

      case 'customer.created':
        await handleCustomerCreated(event);
        break;

      // Ignore other event types
      default:
        logger.debug({ eventType: event.type }, 'Unhandled webhook event type');
    }

    metrics.increment('stripe_webhook_processed', {
      eventType: event.type,
    });
  } catch (error) {
    logger.error(
      {
        eventType: event.type,
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error handling Stripe webhook'
    );
    metrics.increment('stripe_webhook_failed', { eventType: event.type });
    throw error;
  }
}

/**
 * Get organization subscription status
 */
export async function getSubscriptionStatus(
  organizationId: string
): Promise<{
  status: string;
  plan: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}> {
  const organization = await prisma.organizations.findUnique({
    where: { id: organizationId },
    select: {
      stripeSubscriptionStatus: true,
      plan: true,
      stripeSubscriptionEndDate: true,
      stripeCancelAtPeriodEnd: true,
    },
  });

  if (!organization) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  return {
    status: organization.stripeSubscriptionStatus || 'unknown',
    plan: organization.plan,
    currentPeriodEnd: organization.stripeSubscriptionEndDate,
    cancelAtPeriodEnd: organization.stripeCancelAtPeriodEnd || false,
  };
}
