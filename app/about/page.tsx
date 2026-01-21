import { SimplePage } from '@/components/marketing/simple-page'

export default function AboutPage() {
  return (
    <SimplePage
      title="About ReadyLayer"
      description="ReadyLayer helps engineering teams enforce AI code readiness with deterministic checks, audit trails, and automated verification."
      primaryCta={{ label: 'See how it works', href: '/how-it-works' }}
      secondaryCta={{ label: 'Talk to support', href: '/contact', variant: 'outline' }}
    />
  )
}
