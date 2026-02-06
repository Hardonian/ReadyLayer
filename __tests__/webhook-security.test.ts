/**
 * Webhook Security Tests
 *
 * Tests for webhook security hardening:
 * - Replay protection validation
 * - Rate limiting enforcement
 * - Signature verification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  webhookReplayProtection,
  validateWebhookTimestamp,
  validateWebhookNonce,
} from '../lib/security/webhook-replay';

describe('Webhook Replay Protection', () => {
  const TEST_PROVIDER = 'test-github';
  const TEST_SIGNATURE = 'sha256=test_signature_1234567890abcdef';
  const TEST_SECRET = 'test_webhook_secret';

  describe('generateNonce', () => {
    it('should generate valid nonce format', () => {
      const nonce = webhookReplayProtection.generateNonce();

      expect(nonce).toBeDefined();
      expect(nonce).toContain(':');
      expect(nonce.split(':').length).toBe(2);
    });

    it('should generate unique nonces', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(webhookReplayProtection.generateNonce());
      }
      expect(nonces.size).toBe(100);
    });
  });

  describe('generateSignature', () => {
    it('should generate consistent signature for same inputs', () => {
      const payload = '{"test": "payload"}';
      const timestamp = Date.now().toString();
      const nonce = '12345:abcde';
      const sig1 = webhookReplayProtection.generateSignature(payload, timestamp, nonce, TEST_SECRET);
      const sig2 = webhookReplayProtection.generateSignature(payload, timestamp, nonce, TEST_SECRET);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different payloads', () => {
      const timestamp = Date.now().toString();
      const nonce = '12345:abcde';
      const sig1 = webhookReplayProtection.generateSignature('payload1', timestamp, nonce, TEST_SECRET);
      const sig2 = webhookReplayProtection.generateSignature('payload2', timestamp, nonce, TEST_SECRET);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different nonces', () => {
      const payload = '{"test": "payload"}';
      const timestamp = Date.now().toString();
      const sig1 = webhookReplayProtection.generateSignature(payload, timestamp, '12345:abcde', TEST_SECRET);
      const sig2 = webhookReplayProtection.generateSignature(payload, timestamp, '67890:fghij', TEST_SECRET);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('validateWebhookTimestamp', () => {
    it('should accept valid timestamp', () => {
      const timestamp = Date.now().toString();
      const result = validateWebhookTimestamp(timestamp);

      expect(result).toBe(parseInt(timestamp, 10));
    });

    it('should reject non-numeric timestamp', () => {
      expect(() => validateWebhookTimestamp('invalid')).toThrow('Invalid timestamp format');
    });

    it('should reject empty timestamp', () => {
      expect(() => validateWebhookTimestamp('')).toThrow('Invalid timestamp format');
    });
  });

  describe('validateWebhookNonce', () => {
    it('should accept valid nonce format', () => {
      const nonce = '1234567890:abcdefghij';
      const result = validateWebhookNonce(nonce);

      expect(result).toBe(nonce);
    });

    it('should reject nonce without colon separator', () => {
      // Use a long enough nonce to pass length check but missing colon
      expect(() => validateWebhookNonce('1234567890_no_colon')).toThrow('Invalid nonce format');
    });

    it('should reject too short nonce', () => {
      expect(() => validateWebhookNonce('123:abc')).toThrow('Nonce is too short');
    });

    it('should reject too long nonce', () => {
      const longNonce = '1234567890:' + 'a'.repeat(100);
      expect(() => validateWebhookNonce(longNonce)).toThrow('Nonce is too long');
    });

    it('should reject empty nonce', () => {
      expect(() => validateWebhookNonce('')).toThrow('Invalid nonce format');
    });
  });

  describe('isReplay', () => {
    beforeEach(async () => {
      await webhookReplayProtection.clearAllReplayCache();
    });

    afterEach(async () => {
      await webhookReplayProtection.clearAllReplayCache();
    });

    it('should not detect replay for first request', async () => {
      const timestamp = Date.now();
      const nonce = webhookReplayProtection.generateNonce();
      const signature = webhookReplayProtection.generateSignature(
        '{"test": "payload"}',
        timestamp.toString(),
        nonce,
        TEST_SECRET
      );

      const isReplay = await webhookReplayProtection.isReplay(
        TEST_PROVIDER,
        signature,
        timestamp,
        nonce
      );

      expect(isReplay).toBe(false);
    });

    it('should detect replay of same signature and nonce', async () => {
      const timestamp = Date.now();
      const nonce = webhookReplayProtection.generateNonce();
      const signature = webhookReplayProtection.generateSignature(
        '{"test": "payload"}',
        timestamp.toString(),
        nonce,
        TEST_SECRET
      );

      await webhookReplayProtection.isReplay(TEST_PROVIDER, signature, timestamp, nonce);
      const isReplay = await webhookReplayProtection.isReplay(TEST_PROVIDER, signature, timestamp, nonce);

      expect(isReplay).toBe(true);
    });

    it('should not detect replay with different nonce', async () => {
      const timestamp = Date.now();
      const nonce1 = '12345:nonce1';
      const nonce2 = '12345:nonce2';
      const signature = webhookReplayProtection.generateSignature(
        '{"test": "payload"}',
        timestamp.toString(),
        nonce1,
        TEST_SECRET
      );

      await webhookReplayProtection.isReplay(TEST_PROVIDER, signature, timestamp, nonce1);
      const isReplay = await webhookReplayProtection.isReplay(TEST_PROVIDER, signature, timestamp, nonce2);

      expect(isReplay).toBe(false);
    });

    it('should detect expired timestamp', async () => {
      const oldTimestamp = Date.now() - 400000;
      const nonce = webhookReplayProtection.generateNonce();
      const signature = 'sha256=oldsignature123456789';

      const isReplay = await webhookReplayProtection.isReplay(
        TEST_PROVIDER,
        signature,
        oldTimestamp,
        nonce
      );

      expect(isReplay).toBe(true);
    });

    it('should detect future timestamp', async () => {
      const futureTimestamp = Date.now() + 100000;
      const nonce = webhookReplayProtection.generateNonce();
      const signature = 'sha256=futuresignature123';

      const isReplay = await webhookReplayProtection.isReplay(
        TEST_PROVIDER,
        signature,
        futureTimestamp,
        nonce
      );

      expect(isReplay).toBe(true);
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      await webhookReplayProtection.clearAllReplayCache();
    });

    afterEach(async () => {
      await webhookReplayProtection.clearAllReplayCache();
    });

    it('should clear specific replay cache entry', async () => {
      const timestamp = Date.now();
      const nonce = webhookReplayProtection.generateNonce();
      const signature = webhookReplayProtection.generateSignature(
        '{"test": "payload"}',
        timestamp.toString(),
        nonce,
        TEST_SECRET
      );

      await webhookReplayProtection.isReplay(TEST_PROVIDER, signature, timestamp, nonce);
      await webhookReplayProtection.clearReplayCache(TEST_PROVIDER, signature);

      const isReplay = await webhookReplayProtection.isReplay(TEST_PROVIDER, signature, timestamp, nonce);
      expect(isReplay).toBe(false);
    });

    it('should clear all replay cache', async () => {
      const timestamp = Date.now();
      const nonce = webhookReplayProtection.generateNonce();
      const signature = webhookReplayProtection.generateSignature(
        '{"test": "payload"}',
        timestamp.toString(),
        nonce,
        TEST_SECRET
      );

      await webhookReplayProtection.isReplay(TEST_PROVIDER, signature, timestamp, nonce);
      await webhookReplayProtection.clearAllReplayCache();

      const isReplay = await webhookReplayProtection.isReplay(TEST_PROVIDER, signature, timestamp, nonce);
      expect(isReplay).toBe(false);
    });
  });
});

describe('Webhook Rate Limiting Integration', () => {
  describe('rate limit headers', () => {
    it('should include rate limit headers in response', async () => {
      const testLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
      };

      const { checkRateLimit } = await import('../lib/rate-limiting/redis-rate-limiter');

      const result = await checkRateLimit('test-key', testLimitConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });
});
