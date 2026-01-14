/**
 * Slack Events Handler
 * 
 * Processes Slack events (messages, reactions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export const dynamic = 'force-dynamic';

/**
 * POST /integrations/slack/events
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      logger.info('Slack URL verification challenge');
      return NextResponse.json({
        challenge: payload.challenge,
      });
    }

    // Handle events
    if (payload.type === 'event_callback') {
      const event = payload.event;

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
        await handleAppMention(event, payload.team_id);
      }

      // Handle message
      if (event.type === 'message' && !event.bot_id) {
        await handleMessage(event, payload.team_id);
      }

      // Handle reaction
      if (event.type === 'reaction_added') {
        await handleReaction(event, payload.team_id);
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
async function handleAppMention(event: any, teamId: string): Promise<void> {
  const { user, channel, text } = event;

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
  const command = text.toLowerCase().split(/\s+/)[1];

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
async function handleMessage(event: any, teamId: string): Promise<void> {
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
async function handleReaction(event: any, teamId: string): Promise<void> {
  logger.info(
    {
      reaction: event.reaction,
      teamId,
    },
    'Handling reaction event'
  );

  metrics.increment('slack_reaction_event', {
    reaction: event.reaction,
  });
}

/**
 * Send status message
 */
async function sendStatus(channel: string, teamId: string): Promise<void> {
  // TODO: Fetch ReadyLayer status and send to Slack
  logger.info('Sending status message to Slack');
}

/**
 * Send help message
 */
async function sendHelp(channel: string, teamId: string): Promise<void> {
  // TODO: Send help text to Slack
  logger.info('Sending help message to Slack');
}

/**
 * Send unknown command message
 */
async function sendUnknownCommand(channel: string, teamId: string): Promise<void> {
  // TODO: Send error message to Slack
  logger.info('Sending unknown command message to Slack');
}
