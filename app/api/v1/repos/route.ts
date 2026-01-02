import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';
import { checkBillingLimits } from '../../../../lib/billing-middleware';

/**
 * GET /api/v1/repos
 * List repositories (tenant-isolated)
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

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

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get user's organization memberships for tenant isolation
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m: { organizationId: string }) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({
        repositories: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      });
    }

    // If organizationId specified, verify user belongs to it
    if (organizationId && !userOrgIds.includes(organizationId)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to organization',
          },
        },
        { status: 403 }
      );
    }

    // Build where clause with tenant isolation
    const where: Record<string, unknown> = {
      organizationId: organizationId 
        ? organizationId 
        : { in: userOrgIds }, // Only show repos from user's organizations
    };

    const [repos, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.repository.count({ where }),
    ]);

    return NextResponse.json({
      repositories: repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        provider: repo.provider,
        url: repo.url,
        enabled: repo.enabled,
        organization: repo.organization,
        createdAt: repo.createdAt,
        updatedAt: repo.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    log.error(error, 'Failed to list repositories');
    return NextResponse.json(
      {
        error: {
          code: 'LIST_REPOS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/repos
 * Create a new repository (tenant-isolated, billing-enforced)
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

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

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        },
        { status: 400 }
      );
    }
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
    const organizationId = bodyObj.organizationId;
    const name = bodyObj.name;
    const fullName = bodyObj.fullName;
    const provider = bodyObj.provider;
    const providerId = bodyObj.providerId;
    const url = bodyObj.url;
    const defaultBranch = bodyObj.defaultBranch;

    // Validate input
    if (!organizationId || typeof organizationId !== 'string' ||
        !name || typeof name !== 'string' ||
        !fullName || typeof fullName !== 'string' ||
        !provider || typeof provider !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: organizationId (string), name (string), fullName (string), provider (string)',
          },
        },
        { status: 400 }
      );
    }

    // Verify user belongs to organization (tenant isolation)
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organizationId as string,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      const { ErrorMessages } = await import('../../../../lib/errors');
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: ErrorMessages.ORGANIZATION_ACCESS_DENIED(organizationId as string).message,
            context: ErrorMessages.ORGANIZATION_ACCESS_DENIED(organizationId as string).context,
            fix: ErrorMessages.ORGANIZATION_ACCESS_DENIED(organizationId as string).fix,
          },
        },
        { status: 403 }
      );
    }

    // Check billing limits (repository limit)
    const billingCheck = await checkBillingLimits(organizationId as string, {
      checkRepoLimit: true,
    });
    if (billingCheck) {
      return billingCheck;
    }

    // Create repository
    const repo = await prisma.repository.create({
      data: {
        organizationId: organizationId as string,
        name: name as string,
        fullName: fullName as string,
        provider: provider as string,
        providerId: providerId as string | undefined,
        url: url as string | undefined,
        defaultBranch: (defaultBranch as string | undefined) || 'main',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Auto-generate default config
    try {
      const { configService } = await import('../../../../services/config');
      await configService.autoGenerateConfig(repo.id);
      log.info({ repoId: repo.id }, 'Auto-generated default config');
    } catch (error) {
      // Don't fail repo creation if config generation fails
      log.warn({ err: error }, 'Failed to auto-generate config, will be created on first use');
    }

    // Audit log
    try {
      const { createAuditLog, AuditActions } = await import('../../../../lib/audit');
      await createAuditLog({
        organizationId: organizationId as string,
        userId: user.id,
        action: AuditActions.REPO_CREATED,
        resourceType: 'repository',
        resourceId: repo.id,
        details: {
          name: repo.name,
          fullName: repo.fullName,
          provider: repo.provider,
        },
      });
    } catch (error) {
      // Don't fail on audit log errors
      log.warn({ err: error }, 'Failed to create audit log');
    }

    log.info({ repoId: repo.id, organizationId }, 'Repository created');

    return NextResponse.json(
      {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        provider: repo.provider,
        url: repo.url,
        enabled: repo.enabled,
        organization: repo.organization,
        createdAt: repo.createdAt,
        updatedAt: repo.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error(error, 'Failed to create repository');
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_REPOSITORY',
            message: 'Repository already exists',
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'CREATE_REPO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
