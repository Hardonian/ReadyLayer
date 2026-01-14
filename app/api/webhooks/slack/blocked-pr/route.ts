/**
 * Slack Blocked PR Notification Webhook
 * 
 * Sends blocked PR notifications to Slack channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export const dynamic = 'force-dynamic';

export interface BlockedPRNotification {
  prNumber: number;
  prTitle: string;
  repositoryName: string;
  author: string;
  issueCount: number;
  criticalCount: number;
  highCount: number;
  slackChannelId: string;
  issues: Array<{
    severity: 'critical' | 'high' | 'medium';
    rule: string;
    message: string;
    file?: string;
  }>;
}

/**
 * POST /api/webhooks/slack/blocked-pr
 */
export async function POST(request: NextRequest) {
  try {
    const notification: BlockedPRNotification = await request.json();

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

    // TODO: Send to Slack using webhook or API
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
function buildBlockedPRMessage(notification: BlockedPRNotification): any {
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
async function sendToSlack(channelId: string, message: any): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
        },
        'Failed to send message to Slack'
      );
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error sending to Slack'
    );
  }
}
