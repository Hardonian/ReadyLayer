/**
 * Policy Pack Rollback API
 * 
 * POST /api/v1/policies/:packId/rollback
 * Restores a policy pack configuration from a previous historical version.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';
import { logger } from '../../../../../../observability/logging';
import { parseJsonBody } from '../../../../../../lib/api-route-helpers';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const rollbackSchema = z.object({
  targetVersion: z.string().optional(),
  targetPackId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
): Promise<NextResponse> {
  const { packId } = await params;
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, packId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const currentPack = await prisma.policyPack.findUnique({
      where: { id: packId },
      include: { rules: true },
    });

    if (!currentPack) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Current policy pack not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify tenant membership
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: currentPack.organizationId,
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

    const validated = rollbackSchema.parse(bodyResult.data);

    if (!validated.targetVersion && !validated.targetPackId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Must provide either targetVersion or targetPackId',
          },
        },
        { status: 400 }
      );
    }

    // Find target historical pack
    const targetPack = await prisma.policyPack.findFirst({
      where: {
        organizationId: currentPack.organizationId,
        repositoryId: currentPack.repositoryId,
        ...(validated.targetPackId ? { id: validated.targetPackId } : { version: validated.targetVersion }),
      },
      include: { rules: true },
    });

    if (!targetPack) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Target historical policy version not found',
          },
        },
        { status: 404 }
      );
    }

    // Apply rollback to currentPack: replace rules and restore source & checksum
    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing rules for this pack
      await tx.policyRule.deleteMany({
        where: { policyPackId: currentPack.id },
      });

      // Insert target rules
      if (targetPack.rules.length > 0) {
        await tx.policyRule.createMany({
          data: targetPack.rules.map((rule) => ({
            policyPackId: currentPack.id,
            ruleId: rule.ruleId,
            severityMapping: rule.severityMapping as Prisma.InputJsonValue,
            enabled: rule.enabled,
            params: (rule.params || {}) as Prisma.InputJsonValue,
          })),
        });
      }

      // Update pack source and checksum
      return tx.policyPack.update({
        where: { id: currentPack.id },
        data: {
          source: targetPack.source,
          checksum: targetPack.checksum,
          updatedAt: new Date(),
        },
        include: { rules: true },
      });
    });

    log.info(
      {
        packId: currentPack.id,
        fromVersion: currentPack.version,
        targetVersion: targetPack.version,
        userId: user.id,
      },
      'Policy pack rolled back successfully'
    );

    return NextResponse.json({
      success: true,
      message: `Successfully rolled back policy to version ${targetPack.version}`,
      rolledBackFromVersion: currentPack.version,
      rolledBackToVersion: targetPack.version,
      policyPack: {
        id: updated.id,
        version: updated.version,
        checksum: updated.checksum,
        source: updated.source,
        rules: updated.rules,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid rollback request',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    log.error(error, 'Failed to rollback policy pack');
    return NextResponse.json(
      {
        error: {
          code: 'ROLLBACK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error during rollback',
        },
      },
      { status: 500 }
    );
  }
}
