import { SimplePage } from '@/components/marketing/simple-page'

export default function DpaPage(): React.JSX.Element {
  return (
    <SimplePage
      title="Data Processing Addendum"
      description="ReadyLayer offers a Data Processing Addendum for customers with compliance requirements."
      primaryCta={{ label: 'Contact compliance', href: '/contact' }}
      secondaryCta={{ label: 'Security overview', href: '/security', variant: 'outline' }}
    />
  )
}
