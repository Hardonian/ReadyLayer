/**
 * JobForge TypeScript Worker
 */

import { JobForgeClient } from '../../../../lib/jobforge/sdk/src'
import type { JobRow, JobContext } from '../../../../lib/jobforge/shared/src'
import { DEFAULT_HEARTBEAT_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS } from '../../../../lib/jobforge/shared/src'
import { HandlerRegistry } from './registry'
import { logger, type Logger } from './logger'
import { randomUUID } from 'crypto'

export interface WorkerConfig {
  workerId: string
  supabaseUrl: string
  supabaseKey: string
  pollIntervalMs?: number
  heartbeatIntervalMs?: number
  claimLimit?: number
}

export class Worker {
  private client: JobForgeClient
  private registry: HandlerRegistry
  private config: Required<WorkerConfig>
  private logger: Logger
  private running = false
  private shuttingDown = false
  private activeJobs = new Set<string>()
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>()

  constructor(config: WorkerConfig, registry: HandlerRegistry) {
    this.config = {
      pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
      heartbeatIntervalMs: DEFAULT_HEARTBEAT_INTERVAL_MS,
      claimLimit: 10,
      ...config,
    }

    this.client = new JobForgeClient({
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
    })

    this.registry = registry
    this.logger = logger.child({ worker_id: this.config.workerId })
  }

  /**
   * Run worker once (claim and process available jobs)
   */
  async runOnce(): Promise<void> {
    try {
      const jobs = await this.client.claimJobs({
        worker_id: this.config.workerId,
        limit: this.config.claimLimit,
      })

      if (jobs.length === 0) {
        this.logger.debug('No jobs claimed')
        return
      }

      this.logger.info(`Claimed ${jobs.length} jobs`)

      // Process jobs concurrently
      await Promise.allSettled(jobs.map((job) => this.processJob(job)))
    } catch (error) {
      this.logger.error('Error in runOnce', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Run worker in loop
   */
  async run(): Promise<void> {
    this.running = true
    this.logger.info('Worker started', {
      poll_interval_ms: this.config.pollIntervalMs,
      claim_limit: this.config.claimLimit,
    })

    this.setupShutdownHandlers()

    while (this.running && !this.shuttingDown) {
      await this.runOnce()

      if (!this.shuttingDown) {
        await this.sleep(this.config.pollIntervalMs)
      }
    }

    await this.shutdown()
  }

  /**
   * Process a single job
   */
  private async processJob(job: JobRow): Promise<void> {
    const trace_id = randomUUID()
    const jobLogger = this.logger.child({
      trace_id,
      job_id: job.id,
      job_type: job.type,
      tenant_id: job.tenant_id,
      attempt_no: job.attempts,
    })

    this.activeJobs.add(job.id)
    jobLogger.info('Processing job started')

    // Setup heartbeat
    const heartbeatInterval = setInterval(() => {
      this.client
        .heartbeatJob({
          job_id: job.id,
          worker_id: this.config.workerId,
        })
        .catch((error) => {
          jobLogger.warn('Heartbeat failed', {
            error: error instanceof Error ? error.message : String(error),
          })
        })
    }, this.config.heartbeatIntervalMs)

    this.heartbeatIntervals.set(job.id, heartbeatInterval)

    try {
      const registration = this.registry.get(job.type)

      if (!registration) {
        throw new Error(`No handler registered for job type: ${job.type}`)
      }

      // Validate payload if validator provided
      if (registration.options?.validate) {
        const isValid = registration.options.validate(job.payload)
        if (!isValid) {
          throw new Error('Payload validation failed')
        }
      }

      // Create job context
      const context: JobContext = {
        job_id: job.id,
        tenant_id: job.tenant_id,
        attempt_no: job.attempts,
        trace_id,
        heartbeat: async () => {
          await this.client.heartbeatJob({
            job_id: job.id,
            worker_id: this.config.workerId,
          })
        },
      }

      // Execute handler with timeout
      const timeoutMs = registration.options?.timeoutMs || 300_000 // 5 min default
      const result = await this.withTimeout(registration.handler(job.payload, context), timeoutMs)

      // Complete job successfully
      await this.client.completeJob({
        job_id: job.id,
        worker_id: this.config.workerId,
        status: 'succeeded',
        result: result as Record<string, unknown>,
      })

      jobLogger.info('Job succeeded')
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      const errorData = {
        message: errorObj.message,
        stack: errorObj.stack,
        name: errorObj.name,
      }

      jobLogger.error('Job failed', { error: errorObj.message })

      await this.client.completeJob({
        job_id: job.id,
        worker_id: this.config.workerId,
        status: 'failed',
        error: errorData,
      })
    } finally {
      // Clean up heartbeat
      const interval = this.heartbeatIntervals.get(job.id)
      if (interval) {
        clearInterval(interval)
        this.heartbeatIntervals.delete(job.id)
      }

      this.activeJobs.delete(job.id)
    }
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    this.logger.info('Worker shutting down gracefully', {
      active_jobs: this.activeJobs.size,
    })

    // Wait for active jobs to complete (with timeout)
    const shutdownTimeout = 30_000 // 30 seconds
    const start = Date.now()

    while (this.activeJobs.size > 0 && Date.now() - start < shutdownTimeout) {
      await this.sleep(1000)
    }

    // Clear all heartbeat intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval)
    }

    this.logger.info('Worker stopped', {
      remaining_jobs: this.activeJobs.size,
    })
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupShutdownHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']

    for (const signal of signals) {
      process.on(signal, () => {
        if (!this.shuttingDown) {
          this.logger.info(`Received ${signal}, shutting down...`)
          this.shuttingDown = true
          this.running = false
        }
      })
    }
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Helper: run with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Handler timeout')), timeoutMs)
      ),
    ])
  }
}
