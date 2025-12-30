export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { configService } from '../../../../../../services/config';
import { logger } from '../../../../../../observability/logging';
import { createAuthzMiddleware } from '../../../../../../lib/authz';
import { requireAuth } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

/**
 * GET /api/v1/config/repos/:repoId
 * Get repository configuration (tenant-isolated)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, repoId: params.repoId });

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

    // Verify user belongs to repository's organization (tenant isolation)
    const repo = await prisma.repository.findUnique({
      where: { id: params.repoId },
      select: { organizationId: true },
    });

    if (!repo) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${params.repoId} not found`,
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

    const config = await configService.getRepositoryConfig(params.repoId);

    return NextResponse.json({ config });
  } catch (error) {
    log.error(error, 'Failed to get repository config');
    return NextResponse.json(
      {
        error: {
          code: 'GET_CONFIG_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/config/repos/:repoId
 * Update repository configuration (tenant-isolated)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, repoId: params.repoId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Check authorization (requires write scope)
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Verify user belongs to repository's organization and has admin role (tenant isolation)
    const repo = await prisma.repository.findUnique({
      where: { id: params.repoId },
      select: { organizationId: true },
    });

    if (!repo) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${params.repoId} not found`,
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

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required to update repository configuration',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { config, rawConfig } = body;

    // Validate and update config
    await configService.updateRepositoryConfig(params.repoId, config, rawConfig);

    log.info({ repoId: params.repoId }, 'Repository config updated');

    return NextResponse.json({
      id: params.repoId,
      config,
      updatedAt: new Date(),
    });
  } catch (error) {
    log.error(error, 'Failed to update repository config');
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_CONFIG_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 400 }
    );
  }
}
