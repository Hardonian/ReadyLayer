import { SimplePage } from '@/components/marketing/simple-page'

export default function TermsPage(): React.JSX.Element {
  return (
    <SimplePage
      title="Terms of Service"
      description="Review the terms that govern access to ReadyLayer services."
      primaryCta={{ label: 'Privacy policy', href: '/privacy' }}
      secondaryCta={{ label: 'Contact support', href: '/contact', variant: 'outline' }}
    />
  )
}
