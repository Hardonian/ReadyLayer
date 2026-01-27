import { SimplePage } from '@/components/marketing/simple-page'

export default function PrivacyPage(): React.JSX.Element {
  return (
    <SimplePage
      title="Privacy Policy"
      description="ReadyLayer is committed to protecting customer data and operating with least-privilege access."
      primaryCta={{ label: 'Security overview', href: '/security' }}
      secondaryCta={{ label: 'Contact support', href: '/contact', variant: 'outline' }}
    />
  )
}
