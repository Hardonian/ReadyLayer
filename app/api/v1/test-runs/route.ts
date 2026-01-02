import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';
import { errorResponse, successResponse, parsePagination } from '../../../../lib/api-route-helpers';

/**
 * GET /api/v1/test-runs
 * List test runs (tenant-isolated)
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
    const prSha = searchParams.get('prSha');

    if (!repositoryId) {
      return errorResponse('VALIDATION_ERROR', 'repositoryId is required', 400);
    }

    // Get repository with tenant isolation
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!repository) {
      return errorResponse('NOT_FOUND', 'Repository not found', 404);
    }

    // Verify user has access to repository's organization
    if (repository.organization.members.length === 0) {
      return errorResponse('FORBIDDEN', 'Access denied to repository', 403);
    }

    // Build where clause
    const where: Record<string, unknown> = {
      repositoryId: repository.id,
    };

    if (prNumber) {
      where.prNumber = parseInt(prNumber, 10);
    }

    if (prSha) {
      where.prSha = prSha;
    }

    const { limit, offset } = parsePagination(request);

    const [testRuns, total] = await Promise.all([
      prisma.testRun.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.testRun.count({ where }),
    ]);

    return successResponse({
      testRuns: testRuns.map((run) => ({
        id: run.id,
        repositoryId: run.repositoryId,
        prNumber: run.prNumber,
        prSha: run.prSha,
        workflowRunId: run.workflowRunId,
        status: run.status,
        conclusion: run.conclusion,
        coverage: run.coverage,
        summary: run.summary,
        artifactsUrl: run.artifactsUrl,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    log.error(error, 'Failed to list test runs');
    return errorResponse(
      'LIST_TEST_RUNS_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
