/**
 * Policy Pack Detail API
 * 
 * GET    /api/v1/policies/:packId - Get policy pack
 * PUT    /api/v1/policies/:packId - Update policy pack
 * DELETE /api/v1/policies/:packId - Delete policy pack
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { createHash } from 'crypto';
import { z } from 'zod';

const updatePolicyPackSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic (e.g., 1.0.0)').optional(),
  source: z.string().min(1, 'Policy source is required').optional(),
  rules: z.array(z.object({
    ruleId: z.string(),
    severityMapping: z.record(z.enum(['block', 'warn', 'allow'])),
    enabled: z.boolean().default(true),
    params: z.record(z.any()).optional(),
  })).optional(),
});

/**
 * GET /api/v1/policies/:packId
 * Get policy pack details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { packId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, packId: params.packId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const policyPack = await prisma.policyPack.findUnique({
      where: { id: params.packId },
      include: {
        rules: true,
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

    if (!policyPack) {
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

    // Verify user belongs to organization (tenant isolation)
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: policyPack.organizationId,
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

    return NextResponse.json({
      id: policyPack.id,
      organizationId: policyPack.organizationId,
      repositoryId: policyPack.repositoryId,
      version: policyPack.version,
      source: policyPack.source,
      checksum: policyPack.checksum,
      rules: policyPack.rules,
      organization: policyPack.organization,
      repository: policyPack.repository,
      createdAt: policyPack.createdAt,
      updatedAt: policyPack.updatedAt,
    });
  } catch (error) {
    log.error(error, 'Failed to get policy pack');
    return NextResponse.json(
      {
        error: {
          code: 'GET_POLICY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/policies/:packId
 * Update policy pack
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { packId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, packId: params.packId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Get existing policy pack
    const existing = await prisma.policyPack.findUnique({
      where: { id: params.packId },
      include: { rules: true },
    });

    if (!existing) {
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
            message: 'Access denied to policy pack',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updatePolicyPackSchema.parse(body);

    // Calculate checksum if source updated
    const source = validated.source || existing.source;
    const checksum = createHash('sha256').update(source, 'utf8').digest('hex');

    // Update policy pack
    const policyPack = await prisma.policyPack.update({
      where: { id: params.packId },
      data: {
        version: validated.version || existing.version,
        source,
        checksum,
        ...(validated.rules && {
          rules: {
            deleteMany: {},
            create: validated.rules.map((rule) => ({
              ruleId: rule.ruleId,
              severityMapping: rule.severityMapping,
              enabled: rule.enabled,
              params: rule.params || null,
            })),
          },
        }),
      },
      include: {
        rules: true,
      },
    });

    log.info({ policyPackId: policyPack.id }, 'Policy pack updated');

    return NextResponse.json({
      id: policyPack.id,
      organizationId: policyPack.organizationId,
      repositoryId: policyPack.repositoryId,
      version: policyPack.version,
      checksum: policyPack.checksum,
      rules: policyPack.rules,
      createdAt: policyPack.createdAt,
      updatedAt: policyPack.updatedAt,
    });
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

    log.error(error, 'Failed to update policy pack');
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_POLICY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/policies/:packId
 * Delete policy pack
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { packId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, packId: params.packId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Get existing policy pack
    const existing = await prisma.policyPack.findUnique({
      where: { id: params.packId },
    });

    if (!existing) {
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
            message: 'Access denied to policy pack',
          },
        },
        { status: 403 }
      );
    }

    // Delete policy pack (cascade deletes rules)
    await prisma.policyPack.delete({
      where: { id: params.packId },
    });

    log.info({ policyPackId: params.packId }, 'Policy pack deleted');

    return NextResponse.json(
      {
        message: 'Policy pack deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    log.error(error, 'Failed to delete policy pack');
    return NextResponse.json(
      {
        error: {
          code: 'DELETE_POLICY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
