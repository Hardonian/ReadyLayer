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

    log.info({ repositoryId, prNumber }, 'Starting review');

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
    // Note: metrics.increment signature may vary - adjust if needed
    if (result.summary.critical > 0) {
      metrics.increment('reviews.issues_found', { severity: 'critical' });
    }
    if (result.summary.high > 0) {
      metrics.increment('reviews.issues_found', { severity: 'high' });
    }

    log.info({
      repositoryId,
      prNumber,
      reviewId: result.id,
      issuesFound: result.summary.total,
      isBlocked: result.isBlocked,
    }, 'Review completed');

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    log.error(error, 'Review failed');
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

    const where: any = {};
    if (repositoryId) {
      where.repositoryId = repositoryId;
    }
    if (prNumber) {
      where.prNumber = parseInt(prNumber, 10);
    }

    const { prisma } = await import('../../../../lib/prisma');
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          repository: {
            select: {
              id: true,
              name: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        repositoryId: r.repositoryId,
        prNumber: r.prNumber,
        prSha: r.prSha,
        prTitle: r.prTitle,
        status: r.status,
        isBlocked: r.isBlocked,
        blockedReason: r.blockedReason,
        summary: r.summary,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    log.error(error, 'Failed to list reviews');
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
