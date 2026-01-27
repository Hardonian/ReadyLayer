import { SimplePage } from '@/components/marketing/simple-page'

export default function ContactPage(): React.JSX.Element {
  return (
    <SimplePage
      title="Contact"
      description="Reach out to ReadyLayer for product questions, partnerships, or support."
      primaryCta={{ label: 'Support center', href: '/help/support' }}
      secondaryCta={{ label: 'Sign in', href: '/auth/signin', variant: 'outline' }}
    />
  )
}
