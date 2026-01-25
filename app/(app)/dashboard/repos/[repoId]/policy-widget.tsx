'use client'

import { PolicyStatusWidget } from '@/components/git-provider/policy-status-widget'
import { useGitProvider } from '@/lib/git-provider-ui/hooks'

interface PolicyWidgetProps {
  repository: {
    id: string
    provider?: string
    url?: string
    fullName?: string
  }
  reviewId?: string
}

/**
 * Policy Widget for Repository Page
 * 
 * Shows policy status in repository view
 * Adapts to Git provider UI
 */
export function PolicyWidget({ repository, reviewId }: PolicyWidgetProps) {
  const { provider: _provider, theme: _theme } = useGitProvider({ repository })

  // This would fetch the latest policy evaluation for this repo
  // For now, showing placeholder structure

  return (
    <div className="space-y-4">
      <PolicyStatusWidget
        repository={repository}
        policyResult={{
          blocked: false,
          score: 85,
          rulesFired: [],
          issuesCount: 0,
        }}
        reviewId={reviewId}
      />
    </div>
  )
}
