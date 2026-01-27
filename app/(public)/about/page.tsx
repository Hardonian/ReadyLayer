import type { Metadata } from 'next'
import { SimplePage } from '@/components/marketing/simple-page'

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about ReadyLayer, the open-source governance framework for AI-generated code.',
}

export default function AboutPage(): React.JSX.Element {
  return (
    <SimplePage
      title="About ReadyLayer"
      description="ReadyLayer is an open-source governance framework for AI-generated code. It is composable with Git + CI and deterministic where it matters."
      primaryCta={{ label: 'See how it works', href: '/how-it-works' }}
      secondaryCta={{ label: 'View docs', href: '/docs', variant: 'outline' }}
    />
  )
}
