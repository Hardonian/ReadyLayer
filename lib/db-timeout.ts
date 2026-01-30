/**
 * Database Query Timeout Utility
 *
 * Prevents database queries from hanging indefinitely
 * Provides timeout enforcement for Prisma operations
 */

import { logger } from '@/observability/logging';

/**
 * Default timeout for database queries (10 seconds)
 */
const DEFAULT_QUERY_TIMEOUT_MS = 10000;

/**
 * Timeout error for database operations
 */
export class DatabaseTimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`Database operation '${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'DatabaseTimeoutError';
  }
}

/**
 * Execute a promise with a timeout
 *
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param operation - Operation name for error messages
 * @returns Promise result or throws DatabaseTimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  operation: string = 'database query'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      logger.error(`Database timeout: ${operation} exceeded ${timeoutMs}ms`);
      reject(new DatabaseTimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Execute Promise.all with individual timeouts on each promise
 * If a promise times out, it rejects and fails the entire operation
 *
 * @param promises - Array of promises
 * @param timeoutMs - Timeout for each promise
 * @param operation - Operation name for error messages
 * @returns Array of results
 */
export async function promiseAllWithTimeout<T extends readonly unknown[] | []>(
  promises: readonly [...{ [K in keyof T]: Promise<T[K]> }],
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  operation: string = 'batch query'
): Promise<T> {
  return Promise.all(
    promises.map((promise, index) =>
      withTimeout(promise as Promise<T[number]>, timeoutMs, `${operation}[${index}]`)
    )
  ) as Promise<T>;
}

/**
 * Execute Promise.all with graceful degradation
 * If a promise times out or fails, it returns null instead of failing the entire batch
 *
 * @param promises - Array of promises
 * @param timeoutMs - Timeout for each promise
 * @param operation - Operation name for error messages
 * @returns Array of results (null for failed promises)
 */
export async function promiseAllSettledWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  operation: string = 'batch query'
): Promise<(T | null)[]> {
  const results = await Promise.allSettled(
    promises.map((promise, index) =>
      withTimeout(promise, timeoutMs, `${operation}[${index}]`)
    )
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.warn(`Promise ${index} failed or timed out in ${operation}`, {
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      return null;
    }
  });
}
