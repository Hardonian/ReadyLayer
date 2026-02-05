import { Worker } from '../services/jobforge-worker/src/lib/worker'
import { HandlerRegistry } from '../services/jobforge-worker/src/lib/registry'
import type { JobRow } from '../lib/jobforge/shared/src'

type HeartbeatClient = {
  heartbeatJob: (params: { job_id: string; worker_id: string }) => Promise<void>
  completeJob: (params: { job_id: string; worker_id: string }) => Promise<void>
}

const registry = new HandlerRegistry()
registry.register('benchmark', async () => ({ ok: true }))

const worker = new Worker(
  {
    workerId: 'benchmark-worker',
    supabaseUrl: 'http://localhost:54321',
    supabaseKey: 'benchmark-key',
    heartbeatIntervalMs: 1000,
    pollIntervalMs: 1000,
    claimLimit: 10,
  },
  registry
)

let heartbeatCalls = 0
const client: HeartbeatClient = {
  heartbeatJob: async () => {
    heartbeatCalls += 1
  },
  completeJob: async () => undefined,
}

const originalSetInterval = global.setInterval
let intervalCalls = 0
const targetIntervalMs = 1000
global.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  if (timeout === targetIntervalMs) {
    intervalCalls += 1
  }
  return originalSetInterval(handler, timeout, ...args)
}) as typeof global.setInterval

(worker as unknown as { client: HeartbeatClient }).client = client

const now = new Date().toISOString()
const jobs: JobRow[] = Array.from({ length: 5 }, (_, index) => ({
  id: `job-${index}`,
  tenant_id: 'tenant',
  type: 'benchmark',
  payload: { index },
  status: 'queued',
  attempts: 0,
  max_attempts: 3,
  run_at: now,
  locked_at: null,
  locked_by: null,
  heartbeat_at: null,
  started_at: null,
  finished_at: null,
  idempotency_key: null,
  created_by: null,
  error: null,
  result_id: null,
  created_at: now,
  updated_at: now,
}))

const run = async (): Promise<void> => {
  const start = Date.now()
  await Promise.all(jobs.map((job) => (worker as unknown as { processJob: (job: JobRow) => Promise<void> }).processJob(job)))
  const durationMs = Date.now() - start
  global.setInterval = originalSetInterval

  console.log(
    JSON.stringify(
      {
        intervalCalls,
        heartbeatCalls,
        durationMs,
        jobs: jobs.length,
        targetIntervalMs,
      },
      null,
      2
    )
  )
}

run().catch((error) => {
  global.setInterval = originalSetInterval
  console.error(error)
  process.exit(1)
})
