/**
 * Dead Letter Queue (DLQ) Redrive API Route
 *
 * POST /api/v1/jobs/dlq/[id]/redrive
 * Re-enqueues a failed or dead-letter job with a fresh retry budget.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthUser } from '@/lib/auth';
import { redriveDeadJob } from '@/lib/jobs';
import { errorResponse, successResponse } from '@/lib/api-route-helpers';
import { logger } from '@/observability/logging';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  let user: AuthUser;
  try {
    user = await requireAuth(request);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  const { id } = await params;
  if (!id) {
    return errorResponse('VALIDATION_ERROR', 'Job ID is required', 400);
  }

  try {
    const tenantId = user.organizationIds[0];
    const result = await redriveDeadJob(id, tenantId);

    if (!result.success) {
      return errorResponse('JOB_REDRIVE_FAILED', result.error || 'Failed to redrive dead job', 400);
    }

    logger.info({ userId: user.id, jobId: id, newJobId: result.newJobId }, 'DLQ job redriven');

    return successResponse({
      message: 'Job redriven successfully',
      originalJobId: id,
      newJobId: result.newJobId,
    });
  } catch (error) {
    logger.error({ error, jobId: id }, 'DLQ redrive route failed');
    return errorResponse('INTERNAL_SERVER_ERROR', 'Internal server error while redriving job', 500);
  }
}
