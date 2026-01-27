import { SimplePage } from '@/components/marketing/simple-page'

export default function CookiesPage(): React.JSX.Element {
  return (
    <SimplePage
      title="Cookie Policy"
      description="ReadyLayer uses cookies to maintain secure sessions and improve product performance."
      primaryCta={{ label: 'Privacy policy', href: '/privacy' }}
      secondaryCta={{ label: 'Contact support', href: '/contact', variant: 'outline' }}
    />
  )
}
