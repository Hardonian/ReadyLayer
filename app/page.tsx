'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { LoadingState } from '@/components/ui'
import { HeroProof, PipelineStrip, ProofGrid, ValueDrivers } from '@/components/landing'
import { CulturalArtifacts } from '@/components/landing/CulturalArtifacts'
import { FeatureShowcase } from '@/components/feature-showcase'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      setLoading(false)
      return
    }

    const supabase = createSupabaseClient()

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Failed to get user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading..." />
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {/* New Hero Section with Interactive Demo */}
      <HeroProof user={user} />

      {/* Pipeline Strip */}
      <PipelineStrip />

      {/* Proof Grid */}
      <ProofGrid />

      {/* Value Drivers */}
      <ValueDrivers />

      {/* Cultural Lock-In Artifacts */}
      <CulturalArtifacts />

      {/* Feature Showcase (for authenticated users) */}
      {user && <FeatureShowcase />}
    </main>
  )
}
