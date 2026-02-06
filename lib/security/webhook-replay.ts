/**
 * Webhook Replay Protection Service
 *
 * Prevents replay attacks by tracking recently seen webhook signatures/nonces.
 * Uses Redis with TTL for distributed state, falls back to in-memory.
 *
 * Security model:
 * - Each webhook must include a timestamp and nonce
 * - Signatures are validated against the secret
 * - Replay detection: store (signature + timestamp) with TTL
 * - Reject requests if signature was seen within TTL window
 */

import { createHash } from 'crypto';
import { createClient, RedisClientType } from 'redis';
import { logger } from '@/observability/logging';

const WEBHOOK_REPLAY_TTL_SECONDS = 300;
const WEBHOOK_REPLAY_CACHE_KEY = 'readylayer:webhook:replay';

interface ReplayCacheEntry {
  seenAt: number;
  nonce: string;
}

class WebhookReplayProtection {
  private redisClient: RedisClientType | null = null;
  private memoryCache: Map<string, ReplayCacheEntry> = new Map();
  private useRedis = false;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        this.redisClient = createClient({ url: redisUrl });

        this.redisClient.on('error', (err: Error) => {
          logger.warn({ err }, 'Redis connection error for replay protection, falling back to memory');
          this.useRedis = false;
        });

        this.redisClient.on('connect', () => {
          logger.info('Redis connected for webhook replay protection');
          this.useRedis = true;
        });

        await this.redisClient.connect();
        await this.redisClient.ping();
        this.useRedis = true;
      } catch (error) {
        logger.warn({ error }, 'Failed to connect Redis for replay protection, using memory only');
        this.useRedis = false;
      }
    }

    this.initialized = true;
  }

  generateNonce(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}:${random}`;
  }

  generateSignature(payload: string, timestamp: string, nonce: string, secret: string): string {
    const payloadToSign = `${timestamp}.${nonce}.${payload}`;
    return createHash('sha256')
      .update(payloadToSign)
      .update(secret)
      .digest('hex');
  }

  private getCacheKey(provider: string, signature: string): string {
    return `${WEBHOOK_REPLAY_CACHE_KEY}:${provider}:${signature.substring(0, 16)}`;
  }

  async isReplay(
    provider: string,
    signature: string,
    timestamp: number,
    nonce: string
  ): Promise<boolean> {
    await this.initialize();

    const now = Date.now();
    const timestampAge = now - timestamp;

    if (timestampAge > WEBHOOK_REPLAY_TTL_SECONDS * 1000) {
      logger.warn(
        { provider, timestampAge },
        'Webhook timestamp is too old, treating as potential replay'
      );
      return true;
    }

    if (timestampAge < 0) {
      logger.warn({ provider, timestampAge }, 'Webhook timestamp is in the future');
      return true;
    }

    const cacheKey = this.getCacheKey(provider, signature);

    if (this.useRedis && this.redisClient) {
      try {
        const existing = await this.redisClient.get(cacheKey);
        if (existing) {
          const parsed = JSON.parse(existing) as ReplayCacheEntry;
          if (parsed.nonce === nonce) {
            logger.warn({ provider, cacheKey }, 'Webhook replay detected (Redis)');
            return true;
          }
        }

        await this.redisClient.setEx(
          cacheKey,
          WEBHOOK_REPLAY_TTL_SECONDS,
          JSON.stringify({ seenAt: now, nonce } as ReplayCacheEntry)
        );

        return false;
      } catch (error) {
        logger.warn({ error, cacheKey }, 'Redis error during replay check, falling back to memory');
        this.useRedis = false;
      }
    }

    const existing = this.memoryCache.get(cacheKey);
    if (existing) {
      if (existing.nonce === nonce) {
        logger.warn({ provider, cacheKey }, 'Webhook replay detected (memory)');
        return true;
      }
    }

    this.memoryCache.set(cacheKey, { seenAt: now, nonce });

    this.cleanupMemoryCache();

    return false;
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    const ttlMs = WEBHOOK_REPLAY_TTL_SECONDS * 1000;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.seenAt > ttlMs) {
        this.memoryCache.delete(key);
      }
    }
  }

  async clearReplayCache(provider: string, signature: string): Promise<void> {
    await this.initialize();

    const cacheKey = this.getCacheKey(provider, signature);

    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(cacheKey);
      } catch (error) {
        logger.warn({ error, cacheKey }, 'Failed to clear replay cache in Redis');
      }
    }

    this.memoryCache.delete(cacheKey);
  }

  async clearAllReplayCache(): Promise<void> {
    await this.initialize();

    if (this.useRedis && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${WEBHOOK_REPLAY_CACHE_KEY}:*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to clear all replay cache in Redis');
      }
    }

    this.memoryCache.clear();
  }

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
      this.useRedis = false;
    }
  }
}

export const webhookReplayProtection = new WebhookReplayProtection();

export function validateWebhookTimestamp(timestamp: string): number {
  const ts = parseInt(timestamp, 10);

  if (isNaN(ts)) {
    throw new Error('Invalid timestamp format');
  }

  return ts;
}

export function validateWebhookNonce(nonce: string): string {
  if (!nonce || typeof nonce !== 'string') {
    throw new Error('Invalid nonce format');
  }

  if (nonce.length < 10) {
    throw new Error('Nonce is too short');
  }

  if (nonce.length > 100) {
    throw new Error('Nonce is too long');
  }

  const parts = nonce.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid nonce format (must be timestamp:random)');
  }

  return nonce;
}
