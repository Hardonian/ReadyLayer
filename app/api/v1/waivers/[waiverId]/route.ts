/**
 * Waiver Detail API
 * 
 * GET    /api/v1/waivers/:waiverId - Get waiver
 * DELETE /api/v1/waivers/:waiverId - Revoke waiver
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';

/**
 * GET /api/v1/waivers/:waiverId
 * Get waiver details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { waiverId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, waiverId: params.waiverId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const waiver = await prisma.waiver.findUnique({
      where: { id: params.waiverId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        repository: {
          select: {
            id: true,
            name: true,
            fullName: true,
          },
        },
      },
    });

    if (!waiver) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Waiver not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify user belongs to organization (tenant isolation)
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: waiver.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to waiver',
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: waiver.id,
      organizationId: waiver.organizationId,
      repositoryId: waiver.repositoryId,
      ruleId: waiver.ruleId,
      scope: waiver.scope,
      scopeValue: waiver.scopeValue,
      reason: waiver.reason,
      expiresAt: waiver.expiresAt,
      createdBy: waiver.createdBy,
      organization: waiver.organization,
      repository: waiver.repository,
      createdAt: waiver.createdAt,
      updatedAt: waiver.updatedAt,
    });
  } catch (error) {
    log.error(error, 'Failed to get waiver');
    return NextResponse.json(
      {
        error: {
          code: 'GET_WAIVER_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/waivers/:waiverId
 * Revoke waiver
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { waiverId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, waiverId: params.waiverId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Get existing waiver
    const existing = await prisma.waiver.findUnique({
      where: { id: params.waiverId },
    });

    if (!existing) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Waiver not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify user belongs to organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: existing.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to waiver',
          },
        },
        { status: 403 }
      );
    }

    // Delete waiver
    await prisma.waiver.delete({
      where: { id: params.waiverId },
    });

    log.info({ waiverId: params.waiverId }, 'Waiver revoked');

    return NextResponse.json(
      {
        message: 'Waiver revoked successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    log.error(error, 'Failed to revoke waiver');
    return NextResponse.json(
      {
        error: {
          code: 'REVOKE_WAIVER_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
