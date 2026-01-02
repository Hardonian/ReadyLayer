'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, WifiOff, Clock, FileX, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'

interface FailureModesProps {
  className?: string
}

const failureScenarios = [
  {
    id: 'ai-unavailable',
    title: 'AI service unavailable',
    icon: WifiOff,
    description: 'What happens if the AI service is down or rate-limited',
    fallback: 'Hard fallback to rule-based checks',
    prStatus: 'warn',
    auditMessage: 'AI service unavailable, falling back to rule-based analysis',
    details: [
      'Review Guard uses static analysis only',
      'Test Engine skips generation, uses existing tests',
      'Doc Sync uses template-based generation',
      'PR is not blocked, but warnings are shown',
    ],
  },
  {
    id: 'ci-timeout',
    title: 'CI timeout',
    icon: Clock,
    description: 'What happens if ReadyLayer checks exceed timeout',
    fallback: 'Graceful timeout with partial results',
    prStatus: 'warn',
    auditMessage: 'Check timeout after 5 minutes, partial results available',
    details: [
      'Completed checks are reported',
      'Incomplete checks show timeout status',
      'PR is not blocked (timeout is not a failure)',
      'Admin can configure timeout thresholds',
    ],
  },
  {
    id: 'docs-fail',
    title: 'Documentation generation fails',
    icon: FileX,
    description: 'What happens if doc generation encounters errors',
    fallback: 'Skip doc generation, continue with other checks',
    prStatus: 'warn',
    auditMessage: 'Doc generation failed: template error, continuing with other checks',
    details: [
      'Doc Sync check shows warning status',
      'Other checks (Review Guard, Test Engine) continue',
      'PR is not blocked (docs are non-critical)',
      'Error details logged for debugging',
    ],
  },
  {
    id: 'readylayer-error',
    title: 'ReadyLayer service error',
    icon: AlertTriangle,
    description: 'What happens if ReadyLayer itself encounters an error',
    fallback: 'Fail open with clear error message',
    prStatus: 'warn',
    auditMessage: 'ReadyLayer error: database connection failed, PR allowed with warning',
    details: [
      'Error is logged with full stack trace',
      'PR is not blocked (fail-open policy)',
      'Clear error message shown in PR comments',
      'Admin notified via configured channels',
    ],
  },
]

export function FailureModes({ className }: FailureModesProps) {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <motion.section
      className={cn('w-full space-y-6', className)}
      variants={prefersReducedMotion ? fadeIn : staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <AlertTriangle className="h-6 w-6 text-warning" />
          What if something goes wrong?
        </h2>
        <p className="text-text-muted">
          Every failure mode has a defined fallback behavior. ReadyLayer never blocks PRs due to its own failures.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {failureScenarios.map((scenario) => {
          const Icon = scenario.icon
          return (
            <motion.div key={scenario.id} variants={prefersReducedMotion ? fadeIn : staggerItem}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-warning-muted">
                        <Icon className="h-5 w-5 text-warning" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{scenario.title}</CardTitle>
                        <p className="text-sm text-text-muted mt-1">{scenario.description}</p>
                      </div>
                    </div>
                    <Badge
                      variant={scenario.prStatus === 'warn' ? 'warning' : 'destructive'}
                      className="text-xs"
                    >
                      {scenario.prStatus === 'warn' ? 'Warns' : 'Blocks'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-md border border-border-subtle bg-surface-muted">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold">Fallback behavior</span>
                    </div>
                    <p className="text-xs text-text-muted">{scenario.fallback}</p>
                  </div>

                  <div className="p-3 rounded-md border border-border-subtle bg-surface-muted">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold">Audit trail message</span>
                    </div>
                    <p className="text-xs font-mono text-text-muted">{scenario.auditMessage}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold mb-1">What happens:</div>
                    <ul className="space-y-1">
                      {scenario.details.map((detail, idx) => (
                        <li key={idx} className="text-xs text-text-muted flex items-start gap-2">
                          <span className="text-accent mt-0.5">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card className="border-2 border-success bg-success-muted/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold mb-2">Fail-open policy</div>
              <p className="text-sm text-text-muted">
                ReadyLayer never blocks PRs due to its own failures. If ReadyLayer encounters an error, the PR is
                allowed with a warning. This ensures ReadyLayer never becomes a blocker for your team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  )
}
