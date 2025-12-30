import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { billingService } from '../../../../../billing';
import { logger } from '../../../../../observability/logging';
import { createAuthzMiddleware } from '../../../../../lib/authz';

/**
 * GET /api/v1/billing/tier
 * Get organization billing tier and limits
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    await requireAuth(request);

    // Get organization ID from query or header
    const organizationId =
      request.nextUrl.searchParams.get('organizationId') ||
      request.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Organization ID required',
          },
        },
        { status: 400 }
      );
    }

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requireOrganization: true,
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Get tier and budget info
    const tier = await billingService.getOrganizationTier(organizationId);
    const budget = await billingService.checkLLMBudget(organizationId);

    return NextResponse.json({
      tier: tier.name,
      features: tier.features,
      budget: {
        current: budget.currentSpend,
        limit: budget.budget,
        remaining: budget.remaining,
        allowed: budget.allowed,
      },
    });
  } catch (error) {
    log.error(error, 'Failed to get billing tier');
    return NextResponse.json(
      {
        error: {
          code: 'GET_BILLING_TIER_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
