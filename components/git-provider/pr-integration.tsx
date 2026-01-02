'use client'

import { useEffect, useState } from 'react'
import { PolicyStatusWidget } from './policy-status-widget'
import { TestRunStatus } from './test-run-status'
import { formatProviderComment, getStatusCheckDescription, type GitProvider } from '@/lib/git-provider-ui'

interface PRIntegrationProps {
  repository: {
    id: string
    provider?: string
    url?: string
    fullName?: string
  }
  prNumber: number
  prSha: string
  reviewId?: string
}

/**
 * PR Integration Component
 * 
 * Embeds policy status into Git provider PR/MR UI
 * Adapts styling and behavior to match provider
 */
export function PRIntegration({ repository, prNumber, prSha, reviewId }: PRIntegrationProps) {
  const [policyResult, setPolicyResult] = useState<{
    blocked: boolean
    score: number
    rulesFired: string[]
    issuesCount: number
  } | null>(null)
  const [evidenceBundleId, setEvidenceBundleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPolicyResult() {
      try {
        // Fetch review result which includes policy evaluation
        if (reviewId) {
          const response = await fetch(`/api/v1/reviews/${reviewId}`)
          if (response.ok) {
            const review = await response.json()
            // Extract policy result from review
            setPolicyResult({
              blocked: review.isBlocked || false,
              score: review.result?.policyScore || 100,
              rulesFired: review.result?.rulesFired || [],
              issuesCount: review.result?.summary?.total || 0,
            })
          }
        }

        // Fetch evidence bundle if available
        const evidenceResponse = await fetch(`/api/v1/evidence?reviewId=${reviewId}`)
        if (evidenceResponse.ok) {
          const evidenceData = await evidenceResponse.json()
          if (evidenceData.evidence && evidenceData.evidence.length > 0) {
            setEvidenceBundleId(evidenceData.evidence[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch policy result:', error)
      } finally {
        setLoading(false)
      }
    }

    if (reviewId) {
      fetchPolicyResult()
    } else {
      setLoading(false)
    }
  }, [reviewId])

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-muted animate-pulse">
        <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-2" />
        <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
      </div>
    )
  }

  if (!policyResult) {
    return null
  }

  return (
    <div className="space-y-4">
      <PolicyStatusWidget
        repository={repository}
        policyResult={policyResult}
        evidenceBundleId={evidenceBundleId || undefined}
        reviewId={reviewId}
      />
      <TestRunStatus
        repository={repository}
        prNumber={prNumber}
        prSha={prSha}
      />
    </div>
  )
}

/**
 * Generate provider-specific PR comment
 */
export function generatePRComment(
  provider: GitProvider,
  policyResult: {
    blocked: boolean
    score: number
    rulesFired: string[]
    issues: Array<{ severity: string; message: string; file: string; line: number }>
  }
): string {
  const title = policyResult.blocked
    ? 'Policy Check Failed'
    : 'Policy Check Passed'

  const body = getStatusCheckDescription(provider, {
    blocked: policyResult.blocked,
    score: policyResult.score,
    issuesCount: policyResult.issues.length,
  })

  return formatProviderComment(provider, {
    title,
    body,
    issues: policyResult.issues,
    score: policyResult.score,
  })
}
