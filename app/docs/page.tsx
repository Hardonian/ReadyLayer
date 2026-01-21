import { SimplePage } from '@/components/marketing/simple-page'

export default function DocsPage() {
  return (
    <SimplePage
      title="Documentation"
      description="Browse API reference and implementation guidance for ReadyLayer."
      primaryCta={{ label: 'API reference', href: '/docs/api-reference' }}
      secondaryCta={{ label: 'Getting started', href: '/help/getting-started', variant: 'outline' }}
    />
  )
}
