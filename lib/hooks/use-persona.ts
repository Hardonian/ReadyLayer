'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

type Persona = 'founder' | 'enterprise-cto' | 'junior-developer' | 'open-source-maintainer' | 'agency-freelancer' | 'startup-cto' | null

export function usePersona() {
  const [persona, setPersona] = useState<Persona>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function detectPersona() {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        // In production, this would call the persona detection API
        // For now, we'll use a simple heuristic or default to founder
        // This is a placeholder - actual implementation would call /api/v1/persona/detect
        
        // Mock: Default to founder for now
        // In production, this would be determined by analyzing user's repositories
        setPersona('founder')
        setLoading(false)
      } catch (error) {
        console.error('Failed to detect persona:', error)
        setPersona(null)
        setLoading(false)
      }
    }

    detectPersona()
  }, [])

  return { persona, loading }
}
