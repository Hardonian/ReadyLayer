'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { detectGitProvider, getGitProviderUIConfig } from '@/lib/git-provider-ui'
import { TestTube, CheckCircle2, XCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface TestRunStatusProps {
  repository: {
    id: string
    provider?: string
    url?: string
    fullName?: string
  }
  prNumber?: number
  prSha?: string
  className?: string
}

interface TestRun {
  id: string
  status: string
  conclusion: string | null
  coverage: {
    total?: number
    lines?: number
    functions?: number
    branches?: number
  } | null
  summary: {
    total?: number
    passed?: number
    failed?: number
    skipped?: number
  } | null
  artifactsUrl?: string | null
  workflowRunId?: string | null
  completedAt?: string | null
}

/**
 * Test Run Status Component
 * 
 * Shows test execution status, coverage, and pass/fail summary
 */
export function TestRunStatus({
  repository,
  prNumber,
  prSha,
  className,
}: TestRunStatusProps) {
  const [testRun, setTestRun] = useState<TestRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const provider = detectGitProvider(repository)
  const config = getGitProviderUIConfig(provider)
  const theme = config.theme

  useEffect(() => {
    async function fetchTestRun() {
      if (!repository.id || (!prNumber && !prSha)) {
        setLoading(false)
        return
      }

      try {
        const params = new URLSearchParams({
          repositoryId: repository.id,
        })
        if (prNumber) {
          params.append('prNumber', String(prNumber))
        }
        if (prSha) {
          params.append('prSha', prSha)
        }

        const response = await fetch(`/api/v1/test-runs?${params.toString()}`)
        if (!response.ok) {
          if (response.status === 404) {
            // No test runs found - this is OK
            setTestRun(null)
            setLoading(false)
            return
          }
          throw new Error(`Failed to fetch test runs: ${response.statusText}`)
        }

        const data = await response.json()
        if (data.data?.testRuns && data.data.testRuns.length > 0) {
          // Get the most recent test run
          setTestRun(data.data.testRuns[0])
        } else {
          setTestRun(null)
        }
      } catch (err) {
        console.error('Failed to fetch test run:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchTestRun()
  }, [repository.id, prNumber, prSha])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            Failed to load test run status: {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!testRun) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            No test runs found. Tests will appear here after CI execution.
          </div>
        </CardContent>
      </Card>
    )
  }

  const status = testRun.status === 'completed'
    ? (testRun.conclusion === 'success' ? 'success' : 'failure')
    : testRun.status === 'in_progress'
    ? 'pending'
    : 'pending'

  const statusColor =
    status === 'success'
      ? theme.colors.success
      : status === 'failure'
      ? theme.colors.danger
      : theme.colors.warning

  const Icon =
    status === 'success'
      ? CheckCircle2
      : status === 'failure'
      ? XCircle
      : Clock

  return (
    <Card
      className={className}
      style={{
        borderColor: statusColor + '40',
        backgroundColor: status === 'success' ? statusColor + '08' : status === 'failure' ? theme.colors.danger + '08' : theme.colors.warning + '08',
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TestTube className="h-5 w-5" style={{ color: statusColor }} />
            <CardTitle className="text-lg">Test Run</CardTitle>
          </div>
          <Badge
            variant={status === 'success' ? 'default' : status === 'failure' ? 'destructive' : 'secondary'}
            style={{
              backgroundColor: statusColor + '15',
              color: statusColor,
              borderColor: statusColor + '40',
            }}
          >
            <Icon className="h-3 w-3 mr-1" />
            {status === 'success' && 'Passed'}
            {status === 'failure' && 'Failed'}
            {status === 'pending' && 'Running'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Summary */}
        {testRun.summary && (
          <div>
            <div className="text-sm font-medium mb-2">Test Results</div>
            <div className="grid grid-cols-3 gap-2">
              {testRun.summary.total !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold">{testRun.summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              )}
              {testRun.summary.passed !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{testRun.summary.passed}</div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>
              )}
              {testRun.summary.failed !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{testRun.summary.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coverage */}
        {testRun.coverage && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Coverage</span>
              {testRun.coverage.total !== undefined && (
                <span className="text-lg font-bold" style={{ color: statusColor }}>
                  {testRun.coverage.total.toFixed(1)}%
                </span>
              )}
            </div>
            {testRun.coverage.total !== undefined && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${testRun.coverage.total}%`,
                    backgroundColor: statusColor,
                  }}
                />
              </div>
            )}
            {testRun.coverage.lines !== undefined && (
              <div className="text-xs text-muted-foreground mt-1">
                Lines: {testRun.coverage.lines.toFixed(1)}% | Functions: {testRun.coverage.functions?.toFixed(1) || 'N/A'}% | Branches: {testRun.coverage.branches?.toFixed(1) || 'N/A'}%
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {testRun.workflowRunId && repository.fullName && (
            <a
              href={`https://github.com/${repository.fullName}/actions/runs/${testRun.workflowRunId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Badge variant="outline" className="cursor-pointer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Workflow
              </Badge>
            </a>
          )}
          {testRun.artifactsUrl && (
            <a href={testRun.artifactsUrl} target="_blank" rel="noopener noreferrer">
              <Badge variant="outline" className="cursor-pointer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Download Artifacts
              </Badge>
            </a>
          )}
        </div>

        {/* Provider-specific footer */}
        {config.workflow.embedInProviderUI && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {provider === 'github' && 'ReadyLayer Test Execution'}
            {provider === 'gitlab' && 'ReadyLayer Test Results'}
            {provider === 'bitbucket' && 'ReadyLayer Test Status'}
            {provider === 'generic' && 'Test Execution'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
