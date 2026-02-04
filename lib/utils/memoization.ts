/**
 * Memoization Utilities
 * 
 * Provides caching decorators and utilities for expensive function calls.
 * Optimized for high-frequency operations with TTL and LRU eviction.
 */

import { logger } from '../../observability/logging';

interface MemoizeOptions {
  ttlMs: number;
  keyGenerator?: (...args: unknown[]) => string;
  maxSize?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

export function createMemoizedFunction<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: MemoizeOptions
): T {
  const cache = new Map<string, CacheEntry<ReturnType<T>>>();
  const maxSize = options.maxSize ?? 1000;

  // Cleanup interval (every 30 seconds)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt < now) {
        cache.delete(key);
      }
    }
  }, 30000);

  // Prevent unhandled rejection on cleanup
  cleanupInterval.unref?.();

  return async function memoizedWrapper(...args: Parameters<T>): Promise<ReturnType<T>> {
    const key = options.keyGenerator 
      ? options.keyGenerator(...args)
      : JSON.stringify(args);

    const now = Date.now();
    const cached = cache.get(key);

    // Check if cached and not expired
    if (cached && cached.expiresAt > now) {
      cached.lastAccessed = now;
      return cached.value;
    }

    // LRU eviction if at capacity
    if (cache.size >= maxSize && !cached) {
      let oldestKey = cache.keys().next().value as string;
      let oldestTime = cache.get(oldestKey)?.lastAccessed ?? now;
      
      for (const [k, v] of cache.entries()) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      cache.delete(oldestKey);
    }

    const result = await fn(...args) as ReturnType<T>;
    
    cache.set(key, {
      value: result,
      expiresAt: now + options.ttlMs,
      lastAccessed: now,
    });

    return result;
  } as T;
}

/**
 * Simple in-memory cache with TTL and LRU
 */
export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) return undefined;

    if (entry.expiresAt < now) {
      this.cache.delete(key);
      return undefined;
    }

    entry.lastAccessed = now;
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    const now = Date.now();

    // LRU eviction if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: now + ttlMs,
      lastAccessed: now,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictLRU(): void {
    let oldestKey = this.cache.keys().next().value as string;
    let oldestTime = this.cache.get(oldestKey)?.lastAccessed ?? Date.now();
    
    for (const [k, v] of this.cache.entries()) {
      if (v.lastAccessed < oldestTime) {
        oldestTime = v.lastAccessed;
        oldestKey = k;
      }
    }
    this.cache.delete(oldestKey);
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Memoization decorator for class methods
 */
export function memoize<T>(options: MemoizeOptions) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    if (typeof descriptor.value !== 'function') {
      throw new Error(`@memoize can only be applied to methods. Received: ${typeof descriptor.value}`);
    }

    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<T>;
    const cache = new Map<string, CacheEntry<T>>();
    const maxSize = options.maxSize ?? 1000;

    descriptor.value = async function memoizedMethod(...args: unknown[]): Promise<T> {
      const key = options.keyGenerator 
        ? options.keyGenerator(...args)
        : `${propertyKey}:${JSON.stringify(args)}`;

      const now = Date.now();
      const cached = cache.get(key);

      if (cached && cached.expiresAt > now) {
        cached.lastAccessed = now;
        return cached.value;
      }

      // LRU eviction
      if (cache.size >= maxSize && !cached) {
        let oldestKey = cache.keys().next().value as string;
        let oldestTime = cache.get(oldestKey)?.lastAccessed ?? now;
        
        for (const [k, v] of cache.entries()) {
          if (v.lastAccessed < oldestTime) {
            oldestTime = v.lastAccessed;
            oldestKey = k;
          }
        }
        cache.delete(oldestKey);
      }

      try {
        const result = await originalMethod.apply(this, args) as T;
        
        cache.set(key, {
          value: result,
          expiresAt: now + options.ttlMs,
          lastAccessed: now,
        });

        return result;
      } catch (error) {
        logger.warn({ error, method: propertyKey }, 'Memoized method failed');
        throw error;
      }
    };

    return descriptor;
  };
}
