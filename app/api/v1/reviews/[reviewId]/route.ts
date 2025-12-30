import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';

/**
 * GET /api/v1/reviews/:reviewId
 * Get review details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, reviewId: params.reviewId });

  try {
    const review = await prisma.review.findUnique({
      where: { id: params.reviewId },
      include: {
        repository: true,
      },
    });

    if (!review) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Review ${params.reviewId} not found`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: review.id,
      repositoryId: review.repositoryId,
      prNumber: review.prNumber,
      prSha: review.prSha,
      status: review.status,
      issues: review.issuesFound,
      summary: review.summary,
      isBlocked: review.isBlocked,
      blockedReason: review.blockedReason,
      createdAt: review.createdAt,
      completedAt: review.completedAt,
    });
  } catch (error) {
    log.error(error, 'Failed to get review');
    return NextResponse.json(
      {
        error: {
          code: 'GET_REVIEW_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
