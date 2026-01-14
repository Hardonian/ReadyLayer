import { createClient } from '@/lib/supabase/server';

export type NotificationChannel = 'slack' | 'email' | 'in-app';

export interface NotificationPayload {
  organizationId: string;
  type: 'blocked-pr' | 'policy-violation' | 'invitation' | 'alert' | 'milestone';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  recipients?: string[];
  channels?: NotificationChannel[];
  priority?: 'low' | 'normal' | 'high';
}

export interface NotificationResult {
  success: boolean;
  channels: {
    [key in NotificationChannel]?: {
      sent: boolean;
      messageId?: string;
      error?: string;
    };
  };
}

class NotificationService {
  async sendNotification(
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      success: false,
      channels: {},
    };

    const channels = payload.channels || ['in-app', 'email'];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'slack':
            result.channels.slack = await this.sendSlackNotification(payload);
            break;
          case 'email':
            result.channels.email = await this.sendEmailNotification(payload);
            break;
          case 'in-app':
            result.channels['in-app'] = await this.sendInAppNotification(
              payload
            );
            break;
        }
      } catch (error) {
        result.channels[channel] = {
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    result.success = Object.values(result.channels).some((c) => c.sent);
    return result;
  }

  private async sendSlackNotification(
    payload: NotificationPayload
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    try {
      // Get organization's Slack webhook URL
      const supabase = createClient();
      const { data: config } = await supabase
        .from('notification_configs')
        .select('slack_webhook_url')
        .eq('organization_id', payload.organizationId)
        .single();

      if (!config?.slack_webhook_url) {
        return { sent: false, error: 'Slack webhook not configured' };
      }

      const color = {
        'blocked-pr': '#FF6B6B',
        'policy-violation': '#FF6B6B',
        invitation: '#4ECDC4',
        alert: '#FFE66D',
        milestone: '#95E1D3',
      }[payload.type];

      const response = await fetch(config.slack_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [
            {
              color,
              title: payload.title,
              text: payload.message,
              fields: Object.entries(payload.metadata || {}).map(
                ([key, value]) => ({
                  title: key,
                  value: String(value),
                  short: true,
                })
              ),
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      return { sent: true };
    } catch (error) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Failed to send Slack',
      };
    }
  }

  private async sendEmailNotification(
    payload: NotificationPayload
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    try {
      const supabase = createClient();

      // Get organization's email config
      const { data: config } = await supabase
        .from('notification_configs')
        .select('email_enabled, email_provider')
        .eq('organization_id', payload.organizationId)
        .single();

      if (!config?.email_enabled) {
        return { sent: false, error: 'Email notifications disabled' };
      }

      // Send email using configured provider
      const response = await fetch('/api/v1/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: payload.organizationId,
          recipients: payload.recipients || [],
          subject: payload.title,
          message: payload.message,
          type: payload.type,
          metadata: payload.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { sent: true, messageId: data.messageId };
    } catch (error) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  private async sendInAppNotification(
    payload: NotificationPayload
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    try {
      const supabase = createClient();

      // Store notification in database
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          organization_id: payload.organizationId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          metadata: payload.metadata,
          priority: payload.priority || 'normal',
          created_at: new Date().toISOString(),
          read: false,
        })
        .select()
        .single();

      if (error) throw error;

      return { sent: true, messageId: data.id };
    } catch (error) {
      return {
        sent: false,
        error:
          error instanceof Error ? error.message : 'Failed to store notification',
      };
    }
  }

  async getNotifications(
    organizationId: string,
    limit: number = 20,
    offset: number = 0
  ) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  async markAsRead(notificationId: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  async deleteNotification(notificationId: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }
}

export const notificationService = new NotificationService();
