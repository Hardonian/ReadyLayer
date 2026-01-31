/**
 * Job Status API Route
 * 
 * GET /api/jobs/[id] - Get job status and details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJob, transformJobForApi } from '@/lib/jobs';
import { requireAuth, canAccessOrganization } from '@/lib/auth';
import { logger } from '@/observability/logging';

/**
 * GET handler for job status
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

    log.info({ jobId, userId: user.id }, 'Fetching job status');

    // Fetch job
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      );
    }

    // Verify tenant access - user must belong to the job's organization
    if (job.organizationId) {
      const hasAccess = user.organizationIds.includes(job.organizationId) ||
        await canAccessOrganization(user.id, job.organizationId);

      if (!hasAccess) {
        log.warn({ 
          jobId, 
          userId: user.id, 
          jobOrgId: job.organizationId 
        }, 'User attempted to access job from different organization');
        
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Access denied to this job' } },
          { status: 403 }
        );
      }
    } else if (job.userId && job.userId !== user.id) {
      // If no organization, only job owner can access
      log.warn({ 
        jobId, 
        userId: user.id, 
        jobUserId: job.userId 
      }, 'User attempted to access job they do not own');
      
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to this job' } },
        { status: 403 }
      );
    }

    // Return job status
    return NextResponse.json({
      data: transformJobForApi(job),
    });

  } catch (error) {
    log.error({ error, jobId: (await params).id }, 'Failed to fetch job status');

    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch job status. Please try again later.',
          context: { traceId: requestId }
        } 
      },
      { status: 500 }
    );
  }
}
