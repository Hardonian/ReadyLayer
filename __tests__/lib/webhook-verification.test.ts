import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseRotatedSecrets,
  verifySignatureWithRotation,
  validateWebhookTimestampAndNonce,
  webhookNonceCache,
  verifyRotatedGitHubWebhook,
} from '../../lib/secrets/webhook-verification';
import { generateHmacSignature } from '../../lib/security/webhook-signature';

describe('GitHub Webhook Verification & Rotation', () => {
  beforeEach(() => {
    webhookNonceCache.clear();
  });

  describe('parseRotatedSecrets', () => {
    it('parses versioned secrets', () => {
      const config = 'v1:secretA, v2:secretB, v3:secretC';
      const parsed = parseRotatedSecrets(config);
      expect(parsed).toEqual([
        { version: 'v1', secret: 'secretA' },
        { version: 'v2', secret: 'secretB' },
        { version: 'v3', secret: 'secretC' },
      ]);
    });

    it('parses unversioned secrets with synthetic versions', () => {
      const config = 'sec1, sec2';
      const parsed = parseRotatedSecrets(config);
      expect(parsed).toEqual([
        { version: 'v1', secret: 'sec1' },
        { version: 'v2', secret: 'sec2' },
      ]);
    });

    it('returns empty array for empty config', () => {
      expect(parseRotatedSecrets('')).toEqual([]);
      expect(parseRotatedSecrets(undefined)).toEqual([]);
    });
  });

  describe('verifySignatureWithRotation', () => {
    const payload = '{"action":"opened","pull_request":{"id":1}}';
    const oldSecret = 'old_secret_key_123';
    const newSecret = 'new_secret_key_456';
    const candidates = [
      { version: 'v1', secret: oldSecret },
      { version: 'v2', secret: newSecret },
    ];

    it('matches when signature is signed by an older rotated secret', () => {
      const sigOld = generateHmacSignature(payload, oldSecret, 'sha256=');
      const res = verifySignatureWithRotation(payload, sigOld, candidates);
      expect(res.valid).toBe(true);
      expect(res.matchedVersion).toBe('v1');
    });

    it('matches when signature is signed by a newer rotated secret', () => {
      const sigNew = generateHmacSignature(payload, newSecret, 'sha256=');
      const res = verifySignatureWithRotation(payload, sigNew, candidates);
      expect(res.valid).toBe(true);
      expect(res.matchedVersion).toBe('v2');
    });

    it('fails when signature is forged or invalid', () => {
      const sigInvalid = generateHmacSignature(payload, 'wrong_secret', 'sha256=');
      const res = verifySignatureWithRotation(payload, sigInvalid, candidates);
      expect(res.valid).toBe(false);
      expect(res.matchedVersion).toBeUndefined();
    });
  });

  describe('validateWebhookTimestampAndNonce', () => {
    it('accepts current timestamp within 5 minutes', () => {
      const now = Date.now();
      const res = validateWebhookTimestampAndNonce(now.toString(), 'nonce-123');
      expect(res.valid).toBe(true);
    });

    it('rejects expired timestamp older than 5 minutes', () => {
      const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
      const res = validateWebhookTimestampAndNonce(sixMinutesAgo.toString(), 'nonce-456');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('TIMESTAMP_OUT_OF_BOUNDS');
    });

    it('detects replay attack when duplicate nonce is presented', () => {
      const now = Date.now();
      const first = validateWebhookTimestampAndNonce(now.toString(), 'replay-nonce');
      expect(first.valid).toBe(true);

      const second = validateWebhookTimestampAndNonce(now.toString(), 'replay-nonce');
      expect(second.valid).toBe(false);
      expect(second.error).toBe('REPLAYED_NONCE');
    });
  });

  describe('verifyRotatedGitHubWebhook', () => {
    it('verifies valid payload with rotated secrets and headers', () => {
      const payload = '{"zen":"Keep it logically awesome."}';
      const secret = 'v1:old_secret,v2:active_secret';
      const sig = generateHmacSignature(payload, 'active_secret', 'sha256=');
      const now = Date.now().toString();

      const result = verifyRotatedGitHubWebhook(
        payload,
        {
          signature: sig,
          timestamp: now,
          nonce: 'unique-nonce-1',
        },
        secret
      );

      expect(result.valid).toBe(true);
      expect(result.matchedVersion).toBe('v2');
    });
  });
});
