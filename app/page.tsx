'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { LoadingState } from '@/components/ui'
import { HeroProof } from '@/components/landing'

// P2-FIX: Lazy load below-the-fold components to reduce initial bundle size
const PipelineStrip = dynamic(() => import('@/components/landing').then(mod => ({ default: mod.PipelineStrip })), {
  loading: () => <div className="h-24" />, // Placeholder to prevent layout shift
})
const ProofGrid = dynamic(() => import('@/components/landing').then(mod => ({ default: mod.ProofGrid })), {
  loading: () => <div className="h-96" />,
})
const ValueDrivers = dynamic(() => import('@/components/landing').then(mod => ({ default: mod.ValueDrivers })), {
  loading: () => <div className="h-96" />,
})
const CulturalArtifacts = dynamic(() => import('@/components/landing/CulturalArtifacts').then(mod => ({ default: mod.CulturalArtifacts })), {
  loading: () => <div className="h-96" />,
})
const FeatureShowcase = dynamic(() => import('@/components/feature-showcase').then(mod => ({ default: mod.FeatureShowcase })), {
  loading: () => <div className="h-96" />,
})
const TrustSection = dynamic(() => import('@/components/landing/TrustSection').then(mod => ({ default: mod.TrustSection })), {
  loading: () => <div className="h-96" />,
})

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
