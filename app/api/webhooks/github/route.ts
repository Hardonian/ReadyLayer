import { NextRequest, NextResponse } from 'next/server';
import { githubWebhookHandler, GitHubWebhookEvent } from '../../../../integrations/github/webhook';
import { webhookReplayProtection, validateWebhookTimestamp, validateWebhookNonce } from '../../../../lib/security/webhook-replay';
import { checkRateLimit, RateLimitConfig } from '../../../../lib/rate-limiting/redis-rate-limiter';
import { logger } from '../../../../observability/logging';
import { metrics } from '../../../../observability/metrics';
import { gitHubWebhookEventSchema } from '../../../../lib/contracts/github-webhook';

export const runtime = 'nodejs';

const WEBHOOK_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 100,
};

const GITHUB_WEBHOOK_PROVIDER = 'github';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, handler: 'webhook-github' });

  try {
    const signature = request.headers.get('x-hub-signature-256') || '';
    const eventType = request.headers.get('x-github-event') || '';
    const installationId = request.headers.get('x-github-installation-id') || '';
    const timestamp = request.headers.get('x-hub-signature-256-timestamp') || '';
    const nonce = request.headers.get('x-hub-signature-256-nonce') || '';

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

    const rateLimitResult = await checkRateLimit(
      `webhook:${installationId}`,
      WEBHOOK_RATE_LIMIT
    );

    if (!rateLimitResult.allowed) {
      metrics.increment('webhooks.rate_limited', { provider: GITHUB_WEBHOOK_PROVIDER });
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many webhook requests. Please try again later.',
            resetAt: new Date(rateLimitResult.resetAt).toISOString(),
          },
        },
        { status: 429 }
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

    const parsed = gitHubWebhookEventSchema.safeParse(event);
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

    if (timestamp && nonce) {
      try {
        const ts = validateWebhookTimestamp(timestamp);
        const validatedNonce = validateWebhookNonce(nonce);

        const isReplay = await webhookReplayProtection.isReplay(
          GITHUB_WEBHOOK_PROVIDER,
          signature,
          ts,
          validatedNonce
        );

        if (isReplay) {
          log.warn({ eventType, installationId }, 'Webhook replay detected');
          metrics.increment('webhooks.replay_detected', { provider: GITHUB_WEBHOOK_PROVIDER });
          return NextResponse.json(
            {
              error: {
                code: 'REPLAY_DETECTED',
                message: 'Webhook request is a replay of a previously seen request',
              },
            },
            { status: 400 }
          );
        }
      } catch {
        log.warn({}, 'Failed to validate timestamp/nonce, proceeding with signature-only validation');
      }
    }

    const eventData = parsed.data as GitHubWebhookEvent;

    log.info({
      eventType,
      installationId,
      action: eventData.action,
    }, 'Received GitHub webhook');

    await githubWebhookHandler.handleEvent(eventData, installationId, signature, payload);

    metrics.increment('webhooks.received', { provider: GITHUB_WEBHOOK_PROVIDER, event: eventType });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error(error, 'Webhook handling failed');
    metrics.increment('webhooks.failed', { provider: GITHUB_WEBHOOK_PROVIDER });

    if (error instanceof Error) {
      if (error.message.includes('Invalid webhook signature')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Webhook signature validation failed',
            },
          },
          { status: 401 }
        );
      }

      if (error.message.includes('Installation not found')) {
        return NextResponse.json(
          {
            error: {
              code: 'INSTALLATION_NOT_FOUND',
              message: 'GitHub App installation not found',
            },
          },
          { status: 404 }
        );
      }
    }

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
