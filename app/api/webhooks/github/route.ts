import { NextRequest, NextResponse } from 'next/server';
import { githubWebhookHandler, GitHubWebhookEvent } from '../../../../integrations/github/webhook';
import { logger } from '../../../../observability/logging';
import { metrics } from '../../../../observability/metrics';
import { UsageLimitExceededError } from '../../../../lib/usage-enforcement';
import { z } from 'zod';

// Webhook routes must use Node runtime for signature verification and raw body access
export const runtime = 'nodejs';

export const GitHubWebhookEventSchema = z.object({
  action: z.string(),
  repository: z
    .object({
      id: z.number().optional(),
      full_name: z.string(),
    })
    .optional(),
  pull_request: z
    .object({
      number: z.number(),
      title: z.string(),
      head: z.object({
        sha: z.string(),
        ref: z.string(),
      }),
      base: z.object({
        ref: z.string(),
      }),
      merged: z.boolean().optional(),
      merge_commit_sha: z.string().nullable().optional(),
    })
    .optional(),
  check_run: z.unknown().optional(),
  workflow_run: z.unknown().optional(),
  installation: z
    .object({
      id: z.number(),
    })
    .optional(),
}).passthrough();

/**
 * POST /api/webhooks/github
 * Handle GitHub webhooks
 * Requires Node runtime for signature verification
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const parsed = GitHubWebhookEventSchema.safeParse(event);
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
    const eventData = parsed.data as GitHubWebhookEvent;

    log.info({
      eventType,
      installationId,
      action: eventData.action,
    }, 'Received GitHub webhook');

    // Handle event (pass raw payload for signature verification)
    await githubWebhookHandler.handleEvent(eventData, installationId, signature, payload);

    metrics.increment('webhooks.received', { provider: 'github', event: eventType });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error(error, 'Webhook handling failed');
    metrics.increment('webhooks.failed', { provider: 'github' });

    // Handle usage limit errors with proper status codes
    if (error instanceof UsageLimitExceededError) {
      return NextResponse.json(
        {
          error: {
            code: 'USAGE_LIMIT_EXCEEDED',
            message: error.message,
            limitType: error.limitType,
            current: error.current,
            limit: error.limit,
            remaining: error.limit - error.current,
          },
        },
        { status: error.httpStatus }
      );
    }

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
