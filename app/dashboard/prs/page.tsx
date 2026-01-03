'use client'

import React from 'react'
import { useDashboardPRs, useOrganizationId } from '@/lib/hooks'
import { useStreamConnection } from '@/lib/hooks/use-stream-connection'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, ErrorState, Skeleton, EmptyState } from '@/components/ui'
import { ConnectionStatusBadge } from '@/components/dashboard/connection-status'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { GitBranch, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function PRsPage() {
  const { organizationId, loading } = useOrganizationId()

  const { status, lastEventTime } = useStreamConnection({
    organizationId: organizationId || '',
    enabled: !!organizationId,
  })

  const { data: prsData, isLoading: prsLoading } = useDashboardPRs({
    organizationId: organizationId || '',
    enabled: !!organizationId,
    limit: 50,
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
              <GitBranch className="h-8 w-8" />
              Pull Request Queue
            </h1>
            <p className="text-muted-foreground mt-1">
              Gating status, remediation checklists, and batch actions for PRs
            </p>
          </div>
          <ConnectionStatusBadge status={status} lastEventTime={lastEventTime} />
        </div>

        {/* PRs List */}
        {prsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !prsData?.prs.length ? (
          <EmptyState
            icon={GitBranch}
            title="No PRs found"
            description="Pull requests will appear here after they are analyzed."
          />
        ) : (
          <div className="space-y-4">
            {prsData.prs.map((pr) => (
              <Card key={pr.id} className="hover:bg-surface-hover transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/reviews/${pr.id}`}
                          className="font-semibold text-lg hover:text-primary"
                        >
                          {pr.repositoryName} #{pr.prNumber}
                        </Link>
                        {pr.isBlocked && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Blocked
                          </Badge>
                        )}
                        {pr.gatesPassed && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Gates Passed
                          </Badge>
                        )}
                        {pr.aiTouchedDetected && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                            AI-touched
                          </Badge>
                        )}
                      </div>
                      {pr.prTitle && (
                        <div className="text-sm text-muted-foreground">{pr.prTitle}</div>
                      )}
                      {pr.isBlocked && pr.blockedReason && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <div className="text-sm font-medium text-destructive mb-1">Blocked Reason</div>
                          <div className="text-sm text-muted-foreground">{pr.blockedReason}</div>
                        </div>
                      )}
                      {pr.gatesFailed.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pr.gatesFailed.map((gate, idx) => (
                            <Badge key={idx} variant="outline" className="bg-red-500/10 text-red-600">
                              {gate}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>SHA: {pr.prSha.slice(0, 8)}</span>
                        <span>•</span>
                        <span>{new Date(pr.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="outline"
                        className={
                          pr.status === 'blocked'
                            ? 'bg-red-500/10 text-red-600'
                            : pr.status === 'pass'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-yellow-500/10 text-yellow-600'
                        }
                      >
                        {pr.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </Container>
  )
}
