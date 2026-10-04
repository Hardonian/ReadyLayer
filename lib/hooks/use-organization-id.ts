/**
 * Organization ID Hook
 * 
 * Gets the current user's organization ID from their repositories
 */

import { useCallback, useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'

interface UseOrganizationIdReturn {
  organizationId: string | null
  organizationName: string | null
  hasRepositories: boolean
  loading: boolean
  error: string | null
  refetch: () => void
}

interface CurrentOrganizationResponse {
  data?: {
    organization?: {
      id: string
      name: string
      repositoryCount: number
    } | null
  }
  error?: unknown
}

export function useOrganizationId(): UseOrganizationIdReturn {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  const [hasRepositories, setHasRepositories] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback((): void => {
    setRefreshKey((value) => value + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchOrgId = async (): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setOrganizationId(null)
          setOrganizationName(null)
          setHasRepositories(false)
          setError('Your session has expired. Sign in again to continue.')
          return
        }

        const response = await fetch('/api/v1/organizations/current', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
        })

        const payload = (await response.json().catch(() => ({}))) as CurrentOrganizationResponse
        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload as Record<string, unknown>))
        }

        const organization = payload.data?.organization ?? null
        setOrganizationId(organization?.id ?? null)
        setOrganizationName(organization?.name ?? null)
        setHasRepositories((organization?.repositoryCount ?? 0) > 0)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setOrganizationId(null)
        setOrganizationName(null)
        setHasRepositories(false)
        setError(err instanceof Error ? err.message : 'Failed to fetch organization ID')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchOrgId()
    return () => controller.abort()
  }, [refreshKey])

  return {
    organizationId,
    organizationName,
    hasRepositories,
    loading,
    error,
    refetch,
  }
}
