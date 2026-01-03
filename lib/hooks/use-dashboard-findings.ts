/**
 * Dashboard Findings Hook
 * 
 * Fetches findings inbox with real-time updates
 */

import { useRealtimeQuery } from './use-realtime-query'
import { FindingSnapshot } from '@/lib/dashboard/schemas'
import { createSupabaseClient } from '@/lib/supabase/client'

interface UseDashboardFindingsOptions {
  organizationId: string
  repositoryId?: string
  timeRange?: '24h' | '7d' | '30d'
  limit?: number
  offset?: number
  enabled?: boolean
}

export function useDashboardFindings({
  organizationId,
  repositoryId,
  timeRange = '24h',
  limit = 50,
  offset = 0,
  enabled = true,
}: UseDashboardFindingsOptions) {
  return useRealtimeQuery<FindingSnapshot>({
    queryKey: ['dashboard', 'findings', organizationId, repositoryId, timeRange, limit, offset],
    queryFn: async () => {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const params = new URLSearchParams({
        organizationId: organizationId || '',
        timeRange,
        limit: limit.toString(),
        offset: offset.toString(),
        ...(repositoryId && { repositoryId }),
      })

      const response = await fetch(`/api/dashboard/findings?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || 'Failed to fetch findings')
      }

      const result = await response.json()
      return result.data as FindingSnapshot
    },
    organizationId,
    repositoryId,
    enabled: enabled && !!organizationId,
    staleTime: 30 * 1000,
  })
}
