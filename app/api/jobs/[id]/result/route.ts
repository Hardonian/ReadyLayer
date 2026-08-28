/**
 * Job Result API Route
 *
 * GET /api/jobs/[id]/result - Get job result
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJob, getJobResult, transformJobResultForApi } from '@/lib/jobs';
import { requireAuth, canAccessOrganization } from '@/lib/auth';
import { logger } from '@/observability/logging';

/**
 * GET handler for job result
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = `job_req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id: jobId } = await params;

    log.info({ jobId, userId: user.id }, 'Fetching job result');

    // First check if job exists and user has access
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      );
    }

    // Verify tenant access
    if (job.organizationId) {
      const hasAccess = user.organizationIds.includes(job.organizationId) ||
        await canAccessOrganization(user.id, job.organizationId);

      if (!hasAccess) {
        log.warn({
          jobId,
          userId: user.id,
          jobOrgId: job.organizationId
        }, 'User attempted to access job result from different organization');

        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Access denied to this job result' } },
          { status: 403 }
        );
      }
    } else if (job.userId && job.userId !== user.id) {
      log.warn({
        jobId,
        userId: user.id,
        jobUserId: job.userId
      }, 'User attempted to access job result they do not own');

      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to this job result' } },
        { status: 403 }
      );
    }

    // Get the job result
    const result = await getJobResult(jobId);

    if (!result) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job result not found' } },
        { status: 404 }
      );
    }

    // Return result with graceful degradation message if still queued
    const response = transformJobResultForApi(result);

    // Add helpful message for queued jobs (worker might be offline)
    if (result.status === 'queued' || result.status === 'running') {
      return NextResponse.json({
        data: {
          ...response,
          message: result.status === 'queued'
            ? 'Job is queued and will be processed soon. Processing may take longer if workers are busy.'
            : 'Job is currently being processed.',
        },
      });
    }

    return NextResponse.json({
      data: response,
    });

  } catch (error) {
    log.error({ error, jobId: (await params).id }, 'Failed to fetch job result');

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch job result. Please try again later.',
          context: { traceId: requestId }
        }
      },
      { status: 500 }
    );
  }
}
