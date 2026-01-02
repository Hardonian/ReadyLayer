/**
 * Semantic Cache for RAG Queries
 * 
 * Caches query results to avoid redundant embedding/retrieval calls
 */

import { hashContent } from './hash';
import type { RagQuery, RagResult } from './types';

interface CacheEntry {
  results: RagResult[];
  expiresAt: number;
}

// In-memory LRU cache (server-only, short TTL)
// In production, use Redis if available
class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize = 1000; // Max entries
  private ttl = 5 * 60 * 1000; // 5 minutes

  get(key: string): RagResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.results;
  }

  set(key: string, results: RagResult[]): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      results,
      expiresAt: Date.now() + this.ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new InMemoryCache();

/**
 * Generate cache key from query
 */
function getCacheKey(query: RagQuery): string {
  const keyParts = [
    query.organizationId,
    query.repositoryId || '',
    query.queryText,
    query.topK || 10,
    JSON.stringify(query.filters || {}),
  ];
  return hashContent(keyParts.join('|'));
}

/**
 * Get cached results if available
 */
export function getCachedResults(query: RagQuery): RagResult[] | null {
  const key = getCacheKey(query);
  return cache.get(key);
}

/**
 * Cache query results
 */
export function cacheResults(query: RagQuery, results: RagResult[]): void {
  const key = getCacheKey(query);
  cache.set(key, results);
}

/**
 * Clear cache (useful for testing or cache invalidation)
 */
export function clearCache(): void {
  cache.clear();
}
