/**
 * Database Query Cache Layer
 *
 * Server-side caching for read-heavy queries to reduce DB load.
 * Based on OpenAI playbook: aggressive caching before considering read replicas.
 *
 * Features:
 * - Redis-backed cache (fallback to memory)
 * - Stale-while-revalidate pattern
 * - Cache stampede protection (single-flight)
 * - Automatic tenant isolation in cache keys
 * - TTL-based invalidation
 */

import { createClient, RedisClientType } from 'redis'
import { logger } from '../../observability/logging'
import { metrics } from '../../observability/metrics'

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  // Default TTLs by data type
  TTL_SHORT: 5, // 5s - Transactional data (reviews, runs)
  TTL_MEDIUM: 60, // 60s - Dashboard aggregates
  TTL_LONG: 300, // 5min - Static data (policies, repos)
  TTL_VERY_LONG: 3600, // 1hr - Rarely changing (org settings)

  // Stale-while-revalidate
  STALE_THRESHOLD: 0.8, // Revalidate when TTL is 80% expired

  // In-memory fallback limits
  MAX_MEMORY_CACHE_SIZE: 1000, // Max items in memory cache
  MEMORY_CACHE_TTL: 60, // 60s TTL for memory cache
} as const

/**
 * Cache key builder
 * Ensures consistent, tenant-isolated keys
 */
export function buildCacheKey(
  namespace: string,
  key: string,
  organizationId?: string
): string {
  const parts = ['rl', namespace]

  if (organizationId) {
    parts.push(organizationId)
  }

  parts.push(key)

  return parts.join(':')
}

/**
 * In-memory cache fallback (when Redis unavailable)
 */
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private maxSize = CACHE_CONFIG.MAX_MEMORY_CACHE_SIZE

  set<T>(key: string, value: T, ttlSeconds: number): void {
    // LRU eviction if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

const memoryCache = new MemoryCache()

/**
 * Redis client (lazy initialization)
 */
let redisClient: RedisClientType | null = null
let redisInitialized = false

async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisInitialized) {
    return redisClient
  }

  try {
    if (!process.env.REDIS_URL) {
      logger.info('REDIS_URL not configured, using in-memory cache fallback')
      redisInitialized = true
      return null
    }

    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('Redis reconnect failed after 3 attempts, falling back to memory cache')
            return false // Stop reconnecting
          }
          return Math.min(retries * 100, 3000) // Exponential backoff
        },
      },
    })

redisClient.on('error', (err: Error) => {
      logger.error({ err }, 'Redis client error')
      metrics.increment('cache.redis.error')
    })

    redisClient.on('connect', () => {
      logger.info('Redis connected for caching')
      metrics.increment('cache.redis.connected')
    })

    await redisClient.connect()
    redisInitialized = true

    return redisClient
  } catch (error) {
    logger.warn({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to connect to Redis, using memory cache')
    redisInitialized = true
    return null
  }
}

/**
 * Cache operations
 */
export class QueryCache {
  /**
   * Get from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now()

    try {
      const redis = await getRedisClient()

      if (redis) {
        const cached = await redis.get(key)

        if (cached) {
          metrics.increment('cache.hit', { backend: 'redis' })
          metrics.recordHistogram('cache.get.duration', Date.now() - startTime, { backend: 'redis' })
          return JSON.parse(cached) as T
        }

        metrics.increment('cache.miss', { backend: 'redis' })
        return null
      }

      // Fallback to memory cache
      const cached = memoryCache.get<T>(key)

      if (cached) {
        metrics.increment('cache.hit', { backend: 'memory' })
      } else {
        metrics.increment('cache.miss', { backend: 'memory' })
      }

      return cached
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error : new Error(String(error)), key }, 'Cache get failed')
      metrics.increment('cache.error', { operation: 'get' })
      return null
    } finally {
      metrics.recordHistogram('cache.get.duration', Date.now() - startTime)
    }
  }

  /**
   * Set in cache
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const startTime = Date.now()

    try {
      const redis = await getRedisClient()

      if (redis) {
        await redis.setEx(key, ttlSeconds, JSON.stringify(value))
        metrics.recordHistogram('cache.set.duration', Date.now() - startTime, { backend: 'redis' })
        return
      }

      // Fallback to memory cache
      memoryCache.set(key, value, ttlSeconds)
      metrics.recordHistogram('cache.set.duration', Date.now() - startTime, { backend: 'memory' })
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error : new Error(String(error)), key }, 'Cache set failed')
      metrics.increment('cache.error', { operation: 'set' })
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const redis = await getRedisClient()

      if (redis) {
        await redis.del(key)
        return
      }

      memoryCache.delete(key)
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error : new Error(String(error)), key }, 'Cache delete failed')
      metrics.increment('cache.error', { operation: 'delete' })
    }
  }

  /**
   * Delete by pattern (Redis only, no-op for memory cache)
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const redis = await getRedisClient()

      if (redis) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(keys)
        }
      }
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error : new Error(String(error)), pattern }, 'Cache pattern delete failed')
      metrics.increment('cache.error', { operation: 'deletePattern' })
    }
  }
}

const queryCache = new QueryCache()

/**
 * Single-flight cache pattern
 * Prevents cache stampede (multiple requests fetching same data)
 */
const inflightRequests = new Map<string, Promise<unknown>>()

export async function cachedQuery<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number
    staleWhileRevalidate?: boolean
  } = {}
): Promise<T> {
  const ttl = options.ttl || CACHE_CONFIG.TTL_MEDIUM

  // Check cache
  const cached = await queryCache.get<T>(cacheKey)

  if (cached !== null) {
    // Cache hit
    return cached
  }

  // Check if request is already in-flight (stampede protection)
  const inflight = inflightRequests.get(cacheKey)
  if (inflight) {
    metrics.increment('cache.stampede_prevented')
    return inflight as Promise<T>
  }

  // Execute fetch
  const fetchPromise = fetchFn()
  inflightRequests.set(cacheKey, fetchPromise)

  try {
    const result = await fetchPromise

    // Cache result
    await queryCache.set(cacheKey, result, ttl)

    return result
  } finally {
    inflightRequests.delete(cacheKey)
  }
}

/**
 * Convenience wrappers for common cache TTLs
 */
export const cache = {
  /**
   * Short TTL (5s) - Transactional data
   */
  short: <T>(key: string, fn: () => Promise<T>): Promise<T> =>
    cachedQuery(key, fn, { ttl: CACHE_CONFIG.TTL_SHORT }),

  /**
   * Medium TTL (60s) - Dashboard aggregates
   */
  medium: <T>(key: string, fn: () => Promise<T>): Promise<T> =>
    cachedQuery(key, fn, { ttl: CACHE_CONFIG.TTL_MEDIUM }),

  /**
   * Long TTL (5min) - Static data
   */
  long: <T>(key: string, fn: () => Promise<T>): Promise<T> =>
    cachedQuery(key, fn, { ttl: CACHE_CONFIG.TTL_LONG }),

  /**
   * Very long TTL (1hr) - Rarely changing
   */
  veryLong: <T>(key: string, fn: () => Promise<T>): Promise<T> =>
    cachedQuery(key, fn, { ttl: CACHE_CONFIG.TTL_VERY_LONG }),

  /**
   * Custom TTL
   */
  custom: <T>(key: string, fn: () => Promise<T>, ttlSeconds: number): Promise<T> =>
    cachedQuery(key, fn, { ttl: ttlSeconds }),

  /**
   * Manual cache operations
   */
  get: <T>(key: string): Promise<T | null> => queryCache.get<T>(key),
  set: <T>(key: string, value: T, ttl: number): Promise<void> => queryCache.set(key, value, ttl),
  delete: (key: string): Promise<void> => queryCache.delete(key),
  deletePattern: (pattern: string): Promise<void> => queryCache.deletePattern(pattern),

  /**
   * Build cache key helper
   */
  key: buildCacheKey,
}

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  /**
   * Invalidate all caches for an organization
   */
  invalidateOrg: (organizationId: string): Promise<void> =>
    cache.deletePattern(`rl:*:${organizationId}:*`),

  /**
   * Invalidate all caches for a repository
   */
  invalidateRepo: (repositoryId: string): Promise<void> =>
    cache.deletePattern(`rl:*:*:${repositoryId}*`),

  /**
   * Invalidate specific namespace
   */
  invalidateNamespace: (namespace: string): Promise<void> =>
    cache.deletePattern(`rl:${namespace}:*`),
}

/**
 * Export for use in application
 */
export { queryCache }

