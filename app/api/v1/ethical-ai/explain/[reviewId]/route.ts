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
import { z } from 'zod';

type ReviewIssue = Record<string, unknown> & {
  id?: string;
  file?: string;
  ruleId?: string;
  rule_id?: string;
};

const IssueSchema = z.object({
  id: z.string().optional(),
  ruleId: z.string().min(1),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  file: z.string().min(1),
  line: z.number().int().min(1),
  message: z.string().min(1),
  confidence: z.number().min(0).max(1),
  column: z.number().int().min(0).optional(),
  fix: z.string().optional(),
});

function coerceIssues(value: unknown): ReviewIssue[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is ReviewIssue => typeof v === 'object' && v !== null);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params;

  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, reviewId: reviewId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

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
    const issues = coerceIssues(review.issuesFound as unknown);
    const finding = findingId
      ? issues.find((i) => i.id === findingId)
      : issues[0];

    if (!finding) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Finding not found' } },
        { status: 404 }
      );
    }

    // Back-compat: some records may use rule_id instead of ruleId
    const normalizedCandidate: Record<string, unknown> = {
      ...finding,
      ruleId:
        typeof finding.ruleId === 'string' && finding.ruleId.length > 0
          ? finding.ruleId
          : typeof finding.rule_id === 'string' && finding.rule_id.length > 0
            ? finding.rule_id
            : undefined,
    };

    const parsedIssue = IssueSchema.safeParse(normalizedCandidate);
    if (!parsedIssue.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_FINDING',
            message: 'Finding is missing required fields',
          },
        },
        { status: 422 }
      );
    }

    const issue = parsedIssue.data;
    const explanation = await ethicalAIGatesService.explainDecision(issue, {
      filePath: issue.file,
      ruleId: issue.ruleId,
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
