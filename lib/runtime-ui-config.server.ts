import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { createAuditLog } from './audit'
import {
  RuntimeUiConfigPatchSchema,
  RuntimeUiConfigSchema,
  deepMerge,
  getDefaultRuntimeUiConfig,
  isPlainObject,
  type RuntimeUiConfig,
} from './runtime-ui-config'

/**
 * Server-side persistence for runtime UI configuration.
 *
 * Stored per-organization in `OrganizationConfig.config.ui`.
 * Separated from the shared module so client bundles never import Prisma.
 */

export async function getRuntimeUiConfigForOrganization(organizationId: string): Promise<{
  config: RuntimeUiConfig
  updatedAt: string | null
  source: 'default' | 'organization'
}> {
  const defaults = getDefaultRuntimeUiConfig()

  const record = await prisma.organizationConfig.findUnique({
    where: { organizationId },
    select: { config: true, updatedAt: true },
  })

  if (!record) {
    return {
      config: defaults,
      updatedAt: null,
      source: 'default',
    }
  }

  const raw = (record.config as unknown) as Record<string, unknown> | null
  const ui = raw && isPlainObject(raw) ? (raw.ui as unknown) : null

  const parsed = RuntimeUiConfigSchema.safeParse(ui ?? {})
  if (!parsed.success) {
    // If stored config is invalid, fail closed to safe defaults (never throw)
    return {
      config: defaults,
      updatedAt: record.updatedAt.toISOString(),
      source: 'organization',
    }
  }

  const merged = RuntimeUiConfigSchema.parse(
    deepMerge(defaults as unknown as Record<string, unknown>, parsed.data as unknown as Record<string, unknown>)
  )

  return {
    config: merged,
    updatedAt: record.updatedAt.toISOString(),
    source: 'organization',
  }
}

export async function updateRuntimeUiConfigForOrganization(params: {
  organizationId: string
  userId: string
  patch: unknown
  requestMeta?: { ipAddress?: string; userAgent?: string }
}): Promise<{ config: RuntimeUiConfig; updatedAt: string }> {
  const patchParsed = RuntimeUiConfigPatchSchema.safeParse(params.patch)
  if (!patchParsed.success) {
    const error = new Error('Invalid runtime UI config patch')
    ;(error as unknown as { code?: string; details?: unknown }).code = 'VALIDATION_ERROR'
    ;(error as unknown as { code?: string; details?: unknown }).details = patchParsed.error.issues
    throw error
  }

  const existing = await prisma.organizationConfig.findUnique({
    where: { organizationId: params.organizationId },
    select: { config: true },
  })

  const existingConfig = (existing?.config as unknown) as Record<string, unknown> | null
  const baseConfig = existingConfig && isPlainObject(existingConfig) ? existingConfig : {}
  const existingUi = isPlainObject(baseConfig.ui) ? (baseConfig.ui as Record<string, unknown>) : {}

  const defaults = getDefaultRuntimeUiConfig()
  const candidateUi = deepMerge(
    RuntimeUiConfigSchema.parse(deepMerge(defaults as unknown as Record<string, unknown>, existingUi)) as unknown as Record<string, unknown>,
    patchParsed.data as unknown as Record<string, unknown>
  )

  const validated = RuntimeUiConfigSchema.parse(candidateUi)
  const nextConfig = { ...baseConfig, ui: validated } as unknown as Prisma.InputJsonValue

  const saved = await prisma.organizationConfig.upsert({
    where: { organizationId: params.organizationId },
    create: {
      organizationId: params.organizationId,
      config: nextConfig,
    },
    update: {
      config: nextConfig,
    },
    select: { updatedAt: true },
  })

  await createAuditLog({
    organizationId: params.organizationId,
    userId: params.userId,
    action: 'ui_config_updated',
    resourceType: 'ui_config',
    resourceId: params.organizationId,
    details: {
      keys: Object.keys(patchParsed.data),
      version: validated.version,
    },
    ipAddress: params.requestMeta?.ipAddress,
    userAgent: params.requestMeta?.userAgent,
  })

  return { config: validated, updatedAt: saved.updatedAt.toISOString() }
}

