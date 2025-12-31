/**
 * Rate Limiting Middleware
 * 
 * Per-user, per-IP, per-organization rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';
import { getAuthenticatedUser } from './auth';
import { logger } from '../observability/logging';

let rateLimiter: RateLimiterMemory | RateLimiterRedis;

// Initialize rate limiter
(async () => {
  try {
    if (process.env.REDIS_URL) {
      const redis = createClient({ url: process.env.REDIS_URL });
      await redis.connect();
      rateLimiter = new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl_rate_limit',
        points: 100, // Number of requests
        duration: 60, // Per 60 seconds
      });
    } else {
      rateLimiter = new RateLimiterMemory({
        points: 100,
        duration: 60,
      });
    }
  } catch (error) {
    logger.warn('Failed to initialize Redis rate limiter, using memory', { error });
    rateLimiter = new RateLimiterMemory({
      points: 100,
      duration: 60,
    });
  }
})();

export interface RateLimitOptions {
  points?: number; // Number of requests
  duration?: number; // Per duration (seconds)
  keyGenerator?: (request: NextRequest) => Promise<string>;
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(options: RateLimitOptions = {}) {
  const limiter = options.points
    ? new RateLimiterMemory({
        points: options.points,
        duration: options.duration || 60,
      })
    : rateLimiter;

  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      // Generate rate limit key
      let key: string;

      if (options.keyGenerator) {
        key = await options.keyGenerator(request);
      } else {
        // Default: use user ID if authenticated, otherwise IP
        const user = await getAuthenticatedUser(request);
        if (user) {
          key = `user:${user.id}`;
        } else {
          const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
          key = `ip:${ip}`;
        }
      }

      // Check rate limit
      await limiter.consume(key);

      // Rate limit passed
      return null;
    } catch (error: any) {
      if (error.remainingPoints !== undefined) {
        // Rate limit exceeded
        const retryAfter = Math.ceil(error.msBeforeNext / 1000);
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded',
              retryAfter,
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': (options.points || 100).toString(),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }

      logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
      }, 'Rate limit check failed');
      // Allow request on error (fail open)
      return null;
    }
  };
}

/**
 * Default rate limit: 100 requests per minute
 */
export const defaultRateLimit = createRateLimitMiddleware();

/**
 * Strict rate limit: 10 requests per minute
 */
export const strictRateLimit = createRateLimitMiddleware({
  points: 10,
  duration: 60,
});
