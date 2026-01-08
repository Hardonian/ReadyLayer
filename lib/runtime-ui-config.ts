import { z } from 'zod'
import { prisma } from './prisma'
import { createAuditLog } from './audit'
import type { Prisma } from '@prisma/client'

/**
 * Runtime UI configuration
 *
 * Stored per-organization in `OrganizationConfig.config.ui`.
 * - Readable at runtime by the frontend via /api/ui-config
 * - Writable only by org owners via /api/ui-config (PUT)
 * - Validated and merged with safe defaults
 */

const BannerVariantSchema = z.enum(['info', 'success', 'warning', 'danger'])

export const RuntimeUiConfigSchema = z.object({
  version: z.number().int().min(1).default(1),
  tokens: z
    .object({
      radius: z
        .object({
          sm: z.string().min(1).default('0.25rem'),
          md: z.string().min(1).default('0.5rem'),
          lg: z.string().min(1).default('0.75rem'),
          base: z.string().min(1).default('0.5rem'),
        })
        .default({ sm: '0.25rem', md: '0.5rem', lg: '0.75rem', base: '0.5rem' }),
    })
    .default({ radius: { sm: '0.25rem', md: '0.5rem', lg: '0.75rem', base: '0.5rem' } }),
  banners: z
    .object({
      topNotice: z
        .object({
          enabled: z.boolean().default(false),
          variant: BannerVariantSchema.default('info'),
          title: z.string().max(80).default('Notice'),
          message: z.string().max(240).default(''),
          dismissible: z.boolean().default(true),
        })
        .default({
          enabled: false,
          variant: 'info',
          title: 'Notice',
          message: '',
          dismissible: true,
        }),
    })
    .default({
      topNotice: {
        enabled: false,
        variant: 'info',
        title: 'Notice',
        message: '',
        dismissible: true,
      },
    }),
  features: z
    .object({
      aiSupportBotEnabled: z.boolean().default(true),
      polishModeEnabled: z.boolean().default(false),
    })
    .default({
      aiSupportBotEnabled: true,
      polishModeEnabled: false,
    }),
  copy: z.record(z.string().max(500)).default({}),
})

export type RuntimeUiConfig = z.infer<typeof RuntimeUiConfigSchema>

export const RuntimeUiConfigPatchSchema = z.object({
  tokens: z
    .object({
      radius: z
        .object({
          sm: z.string().min(1).optional(),
          md: z.string().min(1).optional(),
          lg: z.string().min(1).optional(),
          base: z.string().min(1).optional(),
        })
        .optional(),
    })
    .optional(),
  banners: z
    .object({
      topNotice: z
        .object({
          enabled: z.boolean().optional(),
          variant: BannerVariantSchema.optional(),
          title: z.string().max(80).optional(),
          message: z.string().max(240).optional(),
          dismissible: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  features: z
    .object({
      aiSupportBotEnabled: z.boolean().optional(),
      polishModeEnabled: z.boolean().optional(),
    })
    .optional(),
  copy: z.record(z.string().max(500)).optional(),
})

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    const existing = out[k]
    if (isPlainObject(existing) && isPlainObject(v)) {
      out[k] = deepMerge(existing, v)
    } else {
      out[k] = v
    }
  }
  return out as T
}

export function getDefaultRuntimeUiConfig(): RuntimeUiConfig {
  return RuntimeUiConfigSchema.parse({})
}

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

  // Ensure defaults for any missing fields
  const merged = RuntimeUiConfigSchema.parse(deepMerge(defaults as unknown as Record<string, unknown>, parsed.data as unknown as Record<string, unknown>))
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
    ;(error as unknown as { code?: string; details?: unknown }).details = patchParsed.error.errors
    throw error
  }

  const existing = await prisma.organizationConfig.findUnique({
    where: { organizationId: params.organizationId },
    select: { id: true, config: true },
  })

  const existingConfig = (existing?.config as unknown) as Record<string, unknown> | null
  const baseConfig = existingConfig && isPlainObject(existingConfig) ? existingConfig : {}
  const existingUi = isPlainObject(baseConfig.ui) ? (baseConfig.ui as Record<string, unknown>) : {}

  const defaults = getDefaultRuntimeUiConfig()
  const candidateUi = deepMerge(
    RuntimeUiConfigSchema.parse(deepMerge(defaults as unknown as Record<string, unknown>, existingUi)) as unknown as Record<string, unknown>,
    patchParsed.data as unknown as Record<string, unknown>
  )

  // Validate final config strictly
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

  // Audit (never throws)
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

export function runtimeUiConfigToCssVars(config: RuntimeUiConfig): Record<string, string> {
  return {
    '--radius-sm': config.tokens.radius.sm,
    '--radius-md': config.tokens.radius.md,
    '--radius-lg': config.tokens.radius.lg,
    '--radius': config.tokens.radius.base,
  }
}

export function getRuntimeUiPublicSnapshot(config: RuntimeUiConfig): Pick<
  RuntimeUiConfig,
  'version' | 'tokens' | 'banners' | 'features' | 'copy'
> {
  // Currently all fields are considered safe for client usage (no secrets).
  // Keep this explicit so any future additions are intentionally opted-in.
  return {
    version: config.version,
    tokens: config.tokens,
    banners: config.banners,
    features: config.features,
    copy: config.copy,
  }
}

