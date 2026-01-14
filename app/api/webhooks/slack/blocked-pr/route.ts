import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface BlockedPRNotification {
  organizationId: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  repositoryName: string;
  reason: string;
  violations: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;
  reviewUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BlockedPRNotification = await request.json();

    // Validate request
    if (!body.organizationId || !body.prNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get organization's Slack webhook configuration
    const { data: config } = await supabase
      .from('notification_configs')
      .select('slack_webhook_url, slack_enabled')
      .eq('organization_id', body.organizationId)
      .single();

    if (!config?.slack_enabled || !config?.slack_webhook_url) {
      return NextResponse.json(
        { error: 'Slack notifications not configured' },
        { status: 400 }
      );
    }

    // Prepare Slack message
    const violationText = body.violations
      .map(
        (v) =>
          `• ${v.type} (${v.severity.toUpperCase()}): ${v.description}`
      )
      .join('\n');

    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚫 PR Requires Review',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Repository:*\n${body.repositoryName}`,
            },
            {
              type: 'mrkdwn',
              text: `*PR:*\n#${body.prNumber}`,
            },
            {
              type: 'mrkdwn',
              text: `*Author:*\n${body.prAuthor}`,
            },
            {
              type: 'mrkdwn',
              text: `*Severity:*\nBlocking`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Title:* ${body.prTitle}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Reason:*\n${body.reason}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Violations Found:*\n${violationText}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Review Details',
                emoji: true,
              },
              value: body.prNumber.toString(),
              url: body.reviewUrl,
              style: 'danger',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Dashboard',
                emoji: true,
              },
              url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://readylayer.io'}/dashboard/prs`,
            },
          ],
        },
      ],
    };

    // Send to Slack webhook
    const slackResponse = await fetch(config.slack_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    if (!slackResponse.ok) {
      const error = await slackResponse.text();
      console.error('Slack webhook error:', error);
      return NextResponse.json(
        { error: 'Failed to send Slack notification' },
        { status: 500 }
      );
    }

    // Log notification in database
    await supabase.from('notification_logs').insert({
      organization_id: body.organizationId,
      type: 'blocked-pr',
      channel: 'slack',
      pr_number: body.prNumber,
      repository_name: body.repositoryName,
      status: 'sent',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, sent: true });
  } catch (error) {
    console.error('Blocked PR notification error:', error);
    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({ ok: true, service: 'slack-blocked-pr-webhook' });
}
