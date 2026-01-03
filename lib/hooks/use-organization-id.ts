/**
 * Organization ID Hook
 * 
 * Gets the current user's organization ID from their repositories
 */

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

export function useOrganizationId() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        // Get first repo to extract organizationId
        const response = await fetch('/api/v1/repos?limit=1', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.repositories?.[0]?.organization?.id) {
            setOrganizationId(data.repositories[0].organization.id)
          }
        }
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organization ID')
        setLoading(false)
      }
    }

    fetchOrgId()
  }, [])

  return { organizationId, loading, error }
}
