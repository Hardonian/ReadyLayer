/**
 * Slack Blocked PR Notification Webhook
 *
 * Sends blocked PR notifications to Slack channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const BlockedPRNotificationSchema = z.object({
  prNumber: z.number(),
  prTitle: z.string(),
  repositoryName: z.string(),
  author: z.string(),
  issueCount: z.number(),
  criticalCount: z.number(),
  highCount: z.number(),
  slackChannelId: z.string(),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'high', 'medium']),
      rule: z.string(),
      message: z.string(),
      file: z.string().optional(),
    })
  ),
});

type BlockedPRNotification = z.infer<typeof BlockedPRNotificationSchema>;

interface SlackMessage {
  channel?: string;
  attachments: Array<{
    color: 'danger' | 'warning';
    title: string;
    title_link: string;
    fields: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
    actions: Array<{
      type: 'button';
      text: string;
      url: string;
    }>;
    footer: string;
    ts: number;
  }>;
}

/**
 * POST /api/webhooks/slack/blocked-pr
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = process.env.SLACK_BLOCKED_PR_WEBHOOK_TOKEN;
    if (token) {
      const providedToken = request.headers.get('x-readylayer-webhook-token');
      if (!providedToken || providedToken !== token) {
        logger.warn('Blocked PR Slack webhook unauthorized');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = await request.json() as unknown;
    const parsed = BlockedPRNotificationSchema.safeParse(payload);
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, 'Invalid blocked PR Slack payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const notification = parsed.data;

    logger.info(
      {
        prNumber: notification.prNumber,
        repository: notification.repositoryName,
        issueCount: notification.issueCount,
      },
      'Processing blocked PR Slack notification'
    );

    metrics.increment('slack_blocked_pr_webhook', {
      severity: notification.criticalCount > 0 ? 'critical' : 'high',
    });

    // Build Slack message
    const slackMessage = buildBlockedPRMessage(notification);
    await sendToSlack(notification.slackChannelId, slackMessage);

    logger.info(
      {
        prNumber: notification.prNumber,
      },
      'Blocked PR notification sent to Slack'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error processing blocked PR Slack notification'
    );

    metrics.increment('slack_blocked_pr_webhook_error');

    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

/**
 * Build Slack message for blocked PR
 */
function buildBlockedPRMessage(notification: BlockedPRNotification): SlackMessage {
  const color = notification.criticalCount > 0 ? 'danger' : 'warning';
  const severity =
    notification.criticalCount > 0
      ? `🔴 ${notification.criticalCount} Critical Issues`
      : `🟠 ${notification.highCount} High Priority Issues`;

  return {
    attachments: [
      {
        color,
        title: `PR #${notification.prNumber} Blocked - ${notification.prTitle}`,
        title_link: `https://github.com/${notification.repositoryName}/pull/${notification.prNumber}`,
        fields: [
          {
            title: 'Repository',
            value: notification.repositoryName,
            short: true,
          },
          {
            title: 'Author',
            value: notification.author,
            short: true,
          },
          {
            title: 'Severity',
            value: severity,
            short: true,
          },
          {
            title: 'Total Issues',
            value: notification.issueCount.toString(),
            short: true,
          },
          {
            title: 'Top Issues',
            value: notification.issues
              .slice(0, 3)
              .map(i => `• ${i.severity.toUpperCase()}: ${i.message}`)
              .join('\n'),
            short: false,
          },
        ],
        actions: [
          {
            type: 'button',
            text: 'View PR',
            url: `https://github.com/${notification.repositoryName}/pull/${notification.prNumber}`,
          },
          {
            type: 'button',
            text: 'View Findings',
            url: `https://readylayer.io/dashboard/prs/${notification.prNumber}`,
          },
        ],
        footer: 'ReadyLayer',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

/**
 * Send message to Slack
 */
async function sendToSlack(channelId: string, message: SlackMessage): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const payload: SlackMessage = channelId
      ? { ...message, channel: channelId }
      : message;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed with status ${response.status}`);
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error sending to Slack'
    );
    throw error;
  }
}
