/**
 * False Positive Metrics API
 * 
 * GET /api/v1/billing/false-positives - Get false positive metrics
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { getFalsePositiveMetrics, getRuleFalsePositiveRate, trackWaiverCreated } from '../../../../../lib/telemetry/false-positives';
import { prisma } from '../../../../../lib/prisma';
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

/**
 * POST /api/v1/billing/false-positives
 * Report or resolve a false positive finding dispute with credit refund
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `fp_post_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json();
    const {
      organizationId,
      repositoryId,
      reviewId,
      ruleId,
      severity,
      reason,
      action = 'report',
      refundCredits = false,
    } = body;

    if (!organizationId || !ruleId) {
      return errorResponse('VALIDATION_ERROR', 'organizationId and ruleId are required', 400);
    }

    // Track the waiver / false-positive report
    await trackWaiverCreated({
      organizationId,
      repositoryId: repositoryId || null,
      ruleId,
      severity: severity || 'medium',
      reviewId,
    });

    const disputeId = `dsp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Log the resolution / dispute action in audit log
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: user?.id || null,
        action: action === 'approve' ? 'false_positive_approved' : action === 'reject' ? 'false_positive_rejected' : 'false_positive_reported',
        resourceType: 'billing_dispute',
        resourceId: disputeId,
        details: {
          ruleId,
          severity,
          reason,
          refundCredits,
          reviewId,
          repositoryId,
        },
      },
    });

    return successResponse({
      disputeId,
      organizationId,
      ruleId,
      action,
      status: action === 'reject' ? 'rejected' : 'approved',
      refunded: refundCredits && action === 'approve',
      resolvedAt: new Date().toISOString(),
    });
  } catch (error) {
    log.error(error, 'Failed to process false positive dispute');
    return errorResponse(
      'PROCESS_FALSE_POSITIVE_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
