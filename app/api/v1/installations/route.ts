/**
 * Installations API Route
 * 
 * GET /api/v1/installations - List installations (tenant-isolated)
 */

import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for Prisma access
export const runtime = 'nodejs';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';

/**
 * GET /api/v1/installations
 * List installations (tenant-isolated)
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

    // Get user's organization memberships for tenant isolation
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({ installations: [] });
    }

    // Get installations for user's organizations
    const installations = await prisma.installation.findMany({
      where: {
        organizationId: { in: userOrgIds },
      },
      select: {
        id: true,
        provider: true,
        providerId: true,
        permissions: true,
        isActive: true,
        installedAt: true,
        updatedAt: true,
        organizationId: true,
      },
      orderBy: { installedAt: 'desc' },
    });

    return NextResponse.json({
      installations: installations.map((inst) => ({
        id: inst.id,
        provider: inst.provider,
        providerId: inst.providerId,
        permissions: inst.permissions,
        isActive: inst.isActive,
        installedAt: inst.installedAt,
        updatedAt: inst.updatedAt,
        organizationId: inst.organizationId,
      })),
    });
  } catch (error) {
    log.error(error, 'Failed to list installations');
    return NextResponse.json(
      {
        error: {
          code: 'LIST_INSTALLATIONS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
