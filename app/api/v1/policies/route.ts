/**
 * Policy Pack Management API
 * 
 * POST   /api/v1/policies - Create policy pack
 * GET    /api/v1/policies - List policy packs
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';
import { createHash } from 'crypto';
import { z } from 'zod';
import { parseJsonBody } from '../../../../lib/api-route-helpers';

const createPolicyPackSchema = z.object({
  organizationId: z.string(),
  repositoryId: z.string().optional().nullable(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic (e.g., 1.0.0)'),
  source: z.string().min(1, 'Policy source is required'),
  rules: z.array(z.object({
    ruleId: z.string(),
    severityMapping: z.record(z.enum(['block', 'warn', 'allow'])),
    enabled: z.boolean().default(true),
    params: z.record(z.any()).optional(),
  })).optional().default([]),
});

/**
 * POST /api/v1/policies
 * Create a new policy pack
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
    
    const validated = createPolicyPackSchema.parse(bodyResult.data);

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

    // Calculate checksum
    const checksum = createHash('sha256').update(validated.source, 'utf8').digest('hex');

    // Create policy pack
    const policyPack = await prisma.policyPack.create({
      data: {
        organizationId: validated.organizationId,
        repositoryId: validated.repositoryId || null,
        version: validated.version,
        source: validated.source,
        checksum,
        rules: {
          create: validated.rules.map((rule) => ({
            ruleId: rule.ruleId,
            severityMapping: rule.severityMapping as Prisma.InputJsonValue,
            enabled: rule.enabled,
            params: rule.params ? (rule.params as Prisma.InputJsonValue) : undefined,
          })),
        },
      },
      include: {
        rules: true,
      },
    });

    log.info({ policyPackId: policyPack.id, organizationId: validated.organizationId }, 'Policy pack created');

    return NextResponse.json(
      {
        id: policyPack.id,
        organizationId: policyPack.organizationId,
        repositoryId: policyPack.repositoryId,
        version: policyPack.version,
        checksum: policyPack.checksum,
        rules: policyPack.rules,
        createdAt: policyPack.createdAt,
        updatedAt: policyPack.updatedAt,
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

    log.error(error, 'Failed to create policy pack');

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_POLICY',
            message: 'Policy pack with this version already exists',
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'CREATE_POLICY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/policies
 * List policy packs (tenant-isolated)
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
        policies: [],
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
    } else {
      // Include both org-level (null) and repo-level policies
      where.repositoryId = repositoryId === null ? null : undefined;
    }

    const [policies, total] = await Promise.all([
      prisma.policyPack.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          rules: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.policyPack.count({ where }),
    ]);

    return NextResponse.json({
      policies: policies.map((policy) => ({
        id: policy.id,
        organizationId: policy.organizationId,
        repositoryId: policy.repositoryId,
        version: policy.version,
        checksum: policy.checksum,
        rules: policy.rules,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    log.error(error, 'Failed to list policy packs');
    return NextResponse.json(
      {
        error: {
          code: 'LIST_POLICIES_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
