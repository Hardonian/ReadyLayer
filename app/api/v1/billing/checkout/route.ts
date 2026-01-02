/**
 * Billing Checkout API
 * 
 * POST /api/v1/billing/checkout - Create Stripe checkout session
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { errorResponse, successResponse, parseJsonBody } from '../../../../../lib/api-route-helpers';
import Stripe from 'stripe';
import { z } from 'zod';

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
  return !!process.env.STRIPE_SECRET_KEY && 
         !!process.env.STRIPE_PRICE_ID_GROWTH && 
         !!process.env.STRIPE_PRICE_ID_SCALE;
}

const checkoutSchema = z.object({
  organizationId: z.string().min(1),
  plan: z.enum(['growth', 'scale']), // Starter is free, no checkout needed
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

/**
 * POST /api/v1/billing/checkout
 * Create Stripe checkout session
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `checkout_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Parse and validate body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const validationResult = checkoutSchema.safeParse(bodyResult.data);
    if (!validationResult.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validationResult.error.errors }
      );
    }

    const { organizationId, plan, successUrl, cancelUrl } = validationResult.data;

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return errorResponse(
        'STRIPE_NOT_CONFIGURED',
        'Stripe is not configured. Please set STRIPE_SECRET_KEY, STRIPE_PRICE_ID_GROWTH, and STRIPE_PRICE_ID_SCALE environment variables.',
        503
      );
    }

    // Verify user belongs to organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
      include: {
        organization: {
          include: {
            subscriptions: true,
          },
        },
      },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return errorResponse('FORBIDDEN', 'Only owners and admins can create checkout sessions', 403);
    }

    const org = membership.organization;

    // Get or create Stripe customer
    let customerId = org.subscriptions[0]?.stripeCustomerId;

    if (!customerId) {
      const stripe = getStripeClient();
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: org.name,
        metadata: {
          organizationId: org.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to subscription if exists, otherwise create new subscription record
      if (org.subscriptions[0]) {
        await prisma.subscription.update({
          where: { id: org.subscriptions[0].id },
          data: { stripeCustomerId: customerId },
        });
      } else {
        await prisma.subscription.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            plan: 'starter', // Will be updated by webhook
            status: 'trialing',
            stripeCustomerId: customerId,
          },
        });
      }
    }

    // Get Stripe price ID for plan (from environment or metadata)
    // In production, these should be configured in Stripe dashboard and stored in env vars
    const priceIds: Record<string, string> = {
      growth: process.env.STRIPE_PRICE_ID_GROWTH || '',
      scale: process.env.STRIPE_PRICE_ID_SCALE || '',
    };

    const priceId = priceIds[plan];
    if (!priceId) {
      return errorResponse(
        'CONFIGURATION_ERROR',
        `Stripe price ID not configured for plan: ${plan}`,
        500
      );
    }

    // Create checkout session
    const stripe = getStripeClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${baseUrl}/dashboard/billing?success=true`,
      cancel_url: cancelUrl || `${baseUrl}/dashboard/billing?canceled=true`,
      metadata: {
        organizationId: org.id,
        plan,
      },
      subscription_data: {
        metadata: {
          organizationId: org.id,
          plan,
        },
      },
    });

    log.info({ organizationId, plan, sessionId: session.id }, 'Checkout session created');

    return successResponse({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    log.error(error, 'Failed to create checkout session');
    return errorResponse(
      'CHECKOUT_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
