import { SimplePage } from '@/components/marketing/simple-page'

export default function StatusPage(): React.JSX.Element {
  return (
    <SimplePage
      title="System Status"
      description="Monitor ReadyLayer service availability and incident updates."
      primaryCta={{ label: 'View live status', href: 'https://status.readylayer.io', external: true }}
      secondaryCta={{ label: 'Contact support', href: '/contact', variant: 'outline' }}
    />
  )
}
