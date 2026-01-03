/**
 * Policy Gates API Route
 * 
 * GET /api/v1/policies/gates - List policy gates
 * POST /api/v1/policies/gates - Create policy gate
 */

import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for Prisma access
export const runtime = 'nodejs';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { parseJsonBody } from '../../../../../lib/api-route-helpers';

/**
 * GET /api/v1/policies/gates
 * List policy gates (tenant-isolated)
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

    // Get user's organization memberships
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({ gates: [] });
    }

    // Policy gates are stored in PolicyPack rules
    // For now, return empty array (gates will be implemented via PolicyPack)
    // Filter by organizationId if provided
    const filteredOrgIds = organizationId && userOrgIds.includes(organizationId)
      ? [organizationId]
      : userOrgIds;

    return NextResponse.json({ gates: [] });
  } catch (error) {
    log.error(error, 'Failed to list policy gates');
    return NextResponse.json(
      {
        error: {
          code: 'LIST_GATES_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/policies/gates
 * Create policy gate
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);
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

    const body = bodyResult.data as {
      organizationId?: string;
      repositoryId?: string;
      template?: string;
      enforcementMode?: string;
      exceptions?: unknown;
    };
    const { organizationId } = body;

    if (!organizationId || typeof organizationId !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'organizationId is required',
          },
        },
        { status: 400 }
      );
    }

    // Verify user belongs to organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        },
        { status: 403 }
      );
    }

    // Policy gates are implemented via PolicyPack
    // This endpoint is a placeholder for future implementation
    return NextResponse.json(
      {
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Policy gates are implemented via Policy Packs',
        },
      },
      { status: 501 }
    );
  } catch (error) {
    log.error(error, 'Failed to create policy gate');
    return NextResponse.json(
      {
        error: {
          code: 'CREATE_GATE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
