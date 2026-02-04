/**
 * Prisma Client Singleton
 *
 * Connection pooling, query timeouts, and singleton pattern for optimal performance.
 * Configured for Postgres scaling per OpenAI playbook.
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../observability/logging'
import { metrics } from '../observability/metrics'

// Extend PrismaClient to add connection pool configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Determine log level for Prisma based on environment
 */
function getPrismaLogLevel(): Array<'query' | 'error' | 'warn'> {
  if (process.env.NODE_ENV === 'development') {
    return ['query', 'error', 'warn']
  }

  // Production: Log slow queries only
  if (process.env.LOG_SLOW_QUERIES === 'true') {
    return ['error', 'warn']
  }

  return ['error']
}

/**
 * Create Prisma client with optimized configuration
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: getPrismaLogLevel() as Array<'query' | 'error' | 'warn'>,

    // Query logging in production (for slow query detection)
    // @ts-ignore - Prisma types don't include this yet
    ...(process.env.NODE_ENV === 'production' && {
      // Log queries slower than 1s
      log: [
        { level: 'query' as 'query', emit: 'event' as 'event' },
        { level: 'error' as 'error', emit: 'event' as 'event' },
      ],
    }),
  })

  // Hook query events for metrics and slow query logging (with sampling)
  if (process.env.NODE_ENV === 'production' || process.env.LOG_SLOW_QUERIES === 'true') {
    // Metrics sampling - only record 10% of queries to reduce overhead
    let queryCount = 0

    // @ts-ignore
    client.$on('query', (e: { query: string; duration: number; params: string }) => {
      const durationMs = e.duration
      queryCount++

      // Always log slow queries (> 1s)
      if (durationMs > 1000) {
        logger.warn({
          query: e.query.substring(0, 200), // Truncate long queries
          durationMs,
          params: e.params,
        }, 'Slow query detected')

        metrics.increment('prisma.slow_query', {
          duration_bucket: durationMs > 5000 ? '5s+' : '1-5s',
        })
      }

      // Sample metrics for performance (only 10% of queries)
      if (queryCount % 10 === 0) {
        metrics.recordHistogram('prisma.query.duration', durationMs)
      }
    })

    // @ts-ignore
    client.$on('error', (e: { message: string }) => {
      logger.error({ err: new Error(e.message) }, 'Prisma query error')
      metrics.increment('prisma.query.error')
    })
  }

  return client
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

// Connection pool configuration notes:
//
// For Supabase with PgBouncer (RECOMMENDED):
// DATABASE_URL="postgresql://user:password@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true"
// DIRECT_URL="postgresql://user:password@xxx.supabase.com:5432/postgres" (for migrations)
//
// Connection string parameters:
// - connection_limit=10 (max connections per Prisma instance, default: num_cpus * 2 + 1)
// - pool_timeout=10 (seconds to wait for connection from pool)
// - connect_timeout=10 (seconds to wait for initial connection)
// - statement_timeout=30000 (milliseconds, query execution timeout)
// - lock_timeout=5000 (milliseconds, lock wait timeout)
//
// Example optimized connection string:
// postgresql://user:password@host:6543/db?pgbouncer=true&connection_limit=10&pool_timeout=10&statement_timeout=30000&lock_timeout=5000

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown with connection draining
async function gracefulShutdown(): Promise<void> {
  logger.info('Disconnecting Prisma client...')

  try {
    await prisma.$disconnect()
    logger.info('Prisma client disconnected successfully')
  } catch (error) {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Error disconnecting Prisma client')
  }
}

process.on('beforeExit', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Export gateway helpers for use in application
export { dbGateway } from './db/gateway'
export { dbCircuitBreaker, withCircuitBreaker } from './db/circuit-breaker'
export { cache, cacheInvalidation } from './db/cache'

export default prisma
