/**
 * Redis-Backed LLM Response Cache
 *
 * Persistent, cross-instance cache for deterministic LLM responses.
 * Replaces in-memory cache with Redis primary + in-memory fallback.
 *
 * P0-FIX: Distributed cache shared across server instances
 *
 * Features:
 * - Redis primary cache (persistent, shared across instances)
 * - In-memory fallback (if Redis unavailable)
 * - TTL-based expiration (7 days Redis, 1 hour in-memory)
 * - Deterministic cache keys (SHA-256 of prompt+model+temperature)
 * - Metrics: hit rate, eviction rate, errors
 * - Graceful degradation on Redis errors
 */

import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export interface CachedLLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
  cost: number;
  cachedAt: Date;
}

interface CacheEntry {
  response: CachedLLMResponse;
  expiresAt: number;
  lastAccessed: number; // P3-FIX: Track for LRU eviction
}

class RedisLLMCache {
  private redisClient: RedisClientType | null = null;
  private inMemoryCache: Map<string, CacheEntry> = new Map();
  private inMemoryMaxSize = 1000;
  private inMemoryTTL = 60 * 60 * 1000; // 1 hour (in-memory)
  private redisTTL = 7 * 24 * 60 * 60; // 7 days (Redis)
  private isRedisHealthy = false;
  private cacheKeyPrefix = 'readylayer:llm:';
  private cacheMetrics = {
    redisHits: 0,
    redisMisses: 0,
    inMemoryHits: 0,
    inMemoryMisses: 0,
    errors: 0,
    writes: 0,
    evictions: 0,
  };

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with health monitoring
   */
  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.info('Redis not configured for LLM cache, using in-memory cache only');
      return;
    }

    try {
      this.redisClient = createClient({ url: redisUrl });

      this.redisClient.on('error', (err) => {
        logger.warn({ err }, 'Redis error for LLM cache, falling back to in-memory');
        this.isRedisHealthy = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected for LLM cache');
        this.isRedisHealthy = true;
      });

      await this.redisClient.connect();
      this.isRedisHealthy = true;
      logger.info('Redis LLM cache initialized successfully');
    } catch (error) {
      logger.warn({ error }, 'Failed to connect to Redis for LLM cache, using in-memory only');
      this.isRedisHealthy = false;
    }
  }

  /**
   * Generate deterministic cache key from LLM request parameters
   * Same input = same key (for deterministic caching)
   */
  generateCacheKey(prompt: string, model: string, temperature: number): string {
    const input = `${prompt}|${model}|${temperature}`;
    const hash = createHash('sha256').update(input).digest('hex');
    return `${this.cacheKeyPrefix}${hash}`;
  }

  /**
   * Get cached LLM response (tries Redis first, then in-memory)
   */
  async get(cacheKey: string): Promise<CachedLLMResponse | null> {
    // Try Redis first (shared across instances)
    if (this.isRedisHealthy && this.redisClient) {
      try {
        const redisData = await this.redisClient.get(cacheKey);
        if (redisData) {
          const cached = JSON.parse(redisData) as CacheEntry;
          if (Date.now() < cached.expiresAt) {
            this.cacheMetrics.redisHits++;
            metrics.increment('llm_cache_redis_hit');
            logger.debug({ cacheKey }, 'Redis LLM cache hit');
            return cached.response;
          }
          // Expired in Redis, delete it
          await this.redisClient.del(cacheKey);
        }
      } catch (error) {
        this.cacheMetrics.errors++;
        logger.warn({ error, cacheKey }, 'Redis get error for LLM cache');
      }
    }

    this.cacheMetrics.redisMisses++;

    // Fall back to in-memory cache
    const inMemEntry = this.inMemoryCache.get(cacheKey);
    if (inMemEntry && Date.now() < inMemEntry.expiresAt) {
      // P3-FIX: Update lastAccessed for LRU tracking
      inMemEntry.lastAccessed = Date.now();
      this.inMemoryCache.set(cacheKey, inMemEntry);

      this.cacheMetrics.inMemoryHits++;
      metrics.increment('llm_cache_memory_hit');
      logger.debug({ cacheKey }, 'In-memory LLM cache hit');
      return inMemEntry.response;
    }

    this.cacheMetrics.inMemoryMisses++;
    metrics.increment('llm_cache_miss');
    logger.debug({ cacheKey }, 'LLM cache miss');
    return null;
  }

  /**
   * Set cache entry (writes to both Redis and in-memory)
   */
  async set(
    cacheKey: string,
    response: {
      content: string;
      model: string;
      tokensUsed: number;
      cost: number;
    }
  ): Promise<void> {
    const cachedResponse: CachedLLMResponse = {
      ...response,
      cachedAt: new Date(),
    };

    const expiresAt = Date.now() + this.inMemoryTTL;
    const lastAccessed = Date.now();
    const entry: CacheEntry = { response: cachedResponse, expiresAt, lastAccessed };

    // Write to in-memory cache (short TTL, fast access)
    try {
      if (this.inMemoryCache.size >= this.inMemoryMaxSize) {
        // P3-FIX: Evict least recently used entry (LRU) instead of oldest (FIFO)
        let lruKey: string | null = null;
        let oldestAccess = Date.now();

        for (const [key, value] of this.inMemoryCache.entries()) {
          if (value.lastAccessed < oldestAccess) {
            oldestAccess = value.lastAccessed;
            lruKey = key;
          }
        }

        if (lruKey) {
          this.inMemoryCache.delete(lruKey);
          this.cacheMetrics.evictions++;
          metrics.increment('llm_cache_eviction');
          logger.debug({ evictedKey: lruKey, lastAccessed: oldestAccess }, 'LRU cache eviction');
        }
      }
      this.inMemoryCache.set(cacheKey, entry);
    } catch (error) {
      logger.warn({ error }, 'In-memory LLM cache set error');
    }

    // Write to Redis (long TTL, persistent, shared)
    if (this.isRedisHealthy && this.redisClient) {
      try {
        const redisEntry: CacheEntry = {
          response: cachedResponse,
          expiresAt: Date.now() + this.redisTTL * 1000,
          lastAccessed: Date.now(),
        };
        await this.redisClient.setEx(
          cacheKey,
          this.redisTTL,
          JSON.stringify(redisEntry)
        );
        logger.debug({ cacheKey, cacheSize: this.inMemoryCache.size }, 'LLM response cached to Redis');
      } catch (error) {
        this.cacheMetrics.errors++;
        logger.warn({ error, cacheKey }, 'Redis set error for LLM cache');
      }
    }

    this.cacheMetrics.writes++;
    metrics.increment('llm_cache_write');
  }

  /**
   * Clear entire LLM cache (both Redis and in-memory)
   */
  async clear(): Promise<void> {
    this.inMemoryCache.clear();

    if (this.isRedisHealthy && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${this.cacheKeyPrefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        logger.info('LLM cache cleared (Redis + in-memory)');
      } catch (error) {
        logger.warn({ error }, 'Redis clear error for LLM cache');
      }
    } else {
      logger.info('LLM cache cleared (in-memory only)');
    }
  }

  /**
   * Get cache health status
   */
  getHealthStatus(): {
    redisHealthy: boolean;
    inMemorySize: number;
    inMemoryMaxSize: number;
    hitRate: number;
  } {
    const totalHits = this.cacheMetrics.redisHits + this.cacheMetrics.inMemoryHits;
    const totalMisses = this.cacheMetrics.redisMisses + this.cacheMetrics.inMemoryMisses;
    const hitRate = totalHits / (totalHits + totalMisses || 1);

    return {
      redisHealthy: this.isRedisHealthy,
      inMemorySize: this.inMemoryCache.size,
      inMemoryMaxSize: this.inMemoryMaxSize,
      hitRate: hitRate * 100,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    metrics: {
      redisHits: number;
      redisMisses: number;
      inMemoryHits: number;
      inMemoryMisses: number;
      errors: number;
      writes: number;
    };
  } {
    const totalHits = this.cacheMetrics.redisHits + this.cacheMetrics.inMemoryHits;
    const totalMisses = this.cacheMetrics.redisMisses + this.cacheMetrics.inMemoryMisses;
    const hitRate = totalHits / (totalHits + totalMisses || 1);

    return {
      size: this.inMemoryCache.size,
      hitRate: hitRate * 100,
      metrics: { ...this.cacheMetrics },
    };
  }

  /**
   * Cleanup on shutdown
   */
  async disconnect(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.disconnect();
        logger.info('Redis LLM cache disconnected');
      } catch (error) {
        logger.warn({ error }, 'Redis LLM cache disconnect error');
      }
    }
  }
}

// Singleton instance
const llmCacheInstance = new RedisLLMCache();

/**
 * Generate cache key from LLM request parameters
 */
export function generateCacheKey(
  prompt: string,
  model: string,
  temperature: number
): string {
  return llmCacheInstance.generateCacheKey(prompt, model, temperature);
}

/**
 * Get cached LLM response
 */
export async function getCachedResponse(
  cacheKey: string
): Promise<CachedLLMResponse | null> {
  try {
    return await llmCacheInstance.get(cacheKey);
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        cacheKey,
      },
      'Failed to get cached LLM response'
    );
    return null; // Fail gracefully - don't block on cache errors
  }
}

/**
 * Set cached LLM response
 */
export async function setCachedResponse(
  cacheKey: string,
  response: {
    content: string;
    model: string;
    tokensUsed: number;
    cost: number;
  }
): Promise<void> {
  try {
    await llmCacheInstance.set(cacheKey, response);
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        cacheKey,
      },
      'Failed to cache LLM response'
    );
    // Fail gracefully - don't block on cache errors
  }
}

/**
 * Clear entire LLM cache
 */
export async function clearLLMCache(): Promise<void> {
  return llmCacheInstance.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  hitRate: number;
} {
  const stats = llmCacheInstance.getStats();
  return {
    size: stats.size,
    hitRate: stats.hitRate,
  };
}

interface CacheHealthStatus {
  redisHealthy: boolean;
  inMemorySize: number;
  inMemoryMaxSize: number;
  hitRate: number;
}

/**
 * Get cache health status
 */
export function getCacheHealth(): CacheHealthStatus {
  return llmCacheInstance.getHealthStatus();
}

/**
 * Disconnect Redis client (for graceful shutdown)
 */
export async function disconnectCache(): Promise<void> {
  return llmCacheInstance.disconnect();
}
