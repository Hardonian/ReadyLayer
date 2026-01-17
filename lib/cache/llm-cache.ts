/**
 * LLM Response Cache
 *
 * P0-FIX: Replaced in-memory Map with Redis-backed cache (distributed, persistent)
 *
 * Cache key: SHA-256 hash of (prompt + model + temperature)
 * Storage: Redis primary + in-memory fallback
 *
 * Reference: PROMPT_ARCHITECTURE.md - DETERMINISM FIXES
 *
 * IMPORTANT: This file now delegates to llm-cache-redis.ts
 * The API remains unchanged for backward compatibility.
 */

export type { CachedLLMResponse } from './llm-cache-redis';
export {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  clearLLMCache,
  getCacheStats,
  getCacheHealth,
  disconnectCache,
} from './llm-cache-redis';
