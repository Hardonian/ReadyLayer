/**
 * LLM Response Cache
 *
 * P0: Implement result caching for deterministic LLM responses.
 * Cache key: SHA-256 hash of (prompt + model + temperature)
 *
 * Reference: PROMPT_ARCHITECTURE.md - DETERMINISM FIXES
 */

import { createHash } from 'crypto';
import { prisma } from '../prisma';
import { logger } from '../observability/logging';

export interface CachedLLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
  cost: number;
  cachedAt: Date;
}

/**
 * Generate cache key from LLM request parameters
 */
export function generateCacheKey(
  prompt: string,
  model: string,
  temperature: number
): string {
  const input = `${prompt}|${model}|${temperature}`;
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Get cached LLM response
 */
export async function getCachedResponse(
  cacheKey: string
): Promise<CachedLLMResponse | null> {
  try {
    // For now, we'll use a simple in-memory cache
    // In production, this should use Redis or similar
    const cached = LLM_CACHE.get(cacheKey);

    if (cached) {
      logger.debug(
        { cacheKey },
        'LLM response cache hit'
      );
      return cached;
    }

    logger.debug(
      { cacheKey },
      'LLM response cache miss'
    );
    return null;
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
    const cached: CachedLLMResponse = {
      ...response,
      cachedAt: new Date(),
    };

    // Store in in-memory cache
    LLM_CACHE.set(cacheKey, cached);

    // P0: Implement cache eviction policy (LRU with 1000 entry limit)
    if (LLM_CACHE.size > 1000) {
      // Remove oldest entry (first entry)
      const firstKey = LLM_CACHE.keys().next().value;
      if (firstKey) {
        LLM_CACHE.delete(firstKey);
      }
    }

    logger.debug(
      { cacheKey, cacheSize: LLM_CACHE.size },
      'LLM response cached'
    );
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
export function clearLLMCache(): void {
  LLM_CACHE.clear();
  logger.info('LLM cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  hitRate?: number;
} {
  return {
    size: LLM_CACHE.size,
    // Would track hit rate in production
  };
}

/**
 * In-memory LLM response cache
 * In production, this should be replaced with Redis or similar
 */
const LLM_CACHE = new Map<string, CachedLLMResponse>();
