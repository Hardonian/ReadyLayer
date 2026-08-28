/**
 * Example API route showing how to enqueue Python jobs
 *
 * POST /api/python-jobs/examples/report - Generate a report
 */

import { NextRequest, NextResponse } from 'next/server';
import { enqueueReportGeneration } from '@/lib/jobs/python-jobs';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/observability/logging';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json() as {
      organizationId?: string;
      repositoryId?: string;
      reviewId?: string;
      format?: 'pdf' | 'sarif' | 'json';
    };
    const {
      organizationId,
      repositoryId,
      reviewId,
      format = 'pdf'
    } = body;

    // Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Enqueue Python job
    const jobId = await enqueueReportGeneration({
      organizationId,
      repositoryId,
      reviewId,
      format: format as 'pdf' | 'sarif' | 'json',
      userId: user.id,
    });

    logger.info({
      msg: 'Report generation job enqueued',
      jobId,
      organizationId,
      format,
    });

    // Return job ID for polling
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Report generation queued. Poll /api/python-jobs/{jobId} for status.',
      pollUrl: `/api/python-jobs/${jobId}`,
    });

  } catch (error) {
    logger.error({
      msg: 'Failed to enqueue report generation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to queue job' },
      { status: 500 }
    );
  }
}
