'use client'

import React, { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  ErrorState,
  Skeleton,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { fadeIn } from '@/lib/design/motion'
import { 
  CheckCircle2, 
  Clock,
  XCircle,
  Shield,
  TestTube,
  FileText,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Info,
  FileCode,
  History,
} from 'lucide-react'
import Link from 'next/link'

interface Finding {
  ruleId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  file: string
  line: number
  message: string
  fix?: string
}

interface Artifact {
  type: 'test' | 'doc' | 'report'
  name: string
  url?: string
  size?: number
}

interface AuditLogEntry {
  id: string
  action: string
  resourceType: string
  details?: any
  createdAt: string
  user?: {
    id: string
    name: string | null
    email: string | null
  }
}

interface RunDetails {
  id: string
  correlationId: string
  repositoryId: string | null
  sandboxId: string | null
  trigger: 'webhook' | 'manual' | 'sandbox'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  conclusion?: 'success' | 'failure' | 'partial_success' | 'cancelled'
  reviewGuardStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  testEngineStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  docSyncStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  reviewGuardResult?: {
    reviewId?: string
    issuesFound: number
    isBlocked: boolean
    summary: {
      total: number
      critical: number
      high: number
      medium: number
      low: number
    }
  }
  testEngineResult?: {
    testsGenerated: number
    coverage?: {
      lines: number
      branches: number
      functions: number
    }
    meetsThreshold: boolean
  }
  docSyncResult?: {
    docId?: string
    driftDetected: boolean
    missingEndpoints: number
    changedEndpoints: number
  }
  aiTouchedDetected: boolean
  aiTouchedFiles?: Array<{ path: string; confidence: number; methods: string[] }>
  gatesPassed: boolean
  gatesFailed?: Array<{ gate: string; reason: string }>
  startedAt: string
  completedAt?: string
  reviewGuardStartedAt?: string
  reviewGuardCompletedAt?: string
  testEngineStartedAt?: string
  testEngineCompletedAt?: string
  docSyncStartedAt?: string
  docSyncCompletedAt?: string
  repository?: {
    id: string
    name: string
    fullName: string
    provider?: string
  }
  findings?: Finding[]
  artifacts?: Artifact[]
  auditLog?: AuditLogEntry[]
  providerLink?: string
}

export default function RunDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const runId = params.runId as string
  const [run, setRun] = useState<RunDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRun() {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        const response = await fetch(`/api/v1/runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>
          throw new Error(getApiErrorMessage(errorData))
        }

        const data = (await response.json()) as { data?: RunDetails }
        setRun(data.data || null)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load run')
        setLoading(false)
      }
    }

    if (runId) {
      fetchRun()
    }
  }, [runId])

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Container>
    )
  }

  if (error || !run) {
    return (
      <Container className="py-8">
        <ErrorState
          message={error || 'Run not found'}
          action={{
            label: 'Back to Runs',
            onClick: () => router.push('/dashboard/runs'),
          }}
        />
      </Container>
    )
  }

  const getStageStatus = (status: string) => {
    switch (status) {
      case 'succeeded':
        return { icon: CheckCircle2, color: 'text-green-500', label: 'Succeeded' }
      case 'failed':
        return { icon: XCircle, color: 'text-red-500', label: 'Failed' }
      case 'running':
        return { icon: Clock, color: 'text-blue-500', label: 'Running' }
      case 'skipped':
        return { icon: Clock, color: 'text-gray-400', label: 'Skipped' }
      default:
        return { icon: Clock, color: 'text-gray-400', label: 'Pending' }
    }
  }

  return (
    <Container className="py-8">
      <motion.div
        className="space-y-8"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/runs')}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {run.sandboxId ? 'Sandbox Demo Run' : 
               run.repository?.fullName || `Run ${run.correlationId.slice(0, 8)}`}
            </h1>
            <p className="text-muted-foreground mt-1">
              Correlation ID: {run.correlationId}
            </p>
          </div>
        </div>

        {/* Run Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Run Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-lg font-semibold">{run.status}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Conclusion</div>
                <div className="text-lg font-semibold">{run.conclusion || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Trigger</div>
                <div className="text-lg font-semibold">{run.trigger}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Gates</div>
                <div className={`text-lg font-semibold ${run.gatesPassed ? 'text-green-600' : 'text-red-600'}`}>
                  {run.gatesPassed ? 'Passed' : 'Failed'}
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">Timing</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Started:</span>{' '}
                  {new Date(run.startedAt).toLocaleString()}
                </div>
                {run.completedAt && (
                  <div>
                    <span className="text-muted-foreground">Completed:</span>{' '}
                    {new Date(run.completedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stage Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Review Guard */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6" />
                <div className="flex-1">
                  <div className="font-semibold">Review Guard</div>
                  <div className="text-sm text-muted-foreground">
                    Static analysis and AI-powered code review
                  </div>
                </div>
                {(() => {
                  const status = getStageStatus(run.reviewGuardStatus)
                  const Icon = status.icon
                  return (
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${status.color}`} />
                      <span className={status.color}>{status.label}</span>
                    </div>
                  )
                })()}
              </div>
              {run.reviewGuardResult && (
                <div className="ml-9 pl-4 border-l-2 border-border-subtle space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">{run.reviewGuardResult.issuesFound}</span> issue(s) found
                  </div>
                  {run.reviewGuardResult.summary && (
                    <div className="text-sm text-muted-foreground">
                      Critical: {run.reviewGuardResult.summary.critical} • 
                      High: {run.reviewGuardResult.summary.high} • 
                      Medium: {run.reviewGuardResult.summary.medium} • 
                      Low: {run.reviewGuardResult.summary.low}
                    </div>
                  )}
                  {run.reviewGuardResult.isBlocked && (
                    <div className="text-sm text-red-600 font-medium">
                      PR blocked due to policy violations
                    </div>
                  )}
                  {run.reviewGuardResult.reviewId && (
                    <Link
                      href={`/dashboard/reviews/${run.reviewGuardResult.reviewId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View review details →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Test Engine */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <TestTube className="h-6 w-6" />
                <div className="flex-1">
                  <div className="font-semibold">Test Engine</div>
                  <div className="text-sm text-muted-foreground">
                    Test generation and coverage enforcement
                  </div>
                </div>
                {(() => {
                  const status = getStageStatus(run.testEngineStatus)
                  const Icon = status.icon
                  return (
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${status.color}`} />
                      <span className={status.color}>{status.label}</span>
                    </div>
                  )
                })()}
              </div>
              {run.testEngineResult && (
                <div className="ml-9 pl-4 border-l-2 border-border-subtle space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">{run.testEngineResult.testsGenerated}</span> test(s) generated
                  </div>
                  {run.testEngineResult.coverage && (
                    <div className="text-sm text-muted-foreground">
                      Coverage: {run.testEngineResult.coverage.lines}% lines • 
                      {run.testEngineResult.coverage.branches}% branches • 
                      {run.testEngineResult.coverage.functions}% functions
                    </div>
                  )}
                  <div className={`text-sm font-medium ${
                    run.testEngineResult.meetsThreshold ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {run.testEngineResult.meetsThreshold ? 'Meets threshold' : 'Below threshold'}
                  </div>
                </div>
              )}
            </div>

            {/* Doc Sync */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                <div className="flex-1">
                  <div className="font-semibold">Doc Sync</div>
                  <div className="text-sm text-muted-foreground">
                    Documentation generation and drift detection
                  </div>
                </div>
                {(() => {
                  const status = getStageStatus(run.docSyncStatus)
                  const Icon = status.icon
                  return (
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${status.color}`} />
                      <span className={status.color}>{status.label}</span>
                    </div>
                  )
                })()}
              </div>
              {run.docSyncResult && (
                <div className="ml-9 pl-4 border-l-2 border-border-subtle space-y-2">
                  <div className={`text-sm font-medium ${
                    run.docSyncResult.driftDetected ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {run.docSyncResult.driftDetected ? 'Drift detected' : 'No drift detected'}
                  </div>
                  {run.docSyncResult.driftDetected && (
                    <div className="text-sm text-muted-foreground">
                      Missing endpoints: {run.docSyncResult.missingEndpoints} • 
                      Changed endpoints: {run.docSyncResult.changedEndpoints}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI-Touched Detection */}
        {run.aiTouchedDetected && run.aiTouchedFiles && run.aiTouchedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>AI-Touched Files Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {run.aiTouchedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-surface-muted rounded">
                    <div>
                      <div className="font-medium">{file.path}</div>
                      <div className="text-sm text-muted-foreground">
                        Confidence: {(file.confidence * 100).toFixed(0)}% • 
                        Methods: {file.methods.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Policy Gates */}
        {run.gatesFailed && run.gatesFailed.length > 0 && (
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-600">Policy Gates Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {run.gatesFailed.map((gate, idx) => (
                  <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                    <div className="font-medium">{gate.gate}</div>
                    <div className="text-sm text-muted-foreground">{gate.reason}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Findings */}
        {run.findings && run.findings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Findings ({run.findings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {run.findings.map((finding, idx) => {
                  const severityColors = {
                    critical: 'text-red-600 bg-red-50 border-red-200',
                    high: 'text-orange-600 bg-orange-50 border-orange-200',
                    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
                    low: 'text-blue-600 bg-blue-50 border-blue-200',
                  };
                  const severityIcons = {
                    critical: AlertCircle,
                    high: AlertTriangle,
                    medium: Info,
                    low: Info,
                  };
                  const Icon = severityIcons[finding.severity] || Info;
                  
                  return (
                    <div
                      key={idx}
                      className={`p-4 border rounded-lg ${severityColors[finding.severity] || 'bg-surface-muted'}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold capitalize">{finding.severity}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm font-mono">{finding.ruleId}</span>
                          </div>
                          <div className="text-sm mb-2">{finding.message}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {finding.file}:{finding.line}
                          </div>
                          {finding.fix && (
                            <div className="mt-2 p-2 bg-surface-muted rounded text-xs font-mono">
                              <div className="text-muted-foreground mb-1">Suggested fix:</div>
                              <div>{finding.fix}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Artifacts */}
        {run.artifacts && run.artifacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Artifacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {run.artifacts.map((artifact, idx) => {
                  const artifactIcons = {
                    test: TestTube,
                    doc: FileText,
                    report: FileCode,
                  };
                  const Icon = artifactIcons[artifact.type] || FileCode;
                  
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-surface-muted rounded-lg"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{artifact.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {artifact.type} {artifact.size ? `• ${artifact.size} bytes` : ''}
                        </div>
                      </div>
                      {artifact.url && (
                        <a
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <span className="text-sm">Download</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit Log */}
        {run.auditLog && run.auditLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {run.auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 bg-surface-muted rounded-lg"
                  >
                    <History className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">{entry.action}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground capitalize">
                          {entry.resourceType}
                        </span>
                      </div>
                      {entry.user && (
                        <div className="text-sm text-muted-foreground mb-1">
                          by {entry.user.name || entry.user.email || 'System'}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                      {entry.details && (
                        <div className="mt-2 text-xs font-mono bg-surface p-2 rounded">
                          {JSON.stringify(entry.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provider Link */}
        {run.providerLink && (
          <Card>
            <CardContent className="pt-6">
              <a
                href={run.providerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                <span>View in {run.repository?.provider || 'provider'}</span>
              </a>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </Container>
  )
}
