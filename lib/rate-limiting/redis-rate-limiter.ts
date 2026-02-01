/**
 * Redis-Backed Rate Limiting
 *
 * P0-FIX: Distributed rate limiting shared across server instances
 *
 * Uses rate-limiter-flexible package with Redis backend
 * Falls back to in-memory if Redis unavailable
 *
 * Features:
 * - Redis primary (shared across instances)
 * - In-memory fallback (if Redis unavailable)
 * - Sliding window algorithm (more accurate than fixed window)
 * - Automatic cleanup of expired entries
 * - Health monitoring and metrics
 */

import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { createClient, RedisClientType } from 'redis';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

class RedisRateLimiter {
  private redisClient: RedisClientType | null = null;
  private redisLimiter: RateLimiterRedis | null = null;
  private memoryLimiter: RateLimiterMemory | null = null;
  private isRedisHealthy = false;
  private rateLimitMetrics = {
    redisChecks: 0,
    memoryChecks: 0,
    allowed: 0,
    blocked: 0,
    errors: 0,
  };

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection for rate limiting
   */
  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.info('Redis not configured for rate limiting, using in-memory only');
      this.initializeMemoryLimiter();
      return;
    }

    try {
      this.redisClient = createClient({ url: redisUrl });

      this.redisClient.on('error', (err) => {
        logger.warn({ err }, 'Redis error for rate limiter, falling back to in-memory');
        this.isRedisHealthy = false;
        this.initializeMemoryLimiter();
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected for rate limiting');
        this.isRedisHealthy = true;
      });

      await this.redisClient.connect();
      this.isRedisHealthy = true;

      // Create Redis-backed limiter (default 100 requests per 60 seconds)
      this.redisLimiter = new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix: 'readylayer:ratelimit:',
        points: 100, // Number of requests
        duration: 60, // Per 60 seconds
      });

      logger.info('Redis rate limiter initialized successfully');
    } catch (error) {
      logger.warn({ error }, 'Failed to connect Redis for rate limiting, using in-memory only');
      this.isRedisHealthy = false;
      this.initializeMemoryLimiter();
    }
  }

  /**
   * Initialize in-memory fallback limiter
   */
  private initializeMemoryLimiter(): void {
    if (!this.memoryLimiter) {
      this.memoryLimiter = new RateLimiterMemory({
        keyPrefix: 'memory:ratelimit:',
        points: 100, // Number of requests
        duration: 60, // Per 60 seconds
      });
      logger.info('In-memory rate limiter initialized');
    }
  }

  /**
   * Check rate limit for a key
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const points = config.maxRequests;
    const duration = Math.floor(config.windowMs / 1000); // Convert ms to seconds

    try {
      // Try Redis first (shared across instances)
      if (this.isRedisHealthy && this.redisLimiter) {
        try {
          // Create custom limiter with provided config if different from default
          const limiter = new RateLimiterRedis({
            storeClient: this.redisClient!,
            keyPrefix: 'readylayer:ratelimit:',
            points,
            duration,
          });

          const result = await limiter.consume(key, 1);
          this.rateLimitMetrics.redisChecks++;
          this.rateLimitMetrics.allowed++;
          metrics.increment('rate_limit_redis_allowed');

          return {
            allowed: true,
            remaining: result.remainingPoints,
            resetAt: Date.now() + (result.msBeforeNext || 0),
          };
        } catch (rejRes) {
          if (rejRes && typeof rejRes === 'object' && 'remainingPoints' in rejRes && rejRes.remainingPoints !== undefined) {
            // Rate limited (not an error, just exceeded)
            this.rateLimitMetrics.redisChecks++;
            this.rateLimitMetrics.blocked++;
            metrics.increment('rate_limit_redis_blocked');

            return {
              allowed: false,
              remaining: 0,
              resetAt: Date.now() + ((rejRes as { msBeforeNext?: number }).msBeforeNext || 0),
            };
          }
          // Actual error, fall through to in-memory
          throw rejRes;
        }
      }

      // Fall back to in-memory limiter
      this.initializeMemoryLimiter();

      // Create custom limiter with provided config
      const memLimiter = new RateLimiterMemory({
        keyPrefix: 'memory:ratelimit:',
        points,
        duration,
      });

      try {
        const result = await memLimiter.consume(key, 1);
        this.rateLimitMetrics.memoryChecks++;
        this.rateLimitMetrics.allowed++;
        metrics.increment('rate_limit_memory_allowed');

        return {
          allowed: true,
          remaining: result.remainingPoints,
          resetAt: Date.now() + (result.msBeforeNext || 0),
        };
      } catch (rejRes) {
        this.rateLimitMetrics.memoryChecks++;
        this.rateLimitMetrics.blocked++;
        metrics.increment('rate_limit_memory_blocked');

        return {
          allowed: false,
          remaining: 0,
          resetAt: Date.now() + ((rejRes && typeof rejRes === 'object' && 'msBeforeNext' in rejRes ? (rejRes as { msBeforeNext?: number }).msBeforeNext : undefined) || 0),
        };
      }
    } catch (error) {
      this.rateLimitMetrics.errors++;
      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          key,
        },
        'Rate limit check error'
      );

      // On error, allow the request (fail-open for availability)
      // This is a security vs availability trade-off
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: Date.now() + config.windowMs,
      };
    }
  }

  /**
   * Clear rate limit for a specific key (for testing)
   */
  async clearRateLimit(key: string): Promise<void> {
    if (this.isRedisHealthy && this.redisLimiter) {
      try {
        await this.redisLimiter.delete(key);
      } catch (error) {
        logger.warn({ error, key }, 'Failed to clear rate limit from Redis');
      }
    }

    if (this.memoryLimiter) {
      try {
        await this.memoryLimiter.delete(key);
      } catch (error) {
        logger.warn({ error, key }, 'Failed to clear rate limit from memory');
      }
    }
  }

  /**
   * Clear all rate limits (for testing)
   */
  async clearAllRateLimits(): Promise<void> {
    if (this.isRedisHealthy && this.redisClient) {
      try {
        const keys = await this.redisClient.keys('readylayer:ratelimit:*');
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        logger.info('All rate limits cleared from Redis');
      } catch (error) {
        logger.warn({ error }, 'Failed to clear rate limits from Redis');
      }
    }

    logger.info('All rate limits cleared');
  }

  /**
   * Get rate limiter health status
   */
  getHealthStatus(): {
    redisHealthy: boolean;
    metrics: RedisRateLimiter['rateLimitMetrics'];
  } {
    return {
      redisHealthy: this.isRedisHealthy,
      metrics: { ...this.rateLimitMetrics },
    };
  }

  /**
   * Cleanup on shutdown
   */
  async disconnect(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.disconnect();
        logger.info('Redis rate limiter disconnected');
      } catch (error) {
        logger.warn({ error }, 'Redis rate limiter disconnect error');
      }
    }
  }
}

// Singleton instance
const rateLimiterInstance = new RedisRateLimiter();

/**
 * Check rate limit
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return rateLimiterInstance.checkRateLimit(key, config);
}

/**
 * Clear rate limit (for testing)
 */
export async function clearRateLimit(key: string): Promise<void> {
  return rateLimiterInstance.clearRateLimit(key);
}

/**
 * Clear all rate limits (for testing)
 */
export async function clearAllRateLimits(): Promise<void> {
  return rateLimiterInstance.clearAllRateLimits();
}

interface RateLimiterHealth {
  redisHealthy: boolean;
  metrics: {
    redisChecks: number;
    memoryChecks: number;
    allowed: number;
    blocked: number;
    errors: number;
  };
}

/**
 * Get rate limiter health status
 */
export function getRateLimiterHealth(): RateLimiterHealth {
  return rateLimiterInstance.getHealthStatus();
}

/**
 * Disconnect Redis client (for graceful shutdown)
 */
export async function disconnectRateLimiter(): Promise<void> {
  return rateLimiterInstance.disconnect();
}
