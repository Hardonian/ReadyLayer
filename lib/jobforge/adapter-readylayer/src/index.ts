/**
 * @jobforge/adapter-readylayer
 * JobForge adapter for ReadyLayer (content delivery/CDN platform)
 */

import { z } from 'zod'

/**
 * Job Type: readylayer.asset.optimize
 * Optimize and transcode media assets
 */
export const ReadyLayerAssetOptimizePayloadSchema = z.object({
  asset_id: z.string().uuid(),
  source_url: z.string().url(),
  tenant_id: z.string().uuid(),
  formats: z.array(z.enum(['webp', 'avif', 'jpeg', 'png'])).default(['webp']),
  sizes: z.array(z.number()).default([320, 640, 1280, 1920]),
  quality: z.number().min(1).max(100).default(85),
})

export type ReadyLayerAssetOptimizePayload = z.infer<typeof ReadyLayerAssetOptimizePayloadSchema>

export interface ReadyLayerAssetOptimizeResult {
  asset_id: string
  optimized_urls: Record<string, string[]>
  total_size_reduction_bytes: number
  cdn_urls: string[]
}

/**
 * Job Type: readylayer.cache.purge
 * Purge CDN cache for specific paths
 */
export const ReadyLayerCachePurgePayloadSchema = z.object({
  tenant_id: z.string().uuid(),
  paths: z.array(z.string()),
  purge_type: z.enum(['soft', 'hard']).default('soft'),
  zones: z.array(z.string()).optional(),
})

export type ReadyLayerCachePurgePayload = z.infer<typeof ReadyLayerCachePurgePayloadSchema>

export interface ReadyLayerCachePurgeResult {
  purged_count: number
  failed_paths: string[]
  estimated_propagation_seconds: number
}

/**
 * Job Type: readylayer.analytics.aggregate
 * Aggregate CDN analytics data
 */
export const ReadyLayerAnalyticsAggregatePayloadSchema = z.object({
  tenant_id: z.string().uuid(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  metrics: z.array(z.enum(['bandwidth', 'requests', 'cache_hit_ratio', 'errors'])),
  group_by: z.enum(['hour', 'day', 'week']).default('day'),
})

export type ReadyLayerAnalyticsAggregatePayload = z.infer<
  typeof ReadyLayerAnalyticsAggregatePayloadSchema
>

export interface ReadyLayerAnalyticsAggregateResult {
  period: { start: string; end: string }
  aggregated_metrics: Record<string, number>
  top_assets: Array<{ url: string; requests: number }>
}

export const READYLAYER_INTEGRATION_EXAMPLE = `
// Server action example
'use server';

import { JobForgeClient } from '@jobforge/sdk-ts';

export async function optimizeAsset(assetId: string, sourceUrl: string) {
  const jobforge = new JobForgeClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });

  const job = await jobforge.enqueueJob({
    tenant_id: getTenantId(),
    type: 'readylayer.asset.optimize',
    payload: {
      asset_id: assetId,
      source_url: sourceUrl,
      tenant_id: getTenantId(),
      formats: ['webp', 'avif'],
      sizes: [640, 1280, 1920],
    },
    idempotency_key: \`asset-optimize-\${assetId}\`,
  });

  return { job_id: job.id };
}
`
