import { NextRequest, NextResponse } from 'next/server';
import { gitlabWebhookHandler, GitLabWebhookEvent } from '../../../../integrations/gitlab/webhook';
import { logger } from '../../../../observability/logging';
import { metrics } from '../../../../observability/metrics';
import { z } from 'zod';

// Webhook routes must use Node runtime for signature verification and raw body access
export const runtime = 'nodejs';

export const GitLabWebhookEventSchema = z.object({
  object_kind: z.string(),
  project: z
    .object({
      path_with_namespace: z.string().optional(),
    })
    .optional(),
  object_attributes: z.record(z.string(), z.unknown()).optional(),
  merge_request: z.record(z.string(), z.unknown()).optional(),
  pipeline: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

/**
 * POST /api/webhooks/gitlab
 * Handle GitLab webhooks
 * Requires Node runtime for signature verification and raw body access
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const parsed = GitLabWebhookEventSchema.safeParse(event);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_EVENT',
            message: 'Webhook event payload validation failed',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }
    const eventData = parsed.data as GitLabWebhookEvent;

    log.info({
      eventType,
      installationId,
      objectKind: eventData.object_kind,
    }, 'Received GitLab webhook');

    // Handle event (pass raw payload for API consistency)
    await gitlabWebhookHandler.handleEvent(eventData, installationId, token, payload);

    metrics.increment('webhooks.received', { provider: 'gitlab', event: eventType });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error(error, 'Webhook handling failed');
    metrics.increment('webhooks.failed', { provider: 'gitlab' });

    // Sanitize error message to prevent information disclosure
    // Internal details are logged but not exposed to caller
    return NextResponse.json(
      {
        error: {
          code: 'WEBHOOK_FAILED',
          message: 'Webhook processing failed. Please check webhook configuration and try again.',
        },
      },
      { status: 500 }
    );
  }
}
