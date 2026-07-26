/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe webhook events for:
 * - Subscription creation/updates/cancellation
 * - Payment success/failure
 * - Invoice events
 * - Usage-based billing
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import Stripe from 'stripe';
import { createHmac } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Stripe.Event.Data.Object;
    previous_attributes?: Record<string, unknown>;
  };
  account?: string;
}

export interface BillingEventResult {
  success: boolean;
  eventId: string;
  eventType: string;
  organizationId?: string;
  action: string;
  error?: string;
}

/**
 * Handle Stripe webhook event
 */
export async function handleStripeWebhook(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  try {
    logger.info(
      {
        eventId: event.id,
        eventType: event.type,
      },
      'Processing Stripe webhook'
    );

    metrics.increment('stripe_webhook_received', {
      eventType: event.type,
    });

    switch (event.type) {
      case 'customer.subscription.created':
        return await handleSubscriptionCreated(event);
      case 'customer.subscription.updated':
        return await handleSubscriptionUpdated(event);
      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(event);
      case 'charge.succeeded':
        return await handleChargeSucceeded(event);
      case 'charge.failed':
        return await handleChargeFailed(event);
      case 'invoice.payment_succeeded':
        return await handleInvoicePaymentSucceeded(event);
      case 'invoice.payment_failed':
        return await handleInvoicePaymentFailed(event);
      case 'invoice.created':
        return await handleInvoiceCreated(event);
      case 'billing_portal.session.created':
        return await handleBillingPortalSessionCreated(event);
      case 'usage_record.created':
        return await handleUsageRecordCreated(event);
      default:
        logger.warn(
          {
            eventId: event.id,
            eventType: event.type,
          },
          'Unknown Stripe webhook event type'
        );
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          action: 'ignored',
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(
      {
        eventId: event.id,
        eventType: event.type,
        error: errorMessage,
      },
      'Error processing Stripe webhook'
    );

    metrics.increment('stripe_webhook_error', {
      eventType: event.type,
      errorType: error instanceof Error ? error.name : 'unknown',
    });

    return {
      success: false,
      eventId: event.id,
      eventType: event.type,
      action: 'error',
      error: errorMessage,
    };
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  logger.info(
    {
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
      items: subscription.items.data.length,
    },
    'Handling subscription.created'
  );

  metrics.increment('billing_subscription_created', {
    planId: subscription.items.data[0]?.price?.product?.toString() || 'unknown',
  });

  // TODO: Update organization subscription in database
  // TODO: Send welcome email
  // TODO: Create usage tracking records

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'subscription_created',
  };
}

/**
 * Handle subscription updated
 */
export async function handleSubscriptionUpdated(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  const subscription = event.data.object as Stripe.Subscription;
  const previousAttributes = event.data.previous_attributes || {};

  logger.info(
    {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      changes: Object.keys(previousAttributes),
    },
    'Handling subscription.updated'
  );

  metrics.increment('billing_subscription_updated', {
    changeType: Object.keys(previousAttributes).join(','),
  });

  // Handle plan changes
  if (previousAttributes.items) {
    logger.info('Subscription plan changed');
    metrics.increment('billing_plan_changed');
  }

  // Handle status changes
  if (previousAttributes.status) {
    logger.info(
      {
        oldStatus: previousAttributes.status,
        newStatus: subscription.status,
      },
      'Subscription status changed'
    );
    metrics.increment('billing_status_changed', {
      from: previousAttributes.status as string,
      to: subscription.status,
    });
  }

  // TODO: Update organization subscription in database
  // TODO: Handle pause/resume
  // TODO: Notify organization admins

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'subscription_updated',
  };
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  const subscription = event.data.object as Stripe.Subscription;

  logger.info(
    {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    },
    'Handling subscription.deleted'
  );

  metrics.increment('billing_subscription_cancelled');

  // TODO: Update organization subscription status to cancelled
  // TODO: Disable paid features
  // TODO: Send cancellation confirmation email
  // TODO: Retain data but limit access

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'subscription_cancelled',
  };
}

/**
 * Handle charge succeeded
 */
async function handleChargeSucceeded(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  const charge = event.data.object as Stripe.Charge;

  logger.info(
    {
      chargeId: charge.id,
      customerId: charge.customer,
      amount: charge.amount,
      currency: charge.currency,
    },
    'Handling charge.succeeded'
  );

  metrics.increment('billing_charge_succeeded', {
    amount: (charge.amount / 100).toString(),
  });

  // TODO: Update billing records
  // TODO: Send receipt email

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'charge_succeeded',
  };
}

/**
 * Handle charge failed
 */
async function handleChargeFailed(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  const charge = event.data.object as Stripe.Charge;

  logger.error(
    {
      chargeId: charge.id,
      customerId: charge.customer,
      failureCode: charge.failure_code,
      failureMessage: charge.failure_message,
    },
    'Handling charge.failed'
  );

  metrics.increment('billing_charge_failed', {
    failureCode: charge.failure_code || 'unknown',
  });

  // TODO: Notify organization admins
  // TODO: Attempt retry
  // TODO: Disable features if payment critical

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'charge_failed',
  };
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  const invoice = event.data.object as Stripe.Invoice;

  logger.info(
    {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
    },
    'Handling invoice.payment_succeeded'
  );

  metrics.increment('billing_invoice_paid', {
    amount: (invoice.amount_paid / 100).toString(),
  });

  // TODO: Update payment records
  // TODO: Send invoice email

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'invoice_paid',
  };
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  const invoice = event.data.object as Stripe.Invoice;

  logger.warn(
    {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      nextPaymentAttempt: invoice.next_payment_attempt,
    },
    'Handling invoice.payment_failed'
  );

  metrics.increment('billing_invoice_failed');

  // TODO: Notify organization
  // TODO: Track retry attempts
  // TODO: Escalate after N failures

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'invoice_failed',
  };
}

/**
 * Handle invoice created
 */
async function handleInvoiceCreated(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  const invoice = event.data.object as Stripe.Invoice;

  logger.info(
    {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.total,
    },
    'Invoice created'
  );

  metrics.increment('billing_invoice_created', {
    amount: (invoice.total / 100).toString(),
  });

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'invoice_created',
  };
}

/**
 * Handle billing portal session created
 */
async function handleBillingPortalSessionCreated(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  logger.info('Billing portal session created');

  metrics.increment('billing_portal_session_created');

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'portal_session_created',
  };
}

/**
 * Handle usage record created (metered billing)
 */
async function handleUsageRecordCreated(
  event: StripeWebhookEvent
): Promise<BillingEventResult> {
  const usageRecord = event.data.object;
  if (!isUsageRecord(usageRecord)) {
    throw new Error('Invalid usage record payload');
  }

  logger.info(
    {
      subscriptionItemId: usageRecord.subscription_item,
      quantity: usageRecord.quantity,
    },
    'Usage record created'
  );

  metrics.increment('billing_usage_recorded', {
    quantity: usageRecord.quantity?.toString() || '1',
  });

  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    action: 'usage_recorded',
  };
}

interface UsageRecord {
  subscription_item: string;
  quantity: number;
}

function isUsageRecord(object: Stripe.Event.Data.Object): object is UsageRecord {
  const obj = object as unknown as Record<string, unknown>;
  return (
    typeof obj.subscription_item === 'string' &&
    typeof obj.quantity === 'number'
  );
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  try {
    const hash = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return `t=${Date.now()},v1=${hash}` === signature.split(',')[1];
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error verifying webhook signature'
    );
    return false;
  }
}

/**
 * Get subscription status from Stripe
 */
export async function getSubscriptionStatus(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error(
      {
        subscriptionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error retrieving subscription status'
    );
    return null;
  }
}

/**
 * Alias for handleInvoicePaymentSucceeded
 */
export const handlePaymentSucceeded = handleInvoicePaymentSucceeded;
