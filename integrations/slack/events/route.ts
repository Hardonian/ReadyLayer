/**
 * Slack Events Handler
 * 
 * Processes Slack events (messages, reactions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const SlackEventDataSchema = z.object({
  type: z.string(),
  user: z.string().optional(),
  channel: z.string().optional(),
  text: z.string().optional(),
  reaction: z.string().optional(),
  bot_id: z.string().optional(),
});

export const SlackEventPayloadSchema = z.object({
  type: z.enum(['url_verification', 'event_callback']),
  challenge: z.string().optional(),
  team_id: z.string().optional(),
  event: SlackEventDataSchema.optional(),
}).passthrough();

type SlackEventData = z.infer<typeof SlackEventDataSchema>;

const SLACK_SIGNATURE_MAX_AGE_SECONDS = 60 * 5;

export function verifySlackSignature(
  payload: string,
  timestamp: string | null,
  signature: string | null,
  signingSecret: string,
  nowMs: number = Date.now()
): boolean {
  if (!timestamp || !signature || !signingSecret || !/^v0=[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const issuedAt = Number(timestamp);
  if (!Number.isSafeInteger(issuedAt) || Math.abs(Math.floor(nowMs / 1000) - issuedAt) > SLACK_SIGNATURE_MAX_AGE_SECONDS) {
    return false;
  }

  const expected = `v0=${createHmac('sha256', signingSecret).update(`v0:${timestamp}:${payload}`).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

/**
 * POST /integrations/slack/events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      logger.error('Slack events received without SLACK_SIGNING_SECRET configured');
      return NextResponse.json({ error: 'Slack integration is not configured' }, { status: 503 });
    }

    const payloadText = await request.text();
    if (!verifySlackSignature(
      payloadText,
      request.headers.get('x-slack-request-timestamp'),
      request.headers.get('x-slack-signature'),
      signingSecret
    )) {
      metrics.increment('slack_event_signature_rejected');
      return NextResponse.json({ error: 'Invalid Slack signature' }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    const parsed = SlackEventPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, 'Invalid Slack event payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const data = parsed.data;

    // Handle URL verification challenge
    if (data.type === 'url_verification') {
      logger.info('Slack URL verification challenge');
      return NextResponse.json({
        challenge: data.challenge,
      });
    }

    // Handle events
    if (data.type === 'event_callback') {
      const event = data.event;
      if (!event) {
        return NextResponse.json({ error: 'Missing event data' }, { status: 400 });
      }

      logger.info(
        {
          eventType: event.type,
          userId: event.user,
          channel: event.channel,
        },
        'Slack event received'
      );

      metrics.increment('slack_event_received', {
        eventType: event.type,
      });

      // Handle app mention
      if (event.type === 'app_mention') {
        await handleAppMention(event, data.team_id);
      }

      // Handle message
      if (event.type === 'message' && !event.bot_id) {
        await handleMessage(event, data.team_id);
      }

      // Handle reaction
      if (event.type === 'reaction_added') {
        await handleReaction(event, data.team_id);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Slack events route error'
    );

    metrics.increment('slack_event_error');

    return NextResponse.json(
      { error: 'Failed to process Slack event' },
      { status: 500 }
    );
  }
}

/**
 * Handle app mention events
 */
async function handleAppMention(event: SlackEventData, teamId?: string): Promise<void> {
  if (!teamId) {
    logger.warn('Missing Slack team ID for app mention');
    return;
  }
  const { user, channel, text } = event;

  if (!channel) {
    logger.warn('Missing channel for app mention');
    return;
  }

  logger.info(
    {
      userId: user,
      channel,
      teamId,
    },
    'Handling app mention'
  );

  metrics.increment('slack_app_mention');

  // Parse command from text
  const command = text
    ?.replace(/<@[^>]+>/g, '')
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase();

  switch (command) {
    case 'status':
      await sendStatus(channel);
      break;
    case 'help':
      await sendHelp(channel);
      break;
    default:
      await sendUnknownCommand(channel);
  }
}

/**
 * Handle message events
 */
async function handleMessage(event: SlackEventData, teamId?: string): Promise<void> {
  if (!teamId) {
    logger.warn('Missing Slack team ID for message event');
    return;
  }
  logger.info(
    {
      channel: event.channel,
      teamId,
    },
    'Handling message event'
  );

  metrics.increment('slack_message_event');
}

/**
 * Handle reaction events
 */
async function handleReaction(event: SlackEventData, teamId?: string): Promise<void> {
  if (!teamId) {
    logger.warn('Missing Slack team ID for reaction event');
    return;
  }
  logger.info(
    {
      reaction: event.reaction,
      teamId,
    },
    'Handling reaction event'
  );

  if (event.reaction) {
    metrics.increment('slack_reaction_event', {
      reaction: event.reaction,
    });
  }
}

/**
 * Send status message
 */
async function sendStatus(channel: string): Promise<void> {
  const dependencies = [
    `database: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}`,
    `queue: ${process.env.REDIS_URL ? 'configured' : 'database fallback'}`,
    `LLM: ${hasConfiguredLLMProvider() ? 'configured' : 'not configured'}`,
  ];
  await postSlackMessage(channel, `ReadyLayer is online. ${dependencies.join(' | ')}`);
  metrics.increment('slack_command_completed', { command: 'status' });
}

/**
 * Send help message
 */
async function sendHelp(channel: string): Promise<void> {
  await postSlackMessage(channel, 'ReadyLayer commands: `@ReadyLayer status` shows service configuration. `@ReadyLayer help` shows this message.');
  metrics.increment('slack_command_completed', { command: 'help' });
}

/**
 * Send unknown command message
 */
async function sendUnknownCommand(channel: string): Promise<void> {
  await postSlackMessage(channel, 'Unknown ReadyLayer command. Use `@ReadyLayer help`.');
  metrics.increment('slack_command_completed', { command: 'unknown' });
}

async function postSlackMessage(channel: string, text: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not configured');
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, text, unfurl_links: false, unfurl_media: false }),
  });
  if (!response.ok) {
    throw new Error(`Slack chat.postMessage returned HTTP ${response.status}`);
  }

  const body = await response.json() as { ok?: unknown; error?: unknown };
  if (body.ok !== true) {
    throw new Error(`Slack chat.postMessage failed: ${typeof body.error === 'string' ? body.error : 'unknown error'}`);
  }
}

function hasConfiguredLLMProvider(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENCODE_API_KEY);
}
