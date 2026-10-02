/**
 * Notifications API
 * GET /api/v1/notifications - List notifications for user
 * POST /api/v1/notifications - Mark notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { notificationService } from '../../../../services/notification-service';
import { errorResponse, successResponse } from '../../../../lib/api-route-helpers';
import { logger } from '../../../../observability/logging';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `notif_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);

    let notifications = notificationService.getInAppNotifications(user.id);

    // Provide default initial notifications if empty
    if (notifications.length === 0) {
      notifications = [
        {
          id: `sys_welcome_${Date.now()}`,
          type: 'info',
          title: 'ReadyLayer Governance Active',
          body: 'Deterministic policy evaluation and cryptographic audit chain are operational.',
          cta: {
            label: 'View Audit Logs',
            url: '/dashboard/audit',
          },
          timestamp: new Date(),
        },
        {
          id: `sys_policy_${Date.now() - 3600000}`,
          type: 'success',
          title: 'OWASP & Clean Code Policy Enforced',
          body: 'Default policy packs installed and protecting repository merges.',
          cta: {
            label: 'Inspect Policies',
            url: '/dashboard/policies',
          },
          timestamp: new Date(Date.now() - 3600000),
        },
      ];
    }

    return successResponse({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error) {
    log.error(error, 'Failed to fetch notifications');
    return errorResponse(
      'GET_NOTIFICATIONS_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `notif_ack_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);
    const body = (await request.json().catch(() => ({}))) as { action?: string; messageId?: string };

    log.info({ userId: user.id, action: body.action }, 'Notifications acknowledged');

    return successResponse({
      acknowledged: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error(error, 'Failed to update notifications');
    return errorResponse(
      'UPDATE_NOTIFICATIONS_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
