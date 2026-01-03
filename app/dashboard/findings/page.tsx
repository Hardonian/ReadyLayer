'use client'

import React, { useState } from 'react'
import { useDashboardFindings, useOrganizationId } from '@/lib/hooks'
import { useStreamConnection } from '@/lib/hooks/use-stream-connection'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, ErrorState, Skeleton, EmptyState } from '@/components/ui'
import { ConnectionStatusBadge } from '@/components/dashboard/connection-status'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { AlertTriangle, Shield, CheckCircle2, XCircle, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function FindingsPage() {
  const { organizationId, loading } = useOrganizationId()
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'warn' | 'info'>('all')

  const { status, lastEventTime } = useStreamConnection({
    organizationId: organizationId || '',
    enabled: !!organizationId,
  })

  const { data: findingsData, isLoading: findingsLoading } = useDashboardFindings({
    organizationId: organizationId || '',
    enabled: !!organizationId,
    limit: 100,
  })

  const filteredFindings = findingsData?.findings.filter((f) => {
    if (filter === 'all') return true
    return f.severity === filter
  }) || []

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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'high':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'warn':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    }
  }

  return (
    <Container className="py-8">
      <motion.div className="space-y-6" variants={fadeIn} initial="hidden" animate="visible">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Findings Inbox
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-risk, security, performance, and quality findings with explainability
            </p>
          </div>
          <ConnectionStatusBadge status={status} lastEventTime={lastEventTime} />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter by severity:</span>
              {(['all', 'critical', 'high', 'warn', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilter(sev)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    filter === sev
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-muted hover:bg-surface-hover'
                  }`}
                >
                  {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Findings List */}
        {findingsLoading ? (
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
        ) : !filteredFindings.length ? (
          <EmptyState
            icon={Shield}
            title="No findings"
            description={
              filter === 'all'
                ? 'No findings found. Great job!'
                : `No ${filter} severity findings found.`
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredFindings.map((finding) => (
              <Card key={finding.id} className="hover:bg-surface-hover transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {getSeverityIcon(finding.severity)}
                        <div className="font-semibold">{finding.ruleId}</div>
                        <Badge variant="outline" className={getSeverityBadgeColor(finding.severity)}>
                          {finding.severity}
                        </Badge>
                        {finding.status === 'resolved' && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{finding.message}</div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{finding.repositoryName}</span>
                        <span>•</span>
                        <span>
                          {finding.file}:{finding.line}
                        </span>
                        {finding.reviewId && (
                          <>
                            <span>•</span>
                            <Link
                              href={`/dashboard/reviews/${finding.reviewId}`}
                              className="text-primary hover:underline"
                            >
                              View Review
                            </Link>
                          </>
                        )}
                      </div>
                      {finding.evidenceReferences.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {finding.evidenceReferences.map((ref, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {ref}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {finding.confidence !== null && (
                        <div className="text-xs text-muted-foreground">
                          Confidence: {Math.round(finding.confidence * 100)}%
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="outline"
                        className={
                          finding.status === 'resolved'
                            ? 'bg-green-500/10 text-green-600'
                            : finding.status === 'blocked'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-yellow-500/10 text-yellow-600'
                        }
                      >
                        {finding.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {new Date(finding.createdAt).toLocaleString()}
                      </div>
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
