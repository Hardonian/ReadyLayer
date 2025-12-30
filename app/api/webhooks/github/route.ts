import { NextRequest, NextResponse } from 'next/server';
import { githubWebhookHandler } from '../../../../integrations/github/webhook';
import { logger } from '../../../../observability/logging';
import { metrics } from '../../../../observability/metrics';

/**
 * POST /api/webhooks/github
 * Handle GitHub webhooks
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const signature = request.headers.get('x-hub-signature-256') || '';
    const eventType = request.headers.get('x-github-event') || '';
    const installationId = request.headers.get('x-github-installation-id') || '';

    if (!signature || !eventType || !installationId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required headers: x-hub-signature-256, x-github-event, x-github-installation-id',
          },
        },
        { status: 400 }
      );
    }

    let payload: string;
    let event: any;
    
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

    log.info({
      eventType,
      installationId,
      action: event.action,
    }, 'Received GitHub webhook');

    // Handle event
    await githubWebhookHandler.handleEvent(event, installationId, signature);

    metrics.increment('webhooks.received', { provider: 'github', event: eventType });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error(error, 'Webhook handling failed');
    metrics.increment('webhooks.failed', { provider: 'github' });

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
