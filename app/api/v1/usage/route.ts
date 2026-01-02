/**
 * Usage Stats API Route
 * 
 * GET /api/v1/usage - Get current usage statistics for organization
 */

import {
  createRouteHandler,
  errorResponse,
  successResponse,
  RouteContext,
} from '../../../../lib/api-route-helpers';
import { usageEnforcementService } from '../../../../lib/usage-enforcement';
import { prisma } from '../../../../lib/prisma';

/**
 * GET /api/v1/usage
 * Get usage statistics for authenticated user's organization
 */
export const GET = createRouteHandler(
  async (context: RouteContext) => {
    const { user } = context;

    // Get user's primary organization (first membership)
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return errorResponse('NOT_FOUND', 'No organization found for user', 404);
    }

    // Get usage stats
    const stats = await usageEnforcementService.getUsageStats(membership.organizationId);

    return successResponse({
      ...stats,
      organizationId: membership.organizationId, // Include for client use
    });
  },
  { authz: { requiredScopes: ['read'] } }
);
