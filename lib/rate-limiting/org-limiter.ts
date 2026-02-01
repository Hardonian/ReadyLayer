/**
 * Per-Organization Rate Limiting
 *
 * Implements distributed rate limiting per organization using Redis
 * Supports different limits per billing tier
 */

import { logger } from '../../observability/logging';
import type { RedisClientType } from 'redis';

export interface RateLimitConfig {
  points: number; // Number of requests allowed
  duration: number; // Time window in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

/**
 * Tier-based rate limits
 */
const TIER_LIMITS: Record<string, RateLimitConfig> = {
  free: { points: 100, duration: 3600 }, // 100 requests per hour
  starter: { points: 500, duration: 3600 }, // 500 requests per hour
  growth: { points: 2000, duration: 3600 }, // 2000 requests per hour
  scale: { points: 10000, duration: 3600 }, // 10k requests per hour
  enterprise: { points: 50000, duration: 3600 }, // 50k requests per hour
};

/**
 * In-memory rate limiter for development/testing
 * Production should use Redis-backed implementation
 */
class InMemoryRateLimiter {
  private storage = new Map<string, { count: number; resetAt: number }>();

  async consume(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.storage.get(key);

    // Clean up expired entries
    if (entry && entry.resetAt < now) {
      this.storage.delete(key);
    }

    const current = this.storage.get(key);

    if (!current) {
      // First request in window
      const resetAt = now + config.duration * 1000;
      this.storage.set(key, { count: 1, resetAt });

      return {
        allowed: true,
        remaining: config.points - 1,
        resetAt: new Date(resetAt),
        limit: config.points,
      };
    }

    if (current.count >= config.points) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(current.resetAt),
        limit: config.points,
      };
    }

    // Increment counter
    current.count++;
    this.storage.set(key, current);

    return {
      allowed: true,
      remaining: config.points - current.count,
      resetAt: new Date(current.resetAt),
      limit: config.points,
    };
  }

  async reset(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async getRemaining(key: string, config: RateLimitConfig): Promise<number> {
    const entry = this.storage.get(key);
    if (!entry || entry.resetAt < Date.now()) {
      return config.points;
    }
    return Math.max(0, config.points - entry.count);
  }
}

/**
 * Redis-backed rate limiter for production
 */
class RedisRateLimiter {
  private redisClient: RedisClientType | null = null;

async getClient(): Promise<RedisClientType> {
    if (this.redisClient) {
      return this.redisClient;
    }

    // Lazy load Redis
    try {
      const { createClient } = await import('redis');
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redisClient = createClient({ url: redisUrl });
      await this.redisClient.connect();

      logger.info('Connected to Redis for rate limiting');
      return this.redisClient;
    } catch (error) {
      logger.warn(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to connect to Redis, falling back to in-memory limiter'
      );
      throw error;
    }
  }

  async consume(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    try {
      const client = await this.getClient();
      const now = Date.now();

      // Use Redis for distributed rate limiting
      const multi = client.multi();

      // Increment counter
      multi.incr(key);

      // Set expiry on first request
      multi.expire(key, config.duration);

      // Get current count and TTL
      multi.get(key);
      multi.ttl(key);

      const results = await multi.exec();
      const count = parseInt((results[2] as unknown) as string, 10);
      const ttl = parseInt((results[3] as unknown) as string, 10);

      const resetAt = new Date(now + ttl * 1000);
      const remaining = Math.max(0, config.points - count);

      return {
        allowed: count <= config.points,
        remaining,
        resetAt,
        limit: config.points,
      };
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error : new Error(String(error)), key },
        'Redis rate limit check failed'
      );
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: config.points,
        resetAt: new Date(Date.now() + config.duration * 1000),
        limit: config.points,
      };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.del(key);
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error : new Error(String(error)), key },
        'Failed to reset rate limit'
      );
    }
  }

  async getRemaining(key: string, config: RateLimitConfig): Promise<number> {
    try {
      const client = await this.getClient();
      const count = await client.get(key);
      if (!count) {
        return config.points;
      }
      return Math.max(0, config.points - parseInt(count, 10));
    } catch {
      return config.points; // Fail open
    }
  }
}

// Singleton instances
let inMemoryLimiter: InMemoryRateLimiter | null = null;
let redisLimiter: RedisRateLimiter | null = null;

/**
 * Get rate limiter instance (Redis in production, in-memory otherwise)
 */
function getRateLimiter(): InMemoryRateLimiter | RedisRateLimiter {
  const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production';

  if (useRedis) {
    if (!redisLimiter) {
      redisLimiter = new RedisRateLimiter();
    }
    return redisLimiter;
  }

  if (!inMemoryLimiter) {
    inMemoryLimiter = new InMemoryRateLimiter();
  }
  return inMemoryLimiter;
}

/**
 * Check rate limit for organization
 */
export async function checkOrgRateLimit(
  organizationId: string,
  tier: string = 'free'
): Promise<RateLimitResult> {
  const config = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const key = `ratelimit:org:${organizationId}`;

  const limiter = getRateLimiter();
  const result = await limiter.consume(key, config);

  // Log rate limit violations
  if (!result.allowed) {
    logger.warn(
      {
        organizationId,
        tier,
        limit: config.points,
        resetAt: result.resetAt,
      },
      'Organization rate limit exceeded'
    );
  }

  return result;
}

/**
 * Reset rate limit for organization (admin use)
 */
export async function resetOrgRateLimit(organizationId: string): Promise<void> {
  const key = `ratelimit:org:${organizationId}`;
  const limiter = getRateLimiter();
  await limiter.reset(key);

  logger.info({ organizationId }, 'Organization rate limit reset');
}

/**
 * Get remaining requests for organization
 */
export async function getOrgRateLimitRemaining(
  organizationId: string,
  tier: string = 'free'
): Promise<number> {
  const config = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const key = `ratelimit:org:${organizationId}`;

  const limiter = getRateLimiter();
  return await limiter.getRemaining(key, config);
}

/**
 * Middleware helper for Next.js API routes
 */
export async function enforceOrgRateLimit(
  organizationId: string,
  tier: string = 'free'
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
}> {
  const result = await checkOrgRateLimit(organizationId, tier);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
  };

  if (!result.allowed) {
    headers['Retry-After'] = Math.ceil(
      (result.resetAt.getTime() - Date.now()) / 1000
    ).toString();
  }

  return {
    allowed: result.allowed,
    headers,
  };
}
