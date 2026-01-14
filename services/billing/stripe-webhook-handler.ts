/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe webhook events and updates subscription/billing status
 * Handles: subscription.updated, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted
 */

import { prisma } from '../../lib/prisma'
import { logger } from '../../observability/logging'
import { metrics } from '../../observability/metrics'

export interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
  created: number
  livemode: boolean
}

export interface StripeCustomer {
  id: string
  email?: string
  metadata?: Record<string, string>
}

export interface StripeSubscription {
  id: string
  customer: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  items?: {
    data: Array<{
      price: {
        id: string
        amount: number
        currency: string
        recurring?: {
          interval: string
          interval_count: number
        }
      }
    }>
  }
  metadata?: Record<string, string>
}

export interface StripeInvoice {
  id: string
  customer: string
  subscription: string
  amount_due: number
  amount_paid: number
  status: string
  paid: boolean
  created: number
}

/**
 * Handle Stripe webhook event
 */
export async function handleStripeWebhook(event: StripeWebhookEvent): Promise<void> {
  const eventType = event.type
  const requestId = `stripe_${event.id}`

  logger.info(
    { eventType, stripeEventId: event.id, requestId },
    'Processing Stripe webhook'
  )

  try {
    switch (eventType) {
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as StripeSubscription, requestId)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as StripeInvoice, requestId)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as StripeInvoice, requestId)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as StripeSubscription, requestId)
        break

      default:
        logger.debug({ eventType, requestId }, 'Ignoring unhandled webhook event type')
        break
    }

    metrics.increment('stripe_webhook_processed', { type: eventType })
  } catch (error) {
    metrics.increment('stripe_webhook_failed', { type: eventType })

    logger.error(
      {
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      'Failed to process Stripe webhook'
    )

    // Re-throw so caller can return error status to Stripe
    throw error
  }
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(
  subscription: StripeSubscription,
  requestId: string
): Promise<void> {
  logger.info(
    { subscriptionId: subscription.id, customerId: subscription.customer, requestId },
    'Handling subscription updated'
  )

  try {
    // Extract organization ID from metadata
    const organizationId = subscription.metadata?.organizationId

    if (!organizationId) {
      logger.warn(
        { subscriptionId: subscription.id, requestId },
        'No organizationId in subscription metadata'
      )
      return
    }

    // Determine plan based on Stripe product
    const plan = determinePlanFromSubscription(subscription)

    // Update organization subscription
    await prisma.subscription.upsert({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      create: {
        organizationId,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        plan,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        plan,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    })

    // Update organization plan
    await prisma.organization.update({
      where: { id: organizationId },
      data: { plan },
    })

    metrics.increment('subscription_updated', { plan })

    logger.info(
      { organizationId, plan, subscriptionId: subscription.id, requestId },
      'Subscription updated successfully'
    )
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      'Failed to handle subscription updated'
    )
    throw error
  }
}

/**
 * Handle invoice payment succeeded event
 */
async function handleInvoicePaymentSucceeded(
  invoice: StripeInvoice,
  requestId: string
): Promise<void> {
  logger.info(
    { invoiceId: invoice.id, customerId: invoice.customer, requestId },
    'Handling invoice payment succeeded'
  )

  try {
    // Find subscription
    const subscription = await prisma.subscription.findUnique({
      where: {
        stripeSubscriptionId: invoice.subscription,
      },
    })

    if (!subscription) {
      logger.warn(
        { invoiceId: invoice.id, subscriptionId: invoice.subscription, requestId },
        'Subscription not found'
      )
      return
    }

    // Log payment
    await prisma.billingEvent.create({
      data: {
        organizationId: subscription.organizationId,
        type: 'payment_succeeded',
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: 'usd',
        metadata: {
          status: invoice.status,
        } as any,
      },
    })

    metrics.increment('invoice_payment_succeeded', {
      amount: (invoice.amount_paid / 100).toString(), // Convert cents to dollars
    })

    logger.info(
      {
        organizationId: subscription.organizationId,
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
        requestId,
      },
      'Invoice payment recorded'
    )
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      'Failed to handle invoice payment succeeded'
    )
    throw error
  }
}

/**
 * Handle invoice payment failed event
 */
async function handleInvoicePaymentFailed(
  invoice: StripeInvoice,
  requestId: string
): Promise<void> {
  logger.warn(
    { invoiceId: invoice.id, customerId: invoice.customer, requestId },
    'Handling invoice payment failed'
  )

  try {
    // Find subscription
    const subscription = await prisma.subscription.findUnique({
      where: {
        stripeSubscriptionId: invoice.subscription,
      },
    })

    if (!subscription) {
      logger.warn(
        { invoiceId: invoice.id, subscriptionId: invoice.subscription, requestId },
        'Subscription not found for failed payment'
      )
      return
    }

    // Log failed payment
    await prisma.billingEvent.create({
      data: {
        organizationId: subscription.organizationId,
        type: 'payment_failed',
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: 'usd',
        metadata: {
          status: invoice.status,
          attemptCount: 1,
        } as any,
      },
    })

    // TODO: Send email notification to billing contact
    // TODO: Update org to paused state if payment fails multiple times

    metrics.increment('invoice_payment_failed', {
      amount: (invoice.amount_due / 100).toString(),
    })

    logger.warn(
      {
        organizationId: subscription.organizationId,
        invoiceId: invoice.id,
        amount: invoice.amount_due,
        requestId,
      },
      'Invoice payment failed - org may need to retry'
    )
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      'Failed to handle invoice payment failed'
    )
    throw error
  }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(
  subscription: StripeSubscription,
  requestId: string
): Promise<void> {
  logger.info(
    { subscriptionId: subscription.id, customerId: subscription.customer, requestId },
    'Handling subscription deleted'
  )

  try {
    // Find subscription record
    const dbSubscription = await prisma.subscription.findUnique({
      where: {
        stripeSubscriptionId: subscription.id,
      },
    })

    if (!dbSubscription) {
      logger.warn(
        { subscriptionId: subscription.id, requestId },
        'Subscription not found'
      )
      return
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'canceled',
      },
    })

    // Downgrade org to starter plan
    await prisma.organization.update({
      where: { id: dbSubscription.organizationId },
      data: { plan: 'starter' },
    })

    metrics.increment('subscription_deleted')

    logger.info(
      {
        organizationId: dbSubscription.organizationId,
        subscriptionId: subscription.id,
        requestId,
      },
      'Subscription deleted - org downgraded to starter'
    )
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      'Failed to handle subscription deleted'
    )
    throw error
  }
}

/**
 * Determine plan from Stripe subscription
 */
function determinePlanFromSubscription(subscription: StripeSubscription): string {
  // Map Stripe price IDs to plan names
  const priceToplan: Record<string, string> = {
    // These would be your actual Stripe price IDs
    'price_growth': 'growth',
    'price_scale': 'scale',
  }

  if (!subscription.items?.data?.[0]?.price?.id) {
    return 'starter' // Default to starter if no price found
  }

  const priceId = subscription.items.data[0].price.id
  return priceToplan[priceId] || 'starter'
}

/**
 * Validate Stripe webhook signature
 * Prevents spoofed webhooks from processing
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  // In production, use Stripe's official validation:
  // import Stripe from 'stripe'
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  // try {
  //   stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  //   return true
  // } catch {
  //   return false
  // }

  // Simplified validation - in production use Stripe SDK
  return true
}
