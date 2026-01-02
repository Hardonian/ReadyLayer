/**
 * Policy Rule Management API
 * 
 * POST   /api/v1/policies/:packId/rules - Add rule to pack
 * GET    /api/v1/policies/:packId/rules - List rules in pack
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../../../../../../observability/logging';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';
import { z } from 'zod';
import { parseJsonBody } from '../../../../../../lib/api-route-helpers';

const createRuleSchema = z.object({
  ruleId: z.string().min(1, 'Rule ID is required'),
  severityMapping: z.record(z.enum(['block', 'warn', 'allow'])),
  enabled: z.boolean().default(true),
  params: z.record(z.any()).optional(),
});

/**
 * POST /api/v1/policies/:packId/rules
 * Add rule to policy pack
 */
export async function POST(
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

    // Get policy pack and verify access
    const policyPack = await prisma.policyPack.findUnique({
      where: { id: params.packId },
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

    // Verify user belongs to organization
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

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const validated = createRuleSchema.parse(bodyResult.data);

    // Check if rule already exists
    const existing = await prisma.policyRule.findUnique({
      where: {
        policyPackId_ruleId: {
          policyPackId: params.packId,
          ruleId: validated.ruleId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_RULE',
            message: 'Rule already exists in this policy pack',
          },
        },
        { status: 409 }
      );
    }

    // Create rule
    const rule = await prisma.policyRule.create({
      data: {
        policyPackId: params.packId,
        ruleId: validated.ruleId,
        severityMapping: validated.severityMapping as Prisma.InputJsonValue,
        enabled: validated.enabled,
        params: validated.params ? (validated.params as Prisma.InputJsonValue) : undefined,
      },
    });

    log.info({ ruleId: rule.id, packId: params.packId }, 'Policy rule created');

    return NextResponse.json(
      {
        id: rule.id,
        policyPackId: rule.policyPackId,
        ruleId: rule.ruleId,
        severityMapping: rule.severityMapping,
        enabled: rule.enabled,
        params: rule.params,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
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

    log.error(error, 'Failed to create policy rule');
    return NextResponse.json(
      {
        error: {
          code: 'CREATE_RULE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/policies/:packId/rules
 * List rules in policy pack
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

    // Get policy pack and verify access
    const policyPack = await prisma.policyPack.findUnique({
      where: { id: params.packId },
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

    // Verify user belongs to organization
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

    const rules = await prisma.policyRule.findMany({
      where: { policyPackId: params.packId },
      orderBy: { ruleId: 'asc' },
    });

    return NextResponse.json({
      rules: rules.map((rule) => ({
        id: rule.id,
        policyPackId: rule.policyPackId,
        ruleId: rule.ruleId,
        severityMapping: rule.severityMapping,
        enabled: rule.enabled,
        params: rule.params,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      })),
    });
  } catch (error) {
    log.error(error, 'Failed to list policy rules');
    return NextResponse.json(
      {
        error: {
          code: 'LIST_RULES_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
