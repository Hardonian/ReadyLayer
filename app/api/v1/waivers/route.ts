/**
 * Waiver Management API
 * 
 * POST   /api/v1/waivers - Create waiver
 * GET    /api/v1/waivers - List waivers
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';
import { z } from 'zod';
import { parseJsonBody } from '../../../../lib/api-route-helpers';

const createWaiverSchema = z.object({
  organizationId: z.string(),
  repositoryId: z.string().optional().nullable(),
  ruleId: z.string().min(1, 'Rule ID is required'),
  scope: z.enum(['repo', 'branch', 'path']),
  scopeValue: z.string().optional().nullable(),
  reason: z.string().min(1, 'Reason is required'),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * POST /api/v1/waivers
 * Create a new waiver
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
      requireOrganization: true,
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const validated = createWaiverSchema.parse(bodyResult.data);

    // Verify user belongs to organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: validated.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
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

    // If repositoryId provided, verify it belongs to organization
    if (validated.repositoryId) {
      const repo = await prisma.repository.findUnique({
        where: { id: validated.repositoryId },
        select: { organizationId: true },
      });

      if (!repo || repo.organizationId !== validated.organizationId) {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Repository not found or does not belong to organization',
            },
          },
          { status: 404 }
        );
      }
    }

    // Create waiver
    const waiver = await prisma.waiver.create({
      data: {
        organizationId: validated.organizationId,
        repositoryId: validated.repositoryId || null,
        ruleId: validated.ruleId,
        scope: validated.scope,
        scopeValue: validated.scopeValue || null,
        reason: validated.reason,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        createdBy: user.id,
      },
    });

    // Track false positive (waiver = proxy for false positive)
    try {
      const { trackWaiverCreated } = await import('../../../../lib/telemetry/false-positives');
      // Infer severity from ruleId (security = critical, quality = high, etc.)
      const severity = validated.ruleId.startsWith('security.') ? 'critical' :
                       validated.ruleId.startsWith('quality.') ? 'high' :
                       validated.ruleId.startsWith('style.') ? 'low' : 'medium';
      
      await trackWaiverCreated({
        organizationId: validated.organizationId,
        repositoryId: validated.repositoryId || null,
        ruleId: validated.ruleId,
        severity,
      });
    } catch (error) {
      // Don't fail waiver creation if telemetry fails
      log.warn({ error }, 'Failed to track false positive');
    }

    log.info({ waiverId: waiver.id, organizationId: validated.organizationId }, 'Waiver created');

    return NextResponse.json(
      {
        id: waiver.id,
        organizationId: waiver.organizationId,
        repositoryId: waiver.repositoryId,
        ruleId: waiver.ruleId,
        scope: waiver.scope,
        scopeValue: waiver.scopeValue,
        reason: waiver.reason,
        expiresAt: waiver.expiresAt,
        createdBy: waiver.createdBy,
        createdAt: waiver.createdAt,
        updatedAt: waiver.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    log.error(error, 'Failed to create waiver');
    return NextResponse.json(
      {
        error: {
          code: 'CREATE_WAIVER_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/waivers
 * List waivers (tenant-isolated)
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
    const organizationId = searchParams.get('organizationId');
    const repositoryId = searchParams.get('repositoryId');
    const ruleId = searchParams.get('ruleId');
    const activeOnly = searchParams.get('activeOnly') === 'true';
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
        waivers: [],
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
      organizationId: organizationId ? organizationId : { in: userOrgIds },
    };

    if (repositoryId) {
      where.repositoryId = repositoryId;
    }

    if (ruleId) {
      where.ruleId = ruleId;
    }

    if (activeOnly) {
      const now = new Date();
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ];
    }

    const [waivers, total] = await Promise.all([
      prisma.waiver.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.waiver.count({ where }),
    ]);

    return NextResponse.json({
      waivers: waivers.map((waiver) => ({
        id: waiver.id,
        organizationId: waiver.organizationId,
        repositoryId: waiver.repositoryId,
        ruleId: waiver.ruleId,
        scope: waiver.scope,
        scopeValue: waiver.scopeValue,
        reason: waiver.reason,
        expiresAt: waiver.expiresAt,
        createdBy: waiver.createdBy,
        createdAt: waiver.createdAt,
        updatedAt: waiver.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    log.error(error, 'Failed to list waivers');
    return NextResponse.json(
      {
        error: {
          code: 'LIST_WAIVERS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
