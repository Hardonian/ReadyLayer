import { NextRequest, NextResponse } from 'next/server';
import { reviewGuardService } from '../../../../services/review-guard';
import { logger } from '../../../../observability/logging';
import { metrics } from '../../../../observability/metrics';

/**
 * POST /api/v1/reviews
 * Create a new review
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const body = await request.json();
    const { repositoryId, prNumber, prSha, prTitle, diff, files, config } = body;

    // Validate input
    if (!repositoryId || !prNumber || !prSha || !files) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: repositoryId, prNumber, prSha, files',
          },
        },
        { status: 400 }
      );
    }

    log.info('Starting review', { repositoryId, prNumber });

    // Perform review
    const result = await reviewGuardService.review({
      repositoryId,
      prNumber,
      prSha,
      prTitle,
      diff,
      files,
      config,
    });

    metrics.increment('reviews.completed', { status: result.status });
    metrics.increment('reviews.issues_found', { severity: 'critical' }, result.summary.critical);
    metrics.increment('reviews.issues_found', { severity: 'high' }, result.summary.high);

    log.info('Review completed', {
      repositoryId,
      prNumber,
      reviewId: result.id,
      issuesFound: result.summary.total,
      isBlocked: result.isBlocked,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    log.error('Review failed', error, { requestId });
    metrics.increment('reviews.failed');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'REVIEW_FAILED',
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/reviews
 * List reviews
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const prNumber = searchParams.get('prNumber');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Would fetch from database in production
    const reviews: any[] = [];

    return NextResponse.json({
      reviews,
      pagination: {
        total: reviews.length,
        limit,
        offset,
        hasMore: false,
      },
    });
  } catch (error) {
    log.error('Failed to list reviews', error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: 'LIST_REVIEWS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
