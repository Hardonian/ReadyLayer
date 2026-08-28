/**
 * Slack Events Handler
 *
 * Processes Slack events (messages, reactions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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

/**
 * POST /integrations/slack/events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.json() as Record<string, unknown>;
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
  const command = text?.toLowerCase().split(/\s+/)[1];

  switch (command) {
    case 'status':
      await sendStatus(channel, teamId);
      break;
    case 'help':
      await sendHelp(channel, teamId);
      break;
    default:
      await sendUnknownCommand(channel, teamId);
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
async function sendStatus(_channel: string, _teamId: string): Promise<void> {
  // TODO: Fetch ReadyLayer status and send to Slack
  logger.info('Sending status message to Slack');
}

/**
 * Send help message
 */
async function sendHelp(_channel: string, _teamId: string): Promise<void> {
  // TODO: Send help text to Slack
  logger.info('Sending help message to Slack');
}

/**
 * Send unknown command message
 */
async function sendUnknownCommand(_channel: string, _teamId: string): Promise<void> {
  // TODO: Send error message to Slack
  logger.info('Sending unknown command message to Slack');
}
