'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { fadeIn, slideUp } from '@/lib/design/motion'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Shield,
  TestTube,
  FileText,
  AlertTriangle,
  ChevronRight,
  Bot,
  BarChart3,
  Eye,
  ExternalLink,
  Award,
} from 'lucide-react'
import type {
  PRCheck,
  CheckStatus,
  Finding,
} from '@/content/demo/prDemoFixtures'
import {
  demoChecks,
  demoDiff,
  demoDocUpdates,
} from '@/content/demo/prDemoFixtures'

interface InteractivePRDemoProps {
  autoPlay?: boolean
  onCheckClick?: (checkId: string) => void
  className?: string
}

type DemoState = 'idle' | 'playing' | 'paused' | 'completed'

export function InteractivePRDemo({
  autoPlay = false,
  onCheckClick,
  className,
}: InteractivePRDemoProps) {
  const [state, setState] = React.useState<DemoState>('idle')
  const [activeTab, setActiveTab] = React.useState<'checks' | 'diff' | 'docs'>('checks')
  const [selectedCheck, setSelectedCheck] = React.useState<string | null>(null)
  const [checkStates, setCheckStates] = React.useState<Map<string, CheckStatus>>(
    React.useMemo(() => {
      try {
        return new Map(demoChecks.map((check) => [check.id, 'queued']))
      } catch {
        return new Map()
      }
    }, [])
  )
  const [currentStep, setCurrentStep] = React.useState(0)

  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  // Auto-start when autoPlay prop becomes true
  React.useEffect(() => {
    if (autoPlay && state === 'idle') {
      setState('playing')
    }
  }, [autoPlay, state])

  // State machine for demo animation
  React.useEffect(() => {
    if (!autoPlay || state !== 'playing' || prefersReducedMotion) {
      return
    }

    try {
      const totalSteps = demoChecks.length
      if (currentStep >= totalSteps) {
        setState('completed')
        return
      }

      const check = demoChecks[currentStep]
      if (!check) {
        setState('completed')
        return
      }
      
      // Update check to running
      const runningTimer = setTimeout(() => {
        try {
          setCheckStates((prev) => new Map(prev).set(check.id, 'running'))
        } catch {
          // Silently handle state update errors
        }
      }, 500)

      // Then update to final status after delay
      const statusTimer = setTimeout(() => {
        try {
          setCheckStates((prev) => new Map(prev).set(check.id, check.status))
          setCurrentStep((prev) => prev + 1)
        } catch {
          // Silently handle state update errors
        }
      }, (check.duration ? check.duration * 100 : 2000) + 500)

      return () => {
        clearTimeout(runningTimer)
        clearTimeout(statusTimer)
      }
    } catch {
      // If anything fails, stop the demo gracefully
      setState('completed')
      return
    }
  }, [autoPlay, state, currentStep, prefersReducedMotion])

  const handlePlay = () => {
    if (state === 'completed') {
      // Reset
      setCheckStates(new Map(demoChecks.map((check) => [check.id, 'queued'])))
      setCurrentStep(0)
      setSelectedCheck(null)
    }
    setState('playing')
  }

  const handlePause = () => {
    setState('paused')
  }

  const handleReset = () => {
    setCheckStates(new Map(demoChecks.map((check) => [check.id, 'queued'])))
    setCurrentStep(0)
    setSelectedCheck(null)
    setState('idle')
  }

  const handleCheckClick = (checkId: string) => {
    setSelectedCheck(selectedCheck === checkId ? null : checkId)
    onCheckClick?.(checkId)
  }

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-danger" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-info animate-spin" />
      case 'queued':
        return <Clock className="h-4 w-4 text-text-muted" />
      default:
        return null
    }
  }

  const getCategoryIcon = (category: PRCheck['category']) => {
    switch (category) {
      case 'review-guard':
        return <Shield className="h-4 w-4" />
      case 'test-engine':
        return <TestTube className="h-4 w-4" />
      case 'doc-sync':
        return <FileText className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: Finding['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
    }
  }

  const renderCheckDetails = (check: PRCheck) => {
    return (
      <div className="mt-4 space-y-3 text-sm">
        {/* Transparency Header */}
        {(check.reviewId || check.timestamp) && (
          <div className="flex items-center justify-between p-2 rounded-md bg-accent-muted/30 border border-accent/20">
            <div className="flex items-center gap-2 text-xs">
              <Eye className="h-3 w-3 text-accent" />
              <span className="font-medium text-accent">Full transparency</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              {check.reviewId && (
                <span className="font-mono">Review ID: {check.reviewId}</span>
              )}
              {check.timestamp && (
                <span>{new Date(check.timestamp).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              )}
              {check.reviewId && (
                <button
                  className="flex items-center gap-1 text-accent hover:text-accent-hover transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    // In real app, this would link to audit trail
                    // TODO: Link to /dashboard/evidence/[bundleId] or review detail page
                    if (check.reviewId && typeof window !== 'undefined') {
                      // Navigate to audit trail when implemented
                      window.location.href = `/dashboard/evidence?reviewId=${check.reviewId}`
                    }
                  }}
                  aria-label="View audit trail"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Metrics Summary */}
        {check.metrics && (
          <div className="grid grid-cols-2 gap-2 p-2 rounded-md bg-surface-hover border border-border-subtle">
            {check.metrics.findingsCount !== undefined && (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-info" />
                <div>
                  <div className="text-xs text-text-muted">Findings</div>
                  <div className="font-semibold">{check.metrics.findingsCount}</div>
                </div>
              </div>
            )}
            {check.metrics.coverageDelta !== undefined && (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-success" />
                <div>
                  <div className="text-xs text-text-muted">Coverage Δ</div>
                  <div className="font-semibold text-success">+{check.metrics.coverageDelta}%</div>
                </div>
              </div>
            )}
            {check.metrics.testsGenerated !== undefined && (
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4 text-success" />
                <div>
                  <div className="text-xs text-text-muted">Tests</div>
                  <div className="font-semibold">{check.metrics.testsGenerated}</div>
                </div>
              </div>
            )}
            {check.metrics.docsUpdated !== undefined && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <div>
                  <div className="text-xs text-text-muted">Docs</div>
                  <div className="font-semibold">{check.metrics.docsUpdated}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {check.details?.findings && (
          <div className="space-y-2">
            {check.details.findings.map((finding) => (
              <div
                key={finding.id}
                className="rounded-md border border-border-subtle bg-surface-muted p-3"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4 mt-0.5',
                      finding.severity === 'critical' || finding.severity === 'high'
                        ? 'text-danger'
                        : 'text-warning'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(finding.severity)} className="text-xs">
                        {finding.severity}
                      </Badge>
                      <span className="font-mono text-xs text-text-muted">
                        {finding.file}:{finding.line}
                      </span>
                    </div>
                    <div className="font-medium mb-1">{finding.title}</div>
                    <div className="text-text-muted text-xs">{finding.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {check.details?.testLog && (
          <div className="space-y-1">
            {check.details.testLog.map((log, idx) => (
              <div key={idx} className="font-mono text-xs text-text-muted">
                {log}
              </div>
            ))}
          </div>
        )}

        {check.details?.docChanges && (
          <div className="space-y-2">
            {check.details.docChanges.map((change, idx) => (
              <div key={idx} className="rounded-md border border-border-subtle bg-surface-muted p-3">
                <div className="font-medium mb-1">{change.summary}</div>
                {change.diff && (
                  <pre className="text-xs font-mono text-text-muted mt-2 whitespace-pre-wrap">
                    {change.diff}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border-subtle pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-success" />
              </div>
              <CardTitle className="text-base font-semibold">Pull Request #42</CardTitle>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Bot className="h-3 w-3" />
                AI Detected
              </Badge>
              <Badge variant="success" className="text-xs flex items-center gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle2 className="h-3 w-3" />
                ReadyLayer Verified™
              </Badge>
              <Badge variant="outline" className="text-xs">
                Interactive Preview
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Eye className="h-3 w-3" />
              <span>Deterministic • Signed • Traceable</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {state === 'idle' && (
              <button
                onClick={handlePlay}
                className="text-xs px-3 py-1 rounded-md bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
                aria-label="Play demo"
              >
                Play
              </button>
            )}
            {state === 'playing' && (
              <button
                onClick={handlePause}
                className="text-xs px-3 py-1 rounded-md bg-surface-muted hover:bg-surface-hover transition-colors"
                aria-label="Pause demo"
              >
                Pause
              </button>
            )}
            {(state === 'paused' || state === 'completed') && (
              <button
                onClick={handleReset}
                className="text-xs px-3 py-1 rounded-md bg-surface-muted hover:bg-surface-hover transition-colors"
                aria-label="Reset demo"
              >
                Reset
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <div className="border-b border-border-subtle px-4">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger value="checks" className="data-[state=active]:bg-transparent">
                  Checks
                </TabsTrigger>
                <TabsTrigger value="diff" className="data-[state=active]:bg-transparent">
                  Diff
                </TabsTrigger>
                <TabsTrigger value="docs" className="data-[state=active]:bg-transparent">
                  Docs
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="checks" className="m-0 p-4 space-y-2">
              <AnimatePresence mode="wait">
                {demoChecks.map((check) => {
                  const status = checkStates.get(check.id) || check.status
                  const isExpanded = selectedCheck === check.id

                  return (
                    <motion.div
                      key={check.id}
                      variants={prefersReducedMotion ? fadeIn : slideUp}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      <button
                        onClick={() => handleCheckClick(check.id)}
                        className={cn(
                          'w-full text-left rounded-md border transition-colors',
                          'hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isExpanded
                            ? 'border-border-strong bg-surface-muted'
                            : 'border-border-subtle bg-surface-raised'
                        )}
                        aria-expanded={isExpanded}
                      >
                        <div className="p-3 flex items-center gap-3">
                          {getStatusIcon(status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {getCategoryIcon(check.category)}
                              <span className="text-sm font-medium truncate">{check.name}</span>
                              {check.aiDetected && (
                                <Badge variant="info" className="text-xs px-1.5 py-0 flex items-center gap-1">
                                  <Bot className="h-3 w-3" />
                                  AI detected
                                </Badge>
                              )}
                              {check.metrics && (
                                <div className="flex items-center gap-2 ml-auto">
                                  {check.metrics.findingsCount !== undefined && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0 flex items-center gap-1">
                                      <BarChart3 className="h-3 w-3" />
                                      {check.metrics.findingsCount} finding{check.metrics.findingsCount !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {check.metrics.coverageDelta !== undefined && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      +{check.metrics.coverageDelta}% coverage
                                    </Badge>
                                  )}
                                  {check.metrics.testsGenerated !== undefined && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      {check.metrics.testsGenerated} test{check.metrics.testsGenerated !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {check.metrics.docsUpdated !== undefined && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      {check.metrics.docsUpdated} doc{check.metrics.docsUpdated !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-muted">
                              {status !== 'queued' && check.duration && (
                                <span>{status === 'running' ? 'Running...' : `${check.duration}s`}</span>
                              )}
                              {check.reviewId && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Eye className="h-3 w-3" />
                                  {check.reviewId}
                                </span>
                              )}
                              {check.timestamp && status !== 'queued' && (
                                <span>{new Date(check.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 text-text-muted transition-transform',
                              isExpanded && 'rotate-90'
                            )}
                          />
                        </div>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3">{renderCheckDetails(check)}</div>
                          </motion.div>
                        )}
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Merge Confidence Certificate */}
              {checkStates.get('ds-changelog') === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-md border-2 border-primary bg-gradient-to-r from-primary/10 to-purple-500/10"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-primary">Merge Confidence Certificate</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Certificate ID:</span>
                      <span className="font-mono text-xs">cert_rev_abc123_{Date.now()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Confidence Score:</span>
                      <span className="font-semibold text-success">85/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Readiness Level:</span>
                      <Badge variant="success" className="text-xs">Ready</Badge>
                    </div>
                    <div className="pt-2 border-t border-primary/20 text-xs text-text-muted">
                      <strong className="text-text-primary">The Inevitability Principle:</strong> If ReadyLayer didn&apos;t review it, that absence is visible. 
                      This certificate proves deterministic review with policy version hash.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Blocked status */}
              {checkStates.get('rg-quality') === 'failure' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-md border-2 border-danger bg-danger-muted/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-danger" />
                    <span className="font-semibold text-danger">Merge blocked</span>
                  </div>
                  <p className="text-sm text-text-muted">
                    Critical finding must be resolved before merging.
                  </p>
                  <div className="mt-2 p-2 bg-background/50 rounded border border-danger/20">
                    <div className="text-xs font-semibold text-danger mb-1">No Certificate Issued</div>
                    <div className="text-xs text-text-muted">
                      ReadyLayer review incomplete. This PR cannot be merged without a Merge Confidence Certificate.
                    </div>
                  </div>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="diff" className="m-0 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{demoDiff.file}</div>
                    <div className="text-sm text-text-muted">
                      +{demoDiff.additions} -{demoDiff.deletions}
                    </div>
                  </div>
                  <Badge variant="outline">{demoDiff.language}</Badge>
                </div>

                <div className="rounded-md border border-border-subtle bg-surface-muted overflow-hidden">
                  <div className="bg-surface-hover px-4 py-2 border-b border-border-subtle">
                    <span className="text-xs font-mono text-text-muted">
                      @@ -{demoDiff.hunks[0].oldStart},{demoDiff.hunks[0].oldLines} +{demoDiff.hunks[0].newStart},{demoDiff.hunks[0].newLines} @@
                    </span>
                  </div>
                  <div className="p-4 font-mono text-xs">
                    {demoDiff.hunks[0].content.split('\n').map((line, idx) => {
                      const isAddition = line.startsWith('+')
                      const isDeletion = line.startsWith('-')
                      const annotation = demoDiff.hunks[0].annotations?.find(
                        (a) => a.line === demoDiff.hunks[0].newStart + idx
                      )

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'py-0.5 px-2 -mx-2',
                            isAddition && 'bg-success-muted/30',
                            isDeletion && 'bg-danger-muted/30',
                            annotation && 'border-l-2 border-danger'
                          )}
                        >
                          <span className={cn(isAddition && 'text-success', isDeletion && 'text-danger')}>
                            {line}
                          </span>
                          {annotation && (
                            <div className="mt-1 ml-4 text-xs text-danger flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {annotation.message}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="m-0 p-4">
              <div className="space-y-4">
                <div className="rounded-md border border-border-subtle bg-surface-muted p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{demoDocUpdates.openapi.summary}</span>
                  </div>
                  <pre className="text-xs font-mono text-text-muted whitespace-pre-wrap overflow-x-auto">
                    {demoDocUpdates.openapi.content}
                  </pre>
                </div>

                <div className="rounded-md border border-border-subtle bg-surface-muted p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{demoDocUpdates.readme.summary}</span>
                  </div>
                  <pre className="text-xs font-mono text-text-muted whitespace-pre-wrap overflow-x-auto">
                    {demoDocUpdates.readme.content}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
