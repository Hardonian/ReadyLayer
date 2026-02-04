/**
 * JobForge TypeScript Worker
 */

import { JobForgeClient } from '../../../../lib/jobforge/sdk/src'
import type { JobRow, JobContext } from '../../../../lib/jobforge/shared/src'
import {
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_POLL_INTERVAL_MS,
  MAX_BACKOFF_MS,
  MIN_BACKOFF_MS,
} from '../../../../lib/jobforge/shared/src'
import { HandlerRegistry } from './registry'
import { logger, type Logger } from './logger'
import { randomUUID } from 'crypto'

export interface WorkerConfig {
  workerId: string
  supabaseUrl: string
  supabaseKey: string
  pollIntervalMs?: number
  maxPollIntervalMs?: number
  pollJitterRatio?: number
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
  private heartbeatTimer: NodeJS.Timeout | null = null
  private heartbeatInFlight = false
  private idleBackoffMs: number

  constructor(config: WorkerConfig, registry: HandlerRegistry) {
    const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
    this.config = {
      pollIntervalMs,
      maxPollIntervalMs: Math.min(pollIntervalMs * 3, MAX_BACKOFF_MS),
      pollJitterRatio: 0.2,
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
    this.idleBackoffMs = this.config.pollIntervalMs
  }

  /**
   * Run worker once (claim and process available jobs)
   */
  async runOnce(): Promise<number> {
    try {
      const jobs = await this.client.claimJobs({
        worker_id: this.config.workerId,
        limit: this.config.claimLimit,
      })

      if (jobs.length === 0) {
        this.logger.debug('No jobs claimed')
        return 0
      }

      this.logger.info(`Claimed ${jobs.length} jobs`)

      // Process jobs concurrently
      await Promise.allSettled(jobs.map((job) => this.processJob(job)))
      return jobs.length
    } catch (error) {
      this.logger.error('Error in runOnce', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return 0
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
      const claimedJobs = await this.runOnce()

      if (!this.shuttingDown) {
        const delayMs = this.calculatePollDelay(claimedJobs)
        await this.sleep(delayMs)
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

    this.ensureHeartbeatLoop()

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
      this.activeJobs.delete(job.id)
      if (this.activeJobs.size === 0) {
        this.stopHeartbeatLoop()
      }
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

    this.stopHeartbeatLoop()

    this.logger.info('Worker stopped', {
      remaining_jobs: this.activeJobs.size,
    })
  }

  /**
   * Shared heartbeat loop to avoid per-job timers
   */
  private ensureHeartbeatLoop(): void {
    if (this.heartbeatTimer) {
      return
    }

    this.heartbeatTimer = setInterval(() => {
      void this.runHeartbeatTick()
    }, this.config.heartbeatIntervalMs)
  }

  private stopHeartbeatLoop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private async runHeartbeatTick(): Promise<void> {
    if (this.heartbeatInFlight || this.activeJobs.size === 0) {
      return
    }

    this.heartbeatInFlight = true
    const jobIds = Array.from(this.activeJobs)

    await Promise.allSettled(
      jobIds.map(async (jobId) => {
        try {
          await this.client.heartbeatJob({
            job_id: jobId,
            worker_id: this.config.workerId,
          })
        } catch (error) {
          this.logger.warn('Heartbeat failed', {
            job_id: jobId,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      })
    )

    this.heartbeatInFlight = false
  }

  /**
   * Calculate next poll delay with backoff and jitter.
   */
  private calculatePollDelay(claimedJobs: number): number {
    if (claimedJobs > 0) {
      this.idleBackoffMs = this.config.pollIntervalMs
    } else {
      this.idleBackoffMs = Math.min(
        Math.max(this.idleBackoffMs * 2, this.config.pollIntervalMs),
        this.config.maxPollIntervalMs
      )
    }

    const jitterRatio = Math.max(0, this.config.pollJitterRatio)
    const jitterWindow = this.idleBackoffMs * jitterRatio
    const minDelay = Math.max(MIN_BACKOFF_MS, this.idleBackoffMs - jitterWindow)
    const maxDelay = this.idleBackoffMs + jitterWindow
    const delayRange = Math.max(0, maxDelay - minDelay)

    return Math.floor(minDelay + Math.random() * delayRange)
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
