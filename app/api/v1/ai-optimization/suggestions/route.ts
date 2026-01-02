/**
 * AI Optimization Suggestions API
 * 
 * GET /api/v1/ai-optimization/suggestions - List saved suggestions
 * PATCH /api/v1/ai-optimization/suggestions/:id - Update suggestion status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';

/**
 * GET /api/v1/ai-optimization/suggestions
 * List AI optimization suggestions
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const difficulty = searchParams.get('difficulty');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get user's organization memberships for tenant isolation
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({
        suggestions: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      });
    }

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: organizationId
        ? { in: userOrgIds.filter((id) => id === organizationId) }
        : { in: userOrgIds },
    };

    if (repositoryId) {
      where.repositoryId = repositoryId;
    }
    if (status) {
      where.status = status;
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }
    if (type) {
      where.type = type;
    }

    const [suggestions, total] = await Promise.all([
      prisma.aIOptimizationSuggestion.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.aIOptimizationSuggestion.count({ where }),
    ]);

    return NextResponse.json({
      suggestions: suggestions.map((s) => ({
        id: s.id,
        type: s.type,
        difficulty: s.difficulty,
        title: s.title,
        description: s.description,
        impact: s.impact,
        effort: s.effort,
        stack: s.stack,
        llmAccess: s.llmAccess,
        codeExample: s.codeExample,
        steps: s.steps,
        estimatedSavings: s.estimatedSavings,
        status: s.status,
        completedAt: s.completedAt,
        createdAt: s.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    log.error(error, 'Failed to list AI optimization suggestions');
    return NextResponse.json(
      {
        error: {
          code: 'LIST_SUGGESTIONS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

