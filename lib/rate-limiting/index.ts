/**
 * Rate Limiting
 *
 * P0-FIX: Replaced in-memory Map with Redis-backed distributed rate limiting
 *
 * IMPORTANT: This file now delegates to redis-rate-limiter.ts
 * The API has changed from synchronous to asynchronous for Redis support.
 *
 * Breaking Change: checkRateLimit is now async
 * Migration: Change `checkRateLimit(key, config)` to `await checkRateLimit(key, config)`
 */

export type { RateLimitConfig, RateLimitResult } from './redis-rate-limiter';
export {
  checkRateLimit,
  clearRateLimit,
  clearAllRateLimits,
  getRateLimiterHealth,
  disconnectRateLimiter,
} from './redis-rate-limiter';
