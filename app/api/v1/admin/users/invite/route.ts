/**
 * User Bulk Invite API Endpoint
 *
 * POST /api/v1/admin/users/invite
 *
 * SECURITY: Requires authentication and admin/owner role
 */

import { createRouteHandler, errorResponse, successResponse, parseJsonBody } from '@/lib/api-route-helpers';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const InviteRequestSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
  role: z.enum(['member', 'lead', 'admin']),
});

export const POST = createRouteHandler(
  async ({ request, user }) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) return bodyResult.response;

    const validation = InviteRequestSchema.safeParse(bodyResult.data);
    if (!validation.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400, {
        errors: validation.error.issues,
      });
    }

    const { emails, role } = validation.data;

    // Get user's organization (users must belong to exactly one org for now)
    const { prisma } = await import('@/lib/prisma');
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    if (!membership) {
      return errorResponse('FORBIDDEN', 'User does not belong to an organization', 403);
    }

    const organizationId = membership.organizationId;

    logger.info(
      {
        organizationId,
        userId: user.id,
        emailCount: emails.length,
        role,
      },
      'Processing user invitations'
    );

    metrics.increment('user_invites_sent', {
      count: emails.length.toString(),
      role,
    });

    // TODO: Send invitations to each email
    const invitations = emails.map(email => ({
      email,
      role,
      organizationId,
      createdAt: new Date(),
    }));

    return successResponse({
      invitations,
      sentCount: invitations.length,
    }, 200);
  },
  {
    authz: {
      requireOrganization: true,
      requireRole: 'admin' // Only admins and owners can invite users
    }
  }
);
