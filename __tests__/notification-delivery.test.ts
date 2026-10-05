import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notificationService } from '@/services/notification-service';

const message = {
  id: 'notification_1',
  type: 'warning' as const,
  title: 'Action required',
  body: 'A governed change needs review.',
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
};

describe('notification delivery contracts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('reports a failed Slack delivery when the webhook rejects the request', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.test/services/example');
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));

    const [result] = await notificationService.send({
      recipientId: 'user_1',
      channels: ['slack'],
      message,
    });

    expect(result).toMatchObject({ channel: 'slack', status: 'failed' });
    expect(result.error).toContain('HTTP 429');
  });

  it('refuses unsigned outgoing webhook delivery when its secret is missing', async () => {
    vi.stubEnv('NOTIFICATION_WEBHOOK_URL', 'https://alerts.example.test/ready');
    vi.stubEnv('NOTIFICATION_WEBHOOK_SECRET', '');
    global.fetch = vi.fn();

    const [result] = await notificationService.send({
      recipientId: 'user_1',
      channels: ['webhook'],
      message,
    });

    expect(result).toMatchObject({ channel: 'webhook', status: 'failed' });
    expect(result.error).toContain('NOTIFICATION_WEBHOOK_SECRET');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('marks a signed webhook delivery sent only after an HTTP success', async () => {
    vi.stubEnv('NOTIFICATION_WEBHOOK_URL', 'https://alerts.example.test/ready');
    vi.stubEnv('NOTIFICATION_WEBHOOK_SECRET', 'notification-secret');
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const [result] = await notificationService.send({
      recipientId: 'user_1',
      channels: ['webhook'],
      message,
    });

    expect(result).toMatchObject({ channel: 'webhook', status: 'sent' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://alerts.example.test/ready',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-ReadyLayer-Signature': expect.stringMatching(/^sha256=/),
        }),
      })
    );
  });
});
