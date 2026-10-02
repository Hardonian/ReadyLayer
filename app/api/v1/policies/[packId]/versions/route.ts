/**
 * Policy Pack Versions API
 * 
 * GET /api/v1/policies/:packId/versions
 * Lists all historical versions of a policy pack for comparison and rollback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';
import { logger } from '../../../../../../observability/logging';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
): Promise<NextResponse> {
  const { packId } = await params;
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, packId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Find current pack
    const currentPack = await prisma.policyPack.findUnique({
      where: { id: packId },
      include: {
        rules: true,
      },
    });

    if (!currentPack) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Policy pack not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify tenant membership
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: currentPack.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to policy pack',
          },
        },
        { status: 403 }
      );
    }

    // Find all versions belonging to this org & repo
    const versions = await prisma.policyPack.findMany({
      where: {
        organizationId: currentPack.organizationId,
        repositoryId: currentPack.repositoryId,
      },
      include: {
        rules: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      currentPackId: currentPack.id,
      currentVersion: currentPack.version,
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        checksum: v.checksum,
        source: v.source,
        ruleCount: v.rules.length,
        rules: v.rules,
        isCurrent: v.id === currentPack.id,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
    });
  } catch (error) {
    log.error(error, 'Failed to fetch policy versions');
    return NextResponse.json(
      {
        error: {
          code: 'GET_VERSIONS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
