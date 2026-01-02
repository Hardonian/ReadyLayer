'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { detectGitProvider, getGitProviderUIConfig } from '@/lib/git-provider-ui'
import { Shield, ExternalLink, Download } from 'lucide-react'
import Link from 'next/link'

interface PolicyStatusWidgetProps {
  repository: {
    id: string
    provider?: string
    url?: string
    fullName?: string
  }
  policyResult: {
    blocked: boolean
    score: number
    rulesFired: string[]
    issuesCount: number
  }
  evidenceBundleId?: string
  reviewId?: string
  className?: string
}

/**
 * Policy Status Widget
 * 
 * Transposable widget that adapts to Git provider UI
 * Can be embedded in PR/MR pages or shown standalone
 */
export function PolicyStatusWidget({
  repository,
  policyResult,
  evidenceBundleId,
  reviewId,
  className,
}: PolicyStatusWidgetProps) {
  const provider = detectGitProvider(repository)
  const config = getGitProviderUIConfig(provider)
  const theme = config.theme

  const status = policyResult.blocked ? 'failure' : 'success'
  const statusColor = status === 'success' ? theme.colors.success : theme.colors.danger

  return (
    <Card
      className={className}
      style={{
        borderColor: statusColor + '40',
        backgroundColor: status === 'success' ? theme.colors.success + '08' : theme.colors.danger + '08',
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield
              className="h-5 w-5"
              style={{ color: statusColor }}
            />
            <CardTitle className="text-lg">Policy Check</CardTitle>
          </div>
          <Badge
            variant={status === 'success' ? 'default' : 'destructive'}
            style={{
              backgroundColor: statusColor + '15',
              color: statusColor,
              borderColor: statusColor + '40',
            }}
          >
            {policyResult.blocked ? 'Blocked' : 'Passed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Policy Score</span>
            <span
              className="text-lg font-bold"
              style={{ color: statusColor }}
            >
              {policyResult.score.toFixed(1)}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${policyResult.score}%`,
                backgroundColor: statusColor,
              }}
            />
          </div>
        </div>

        {/* Rules Fired */}
        {policyResult.rulesFired.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">
              Rules Evaluated ({policyResult.rulesFired.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {policyResult.rulesFired.slice(0, 5).map((ruleId) => (
                <Badge key={ruleId} variant="outline" className="text-xs">
                  {ruleId}
                </Badge>
              ))}
              {policyResult.rulesFired.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{policyResult.rulesFired.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Issues Count */}
        {policyResult.issuesCount > 0 && (
          <div className="text-sm">
            <span className="font-medium">{policyResult.issuesCount}</span>
            {' '}
            {policyResult.issuesCount === 1 ? 'issue' : 'issues'} found
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {reviewId && (
            <Link href={`/dashboard/reviews/${reviewId}`}>
              <Button variant="outline" size="sm" className="flex-1">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Review
              </Button>
            </Link>
          )}
          {evidenceBundleId && (
            <Link href={`/dashboard/evidence/${evidenceBundleId}`}>
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="h-3 w-3 mr-1" />
                View Evidence
              </Button>
            </Link>
          )}
        </div>

        {/* Provider-specific footer */}
        {config.workflow.embedInProviderUI && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {provider === 'github' && 'ReadyLayer Policy Check'}
            {provider === 'gitlab' && 'ReadyLayer Policy Verification'}
            {provider === 'bitbucket' && 'ReadyLayer Policy Status'}
            {provider === 'generic' && 'Policy Evaluation'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
