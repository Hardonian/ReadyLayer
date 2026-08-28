'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useCache, CACHE_KEYS } from './use-cache'

/**
 * Hook for refetching data when cache is invalidated
 *
 * Usage:
 * ```tsx
 * const { refetch } = useRefetch()
 *
 * useEffect(() => {
 *   const handleInvalidate = () => refetch()
 *   window.addEventListener('cache-invalidate', handleInvalidate)
 *   return () => window.removeEventListener('cache-invalidate', handleInvalidate)
 * }, [refetch])
 * ```
 */
export function useRefetch(): {
  registerRefetch: (key: string, callback: () => void) => () => void
  refetch: (key: string) => void
  refetchAll: () => void
} {
  const refetchCallbacks = useRef<Map<string, () => void>>(new Map())
  const { clearInvalidation } = useCache()

  /**
   * Register a refetch callback for a cache key
   */
  const registerRefetch = useCallback((key: string, callback: () => void): (() => void) => {
    refetchCallbacks.current.set(key, callback)
    return (): void => {
      refetchCallbacks.current.delete(key)
    }
  }, [])

  /**
   * Refetch data for a specific cache key
   */
  const refetch = useCallback((key: string): void => {
    const callback = refetchCallbacks.current.get(key)
    if (callback) {
      callback()
      clearInvalidation(key)
    }
  }, [clearInvalidation])

  /**
   * Refetch all registered data
   */
  const refetchAll = useCallback((): void => {
    refetchCallbacks.current.forEach((callback) => {
      callback()
    })
    refetchCallbacks.current.forEach((_, key) => {
      clearInvalidation(key)
    })
  }, [clearInvalidation])

  /**
   * Listen for cache invalidation events
   */
  useEffect(() => {
    const handleInvalidate = (event: Event): void => {
      const customEvent = event as CustomEvent<{ key: string }>
      const { key } = customEvent.detail

      if (key === '*') {
        refetchAll()
      } else {
        refetch(key)
      }
    }

    window.addEventListener('cache-invalidate', handleInvalidate)
    return (): void => {
      window.removeEventListener('cache-invalidate', handleInvalidate)
    }
  }, [refetch, refetchAll])

  return {
    registerRefetch,
    refetch,
    refetchAll,
  }
}

export { CACHE_KEYS }
