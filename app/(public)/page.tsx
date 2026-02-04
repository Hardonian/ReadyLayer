import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { HeroProof, PipelineStrip } from '@/components/landing'

// Below-fold components loaded dynamically to reduce initial bundle
const ProofGrid = dynamic(
  () => import('@/components/landing').then((mod) => ({ default: mod.ProofGrid })),
  { loading: () => <div className="h-96" /> }
)
const ValueDrivers = dynamic(
  () => import('@/components/landing').then((mod) => ({ default: mod.ValueDrivers })),
  { loading: () => <div className="h-96" /> }
)
const CulturalArtifacts = dynamic(
  () => import('@/components/landing/CulturalArtifacts').then((mod) => ({ default: mod.CulturalArtifacts })),
  { loading: () => <div className="h-96" /> }
)
const TrustSection = dynamic(
  () => import('@/components/landing/TrustSection').then((mod) => ({ default: mod.TrustSection })),
  { loading: () => <div className="h-96" /> }
)

export const metadata: Metadata = {
  title: 'Open-source governance for AI-generated code',
  description:
    'ReadyLayer is an open-source governance framework for AI-generated code. Ship governed PRs in minutes with deterministic checks and traceable decisions.',
}

export default function Home(): React.ReactElement {
  return (
    <main className="min-h-screen">
      <HeroProof />
      <PipelineStrip />
      <ProofGrid />
      <TrustSection />
      <ValueDrivers />
      <CulturalArtifacts />
    </main>
  )
}
