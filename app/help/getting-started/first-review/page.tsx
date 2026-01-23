import { SimplePage } from '@/components/marketing/simple-page'

export default function FirstReviewPage() {
  return (
    <SimplePage
      title="Your First Review"
      description="Learn how ReadyLayer runs its first readiness review and reports results back to your team."
      primaryCta={{ label: 'Connect a repository', href: '/help/getting-started/connect-repo' }}
      secondaryCta={{ label: 'Review policies', href: '/help/getting-started/policies', variant: 'outline' }}
    />
  )
}
