/**
 * Audit Log Worker
 *
 * Processes queued audit logs in batches to reduce write load.
 *
 * Pattern:
 * - Poll queue every 5 seconds
 * - Batch up to 100 events
 * - Write to DB in single transaction
 * - Retry on failure
 */

import { logger } from '../../observability/logging'
import { metrics } from '../../observability/metrics'
import { getAuditQueue, flushAuditLogs, type AuditEvent } from '../../lib/audit-async'
import { queueService } from '../../queue'

/**
 * Worker configuration
 */
const WORKER_CONFIG = {
  POLL_INTERVAL_MS: 5000, // Poll every 5 seconds
  BATCH_SIZE: 100, // Process up to 100 events per batch
  MAX_RETRIES: 3, // Retry failed batches up to 3 times
  RETRY_DELAY_MS: 10000, // Wait 10s before retry
}

/**
 * Process audit log queue
 */
async function processAuditQueue(): Promise<void> {
  try {
    // Use existing queue service pattern
    await queueService.processQueue('audit', async (payload: unknown) => {
      if (!isAuditEvent(payload)) {
        logger.warn({ payload }, 'Invalid audit event payload')
        return
      }

      // Process single event
      await flushAuditLogs([payload as AuditEvent])
    })
  } catch (error) {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Audit queue processing failed')
    metrics.increment('audit.worker.error')
  }
}

/**
 * Type guard for audit event
 */
function isAuditEvent(payload: unknown): payload is AuditEvent {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    'priority' in payload &&
    'timestamp' in payload
  )
}

/**
 * Batch processor (alternative to queue service pattern)
 * Uses direct queue polling for larger batches
 */
async function batchProcessor(): Promise<void> {
  logger.info('Starting audit log batch processor')

  while (true) {
    try {
      const queue = await getAuditQueue()

      // Dequeue batch
      const events = await queue.dequeue(WORKER_CONFIG.BATCH_SIZE)

      if (events.length > 0) {
        logger.info({ count: events.length }, 'Processing audit log batch')

        // Flush to database
        await flushAuditLogs(events)
      }

      // Wait before next poll
      await sleep(WORKER_CONFIG.POLL_INTERVAL_MS)
    } catch (error) {
      logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
      }, 'Batch processor error')
      metrics.increment('audit.worker.batch_error')

      // Continue after error
      await sleep(WORKER_CONFIG.POLL_INTERVAL_MS)
    }
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Start audit worker
 */
export async function startAuditWorker(): Promise<void> {
  logger.info('Starting audit log worker')

  // Use queue service pattern (recommended)
  await processAuditQueue()

  // Alternative: Use batch processor
  // await batchProcessor()
}

/**
 * Health check
 */
export async function auditWorkerHealth(): Promise<{
  healthy: boolean
  queueDepth?: number
}> {
  try {
    const queue = await getAuditQueue()

    // Check queue depth if using memory queue
    if ('size' in queue && typeof queue.size === 'function') {
      const depth = queue.size()
      return {
        healthy: depth < 5000, // Unhealthy if queue backing up
        queueDepth: depth,
      }
    }

    return { healthy: true }
  } catch (error) {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Audit worker health check failed')
    return { healthy: false }
  }
}

/**
 * Graceful shutdown
 */
export async function shutdownAuditWorker(): Promise<void> {
  logger.info('Shutting down audit worker, flushing remaining events')

  try {
    const queue = await getAuditQueue()

    // Flush all remaining events
    const remaining = await queue.dequeue(10000) // Flush up to 10k events
    if (remaining.length > 0) {
      logger.info({ count: remaining.length }, 'Flushing remaining audit logs')
      await flushAuditLogs(remaining)
    }

    logger.info('Audit worker shutdown complete')
  } catch (error) {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Error during audit worker shutdown')
  }
}

/**
 * Start worker if run directly
 */
if (require.main === module) {
  startAuditWorker().catch((error) => {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Audit worker failed to start')
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down audit worker')
    await shutdownAuditWorker()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down audit worker')
    await shutdownAuditWorker()
    process.exit(0)
  })
}
