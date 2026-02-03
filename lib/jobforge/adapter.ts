/**
 * JobForge Client Adapter
 *
 * Provides a safe, tenant-aware interface for JobForge operations.
 * - Respects JOBFORGE_INTEGRATION_ENABLED (default: disabled)
 * - Requires explicit tenant + project mapping
 * - Redacts sensitive data in logs/errors
 */

import { randomUUID } from 'crypto'
import { z } from 'zod'
import { JobForgeClient } from './sdk/src'
import type { JobRow, JobResultRow } from './shared/src'
import { logger } from '@/observability/logging'
import { redactSecrets } from '@/lib/secrets/redaction'

export interface JobForgeAdapterConfig {
  enabled: boolean
  bundleExecutionEnabled: boolean
  tenantProjectMap?: Record<string, string>
}

export interface JobForgeOperationContext {
  tenantId: string
  projectId: string
}

export interface SubmitEventInput extends JobForgeOperationContext {
  targetUrl: string
  eventType: string
  data: Record<string, unknown>
  secretRef?: string
  timeoutMs?: number
}

export interface RunModuleDryRunInput extends JobForgeOperationContext {
  moduleName: string
  input: Record<string, unknown>
}

export interface RequestBundleExecutionInput extends JobForgeOperationContext {
  bundleId: string
  bundleType?: string
  inputs: Record<string, unknown>
  execute?: boolean
}

export type JobForgeActionResult =
  | {
      status: 'disabled'
      message: string
    }
  | {
      status: 'queued'
      message: string
      job: JobRow
    }

export type JobForgeReportResult =
  | {
      status: 'disabled'
      message: string
    }
  | {
      status: 'not_found'
      message: string
    }
  | {
      status: 'ok'
      result: JobResultRow
    }

const tenantProjectMapSchema = z.record(z.string().min(1), z.string().min(1))

function parseTenantProjectMap(envValue?: string): Record<string, string> | undefined {
  if (!envValue) return undefined
  const parsed = JSON.parse(envValue) as unknown
  const result = tenantProjectMapSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error('JOBFORGE_TENANT_PROJECT_MAP must be a JSON object of projectId -> tenantId')
  }
  return result.data
}

function redactMessage(message: string): string {
  return redactSecrets(message, { logDetections: false }).redacted
}

function getAdapterConfig(): JobForgeAdapterConfig {
  const enabled = process.env.JOBFORGE_INTEGRATION_ENABLED === '1'
  const bundleExecutionEnabled = process.env.JOBFORGE_BUNDLE_EXECUTION_ENABLED === '1'
  const tenantProjectMap = parseTenantProjectMap(process.env.JOBFORGE_TENANT_PROJECT_MAP)

  return {
    enabled,
    bundleExecutionEnabled,
    tenantProjectMap,
  }
}

function assertTenantProjectMapping(
  { tenantId, projectId }: JobForgeOperationContext,
  mapping?: Record<string, string>
): void {
  if (!tenantId || !projectId) {
    throw new Error('Explicit tenantId and projectId are required for JobForge operations')
  }
  if (mapping && mapping[projectId] !== tenantId) {
    throw new Error('Project is not mapped to the provided tenantId')
  }
}

function createJobForgeClient(): JobForgeClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required JobForge environment variables for Supabase access')
  }

  return new JobForgeClient({
    supabaseUrl,
    supabaseKey: supabaseServiceKey,
  })
}

const adapterLogger = logger.child({ module: 'jobforge-adapter' })

export class JobForgeAdapter {
  private config: JobForgeAdapterConfig
  private client: JobForgeClient | null

  constructor(config: JobForgeAdapterConfig = getAdapterConfig()) {
    this.config = config
    this.client = config.enabled ? createJobForgeClient() : null
  }

  private ensureEnabled(): JobForgeActionResult | null {
    if (!this.config.enabled) {
      return {
        status: 'disabled',
        message: 'JobForge integration is disabled (set JOBFORGE_INTEGRATION_ENABLED=1 to enable)',
      }
    }
    return null
  }

  private getClient(): JobForgeClient {
    if (!this.client) {
      throw new Error('JobForge client is not initialized')
    }
    return this.client
  }

  async submitEvent(input: SubmitEventInput): Promise<JobForgeActionResult> {
    const disabled = this.ensureEnabled()
    if (disabled) return disabled

    assertTenantProjectMapping(input, this.config.tenantProjectMap)

    const eventId = randomUUID()

    try {
      const job = await this.getClient().enqueueJob({
        tenant_id: input.tenantId,
        type: 'connector.webhook.deliver',
        payload: {
          target_url: input.targetUrl,
          event_type: input.eventType,
          event_id: eventId,
          data: input.data,
          secret_ref: input.secretRef,
          timeout_ms: input.timeoutMs,
          project_id: input.projectId,
        },
        idempotency_key: eventId,
      })

      return {
        status: 'queued',
        message: 'Event submitted to JobForge',
        job,
      }
    } catch (error) {
      const message = redactMessage(error instanceof Error ? error.message : String(error))
      adapterLogger.error({ err: message, tenantId: input.tenantId, projectId: input.projectId }, 'JobForge event submit failed')
      throw new Error(message)
    }
  }

  async runModuleDryRun(input: RunModuleDryRunInput): Promise<JobForgeActionResult> {
    const disabled = this.ensureEnabled()
    if (disabled) return disabled

    assertTenantProjectMapping(input, this.config.tenantProjectMap)

    try {
      const job = await this.getClient().enqueueJob({
        tenant_id: input.tenantId,
        type: 'connector.module.run',
        payload: {
          module_name: input.moduleName,
          input: input.input,
          dry_run: true,
          project_id: input.projectId,
        },
        idempotency_key: `module-dry-run:${input.projectId}:${input.moduleName}`,
      })

      return {
        status: 'queued',
        message: 'Module dry-run queued in JobForge',
        job,
      }
    } catch (error) {
      const message = redactMessage(error instanceof Error ? error.message : String(error))
      adapterLogger.error({ err: message, tenantId: input.tenantId, projectId: input.projectId }, 'JobForge module dry-run failed')
      throw new Error(message)
    }
  }

  async requestBundleExecution(input: RequestBundleExecutionInput): Promise<JobForgeActionResult> {
    const disabled = this.ensureEnabled()
    if (disabled) return disabled

    assertTenantProjectMapping(input, this.config.tenantProjectMap)

    if (input.execute && !this.config.bundleExecutionEnabled) {
      return {
        status: 'disabled',
        message: 'Bundle execution is gated (set JOBFORGE_BUNDLE_EXECUTION_ENABLED=1 to enable)',
      }
    }

    try {
      const job = await this.getClient().enqueueJob({
        tenant_id: input.tenantId,
        type: 'connector.bundle.execute',
        payload: {
          bundle_id: input.bundleId,
          bundle_type: input.bundleType,
          inputs: input.inputs,
          execute: Boolean(input.execute),
          project_id: input.projectId,
        },
        idempotency_key: `bundle-exec:${input.projectId}:${input.bundleId}`,
      })

      return {
        status: 'queued',
        message: input.execute
          ? 'Bundle execution queued in JobForge'
          : 'Bundle execution dry-run queued in JobForge',
        job,
      }
    } catch (error) {
      const message = redactMessage(error instanceof Error ? error.message : String(error))
      adapterLogger.error({ err: message, tenantId: input.tenantId, projectId: input.projectId }, 'JobForge bundle execution failed')
      throw new Error(message)
    }
  }

  async getReport(input: JobForgeOperationContext & { resultId: string }): Promise<JobForgeReportResult> {
    if (!this.config.enabled) {
      return {
        status: 'disabled',
        message: 'JobForge integration is disabled (set JOBFORGE_INTEGRATION_ENABLED=1 to enable)',
      }
    }

    try {
      assertTenantProjectMapping(input, this.config.tenantProjectMap)
      const result = await this.getClient().getResult(input.resultId, input.tenantId)
      if (!result) {
        return {
          status: 'not_found',
          message: 'Report result not found',
        }
      }

      return {
        status: 'ok',
        result,
      }
    } catch (error) {
      const message = redactMessage(error instanceof Error ? error.message : String(error))
      adapterLogger.error({ err: message, tenantId: input.tenantId, resultId: input.resultId }, 'JobForge report fetch failed')
      throw new Error(message)
    }
  }
}

let adapterInstance: JobForgeAdapter | null = null

export function getJobForgeAdapter(): JobForgeAdapter {
  if (!adapterInstance) {
    adapterInstance = new JobForgeAdapter()
  }
  return adapterInstance
}
