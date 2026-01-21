import { SimplePage } from '@/components/marketing/simple-page'

export default function ChangelogPage() {
  return (
    <SimplePage
      title="Changelog"
      description="Product updates and improvements are published here for transparency as they ship."
      primaryCta={{ label: 'Explore the product', href: '/features' }}
      secondaryCta={{ label: 'View docs', href: '/docs', variant: 'outline' }}
    />
  )
}
