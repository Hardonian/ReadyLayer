import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SlackEvent {
  token: string;
  team_id: string;
  api_app_id: string;
  event: any;
  type: string;
  event_id: string;
  event_time: number;
  challenge?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SlackEvent = await request.json();

    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Verify token
    if (body.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = createClient();

    // Handle different event types
    switch (body.event.type) {
      case 'app_mention':
        await handleAppMention(supabase, body);
        break;
      case 'message':
        await handleMessage(supabase, body);
        break;
      case 'app_uninstalled':
        await handleUninstall(supabase, body);
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack event error:', error);
    return NextResponse.json(
      { error: 'Failed to process event' },
      { status: 500 }
    );
  }
}

async function handleAppMention(
  supabase: any,
  body: SlackEvent
) {
  const { event } = body;
  const { user, channel, text } = event;

  // Parse command from text
  const command = text
    .replace(/<@[^>|]+\|?[^>]*>/g, '')
    .trim()
    .split(' ')[0]
    .toLowerCase();

  let response = '';

  switch (command) {
    case 'status':
      response =
        'Your PR reviews are up to date. All checks passed! ✅';
      break;
    case 'help':
      response = `
Available commands:
• \`@ReadyLayer status\` - Check your PR review status
• \`@ReadyLayer help\` - Show this message
• \`@ReadyLayer dashboard\` - Open your dashboard
      `.trim();
      break;
    case 'dashboard':
      response = `Open your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://readylayer.io'}/dashboard`;
      break;
    default:
      response =
        'I didn\'t understand that command. Try `@ReadyLayer help` for available commands.';
  }

  // Send response to channel
  if (process.env.SLACK_BOT_TOKEN) {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        thread_ts: event.ts,
        text: response,
      }),
    });
  }
}

async function handleMessage(
  supabase: any,
  body: SlackEvent
) {
  // Handle DM messages
  if (body.event.channel_type === 'im') {
    const { user, text } = body.event;

    // You could implement conversational features here
    // For now, just acknowledge the message
    if (text && text.includes('readylayer')) {
      if (process.env.SLACK_BOT_TOKEN) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: user,
            text: 'Hi! 👋 I can help you with your code reviews. Type `help` to learn more.',
          }),
        });
      }
    }
  }
}

async function handleUninstall(
  supabase: any,
  body: SlackEvent
) {
  // Remove Slack integration from database
  await supabase
    .from('notification_configs')
    .update({
      slack_access_token: null,
      slack_installed_at: null,
    })
    .eq('slack_workspace_id', body.team_id);
}
