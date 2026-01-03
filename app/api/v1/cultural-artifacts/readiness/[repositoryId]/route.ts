/**
 * Readiness Score API
 * 
 * GET /api/v1/cultural-artifacts/readiness/[repositoryId] - Get readiness score
 */

import { NextRequest, NextResponse } from 'next/server';
import { culturalArtifactsService } from '../../../../../../services/cultural-artifacts';
import { prisma } from '../../../../../../lib/prisma';
import { logger } from '../../../../../../observability/logging';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: { repositoryId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, repositoryId: params.repositoryId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const repositoryId = params.repositoryId;

    // Verify access
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { organizationId: true },
    });

    if (!repo) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Repository not found' } },
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
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const score = await culturalArtifactsService.calculateReadinessScore(repositoryId);

    log.info({ repositoryId, score: score.score }, 'Readiness score calculated');

    return NextResponse.json({ data: score });
  } catch (error) {
    log.error(error, 'Failed to calculate readiness score');
    return NextResponse.json(
      {
        error: {
          code: 'SCORE_CALCULATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
