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
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user has access (must match userId or be org member)
    if (job.userId && job.userId !== user.id) {
      // TODO: Check if user is org member for this job's org
      // For now, restrict to job owner
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
