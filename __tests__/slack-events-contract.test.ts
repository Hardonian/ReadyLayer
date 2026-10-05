import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST, verifySlackSignature } from '@/integrations/slack/events/route';

const secret = 'slack-signing-secret';

function signature(payload: string, timestamp: number): string {
  return `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${payload}`).digest('hex')}`;
}

describe('Slack events contracts', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('verifies signatures against the raw body and bounded timestamp', () => {
    const payload = JSON.stringify({ type: 'url_verification', challenge: 'challenge_1' });
    const timestamp = Math.floor(Date.now() / 1000);
    const signed = signature(payload, timestamp);

    expect(verifySlackSignature(payload, String(timestamp), signed, secret)).toBe(true);
    expect(verifySlackSignature(`${payload} `, String(timestamp), signed, secret)).toBe(false);
    expect(verifySlackSignature(payload, String(timestamp - 301), signed, secret)).toBe(false);
  });

  it('rejects unsigned event payloads before parsing or processing them', async () => {
    vi.stubEnv('SLACK_SIGNING_SECRET', secret);
    const request = new NextRequest('http://localhost/integrations/slack/events', {
      method: 'POST',
      body: JSON.stringify({ type: 'url_verification', challenge: 'challenge_1' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('answers a valid Slack URL-verification challenge', async () => {
    vi.stubEnv('SLACK_SIGNING_SECRET', secret);
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ type: 'url_verification', challenge: 'challenge_1' });
    const request = new NextRequest('http://localhost/integrations/slack/events', {
      method: 'POST',
      headers: {
        'x-slack-request-timestamp': String(timestamp),
        'x-slack-signature': signature(payload, timestamp),
      },
      body: payload,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ challenge: 'challenge_1' });
  });
});
