/**
 * Webhook Rate Limiting
 *
 * Rate limiting specifically for webhook endpoints
 * Rate limits per GitHub/GitLab/Bitbucket installation
 * Different limits per event type (expensive events like 'push' vs 'ping')
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { createClient, RedisClientType } from 'redis';

export interface WebhookRateLimitConfig {
  points: number;
  duration: number;
}

export interface WebhookRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

interface WebhookEventConfig {
  points: number;
  description: string;
}

const WEBHOOK_EVENT_LIMITS: Record<string, WebhookEventConfig> = {
  ping: { points: 10, description: 'Webhook ping events' },
  push: { points: 100, description: 'Push events' },
  pull_request: { points: 50, description: 'Pull request events' },
  merge_group: { points: 20, description: 'Merge group events' },
  check_run: { points: 30, description: 'Check run events' },
  workflow_run: { points: 30, description: 'Workflow run events' },
  create: { points: 20, description: 'Branch/tag creation events' },
  delete: { points: 20, description: 'Branch/tag deletion events' },
  release: { points: 20, description: 'Release events' },
  issue_comment: { points: 30, description: 'Issue comment events' },
  issues: { points: 30, description: 'Issue events' },
  default: { points: 50, description: 'Other webhook events' },
};

class WebhookRateLimiter {
  private redisClient: RedisClientType | null = null;
  private redisLimiter: RateLimiterRedis | null = null;
  private memoryLimiter: RateLimiterMemory | null = null;
  private isRedisHealthy = false;
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.info('Redis not configured for webhook rate limiting, using in-memory only');
      this.initializeMemoryLimiter();
      this.initialized = true;
      return;
    }

    try {
      this.redisClient = createClient({ url: redisUrl });

      this.redisClient.on('error', (err) => {
        logger.warn({ err }, 'Redis error for webhook rate limiter, falling back to in-memory');
        this.isRedisHealthy = false;
        this.initializeMemoryLimiter();
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected for webhook rate limiting');
        this.isRedisHealthy = true;
      });

      await this.redisClient.connect();
      this.isRedisHealthy = true;
      this.initialized = true;

      logger.info('Webhook rate limiter Redis initialized successfully');
    } catch (error) {
      logger.warn({ error }, 'Failed to connect Redis for webhook rate limiting, using in-memory only');
      this.isRedisHealthy = false;
      this.initializeMemoryLimiter();
      this.initialized = true;
    }
  }

  private initializeMemoryLimiter(): void {
    if (!this.memoryLimiter) {
      this.memoryLimiter = new RateLimiterMemory({
        keyPrefix: 'webhook:memory:ratelimit:',
        points: 100,
        duration: 60,
      });
    }
  }

  private getEventConfig(eventType: string): WebhookRateLimitConfig {
    const config = WEBHOOK_EVENT_LIMITS[eventType] || WEBHOOK_EVENT_LIMITS.default;
    return {
      points: config.points,
      duration: 60,
    };
  }

  private getProviderPrefix(provider: string): string {
    return `webhook:${provider}:`;
  }

  async checkRateLimit(
    installationId: string,
    eventType: string,
    provider: 'github' | 'gitlab' | 'bitbucket' = 'github'
  ): Promise<WebhookRateLimitResult> {
    await this.initialize();

    const config = this.getEventConfig(eventType);
    const key = `${this.getProviderPrefix(provider)}${installationId}:${eventType}`;
    const points = config.points;
    const duration = config.duration;

    if (this.isRedisHealthy && this.redisClient && !this.redisLimiter) {
      this.redisLimiter = new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix: 'readylayer:webhook:ratelimit:',
        points,
        duration,
      });
    }

    try {
      if (this.redisLimiter) {
        try {
          const result = await this.redisLimiter.consume(key, 1);
          metrics.increment('webhook_rate_limit_allowed', { provider, event: eventType });

          return {
            allowed: true,
            remaining: result.remainingPoints,
            resetAt: Date.now() + (result.msBeforeNext || 0),
            limit: points,
          };
        } catch (rejRes) {
          metrics.increment('webhook_rate_limit_blocked', { provider, event: eventType });

          if (rejRes && typeof rejRes === 'object' && 'remainingPoints' in rejRes) {
            return {
              allowed: false,
              remaining: 0,
              resetAt: Date.now() + ((rejRes as { msBeforeNext?: number }).msBeforeNext || duration * 1000),
              limit: points,
            };
          }
          throw rejRes;
        }
      }

      this.initializeMemoryLimiter();

      if (!this.memoryLimiter) {
        return {
          allowed: true,
          remaining: points,
          resetAt: Date.now() + duration * 1000,
          limit: points,
        };
      }

      try {
        const result = await this.memoryLimiter.consume(key, 1);
        metrics.increment('webhook_rate_limit_memory_allowed', { provider, event: eventType });

        return {
          allowed: true,
          remaining: result.remainingPoints,
          resetAt: Date.now() + (result.msBeforeNext || 0),
          limit: points,
        };
      } catch {
        metrics.increment('webhook_rate_limit_memory_blocked', { provider, event: eventType });

        return {
          allowed: false,
          remaining: 0,
          resetAt: Date.now() + duration * 1000,
          limit: points,
        };
      }
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error : new Error(String(error)), installationId, eventType },
        'Webhook rate limit check error'
      );

      return {
        allowed: true,
        remaining: points,
        resetAt: Date.now() + duration * 1000,
        limit: points,
      };
    }
  }

  async clearRateLimit(
    installationId: string,
    eventType: string,
    provider: 'github' | 'gitlab' | 'bitbucket' = 'github'
  ): Promise<void> {
    const key = `${this.getProviderPrefix(provider)}${installationId}:${eventType}`;

    if (this.redisLimiter) {
      try {
        await this.redisLimiter.delete(key);
      } catch (error) {
        logger.warn({ error, key }, 'Failed to clear webhook rate limit from Redis');
      }
    }

    if (this.memoryLimiter) {
      try {
        await this.memoryLimiter.delete(key);
      } catch (error) {
        logger.warn({ error, key }, 'Failed to clear webhook rate limit from memory');
      }
    }
  }

  getEventLimits(): Record<string, WebhookEventConfig> {
    return { ...WEBHOOK_EVENT_LIMITS };
  }
}

const webhookLimiterInstance = new WebhookRateLimiter();

export async function checkWebhookRateLimit(
  installationId: string,
  eventType: string,
  provider: 'github' | 'gitlab' | 'bitbucket' = 'github'
): Promise<WebhookRateLimitResult> {
  return webhookLimiterInstance.checkRateLimit(installationId, eventType, provider);
}

export async function clearWebhookRateLimit(
  installationId: string,
  eventType: string,
  provider: 'github' | 'gitlab' | 'bitbucket' = 'github'
): Promise<void> {
  return webhookLimiterInstance.clearRateLimit(installationId, eventType, provider);
}

export function getWebhookEventLimits(): Record<string, WebhookEventConfig> {
  return webhookLimiterInstance.getEventLimits();
}

export function createWebhookRateLimitHeaders(result: WebhookRateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt / 1000).toString(),
    'Retry-After': result.allowed ? '0' : Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
  };
}
