import type { Metadata } from 'next'
import { SimplePage } from '@/components/marketing/simple-page'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Release notes and governance updates for ReadyLayer OSS.',
}

export default function ChangelogPage(): React.JSX.Element {
  return (
    <SimplePage
      title="Changelog"
      description="Release notes and governance updates are published here for transparency as they ship."
      primaryCta={{ label: 'View docs', href: '/docs' }}
      secondaryCta={{ label: 'See GitHub', href: 'https://github.com/Hardonian/ReadyLayer', variant: 'outline', external: true }}
    />
  )
}
