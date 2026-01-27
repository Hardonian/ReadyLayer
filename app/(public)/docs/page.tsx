import type { Metadata } from 'next'
import { SimplePage } from '@/components/marketing/simple-page'

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Documentation for ReadyLayer OSS governance workflows and API reference.',
}

export default function DocsPage(): React.JSX.Element {
  return (
    <SimplePage
      title="Documentation"
      description="Get started with ReadyLayer OSS governance workflows, integrations, and API reference."
      primaryCta={{ label: 'API reference', href: '/docs/api-reference' }}
      secondaryCta={{ label: 'Get started (OSS)', href: '/docs/api-reference', variant: 'outline' }}
    />
  )
}
