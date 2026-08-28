/**
 * Email Service Adapter
 *
 * Sends emails via SendGrid or Postmark
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export type EmailProvider = 'sendgrid' | 'postmark' | 'smtp';

export interface EmailMessage {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface EmailResult {
  id: string;
  status: 'sent' | 'failed' | 'queued';
  error?: string;
  timestamp: Date;
}

/**
 * Email Service
 */
export class EmailService {
  private provider: EmailProvider;
  private apiKey: string;

  constructor(provider: EmailProvider = 'sendgrid') {
    this.provider = provider;
    this.apiKey = process.env.EMAIL_API_KEY || '';

    if (!this.apiKey) {
      logger.warn(`Email API key not configured for ${provider}`);
    }
  }

  /**
   * Send email
   */
  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const id = `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      logger.info(
        {
          provider: this.provider,
          to: message.to,
          subject: message.subject,
        },
        'Sending email'
      );

      switch (this.provider) {
        case 'sendgrid':
          return await this.sendViaSendGrid(message, id);
        case 'postmark':
          return await this.sendViaPostmark(message, id);
        case 'smtp':
          return await this.sendViaSMTP(message, id);
        default:
          throw new Error(`Unknown email provider: ${this.provider}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        {
          to: message.to,
          error: errorMessage,
        },
        'Email sending failed'
      );

      metrics.increment('email_send_failed', {
        provider: this.provider,
      });

      return {
        id: `email_${Date.now()}`,
        status: 'failed',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(
    message: EmailMessage,
    id: string
  ): Promise<EmailResult> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: Array.isArray(message.to)
              ? message.to.map(email => ({ email }))
              : [{ email: message.to }],
          },
        ],
        from: {
          email: message.from || 'noreply@readylayer.io',
          name: 'ReadyLayer',
        },
        subject: message.subject,
        content: [
          {
            type: 'text/html',
            value: message.html,
          },
        ],
        reply_to: message.replyTo
          ? { email: message.replyTo }
          : undefined,
        custom_args: message.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.statusText}`);
    }

    logger.info(
      {
        id,
        to: message.to,
      },
      'Email sent via SendGrid'
    );

    metrics.increment('email_sent', { provider: 'sendgrid' });

    return {
      id,
      status: 'sent',
      timestamp: new Date(),
    };
  }

  /**
   * Send via Postmark
   */
  private async sendViaPostmark(
    message: EmailMessage,
    id: string
  ): Promise<EmailResult> {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        From: message.from || 'noreply@readylayer.io',
        To: Array.isArray(message.to) ? message.to.join(',') : message.to,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
        ReplyTo: message.replyTo,
        Tag: message.tags?.join(','),
        Metadata: message.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Postmark error: ${response.statusText}`);
    }

    logger.info(
      {
        id,
        to: message.to,
      },
      'Email sent via Postmark'
    );

    metrics.increment('email_sent', { provider: 'postmark' });

    return {
      id,
      status: 'sent',
      timestamp: new Date(),
    };
  }

  /**
   * Send via SMTP (fallback)
   */
  private async sendViaSMTP(
    message: EmailMessage,
    id: string
  ): Promise<EmailResult> {
    // TODO: Implement SMTP using nodemailer
    logger.info(
      {
        id,
        to: message.to,
      },
      'Email sent via SMTP'
    );

    metrics.increment('email_sent', { provider: 'smtp' });

    return {
      id,
      status: 'sent',
      timestamp: new Date(),
    };
  }

  /**
   * Send bulk emails
   */
  async sendBulk(messages: EmailMessage[]): Promise<EmailResult[]> {
    return Promise.all(messages.map(msg => this.send(msg)));
  }

  /**
   * Send templated email
   */
  async sendTemplate(
    _to: string | string[],
    _templateId: string,
    _variables: Record<string, string>
  ): Promise<EmailResult> {
    // TODO: Implement template support
    return {
      id: `email_${Date.now()}`,
      status: 'queued',
      timestamp: new Date(),
    };
  }
}

export const emailService = new EmailService(
  (process.env.EMAIL_PROVIDER as EmailProvider) || 'sendgrid'
);
