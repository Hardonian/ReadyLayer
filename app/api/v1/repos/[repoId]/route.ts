import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { parseJsonBody } from '../../../../../lib/api-route-helpers';

/**
 * GET /api/v1/repos/:repoId
 * Get repository details (tenant-isolated)
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

    // Get repository with tenant isolation check
    const repo = await prisma.repository.findUnique({
      where: { id: params.repoId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        configs: true,
      },
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

    // Verify user belongs to repository's organization (tenant isolation)
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

    return NextResponse.json({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      provider: repo.provider,
      url: repo.url,
      enabled: repo.enabled,
      config: repo.configs[0]?.config || {},
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    });
  } catch (error) {
    log.error(error, 'Failed to get repository');
    return NextResponse.json(
      {
        error: {
          code: 'GET_REPO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/repos/:repoId
 * Update repository config (tenant-isolated)
 */
export async function PATCH(
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
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const body = bodyResult.data;
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
    const bodyObj = body as Record<string, unknown>;
    const config = bodyObj.config;
    const enabled = bodyObj.enabled;

    // Validate config
    if (config !== undefined && (typeof config !== 'object' || config === null || Array.isArray(config))) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Config must be an object',
          },
        },
        { status: 400 }
      );
    }

    // Validate enabled
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Enabled must be a boolean',
          },
        },
        { status: 400 }
      );
    }

    // Get repository and verify tenant isolation
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

    // Verify user belongs to repository's organization and has admin role
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
            message: 'Admin role required to update repository',
          },
        },
        { status: 403 }
      );
    }

    // Update repository enabled status if provided
    if (enabled !== undefined) {
      await prisma.repository.update({
        where: { id: params.repoId },
        data: { enabled },
      });
    }

    // Update config if provided
    if (config !== undefined) {
      await prisma.repositoryConfig.upsert({
        where: { repositoryId: params.repoId },
        update: {
          config: config as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
        create: {
          repositoryId: params.repoId,
          config: config as Prisma.InputJsonValue,
        },
      });
    }

    // Fetch updated repository
    const updatedRepo = await prisma.repository.findUnique({
      where: { id: params.repoId },
      include: {
        configs: true,
      },
    });

    log.info({ repoId: params.repoId, enabled }, 'Repository updated');

    return NextResponse.json({
      id: updatedRepo!.id,
      name: updatedRepo!.name,
      fullName: updatedRepo!.fullName,
      provider: updatedRepo!.provider,
      enabled: updatedRepo!.enabled,
      config: updatedRepo!.configs[0]?.config || {},
      updatedAt: updatedRepo!.updatedAt,
    });
  } catch (error) {
    log.error(error, 'Failed to update repository config');
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_REPO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
