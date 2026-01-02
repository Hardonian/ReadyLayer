import { NextRequest, NextResponse } from 'next/server';
import { gitlabWebhookHandler, GitLabWebhookEvent } from '../../../../integrations/gitlab/webhook';
import { logger } from '../../../../observability/logging';
import { metrics } from '../../../../observability/metrics';

// Webhook routes must use Node runtime for signature verification and raw body access
export const runtime = 'nodejs';

/**
 * POST /api/webhooks/gitlab
 * Handle GitLab webhooks
 * Requires Node runtime for signature verification and raw body access
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const token = request.headers.get('x-gitlab-token') || '';
    const eventType = request.headers.get('x-gitlab-event') || '';
    const installationId = request.headers.get('x-gitlab-installation-id') || '';

    if (!token || !eventType || !installationId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required headers: x-gitlab-token, x-gitlab-event, x-gitlab-installation-id',
          },
        },
        { status: 400 }
      );
    }

    let payload: string;
    let event: unknown;
    
    try {
      payload = await request.text();
    } catch (error) {
      log.error(error, 'Failed to read webhook payload');
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Failed to read webhook payload',
          },
        },
        { status: 400 }
      );
    }

    try {
      event = JSON.parse(payload);
    } catch (error) {
      log.error(error, 'Failed to parse webhook payload as JSON');
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Webhook payload is not valid JSON',
          },
        },
        { status: 400 }
      );
    }

    if (!event || typeof event !== 'object') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_EVENT',
            message: 'Webhook event must be an object',
          },
        },
        { status: 400 }
      );
    }

    log.info({
      eventType,
      installationId,
      objectKind: typeof event === 'object' && event !== null && 'object_kind' in event ? String((event as { object_kind?: string }).object_kind) : undefined,
    }, 'Received GitLab webhook');

    // Handle event
    await gitlabWebhookHandler.handleEvent(event as GitLabWebhookEvent, installationId, token);

    metrics.increment('webhooks.received', { provider: 'gitlab', event: eventType });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error(error, 'Webhook handling failed');
    metrics.increment('webhooks.failed', { provider: 'gitlab' });

    return NextResponse.json(
      {
        error: {
          code: 'WEBHOOK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
