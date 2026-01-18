import { z } from 'zod'

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
  copy: z.record(z.string(), z.string().max(500)).default({}),
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
  copy: z.record(z.string(), z.string().max(500)).optional(),
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

export { isPlainObject, deepMerge }

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

export function getRuntimeCopy(
  copy: Record<string, string> | undefined,
  key: string,
  fallback: string
): string {
  if (!copy) return fallback
  const v = copy[key]
  return typeof v === 'string' && v.length > 0 ? v : fallback
}

