/**
 * AI Decision Explanation API
 * 
 * GET /api/v1/ethical-ai/explain/[reviewId] - Get explanation for review decisions
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethicalAIGatesService } from '../../../../../../services/ethical-ai-gates';
import { prisma } from '../../../../../../lib/prisma';
import { logger } from '../../../../../../observability/logging';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, reviewId: params.reviewId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const reviewId = params.reviewId;
    const { searchParams } = new URL(request.url);
    const findingId = searchParams.get('findingId');

    // Verify access
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        repository: {
          select: { organizationId: true },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Review not found' } },
        { status: 404 }
      );
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: review.repository.organizationId,
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

    // Get finding if specified
    const issues = (review.issuesFound as any[]) || [];
    const finding = findingId
      ? issues.find((i: any) => i.id === findingId)
      : issues[0];

    if (!finding) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Finding not found' } },
        { status: 404 }
      );
    }

    const explanation = await ethicalAIGatesService.explainDecision(finding, {
      filePath: finding.file,
      ruleId: finding.ruleId,
      policyVersion: '1.0.0', // Would get from evidence bundle
    });

    log.info({ reviewId, findingId }, 'Explanation generated');

    return NextResponse.json({ data: explanation });
  } catch (error) {
    log.error(error, 'Failed to generate explanation');
    return NextResponse.json(
      {
        error: {
          code: 'EXPLANATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
