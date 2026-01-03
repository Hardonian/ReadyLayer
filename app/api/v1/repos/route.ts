import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { checkBillingLimits } from '../../../../lib/billing-middleware';
import {
  createRouteHandler,
  parseJsonBody,
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePagination,
  RouteContext,
} from '../../../../lib/api-route-helpers';
import { z } from 'zod';

const createRepoSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  provider: z.string().min(1),
  providerId: z.string().optional(),
  url: z.string().url().optional(),
  defaultBranch: z.string().optional(),
});

/**
 * GET /api/v1/repos
 * List repositories (tenant-isolated)
 */
export const GET = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user } = context;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const { limit, offset } = parsePagination(request);

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
      return paginatedResponse([], 0, limit, offset);
    }

    // If organizationId specified, verify user belongs to it
    if (organizationId && !userOrgIds.includes(organizationId)) {
      return errorResponse('FORBIDDEN', 'Access denied to organization', 403);
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
  },
  { authz: { requiredScopes: ['read'] } }
);

/**
 * POST /api/v1/repos
 * Create a new repository (tenant-isolated, billing-enforced)
 */
export const POST = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user, log } = context;

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const validationResult = createRepoSchema.safeParse(bodyResult.data);
    if (!validationResult.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validationResult.error.errors }
      );
    }

    const { organizationId, name, fullName, provider, providerId, url, defaultBranch } = validationResult.data;

    // Verify user belongs to organization (tenant isolation)
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return errorResponse('FORBIDDEN', `Access denied to organization ${organizationId}`, 403);
    }

    // Check billing limits (repository limit)
    const billingCheck = await checkBillingLimits(organizationId, {
      checkRepoLimit: true,
    });
    if (billingCheck) {
      return billingCheck;
    }

    // Create repository
    const repo = await prisma.repository.create({
      data: {
        organizationId,
        name,
        fullName,
        provider,
        providerId,
        url,
        defaultBranch: defaultBranch || 'main',
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
        organizationId,
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

    return successResponse({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      provider: repo.provider,
      url: repo.url,
      enabled: repo.enabled,
      organization: repo.organization,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    }, 201);
  },
  { authz: { requiredScopes: ['write'] } }
);
