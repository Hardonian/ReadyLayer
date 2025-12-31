import { NextRequest, NextResponse } from 'next/server';
import { reviewGuardService } from '../../../../services/review-guard';
import { logger } from '../../../../observability/logging';
import { metrics } from '../../../../observability/metrics';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';
import { prisma } from '../../../../lib/prisma';
import { checkBillingLimits } from '../../../../lib/billing-middleware';

/**
 * POST /api/v1/reviews
 * Create a new review (tenant-isolated)
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        },
        { status: 400 }
      );
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_BODY',
            message: 'Request body must be an object',
          },
        },
        { status: 400 }
      );
    }
    const { repositoryId, prNumber, prSha, prTitle, diff, files, config } = body as Record<string, unknown>;

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

    // Verify user belongs to repository's organization (tenant isolation)
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { organizationId: true },
    });

    if (!repo) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${repositoryId} not found`,
          },
        },
        { status: 404 }
      );
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: repo.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to repository',
          },
        },
        { status: 403 }
      );
    }

    // Check billing limits (feature access and LLM budget)
    const billingCheck = await checkBillingLimits(repo.organizationId, {
      requireFeature: 'reviewGuard',
      checkLLMBudget: true,
    });
    if (billingCheck) {
      return billingCheck;
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
 * List reviews (tenant-isolated)
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const prNumber = searchParams.get('prNumber');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get user's organization memberships for tenant isolation
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m: { organizationId: string }) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({
        reviews: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      });
    }

    // Build where clause with tenant isolation
    const where: Record<string, unknown> = {
      repository: {
        organizationId: { in: userOrgIds }, // Only show reviews from user's organizations
      },
    };

    if (repositoryId) {
      // Verify repository belongs to user's organization
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repo || !userOrgIds.includes(repo.organizationId)) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to repository',
            },
          },
          { status: 403 }
        );
      }

      where.repositoryId = repositoryId;
    }

    if (prNumber) {
      where.prNumber = parseInt(prNumber, 10);
    }

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
              organizationId: true,
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
