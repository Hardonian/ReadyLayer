/**
 * Policy Rule Detail API
 * 
 * PUT    /api/v1/policies/:packId/rules/:ruleId - Update rule
 * DELETE /api/v1/policies/:packId/rules/:ruleId - Remove rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { logger } from '../../../../../../../observability/logging';
import { requireAuth } from '../../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../../lib/authz';
import { z } from 'zod';

const updateRuleSchema = z.object({
  severityMapping: z.record(z.enum(['block', 'warn', 'allow'])).optional(),
  enabled: z.boolean().optional(),
  params: z.record(z.any()).optional(),
});

/**
 * PUT /api/v1/policies/:packId/rules/:ruleId
 * Update policy rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { packId: string; ruleId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, packId: params.packId, ruleId: params.ruleId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Get rule and verify access
    const rule = await prisma.policyRule.findUnique({
      where: {
        policyPackId_ruleId: {
          policyPackId: params.packId,
          ruleId: params.ruleId,
        },
      },
      include: {
        policyPack: true,
      },
    });

    if (!rule) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Policy rule not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify user belongs to organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: rule.policyPack.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to policy rule',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateRuleSchema.parse(body);

    // Update rule
    const updated = await prisma.policyRule.update({
      where: {
        policyPackId_ruleId: {
          policyPackId: params.packId,
          ruleId: params.ruleId,
        },
      },
      data: {
        ...(validated.severityMapping && { severityMapping: validated.severityMapping }),
        ...(validated.enabled !== undefined && { enabled: validated.enabled }),
        ...(validated.params !== undefined && { params: validated.params || null }),
      },
    });

    log.info({ ruleId: updated.id }, 'Policy rule updated');

    return NextResponse.json({
      id: updated.id,
      policyPackId: updated.policyPackId,
      ruleId: updated.ruleId,
      severityMapping: updated.severityMapping,
      enabled: updated.enabled,
      params: updated.params,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
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

    log.error(error, 'Failed to update policy rule');
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_RULE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/policies/:packId/rules/:ruleId
 * Remove policy rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { packId: string; ruleId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, packId: params.packId, ruleId: params.ruleId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Get rule and verify access
    const rule = await prisma.policyRule.findUnique({
      where: {
        policyPackId_ruleId: {
          policyPackId: params.packId,
          ruleId: params.ruleId,
        },
      },
      include: {
        policyPack: true,
      },
    });

    if (!rule) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Policy rule not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify user belongs to organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: rule.policyPack.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to policy rule',
          },
        },
        { status: 403 }
      );
    }

    // Delete rule
    await prisma.policyRule.delete({
      where: {
        policyPackId_ruleId: {
          policyPackId: params.packId,
          ruleId: params.ruleId,
        },
      },
    });

    log.info({ ruleId: params.ruleId }, 'Policy rule deleted');

    return NextResponse.json(
      {
        message: 'Policy rule deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    log.error(error, 'Failed to delete policy rule');
    return NextResponse.json(
      {
        error: {
          code: 'DELETE_RULE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
