/**
 * Dashboard Metrics Hook
 * 
 * Fetches dashboard metrics with real-time updates
 */

import { useRealtimeQuery } from './use-realtime-query'
import { MetricsSnapshot } from '@/lib/dashboard/schemas'
import { createSupabaseClient } from '@/lib/supabase/client'

interface UseDashboardMetricsOptions {
  organizationId: string
  repositoryId?: string
  timeRange?: '24h' | '7d' | '30d'
  enabled?: boolean
}

export function useDashboardMetrics({
  organizationId,
  repositoryId,
  timeRange = '24h',
  enabled = true,
}: UseDashboardMetricsOptions) {
  return useRealtimeQuery<MetricsSnapshot>({
    queryKey: ['dashboard', 'metrics', organizationId, repositoryId, timeRange],
    queryFn: async () => {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const params = new URLSearchParams({
        organizationId: organizationId || '',
        timeRange,
        ...(repositoryId && { repositoryId }),
      })

      const response = await fetch(`/api/dashboard/metrics?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || 'Failed to fetch metrics')
      }

      const result = await response.json()
      return result.data as MetricsSnapshot
    },
    organizationId,
    repositoryId,
    enabled: enabled && !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  })
}
