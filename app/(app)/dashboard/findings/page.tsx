'use client'

import { useState } from 'react'
import { useDashboardFindings, useOrganizationId } from '@/lib/hooks'
import { useStreamConnection } from '@/lib/hooks/use-stream-connection'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, ErrorState, Skeleton, EmptyState } from '@/components/ui'
import { ConnectionStatusBadge } from '@/components/dashboard/connection-status'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { AlertTriangle, Shield, CheckCircle2, XCircle, Info, FileCheck, CheckSquare, Square } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSeverityColor, type SeverityLevel } from '@/lib/utils/color-mapping'
import Link from 'next/link'

export default function FindingsPage(): React.JSX.Element {
  const { organizationId, loading } = useOrganizationId()
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'warn' | 'info'>('all')
  const [selectedFindingIds, setSelectedFindingIds] = useState<Set<string>>(new Set())
  const [isWaiverModalOpen, setIsWaiverModalOpen] = useState(false)
  const [waiverReason, setWaiverReason] = useState('')
  const [waiverExpiryDays, setWaiverExpiryDays] = useState('30')
  const [waiverScope, setWaiverScope] = useState<'repo' | 'path'>('repo')
  const [isSubmittingWaiver, setIsSubmittingWaiver] = useState(false)
  const [waiverSuccessMsg, setWaiverSuccessMsg] = useState<string | null>(null)

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

  const toggleSelectFinding = (id: string): void => {
    setSelectedFindingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = (): void => {
    if (selectedFindingIds.size === filteredFindings.length) {
      setSelectedFindingIds(new Set())
    } else {
      setSelectedFindingIds(new Set(filteredFindings.map((f) => f.id)))
    }
  }

  const handleApplyBulkWaiver = async (): Promise<void> => {
    if (!organizationId || selectedFindingIds.size === 0 || !waiverReason.trim()) {
      return
    }

    setIsSubmittingWaiver(true)
    try {
      const selectedFindings = filteredFindings.filter((f) => selectedFindingIds.has(f.id))
      const expiryDate = new Date(Date.now() + parseInt(waiverExpiryDays, 10) * 86400 * 1000).toISOString()

      // Submit waivers in parallel
      await Promise.all(
        selectedFindings.map(async (finding) => {
          await fetch('/api/v1/waivers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId,
              repositoryId: finding.repositoryId || undefined,
              ruleId: finding.ruleId,
              scope: waiverScope,
              scopeValue: waiverScope === 'path' ? finding.file : undefined,
              reason: waiverReason.trim(),
              expiresAt: expiryDate,
            }),
          })
        })
      )

      setWaiverSuccessMsg(`Successfully created cryptographically signed waivers for ${selectedFindingIds.size} finding(s).`)
      setSelectedFindingIds(new Set())
      setIsWaiverModalOpen(false)
      setWaiverReason('')
    } catch {
      alert('Failed to apply bulk waivers. Please verify permissions.')
    } finally {
      setIsSubmittingWaiver(false)
    }
  }

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

  const normalizeSeverity = (severity: string): SeverityLevel => {
    const severityMap: Record<string, SeverityLevel> = {
      critical: 'critical',
      high: 'high',
      warn: 'warn',
      info: 'info',
      medium: 'warn',
      low: 'info',
    }
    return severityMap[severity] || 'info'
  }

  const getSeverityIcon = (severity: string): React.JSX.Element => {
    const sev = normalizeSeverity(severity)
    const colors = getSeverityColor(sev)
    const iconClass = colors.icon

    switch (severity) {
      case 'critical':
        return <XCircle className={`h-4 w-4 ${iconClass}`} />
      case 'high':
        return <AlertTriangle className={`h-4 w-4 ${iconClass}`} />
      case 'warn':
        return <AlertTriangle className={`h-4 w-4 ${iconClass}`} />
      default:
        return <Info className={`h-4 w-4 ${iconClass}`} />
    }
  }

  const getSeverityBadgeColor = (severity: string): string => {
    const sev = normalizeSeverity(severity)
    const colors = getSeverityColor(sev)
    return `${colors.bg} ${colors.text} border border-current/20`
  }

  return (
    <Container className="py-8">
      <motion.div className="space-y-6" variants={fadeIn} initial="hidden" animate="visible">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Findings Inbox
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-risk, security, performance, and quality findings with policy waiver management
            </p>
          </div>
          <ConnectionStatusBadge status={status} lastEventTime={lastEventTime} />
        </div>

        {waiverSuccessMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>{waiverSuccessMsg}</span>
            </div>
            <button
              onClick={() => setWaiverSuccessMsg(null)}
              className="text-xs hover:underline text-emerald-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action & Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-surface-muted hover:bg-surface-hover transition-colors"
                >
                  {selectedFindingIds.size > 0 && selectedFindingIds.size === filteredFindings.length ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Select All ({selectedFindingIds.size})</span>
                </button>

                <span className="text-sm font-medium ml-3">Severity:</span>
                {(['all', 'critical', 'high', 'warn', 'info'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFilter(sev)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      filter === sev
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-surface-muted hover:bg-surface-hover'
                    }`}
                  >
                    {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </button>
                ))}
              </div>

              {selectedFindingIds.size > 0 && (
                <Button
                  onClick={() => setIsWaiverModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                >
                  <FileCheck className="h-4 w-4" />
                  Apply Cryptographic Waiver ({selectedFindingIds.size})
                </Button>
              )}
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
            {filteredFindings.map((finding) => {
              const isSelected = selectedFindingIds.has(finding.id)
              return (
                <Card
                  key={finding.id}
                  className={`transition-colors ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-surface-hover'
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleSelectFinding(finding.id)}
                        className="mt-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>

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
                              ? 'bg-success-muted text-success'
                              : finding.status === 'blocked'
                                ? 'bg-danger-muted text-danger'
                                : 'bg-warning-muted text-warning'
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
              )
            })}
          </div>
        )}

        {/* Bulk Waiver Application Modal */}
        <AnimatePresence>
          {isWaiverModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-primary" />
                    Apply Bulk Policy Waiver
                  </h2>
                  <Badge variant="outline">{selectedFindingIds.size} Selected</Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Business & Security Justification <span className="text-danger">*</span>
                    </label>
                    <textarea
                      value={waiverReason}
                      onChange={(e) => setWaiverReason(e.target.value)}
                      placeholder="e.g., Reviewed by security architect; approved exception for staging performance benchmarks."
                      rows={3}
                      className="w-full bg-background border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Validity Period</label>
                      <select
                        value={waiverExpiryDays}
                        onChange={(e) => setWaiverExpiryDays(e.target.value)}
                        className="w-full bg-background border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="7">7 Days</option>
                        <option value="14">14 Days</option>
                        <option value="30">30 Days</option>
                        <option value="90">90 Days</option>
                        <option value="365">1 Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Waiver Scope</label>
                      <select
                        value={waiverScope}
                        onChange={(e) => setWaiverScope(e.target.value as 'repo' | 'path')}
                        className="w-full bg-background border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="repo">Entire Repository</option>
                        <option value="path">Specific File Path Only</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    ℹ️ Waivers are cryptographically signed using Ed25519 and recorded in the immutable audit log for SOC2/ISO 27001 compliance.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsWaiverModalOpen(false)}
                    disabled={isSubmittingWaiver}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApplyBulkWaiver}
                    disabled={isSubmittingWaiver || !waiverReason.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isSubmittingWaiver ? 'Signing & Dispatching...' : 'Sign & Apply Waivers'}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </Container>
  )
}
