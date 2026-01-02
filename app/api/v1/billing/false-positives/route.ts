/**
 * False Positive Metrics API
 * 
 * GET /api/v1/billing/false-positives - Get false positive metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { getFalsePositiveMetrics, getRuleFalsePositiveRate } from '../../../../../lib/telemetry/false-positives';
import { logger } from '../../../../../observability/logging';
import { errorResponse, successResponse } from '../../../../../lib/api-route-helpers';

/**
 * GET /api/v1/billing/false-positives
 * Get false positive metrics for organization
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `fp_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const ruleId = searchParams.get('ruleId');

    if (!organizationId) {
      return errorResponse('VALIDATION_ERROR', 'organizationId is required', 400);
    }

    if (ruleId) {
      // Get false positive rate for specific rule
      const rate = await getRuleFalsePositiveRate(organizationId, ruleId, days);
      return successResponse({
        ruleId,
        falsePositiveRate: rate,
        days,
      });
    }

    // Get overall metrics
    const metrics = await getFalsePositiveMetrics(organizationId, days);

    return successResponse({
      ...metrics,
      days,
      organizationId,
    });
  } catch (error) {
    log.error(error, 'Failed to get false positive metrics');
    return errorResponse(
      'GET_FALSE_POSITIVES_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
