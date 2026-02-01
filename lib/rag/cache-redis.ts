/**
 * Redis-Backed RAG Cache
 * 
 * Persistent, cross-instance cache for RAG queries with in-memory fallback.
 * Dramatically reduces redundant LLM and embedding API calls.
 * 
 * Features:
 * - Redis primary cache (persistent, shared across instances)
 * - In-memory fallback (if Redis unavailable)
 * - TTL-based expiration
 * - Pre-warming for hot queries
 * - Metrics: hit rate, eviction rate
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../../observability/logging';
import { metrics } from '../../observability/metrics';
import { hashContent } from './hash';
import type { RagQuery, RagResult } from './types';

interface CacheEntry {
  results: RagResult[];
  expiresAt: number;
}

interface CacheMetrics {
  redisHits: number;
  redisMisses: number;
  inMemoryHits: number;
  inMemoryMisses: number;
  errors: number;
  hitRate: number;
}

interface CacheHealthStatus {
  redisHealthy: boolean;
  inMemorySize: number;
  inMemoryMaxSize: number;
  hitRate: number;
}

class RedisRAGCache {
  private redisClient: RedisClientType | null = null;
  private inMemoryCache: Map<string, CacheEntry> = new Map();
  private inMemoryMaxSize = 1000;
  private inMemoryTTL = 5 * 60 * 1000; // 5 minutes
  private redisTTL = 24 * 60 * 60; // 24 hours (Redis)
  private isRedisHealthy = false;
  private cacheKeyPrefix = 'readylayer:rag:';
  private metrics = {
    redisHits: 0,
    redisMisses: 0,
    inMemoryHits: 0,
    inMemoryMisses: 0,
    errors: 0,
  };

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.info('Redis not configured, using in-memory cache only');
      return;
    }

    try {
      this.redisClient = createClient({ url: redisUrl });

      this.redisClient.on('error', (err) => {
        logger.warn({ err }, 'Redis error, falling back to in-memory cache');
        this.isRedisHealthy = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected');
        this.isRedisHealthy = true;
      });

      await this.redisClient.connect();
      this.isRedisHealthy = true;
      logger.info('Redis RAG cache initialized');
    } catch (error) {
      logger.warn({ error }, 'Failed to connect to Redis, using in-memory cache only');
      this.isRedisHealthy = false;
    }
  }

  /**
   * Generate cache key from query
   */
  private getCacheKey(query: RagQuery): string {
    const keyParts = [
      query.organizationId,
      query.repositoryId || '',
      query.queryText,
      query.topK || 10,
      JSON.stringify(query.filters || {}),
    ];
    const hash = hashContent(keyParts.join('|'));
    return `${this.cacheKeyPrefix}${hash}`;
  }

  /**
   * Get cached results (tries Redis first, then in-memory)
   */
  async get(query: RagQuery): Promise<RagResult[] | null> {
    const key = this.getCacheKey(query);

    // Try Redis first
    if (this.isRedisHealthy && this.redisClient) {
      try {
        const redisData = await this.redisClient.get(key);
        if (redisData) {
          const cached = JSON.parse(redisData) as CacheEntry;
          if (Date.now() < cached.expiresAt) {
            this.metrics.redisHits++;
            metrics.increment('cache_redis_hit');
            logger.debug({ key }, 'Redis cache hit');
            return cached.results;
          }
          // Expired in Redis, delete it
          await this.redisClient.del(key);
        }
      } catch (error) {
        this.metrics.errors++;
        logger.warn({ error, key }, 'Redis get error');
      }
    }

    this.metrics.redisMisses++;

    // Fall back to in-memory cache
    const inMemEntry = this.inMemoryCache.get(key);
    if (inMemEntry && Date.now() < inMemEntry.expiresAt) {
      this.metrics.inMemoryHits++;
      metrics.increment('cache_memory_hit');
      logger.debug({ key }, 'In-memory cache hit');
      return inMemEntry.results;
    }

    this.metrics.inMemoryMisses++;
    metrics.increment('cache_miss');
    logger.debug({ key }, 'Cache miss');
    return null;
  }

  /**
   * Set cache entry (writes to both Redis and in-memory)
   */
  async set(query: RagQuery, results: RagResult[]): Promise<void> {
    const key = this.getCacheKey(query);
    const expiresAt = Date.now() + this.inMemoryTTL;
    const entry: CacheEntry = { results, expiresAt };

    // Write to in-memory cache
    try {
      if (this.inMemoryCache.size >= this.inMemoryMaxSize) {
        // Evict oldest entry
        const firstKey = this.inMemoryCache.keys().next().value;
        if (firstKey) {
          this.inMemoryCache.delete(firstKey);
          metrics.increment('cache_eviction');
        }
      }
      this.inMemoryCache.set(key, entry);
    } catch (error) {
      logger.warn({ error }, 'In-memory cache set error');
    }

    // Write to Redis (with longer TTL)
    if (this.isRedisHealthy && this.redisClient) {
      try {
        const redisEntry: CacheEntry = {
          results,
          expiresAt: Date.now() + this.redisTTL * 1000,
        };
        await this.redisClient.setEx(
          key,
          this.redisTTL,
          JSON.stringify(redisEntry)
        );
        logger.debug({ key }, 'Cache written to Redis');
      } catch (error) {
        logger.warn({ error, key }, 'Redis set error');
      }
    }

    metrics.increment('cache_write');
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(query: RagQuery): Promise<void> {
    const key = this.getCacheKey(query);

    // Remove from in-memory
    this.inMemoryCache.delete(key);

    // Remove from Redis
    if (this.isRedisHealthy && this.redisClient) {
      try {
        await this.redisClient.del(key);
        logger.debug({ key }, 'Cache invalidated');
      } catch (error) {
        logger.warn({ error, key }, 'Redis invalidate error');
      }
    }

    metrics.increment('cache_invalidation');
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.inMemoryCache.clear();

    if (this.isRedisHealthy && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${this.cacheKeyPrefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        logger.info('Cache cleared');
      } catch (error) {
        logger.warn({ error }, 'Redis clear error');
      }
    }
  }

  /**
   * Pre-warm cache with common queries
   */
  async prewarm(queries: Array<{ query: RagQuery; results: RagResult[] }>): Promise<void> {
    logger.info({ count: queries.length }, 'Pre-warming cache');

    for (const { query, results } of queries) {
      try {
        await this.set(query, results);
      } catch (error) {
        logger.warn({ error }, 'Pre-warm error');
      }
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
    const totalHits = this.metrics.redisHits + this.metrics.inMemoryHits;
    const totalMisses = this.metrics.redisMisses + this.metrics.inMemoryMisses;
    const hitRate = totalHits / (totalHits + totalMisses || 1);

    return {
      redisHealthy: this.isRedisHealthy,
      inMemorySize: this.inMemoryCache.size,
      inMemoryMaxSize: this.inMemoryMaxSize,
      hitRate: hitRate * 100,
    };
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return {
      ...this.metrics,
      hitRate:
        (this.metrics.redisHits + this.metrics.inMemoryHits) /
        (this.metrics.redisHits +
          this.metrics.inMemoryHits +
          this.metrics.redisMisses +
          this.metrics.inMemoryMisses || 1),
    };
  }

  /**
   * Cleanup on shutdown
   */
  async disconnect(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.disconnect();
        logger.info('Redis disconnected');
      } catch (error) {
        logger.warn({ error }, 'Redis disconnect error');
      }
    }
  }
}

// Singleton instance
export const ragCache = new RedisRAGCache();

/**
 * Backward-compatible API (same as lib/rag/cache.ts)
 */
export async function getCachedResults(query: RagQuery): Promise<RagResult[] | null> {
  return ragCache.get(query);
}

export async function cacheResults(query: RagQuery, results: RagResult[]): Promise<void> {
  return ragCache.set(query, results);
}

export async function clearCache(): Promise<void> {
  return ragCache.clear();
}

export function getCacheHealth(): CacheHealthStatus {
  return ragCache.getHealthStatus();
}

export function getCacheMetrics(): CacheMetrics {
  return ragCache.getMetrics();
}
