/**
 * JobForge Admin API
 *
 * POST /api/admin/jobforge - submit event, run module dry-run, request bundle execution
 * GET /api/admin/jobforge - fetch report results
 */

import { z } from 'zod'
import {
  createRouteHandler,
  errorResponse,
  parseJsonBody,
  successResponse,
  validateBody,
} from '@/lib/api-route-helpers'
import { canAccessOrganization, hasRole } from '@/lib/auth'
import { canAccessRepository } from '@/lib/authz'
import { getJobForgeAdapter } from '@/lib/jobforge/adapter'
import { redactSecrets } from '@/lib/secrets/redaction'

const submitEventSchema = z.object({
  action: z.literal('submit_event'),
  tenantId: z.string().uuid(),
  projectId: z.string().min(1),
  targetUrl: z.string().url(),
  eventType: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  secretRef: z.string().optional(),
  timeoutMs: z.number().int().positive().max(60_000).optional(),
})

const moduleDryRunSchema = z.object({
  action: z.literal('run_module_dry_run'),
  tenantId: z.string().uuid(),
  projectId: z.string().min(1),
  moduleName: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
})

const bundleExecutionSchema = z.object({
  action: z.literal('request_bundle_execution'),
  tenantId: z.string().uuid(),
  projectId: z.string().min(1),
  bundleId: z.string().min(1),
  bundleType: z.string().optional(),
  inputs: z.record(z.string(), z.unknown()).default({}),
  execute: z.boolean().default(false),
})

const actionSchema = z.discriminatedUnion('action', [
  submitEventSchema,
  moduleDryRunSchema,
  bundleExecutionSchema,
])

const reportQuerySchema = z.object({
  tenantId: z.string().uuid(),
  projectId: z.string().min(1),
  resultId: z.string().uuid(),
})

async function ensureAdminAccess(userId: string, tenantId: string, projectId: string): Promise<boolean> {
  const canAccessTenant = await canAccessOrganization(userId, tenantId)
  if (!canAccessTenant) return false

  const isAdmin = await hasRole(userId, tenantId, 'admin')
  if (!isAdmin) return false

  const canAccessProject = await canAccessRepository(userId, projectId)
  return canAccessProject
}

function redactErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return redactSecrets(message, { logDetections: false }).redacted
}

export const POST = createRouteHandler(async ({ request, user, log }) => {
  const bodyResult = await parseJsonBody(request)
  if (!bodyResult.success) {
    return bodyResult.response
  }

  const validated = validateBody(bodyResult.data, actionSchema)
  if (!validated.success) {
    return validated.response
  }

  const payload = validated.data
  const hasAccess = await ensureAdminAccess(user.id, payload.tenantId, payload.projectId)
  if (!hasAccess) {
    return errorResponse('FORBIDDEN', 'Admin access required for tenant/project', 403)
  }

  const adapter = getJobForgeAdapter()

  try {
    if (payload.action === 'submit_event') {
      const result = await adapter.submitEvent({
        tenantId: payload.tenantId,
        projectId: payload.projectId,
        targetUrl: payload.targetUrl,
        eventType: payload.eventType,
        data: payload.data,
        secretRef: payload.secretRef,
        timeoutMs: payload.timeoutMs,
      })
      return successResponse(result)
    }

    if (payload.action === 'run_module_dry_run') {
      const result = await adapter.runModuleDryRun({
        tenantId: payload.tenantId,
        projectId: payload.projectId,
        moduleName: payload.moduleName,
        input: payload.input,
      })
      return successResponse(result)
    }

    const result = await adapter.requestBundleExecution({
      tenantId: payload.tenantId,
      projectId: payload.projectId,
      bundleId: payload.bundleId,
      bundleType: payload.bundleType,
      inputs: payload.inputs,
      execute: payload.execute,
    })

    return successResponse(result)
  } catch (error) {
    const message = redactErrorMessage(error)
    log.error({ err: message }, 'JobForge admin action failed')
    return errorResponse('JOBFORGE_ERROR', 'JobForge operation failed', 500, {
      reason: message,
    })
  }
})

export const GET = createRouteHandler(async ({ request, user, log }) => {
  const { searchParams } = new URL(request.url)
  const queryResult = reportQuerySchema.safeParse({
    tenantId: searchParams.get('tenantId') || undefined,
    projectId: searchParams.get('projectId') || undefined,
    resultId: searchParams.get('resultId') || undefined,
  })

  if (!queryResult.success) {
    return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', 400, {
      errors: queryResult.error.issues,
    })
  }

  const { tenantId, projectId, resultId } = queryResult.data
  const hasAccess = await ensureAdminAccess(user.id, tenantId, projectId)
  if (!hasAccess) {
    return errorResponse('FORBIDDEN', 'Admin access required for tenant/project', 403)
  }

  const adapter = getJobForgeAdapter()

  try {
    const result = await adapter.getReport({ tenantId, projectId, resultId })
    if (result.status === 'disabled') {
      return errorResponse('JOBFORGE_DISABLED', result.message, 503)
    }
    if (result.status === 'not_found') {
      return errorResponse('NOT_FOUND', result.message, 404)
    }

    return successResponse(result)
  } catch (error) {
    const message = redactErrorMessage(error)
    log.error({ err: message }, 'JobForge report fetch failed')
    return errorResponse('JOBFORGE_ERROR', 'Failed to fetch JobForge report', 500, {
      reason: message,
    })
  }
})
