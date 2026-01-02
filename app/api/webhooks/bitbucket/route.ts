import { NextRequest, NextResponse } from 'next/server';
import { bitbucketWebhookHandler, BitbucketWebhookEvent } from '../../../../integrations/bitbucket/webhook';
import { logger } from '../../../../observability/logging';
import { metrics } from '../../../../observability/metrics';

// Webhook routes must use Node runtime for signature verification and raw body access
export const runtime = 'nodejs';

/**
 * POST /api/webhooks/bitbucket
 * Handle Bitbucket webhooks
 * Requires Node runtime for signature verification and raw body access
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const signature = request.headers.get('x-hub-signature') || '';
    const eventType = request.headers.get('x-event-key') || '';
    const installationId = request.headers.get('x-bitbucket-installation-id') || '';

    if (!signature || !eventType || !installationId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required headers: x-hub-signature, x-event-key, x-bitbucket-installation-id',
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
      eventKey: (event as any).eventKey,
    }, 'Received Bitbucket webhook');

    // Handle event
    await bitbucketWebhookHandler.handleEvent(event as BitbucketWebhookEvent, installationId, signature);

    metrics.increment('webhooks.received', { provider: 'bitbucket', event: eventType });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error(error, 'Webhook handling failed');
    metrics.increment('webhooks.failed', { provider: 'bitbucket' });

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
