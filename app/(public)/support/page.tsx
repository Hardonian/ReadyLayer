import { SimplePage } from '@/components/marketing/simple-page'

export default function SupportPage(): React.JSX.Element {
  return (
    <SimplePage
      title="Support"
      description="Get help with onboarding, integrations, and product troubleshooting."
      primaryCta={{ label: 'Visit help center', href: '/help' }}
      secondaryCta={{ label: 'Contact support', href: '/contact', variant: 'outline' }}
    />
  )
}
