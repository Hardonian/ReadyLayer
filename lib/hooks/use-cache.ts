'use client'

import { useCallback, useRef } from 'react'

/**
 * Cache invalidation hook
 *
 * Provides a simple cache invalidation mechanism for client-side data fetching.
 * In a production app, consider using React Query or SWR for more robust caching.
 */
interface UseCacheReturn {
  invalidate: (key: string) => void
  invalidateAll: () => void
  isInvalidated: (key: string) => boolean
  clearInvalidation: (key: string) => void
}

export function useCache(): UseCacheReturn {
  const cacheKeys = useRef<Set<string>>(new Set())

  /**
   * Invalidate a specific cache key
   */
  const invalidate = useCallback((key: string): void => {
    cacheKeys.current.add(key)
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('cache-invalidate', { detail: { key } }))
  }, [])

  /**
   * Invalidate all cache
   */
  const invalidateAll = useCallback((): void => {
    cacheKeys.current.clear()
    window.dispatchEvent(new CustomEvent('cache-invalidate', { detail: { key: '*' } }))
  }, [])

  /**
   * Check if a cache key is invalidated
   */
  const isInvalidated = useCallback((key: string): boolean => {
    return cacheKeys.current.has(key)
  }, [])

  /**
   * Clear invalidation flag for a key (after refetch)
   */
  const clearInvalidation = useCallback((key: string): void => {
    cacheKeys.current.delete(key)
  }, [])

  return {
    invalidate,
    invalidateAll,
    isInvalidated,
    clearInvalidation,
  }
}

/**
 * Cache key constants for consistent invalidation
 */
export const CACHE_KEYS = {
  REPOS: 'repos',
  REPO: (id: string) => `repo:${id}`,
  REVIEWS: 'reviews',
  REVIEW: (id: string) => `review:${id}`,
  RUNS: 'runs',
  RUN: (id: string) => `run:${id}`,
  METRICS: 'metrics',
  DASHBOARD: 'dashboard',
} as const
