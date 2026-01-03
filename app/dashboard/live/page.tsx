'use client'

import React from 'react'
import { useDashboardMetrics, useDashboardPRs, useDashboardRuns, useDashboardFindings, useOrganizationId } from '@/lib/hooks'
import { useStreamConnection } from '@/lib/hooks/use-stream-connection'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton } from '@/components/ui'
import { ConnectionStatusBadge } from '@/components/dashboard/connection-status'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Shield,
  GitBranch,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function LiveOpsConsolePage() {
  const { organizationId, loading } = useOrganizationId()

  const { status, lastEventTime } = useStreamConnection({
    organizationId: organizationId || '',
    enabled: !!organizationId,
  })

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics({
    organizationId: organizationId || '',
    enabled: !!organizationId,
  })

  useDashboardPRs({
    organizationId: organizationId || '',
    enabled: !!organizationId,
    limit: 20,
  })

  const { data: runs, isLoading: runsLoading } = useDashboardRuns({
    organizationId: organizationId || '',
    enabled: !!organizationId,
    limit: 20,
  })

  const { data: findings, isLoading: findingsLoading } = useDashboardFindings({
    organizationId: organizationId || '',
    enabled: !!organizationId,
    limit: 20,
  })

  if (loading) {
    return (
      <Container className="py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </Container>
    )
  }

  if (!organizationId) {
    return (
      <Container className="py-8">
        <ErrorState message="Organization ID required. Please connect a repository first." />
      </Container>
    )
  }

  return (
    <Container className="py-8">
      <motion.div className="space-y-6" variants={fadeIn} initial="hidden" animate="visible">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-8 w-8" />
              Live Ops Console
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time situational awareness across AI-generated code, PRs, CI runs, and policy gates
            </p>
          </div>
          <ConnectionStatusBadge status={status} lastEventTime={lastEventTime} />
        </div>

        {/* KPI Tiles */}
        {metricsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Runs Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.kpis.totalRuns}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Blocked PRs</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{metrics.kpis.blockedPRs}</div>
                <p className="text-xs text-muted-foreground mt-1">Requiring attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Critical Findings</CardTitle>
                <Shield className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{metrics.kpis.criticalFindings}</div>
                <p className="text-xs text-muted-foreground mt-1">Security & quality issues</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">AI Risk Detections</CardTitle>
                <GitBranch className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">{metrics.kpis.aiRiskDetections}</div>
                <p className="text-xs text-muted-foreground mt-1">AI-touched code detected</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Split Pane: Events + Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {runsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : runs?.runs.length ? (
                  runs.runs.slice(0, 10).map((run) => (
                    <div
                      key={run.id}
                      className="p-3 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {run.status === 'running' ? (
                          <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                        ) : run.status === 'completed' && run.conclusion === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium text-sm">
                            {run.repositoryName || `Run ${run.correlationId.slice(0, 8)}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(run.startedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {run.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right: Details Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {findingsLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : findings?.findings.length ? (
                  <>
                    <div className="text-sm font-medium mb-2">Recent Findings</div>
                    <div className="space-y-2">
                      {findings.findings.slice(0, 5).map((finding) => (
                        <div
                          key={finding.id}
                          className="p-3 border rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="font-medium text-sm">{finding.ruleId}</div>
                            <Badge
                              variant="outline"
                              className={
                                finding.severity === 'critical'
                                  ? 'bg-red-500/10 text-red-600'
                                  : finding.severity === 'high'
                                    ? 'bg-orange-500/10 text-orange-600'
                                    : 'bg-yellow-500/10 text-yellow-600'
                              }
                            >
                              {finding.severity}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {finding.repositoryName} • {finding.file}:{finding.line}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {finding.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No findings to display
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </Container>
  )
}
