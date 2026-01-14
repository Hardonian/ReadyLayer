export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}

export interface EmailTemplate {
  type:
    | 'blocked-pr'
    | 'policy-violation'
    | 'invitation'
    | 'welcome'
    | 'alert';
  subject: string;
  body: string;
}

class EmailService {
  private provider: string;
  private apiKey: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'sendgrid';
    this.apiKey = process.env.EMAIL_API_KEY || '';
  }

  async send(options: EmailOptions): Promise<{ messageId: string }> {
    if (!this.apiKey) {
      throw new Error('Email API key not configured');
    }

    switch (this.provider) {
      case 'sendgrid':
        return this.sendViaSendGrid(options);
      case 'postmark':
        return this.sendViaPostmark(options);
      case 'resend':
        return this.sendViaResend(options);
      default:
        throw new Error(`Unknown email provider: ${this.provider}`);
    }
  }

  private async sendViaResend(
    options: EmailOptions
  ): Promise<{ messageId: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || 'ReadyLayer <noreply@readylayer.io>',
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Resend error: ${error.message || response.statusText}`
        );
      }

      const data = await response.json();
      return { messageId: data.id };
    } catch (error) {
      throw new Error(
        `Failed to send email via Resend: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async sendViaSendGrid(
    options: EmailOptions
  ): Promise<{ messageId: string }> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: Array.isArray(options.to)
                ? options.to.map((email) => ({ email }))
                : [{ email: options.to }],
              subject: options.subject,
            },
          ],
          from: {
            email: options.from || 'noreply@readylayer.io',
            name: 'ReadyLayer',
          },
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
            {
              type: 'text/plain',
              value: options.text || options.html.replace(/<[^>]*>/g, ''),
            },
          ],
          reply_to: options.replyTo
            ? { email: options.replyTo }
            : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid error: ${error || response.statusText}`);
      }

      const messageId =
        response.headers.get('x-message-id') ||
        `sendgrid-${Date.now()}`;
      return { messageId };
    } catch (error) {
      throw new Error(
        `Failed to send email via SendGrid: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async sendViaPostmark(
    options: EmailOptions
  ): Promise<{ messageId: string }> {
    try {
      const response = await fetch(
        'https://api.postmarkapp.com/email',
        {
          method: 'POST',
          headers: {
            'X-Postmark-Server-Token': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            From: options.from || 'noreply@readylayer.io',
            To: Array.isArray(options.to) ? options.to.join(', ') : options.to,
            Subject: options.subject,
            HtmlBody: options.html,
            TextBody: options.text,
            ReplyTo: options.replyTo,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Postmark error: ${error.Message || response.statusText}`
        );
      }

      const data = await response.json();
      return { messageId: data.MessageID };
    } catch (error) {
      throw new Error(
        `Failed to send email via Postmark: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  sendWelcomeEmail(email: string, name: string): Promise<{ messageId: string }> {
    return this.send({
      to: email,
      subject: 'Welcome to ReadyLayer',
      html: `
        <h1>Welcome to ReadyLayer, ${name}!</h1>
        <p>We're excited to have you on board.</p>
        <p><a href="https://readylayer.io/dashboard">Get started with your first review</a></p>
      `,
      text: `Welcome to ReadyLayer, ${name}! Get started at https://readylayer.io/dashboard`,
    });
  }

  sendBlockedPRNotification(
    email: string,
    prTitle: string,
    reason: string,
    learnMoreUrl: string
  ): Promise<{ messageId: string }> {
    return this.send({
      to: email,
      subject: `Code Review Required: ${prTitle}`,
      html: `
        <h2>Pull Request Blocked</h2>
        <p>Your PR "<strong>${prTitle}</strong>" requires a code review.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><a href="${learnMoreUrl}">Review findings</a></p>
      `,
      text: `Pull Request "${prTitle}" requires review. Reason: ${reason}. Learn more: ${learnMoreUrl}`,
    });
  }

  sendInvitationEmail(
    email: string,
    organizationName: string,
    inviteUrl: string,
    role: string
  ): Promise<{ messageId: string }> {
    return this.send({
      to: email,
      subject: `You're invited to ${organizationName} on ReadyLayer`,
      html: `
        <h2>You're invited!</h2>
        <p>You've been invited to join <strong>${organizationName}</strong> on ReadyLayer.</p>
        <p>Role: <strong>${role}</strong></p>
        <p><a href="${inviteUrl}">Accept invitation</a></p>
      `,
      text: `You're invited to join ${organizationName} on ReadyLayer. Accept: ${inviteUrl}`,
    });
  }

  sendPolicyViolationAlert(
    email: string,
    violationType: string,
    fileName: string,
    lineNumber: number,
    detailsUrl: string
  ): Promise<{ messageId: string }> {
    return this.send({
      to: email,
      subject: `Policy Violation Detected: ${violationType}`,
      html: `
        <h2>Policy Violation Detected</h2>
        <p><strong>Type:</strong> ${violationType}</p>
        <p><strong>File:</strong> ${fileName}:${lineNumber}</p>
        <p><a href="${detailsUrl}">View details and remediation</a></p>
      `,
      text: `Policy violation detected: ${violationType} in ${fileName}:${lineNumber}. View details: ${detailsUrl}`,
    });
  }
}

export const emailService = new EmailService();
