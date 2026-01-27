import { SimplePage } from '@/components/marketing/simple-page'

export default function FaqPage(): React.JSX.Element {
  return (
    <SimplePage
      title="FAQ"
      description="Find quick answers about ReadyLayer onboarding, security, and usage."
      primaryCta={{ label: 'Help center', href: '/help' }}
      secondaryCta={{ label: 'Contact support', href: '/contact', variant: 'outline' }}
    />
  )
}
