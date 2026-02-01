/**
 * JobForge Enqueue Helper for ReadyLayer
 * Server-side only - never expose service keys to the client
 */

import { JobForgeClient } from './sdk/src'
import type { EnqueueJobParams, JobStatus, JobRow } from './shared/src'

let _jobforgeClient: JobForgeClient | null = null

/**
 * Get or create singleton JobForge client
 */
export function getJobForgeClient(): JobForgeClient {
  if (!_jobforgeClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      )
    }

    _jobforgeClient = new JobForgeClient({
      supabaseUrl,
      supabaseKey: supabaseServiceKey,
    })
  }

  return _jobforgeClient
}

/**
 * Enqueue a job using JobForge
 * @example
 * ```ts
 * import { enqueueJob } from '@/lib/jobforge/enqueue'
 *
 * await enqueueJob({
 *   tenant_id: organizationId,
 *   type: 'connector.http.request',
 *   payload: {
 *     url: 'https://api.example.com/webhook',
 *     method: 'POST',
 *     body: { data: 'hello' },
 *   },
 *   idempotency_key: 'webhook-123',
 * })
 * ```
 */
export async function enqueueJob(params: EnqueueJobParams): Promise<JobRow> {
  const client = getJobForgeClient()
  return client.enqueueJob(params)
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string, tenantId: string): Promise<JobRow | null> {
  const client = getJobForgeClient()
  return client.getJob(jobId, tenantId)
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string, tenantId: string): Promise<void> {
  const client = getJobForgeClient()
  return client.cancelJob({ job_id: jobId, tenant_id: tenantId })
}

/**
 * List jobs for a tenant with optional filters
 */
export async function listJobs(
  tenantId: string,
  filters?: {
    status?: JobStatus | JobStatus[]
    type?: string
    limit?: number
    offset?: number
  }
): Promise<JobRow[]> {
  const client = getJobForgeClient()
  return client.listJobs({
    tenant_id: tenantId,
    filters,
  })
}
