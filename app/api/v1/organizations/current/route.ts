/**
 * GET /api/v1/organizations/current
 *
 * Resolves the authenticated user's active organization without requiring a
 * repository to exist first. An explicit organizationId can be supplied by a
 * future organization switcher; otherwise the oldest membership is used as a
 * deterministic default.
 */

import { prisma } from '@/lib/prisma';
import {
  createRouteHandler,
  errorResponse,
  successResponse,
  type RouteContext,
} from '@/lib/api-route-helpers';

export const GET = createRouteHandler(
  async ({ request, user }: RouteContext) => {
    const requestedOrganizationId = new URL(request.url).searchParams.get('organizationId');

    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        ...(requestedOrganizationId
          ? { organizationId: requestedOrganizationId }
          : {}),
      },
      orderBy: { joinedAt: 'asc' },
      select: {
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            _count: {
              select: { repositories: true },
            },
          },
        },
      },
    });

    if (requestedOrganizationId && !membership) {
      return errorResponse('FORBIDDEN', 'Access denied to organization', 403);
    }

    if (!membership) {
      return successResponse({ organization: null });
    }

    return successResponse({
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        plan: membership.organization.plan,
        role: membership.role,
        repositoryCount: membership.organization._count.repositories,
      },
    });
  },
  { authz: { requiredScopes: ['read'] } }
);
