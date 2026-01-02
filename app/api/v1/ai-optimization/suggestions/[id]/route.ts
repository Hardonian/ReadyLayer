/**
 * AI Optimization Suggestion API
 * 
 * PATCH /api/v1/ai-optimization/suggestions/:id - Update suggestion status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { logger } from '../../../../../../observability/logging';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';

/**
 * PATCH /api/v1/ai-optimization/suggestions/:id
 * Update suggestion status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'in_progress', 'completed', 'dismissed'].includes(status)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status. Must be one of: pending, in_progress, completed, dismissed',
          },
        },
        { status: 400 }
      );
    }

    // Get suggestion and verify access
    const suggestion = await prisma.aIOptimizationSuggestion.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Suggestion not found' } },
        { status: 404 }
      );
    }

    // Verify user belongs to organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: suggestion.organizationId,
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

    // Update suggestion
    const updated = await prisma.aIOptimizationSuggestion.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      completedAt: updated.completedAt,
    });
  } catch (error) {
    log.error(error, 'Failed to update AI optimization suggestion');
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_SUGGESTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
