import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  exchangeOAuthCodeForToken,
  validateOAuthStateToken,
  verifyGitHubWebhookSignature,
} from '@/integrations/github/oauth';

describe('GitHub OAuth security contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires an exact OAuth state match without logging token values', () => {
    const state = 'a'.repeat(64);

    expect(validateOAuthStateToken(state, state)).toBe(true);
    expect(validateOAuthStateToken(`${state.slice(0, -1)}b`, state)).toBe(false);
    expect(validateOAuthStateToken(null, state)).toBe(false);
  });

  it('verifies GitHub HMAC signatures with a strict prefix and constant-time comparison', () => {
    const secret = 'webhook-secret';
    const payload = '{"action":"opened"}';
    const signature = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

    expect(verifyGitHubWebhookSignature(payload, signature, secret)).toBe(true);
    expect(verifyGitHubWebhookSignature(payload, `sha256=${'0'.repeat(64)}`, secret)).toBe(false);
    expect(verifyGitHubWebhookSignature(payload, signature.replace('sha256=', ''), secret)).toBe(false);
  });

  it('rejects a successful HTTP response that omits the access token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ token_type: 'bearer', scope: 'repo' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )));

    await expect(exchangeOAuthCodeForToken('client-id', 'client-secret', 'code', 'https://example.test/callback'))
      .resolves.toBeNull();
  });
});
