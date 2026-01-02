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
} from 'lucide-react'
import type {
  PRCheck,
  CheckStatus,
  CodeDiff,
  Finding,
  DocChange,
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
    new Map(demoChecks.map((check) => [check.id, 'queued']))
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
    if (!autoPlay || state !== 'playing' || prefersReducedMotion) return

    const totalSteps = demoChecks.length
    if (currentStep >= totalSteps) {
      setState('completed')
      return
    }

    const check = demoChecks[currentStep]
    
    // Update check to running
    const runningTimer = setTimeout(() => {
      setCheckStates((prev) => new Map(prev).set(check.id, 'running'))
    }, 500)

    // Then update to final status after delay
    const statusTimer = setTimeout(() => {
      setCheckStates((prev) => new Map(prev).set(check.id, check.status))
      setCurrentStep((prev) => prev + 1)
    }, (check.duration ? check.duration * 100 : 2000) + 500)

    return () => {
      clearTimeout(runningTimer)
      clearTimeout(statusTimer)
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
    if (!check.details) return null

    return (
      <div className="mt-4 space-y-3 text-sm">
        {check.details.findings && (
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

        {check.details.testLog && (
          <div className="space-y-1">
            {check.details.testLog.map((log, idx) => (
              <div key={idx} className="font-mono text-xs text-text-muted">
                {log}
              </div>
            ))}
          </div>
        )}

        {check.details.docChanges && (
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-success" />
              </div>
              <CardTitle className="text-base font-semibold">Pull Request #42</CardTitle>
              <Badge variant="outline" className="text-xs">
                Interactive Preview
              </Badge>
            </div>
            <div className="flex items-center gap-2">
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
                            <div className="flex items-center gap-2 mb-1">
                              {getCategoryIcon(check.category)}
                              <span className="text-sm font-medium truncate">{check.name}</span>
                            </div>
                            {status !== 'queued' && check.duration && (
                              <div className="text-xs text-text-muted">
                                {status === 'running' ? 'Running...' : `${check.duration}s`}
                              </div>
                            )}
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
