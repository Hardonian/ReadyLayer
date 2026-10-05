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
import { createClient } from '@supabase/supabase-js';

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

    const organizationId = request.headers.get('x-organization-id')
      || new URL(request.url).searchParams.get('organizationId');
    if (!organizationId) {
      return errorResponse('BAD_REQUEST', 'Organization ID required', 400);
    }

    // Resolve the selected organization, never the first organization returned for a user.
    const { prisma } = await import('@/lib/prisma');
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return errorResponse('FORBIDDEN', 'User does not belong to an organization', 403);
    }

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        'CONFIGURATION_ERROR',
        'Invitation delivery is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.',
        503,
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?redirect=/dashboard`;
    const results = await Promise.all(
      emails.map(async (email) => {
        try {
          const result = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: {
              readylayer_organization_id: organizationId,
              readylayer_organization_role: role,
            },
          });
          return { email, ok: !result.error };
        } catch {
          return { email, ok: false };
        }
      }),
    );
    const sentCount = results.filter((result) => result.ok).length;
    const failedEmails = results.filter((result) => !result.ok).map((result) => result.email);

    if (sentCount === 0) {
      return errorResponse('INVITE_DELIVERY_FAILED', 'No invitations could be delivered. Check the email provider configuration and try again.', 502, {
        failedCount: failedEmails.length,
      });
    }

    return successResponse({
      sentCount,
      failedCount: failedEmails.length,
      failedEmails,
    }, 200);
  },
  {
    authz: {
      requireOrganization: true,
      requireRole: 'admin',
    }
  }
);
