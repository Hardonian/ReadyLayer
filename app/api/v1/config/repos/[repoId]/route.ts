import { NextRequest, NextResponse } from 'next/server';
import { configService, type ReadyLayerConfig } from '../../../../../../services/config';
import { logger } from '../../../../../../observability/logging';
import { createAuthzMiddleware } from '../../../../../../lib/authz';
import { requireAuth } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';
import { parseJsonBody } from '../../../../../../lib/api-route-helpers';

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
      const { ErrorMessages } = await import('../../../../../../lib/errors');
      const notFound = ErrorMessages.NOT_FOUND('Repository', params.repoId);
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: notFound.message,
            context: notFound.context,
            fix: notFound.fix,
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
      const { ErrorMessages } = await import('../../../../../../lib/errors');
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: ErrorMessages.FORBIDDEN.message,
            context: { repositoryId: params.repoId },
            fix: ErrorMessages.FORBIDDEN.fix,
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
      const { ErrorMessages } = await import('../../../../../../lib/errors');
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: ErrorMessages.FORBIDDEN.message,
            context: { repositoryId: params.repoId, userRole: membership?.role || 'none' },
            fix: 'You must be an organization owner or admin to update repository configuration. Contact an organization admin to grant you admin access.',
          },
        },
        { status: 403 }
      );
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
    const rawConfig = bodyObj.rawConfig;

    // Validate config - config is required
    if (config === undefined || config === null || typeof config !== 'object' || Array.isArray(config)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'config is required and must be an object',
          },
        },
        { status: 400 }
      );
    }

    // Validate and update config
    // The service will validate the structure matches ReadyLayerConfig
    await configService.updateRepositoryConfig(
      params.repoId, 
      config as ReadyLayerConfig,
      rawConfig as string | undefined
    );

    // Audit log
    try {
      const { createAuditLog, AuditActions } = await import('../../../../../../lib/audit');
      await createAuditLog({
        organizationId: repo.organizationId,
        userId: user.id,
        action: AuditActions.REPO_CONFIG_UPDATED,
        resourceType: 'repository_config',
        resourceId: params.repoId,
        details: {
          repositoryId: params.repoId,
          configVersion: typeof config === 'object' && config !== null && 'version' in config ? (config as { version?: number }).version : undefined,
        },
      });
    } catch {
      // Don't fail on audit log errors
    }

    log.info({ repoId: params.repoId, userId: user.id }, 'Repository config updated successfully');

    return NextResponse.json({
      id: params.repoId,
      config,
      updatedAt: new Date(),
      message: 'Configuration updated successfully. Changes will apply to the next PR review.',
    });
  } catch (error) {
    log.error(error, 'Failed to update repository config');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConfigError = errorMessage.includes('Invalid config') || errorMessage.includes('configuration');
    
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_CONFIG_FAILED',
          message: errorMessage,
          fix: isConfigError 
            ? errorMessage 
            : 'Check your configuration format and try again. See https://docs.readylayer.com/config for valid configuration options. If the problem persists, contact support@readylayer.com',
        },
      },
      { status: 400 }
    );
  }
}
