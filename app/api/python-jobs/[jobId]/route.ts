/**
 * API route for Python job status polling
 * 
 * GET /api/python-jobs/[jobId] - Get job status and results
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/observability/logging';
import { requireAuth } from '@/lib/auth';

/**
 * GET handler for job status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;

    // Fetch job from database
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        type: true,
        status: true,
        result: true,
        error: true,
        retryCount: true,
        maxRetries: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        repositoryId: true,
        userId: true,
        organizationId: true,
        repository: {
          select: { organizationId: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify ownership through the job's organization. Jobs created by a
    // worker may not have a userId, so checking only the owner would either
    // leak those jobs or make legitimate org members unable to poll them.
    const jobOrganizationId = job.organizationId ?? job.repository?.organizationId ?? null;
    if (jobOrganizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: jobOrganizationId,
            userId: user.id,
          },
        },
        select: { organizationId: true },
      });

      if (!membership) {
        logger.warn({
          msg: 'User attempted to access a job outside their organization',
          jobId,
          userId: user.id,
          organizationId: jobOrganizationId,
        });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (job.userId !== user.id) {
      logger.warn({
        msg: 'User attempted to access job they do not own',
        jobId,
        userId: user.id,
        jobOwnerId: job.userId,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return job status
    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      result: job.result,
      error: job.error,
      progress: {
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
      },
      timestamps: {
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
      },
    });

  } catch (error) {
    logger.error({
      msg: 'Error fetching job status',
      jobId: (await params).jobId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
