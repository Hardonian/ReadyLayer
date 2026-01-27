/**
 * Database Access Gateway
 *
 * Centralized DB access layer with OpenAI-style Postgres scaling guardrails:
 * - Query timeouts
 * - Result size limits
 * - Pagination enforcement
 * - Query metrics
 * - Circuit breaker integration
 * - Graceful degradation
 *
 * Based on: OpenAI Postgres scaling playbook (2024)
 */

import { Prisma, PrismaClient } from '@prisma/client'
import { logger } from '../../observability/logging'
import { metrics } from '../../observability/metrics'

/**
 * Configuration
 */
export const DB_GATEWAY_CONFIG = {
  // Query execution limits
  DEFAULT_QUERY_TIMEOUT_MS: 10000, // 10s for most queries
  SLOW_QUERY_THRESHOLD_MS: 1000, // Log queries slower than 1s
  MAX_QUERY_RESULTS: 1000, // Max rows per query (prevent OOM)
  DEFAULT_PAGE_SIZE: 50, // Default pagination limit
  MAX_PAGE_SIZE: 500, // Max pagination limit

  // Write limits
  MAX_BATCH_INSERT: 500, // Max rows per batch insert

  // Analytics query limits (less strict for dashboards)
  ANALYTICS_QUERY_TIMEOUT_MS: 30000, // 30s for analytics
  ANALYTICS_MAX_RESULTS: 10000, // Higher limit for exports
} as const

/**
 * Query timeout wrapper
 * Prevents hung connections from slow queries
 */
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = DB_GATEWAY_CONFIG.DEFAULT_QUERY_TIMEOUT_MS,
  queryName: string = 'unknown'
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Query timeout after ${timeoutMs}ms: ${queryName}`)),
          timeoutMs
        )
      ),
    ])

    const duration = Date.now() - startTime

    // Metrics
    metrics.recordHistogram('db.query.duration', duration, { query: queryName })

    // Slow query logging
    if (duration > DB_GATEWAY_CONFIG.SLOW_QUERY_THRESHOLD_MS) {
      logger.warn({
        query: queryName,
        durationMs: duration,
        threshold: DB_GATEWAY_CONFIG.SLOW_QUERY_THRESHOLD_MS,
      }, 'Slow query detected')
      metrics.increment('db.query.slow', { query: queryName })
    }

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    metrics.increment('db.query.error', {
      query: queryName,
      error: error instanceof Error ? error.message : 'unknown',
    })

    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
      query: queryName,
      durationMs: duration,
    }, 'Query failed')

    throw error
  }
}

/**
 * Pagination sanitizer
 * Enforces safe limits on pagination parameters
 */
export interface PaginationParams {
  take: number
  skip: number
}

export function sanitizePagination(
  limit?: number | null,
  offset?: number | null,
  maxLimit: number = DB_GATEWAY_CONFIG.MAX_QUERY_RESULTS
): PaginationParams {
  const sanitizedLimit = Math.min(
    Math.max(limit || DB_GATEWAY_CONFIG.DEFAULT_PAGE_SIZE, 1),
    maxLimit
  )

  const sanitizedOffset = Math.max(offset || 0, 0)

  return {
    take: sanitizedLimit,
    skip: sanitizedOffset,
  }
}

/**
 * Query builder with automatic pagination and timeouts
 */
export async function findManyWithLimits<T, A>(
  model: {
    findMany: (args: A) => Promise<T[]>
  },
  args: A & { take?: number; skip?: number },
  options: {
    queryName: string
    timeout?: number
    maxResults?: number
  }
): Promise<T[]> {
  // Extract and sanitize pagination
  const { take, skip, ...restArgs } = args
  const pagination = sanitizePagination(take, skip, options.maxResults)

  // Execute with timeout
  return queryWithTimeout(
    () => model.findMany({ ...restArgs, ...pagination } as A),
    options.timeout,
    options.queryName
  )
}

/**
 * Count with timeout
 */
export async function countWithTimeout<A>(
  model: {
    count: (args?: A) => Promise<number>
  },
  args?: A,
  options: {
    queryName: string
    timeout?: number
  } = { queryName: 'count' }
): Promise<number> {
  return queryWithTimeout(
    () => model.count(args),
    options.timeout,
    options.queryName
  )
}

/**
 * Transaction with timeout
 */
export async function transactionWithTimeout<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: {
    queryName: string
    timeout?: number
    maxWait?: number
  }
): Promise<T> {
  return queryWithTimeout(
    () => prisma.$transaction(fn, {
      maxWait: options.maxWait || 5000, // Max 5s wait to acquire transaction
      timeout: options.timeout || DB_GATEWAY_CONFIG.DEFAULT_QUERY_TIMEOUT_MS,
    }),
    (options.timeout || DB_GATEWAY_CONFIG.DEFAULT_QUERY_TIMEOUT_MS) + 1000, // Extra 1s for outer timeout
    options.queryName
  )
}

/**
 * Batch insert with size limit
 */
export async function createManyWithLimit<A extends { data: unknown[] }>(
  model: {
    createMany: (args: A) => Promise<Prisma.BatchPayload>
  },
  args: A,
  options: {
    queryName: string
    maxBatchSize?: number
  }
): Promise<Prisma.BatchPayload> {
  const maxSize = options.maxBatchSize || DB_GATEWAY_CONFIG.MAX_BATCH_INSERT

  if (Array.isArray(args.data) && args.data.length > maxSize) {
    throw new Error(
      `Batch insert too large: ${args.data.length} rows (max: ${maxSize}). Use batching.`
    )
  }

  return queryWithTimeout(
    () => model.createMany(args),
    DB_GATEWAY_CONFIG.DEFAULT_QUERY_TIMEOUT_MS,
    options.queryName
  )
}

/**
 * Safe aggregation for analytics
 * Uses longer timeout and higher result limits
 */
export async function aggregateQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> {
  return queryWithTimeout(
    queryFn,
    DB_GATEWAY_CONFIG.ANALYTICS_QUERY_TIMEOUT_MS,
    `analytics:${queryName}`
  )
}

/**
 * Health check query
 * Tests DB connectivity with fast timeout
 */
export async function healthCheck(prisma: PrismaClient): Promise<boolean> {
  try {
    await queryWithTimeout(
      () => prisma.$queryRaw`SELECT 1 as health`,
      2000, // 2s timeout for health check
      'health_check'
    )
    return true
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'DB health check failed')
    return false
  }
}

/**
 * Connection pool metrics
 */
export async function getPoolMetrics(_prisma: PrismaClient): Promise<{
  activeConnections: number
  idleConnections: number
  totalConnections: number
}> {
  // Prisma doesn't expose pool metrics directly
  // This is a placeholder for custom metrics implementation
  // In production, integrate with Prisma metrics or pg pool

  return {
    activeConnections: 0, // TODO: Implement via Prisma.$metrics or pg instrumentation
    idleConnections: 0,
    totalConnections: 0,
  }
}

/**
 * Graceful error handling
 * Returns null instead of throwing on non-critical queries
 */
export async function queryWithFallback<T>(
  queryFn: () => Promise<T>,
  fallbackValue: T,
  queryName: string
): Promise<T> {
  try {
    return await queryWithTimeout(queryFn, undefined, queryName)
  } catch (error) {
    logger.warn({
      err: error instanceof Error ? error : new Error(String(error)),
      query: queryName,
    }, 'Query failed, using fallback value')

    metrics.increment('db.query.fallback', { query: queryName })

    return fallbackValue
  }
}

/**
 * Query result validator
 * Ensures queries don't return suspiciously large datasets
 */
export function validateQueryResult<T>(
  result: T[],
  queryName: string,
  maxExpected: number = DB_GATEWAY_CONFIG.MAX_QUERY_RESULTS
): T[] {
  if (result.length >= maxExpected) {
    logger.warn({
      query: queryName,
      resultCount: result.length,
      limit: maxExpected,
    }, 'Query returned maximum results - may be truncated')

    metrics.increment('db.query.max_results', { query: queryName })
  }

  return result
}

/**
 * Tenant-scoped query helper
 * Ensures organizationId is always included in where clause
 */
export function enforceTenantScope<T extends { organizationId?: string }>(
  where: T,
  requiredOrgId: string
): T & { organizationId: string } {
  if (where.organizationId && where.organizationId !== requiredOrgId) {
    throw new Error('Tenant isolation violation: organizationId mismatch')
  }

  return {
    ...where,
    organizationId: requiredOrgId,
  }
}

/**
 * Export for use in API routes and services
 */
export const dbGateway = {
  queryWithTimeout,
  findManyWithLimits,
  countWithTimeout,
  transactionWithTimeout,
  createManyWithLimit,
  aggregateQuery,
  sanitizePagination,
  healthCheck,
  getPoolMetrics,
  queryWithFallback,
  validateQueryResult,
  enforceTenantScope,
}
