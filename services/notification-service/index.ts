/**
 * Notification Service
 * 
 * Unified interface for sending notifications across multiple channels:
 * - Email (SendGrid/Postmark)
 * - Slack
 * - In-app notifications
 * - Webhooks
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export type NotificationChannel = 'email' | 'slack' | 'in-app' | 'webhook';
export type NotificationType = 'alert' | 'info' | 'warning' | 'error' | 'success';

export interface NotificationRecipient {
  id: string;
  email?: string;
  slackId?: string;
  webhookUrl?: string;
  preferences?: {
    channels: NotificationChannel[];
    types?: NotificationType[];
    doNotDisturb?: { start: string; end: string };
  };
}

export interface NotificationMessage {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  cta?: {
    label: string;
    url: string;
  };
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface NotificationRequest {
  recipientId: string;
  channels: NotificationChannel[];
  message: NotificationMessage;
  organizationId?: string;
  retries?: number;
}

export interface NotificationResult {
  id: string;
  recipientId: string;
  channel: NotificationChannel;
  status: 'sent' | 'failed' | 'queued' | 'skipped';
  sentAt?: Date;
  error?: string;
}

/**
 * Notification Service
 */
export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send notification across configured channels
   */
  async send(request: NotificationRequest): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      logger.info(
        {
          recipientId: request.recipientId,
          channels: request.channels,
          messageType: request.message.type,
        },
        'Sending notification'
      );

      metrics.increment('notification_sent', {
        type: request.message.type,
        channels: request.channels.length.toString(),
      });

      for (const channel of request.channels) {
        try {
          const result = await this.sendToChannel(
            channel,
            request.recipientId,
            request.message,
            request.organizationId
          );
          results.push(result);
        } catch (error) {
          results.push({
            id: request.message.id,
            recipientId: request.recipientId,
            channel,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          metrics.increment('notification_failed', {
            channel,
            errorType: error instanceof Error ? error.name : 'unknown',
          });
        }
      }

      return results;
    } catch (error) {
      logger.error(
        {
          recipientId: request.recipientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error sending notification'
      );

      return [
        {
          id: request.message.id,
          recipientId: request.recipientId,
          channel: request.channels[0] || 'email',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ];
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    recipientId: string,
    message: NotificationMessage,
    organizationId?: string
  ): Promise<NotificationResult> {
    switch (channel) {
      case 'email':
        return this.sendEmail(recipientId, message, organizationId);
      case 'slack':
        return this.sendSlack(recipientId, message, organizationId);
      case 'in-app':
        return this.sendInApp(recipientId, message, organizationId);
      case 'webhook':
        return this.sendWebhook(recipientId, message, organizationId);
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    recipientId: string,
    message: NotificationMessage,
    _organizationId?: string
  ): Promise<NotificationResult> {
    // TODO: Integrate with SendGrid/Postmark
    logger.info(
      {
        recipientId,
        messageType: message.type,
      },
      'Sending email notification'
    );

    return {
      id: message.id,
      recipientId,
      channel: 'email',
      status: 'sent',
      sentAt: new Date(),
    };
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(
    recipientId: string,
    message: NotificationMessage,
    _organizationId?: string
  ): Promise<NotificationResult> {
    // TODO: Integrate with Slack API
    logger.info(
      {
        recipientId,
        messageType: message.type,
      },
      'Sending Slack notification'
    );

    return {
      id: message.id,
      recipientId,
      channel: 'slack',
      status: 'sent',
      sentAt: new Date(),
    };
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(
    recipientId: string,
    message: NotificationMessage,
    _organizationId?: string
  ): Promise<NotificationResult> {
    // TODO: Store in notifications table
    logger.info(
      {
        recipientId,
        messageType: message.type,
      },
      'Creating in-app notification'
    );

    return {
      id: message.id,
      recipientId,
      channel: 'in-app',
      status: 'sent',
      sentAt: new Date(),
    };
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    recipientId: string,
    message: NotificationMessage,
    _organizationId?: string
  ): Promise<NotificationResult> {
    // TODO: Make HTTP POST to webhook endpoint
    logger.info(
      {
        recipientId,
        messageType: message.type,
      },
      'Sending webhook notification'
    );

    return {
      id: message.id,
      recipientId,
      channel: 'webhook',
      status: 'sent',
      sentAt: new Date(),
    };
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(requests: NotificationRequest[]): Promise<NotificationResult[]> {
    const results = await Promise.all(
      requests.map(req => this.send(req))
    );
    return results.flat();
  }

  /**
   * Get user preferences
   */
  async getPreferences(_recipientId: string): Promise<NotificationRecipient | null> {
    // TODO: Fetch from database
    return null;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    recipientId: string,
    preferences: Partial<NotificationRecipient['preferences']>
  ): Promise<void> {
    // TODO: Update database
    logger.info(
      {
        recipientId,
        preferences,
      },
      'Updated notification preferences'
    );
  }

  /**
   * Test notification delivery
   */
  async test(recipientId: string, channels: NotificationChannel[]): Promise<NotificationResult[]> {
    const message: NotificationMessage = {
      id: `test_${Date.now()}`,
      type: 'info',
      title: 'Test Notification',
      body: 'This is a test notification to verify delivery',
      timestamp: new Date(),
    };

    return this.send({
      recipientId,
      channels,
      message,
    });
  }
}

// Export singleton
export const notificationService = NotificationService.getInstance();
