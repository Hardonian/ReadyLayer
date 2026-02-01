'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Code2, Eye, MessageSquare, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fadeIn } from '@/lib/design/motion'
import { trackBlockedPREvent } from '@/lib/telemetry/analytics'

export interface BlockedPRIssue {
  severity: 'critical' | 'high' | 'medium'
  ruleId: string
  message: string
  file?: string
  line?: number
  fix?: string
}

interface BlockedPRAlertProps {
  prNumber: number
  prTitle?: string
  issues: BlockedPRIssue[]
  repositoryName?: string
  onDismiss?: () => void
  onViewDetails?: () => void
  compact?: boolean
}

const severityConfig = {
  critical: {
    color: 'destructive',
    icon: AlertTriangle,
    label: 'Critical Issue',
  },
  high: {
    color: 'warning',
    icon: AlertTriangle,
    label: 'High Priority',
  },
  medium: {
    color: 'secondary',
    icon: AlertTriangle,
    label: 'Issue Found',
  },
}

export function BlockedPRAlert({
  prNumber,
  prTitle,
  issues,
  repositoryName,
  onDismiss,
  onViewDetails,
  compact = false,
}: BlockedPRAlertProps): React.JSX.Element | null {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Track when alert is shown
  useEffect(() => {
    if (!isDismissed) {
      const criticalCount = issues.filter((i) => i.severity === 'critical').length
      const highCount = issues.filter((i) => i.severity === 'high').length
      const mediumCount = issues.filter((i) => i.severity === 'medium').length

      trackBlockedPREvent('shown', prNumber, {
        prTitle,
        issueCount: issues.length,
        criticalCount,
        highCount,
        mediumCount,
        repositoryName,
      })
    }
  }, [isDismissed, prNumber, prTitle, issues, repositoryName])

  const handleDismiss = () => {
    setIsDismissed(true)
    trackBlockedPREvent('dismissed', prNumber, { prTitle, repositoryName })
    onDismiss?.()
  }

  const handleViewDetails = () => {
    trackBlockedPREvent('clicked', prNumber, { prTitle, repositoryName })
    onViewDetails?.()
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length
  const highCount = issues.filter((i) => i.severity === 'high').length
  const mediumCount = issues.filter((i) => i.severity === 'medium').length
  const topSeverity = criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : 'medium'
  const config = severityConfig[topSeverity]
  const Icon = config.icon

  if (isDismissed) return null

  if (compact) {
    return (
      <AnimatePresence>
        <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit">
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Icon className="h-4 w-4 text-warning flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    PR #{prNumber} blocked
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {criticalCount} critical, {highCount} high, {mediumCount} medium
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={handleDismiss}>
                  Dismiss
                </Button>
                <Button size="sm" onClick={handleViewDetails}>
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit">
        <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-transparent relative overflow-hidden">
          {/* Decorative warning stripe */}
          <div className="absolute left-0 top-0 h-full w-1 bg-warning" />
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-warning/5" />

          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="rounded-lg bg-warning/10 p-2 text-warning flex-shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">
                      PR #{prNumber} is blocked
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  <CardDescription>
                    {prTitle && <span>{prTitle}</span>}
                    {repositoryName && prTitle && <span> • </span>}
                    {repositoryName && <span>{repositoryName}</span>}
                  </CardDescription>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 relative">
            {/* Issue Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {criticalCount > 0 && (
                <div className="rounded-lg bg-destructive/10 p-2">
                  <p className="text-lg font-bold text-destructive">{criticalCount}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              )}
              {highCount > 0 && (
                <div className="rounded-lg bg-warning/10 p-2">
                  <p className="text-lg font-bold text-warning">{highCount}</p>
                  <p className="text-xs text-muted-foreground">High</p>
                </div>
              )}
              {mediumCount > 0 && (
                <div className="rounded-lg bg-secondary/10 p-2">
                  <p className="text-lg font-bold text-secondary-foreground">
                    {mediumCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Medium</p>
                </div>
              )}
            </div>

            {/* Top Issues Preview */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2 border-t pt-4"
                >
                  {issues.slice(0, 3).map((issue, index) => (
                    <div
                      key={`${issue.ruleId}-${index}`}
                      className="rounded-lg bg-secondary/20 p-3 text-sm space-y-1"
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs flex-shrink-0 mt-0.5">
                          {issue.severity}
                        </Badge>
                        <p className="font-medium flex-1">{issue.message}</p>
                      </div>
                      {issue.file && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Code2 className="h-3 w-3" />
                          {issue.file}
                          {issue.line && `:${issue.line}`}
                        </p>
                      )}
                      {issue.fix && (
                        <p className="text-xs text-muted-foreground italic">💡 {issue.fix}</p>
                      )}
                    </div>
                  ))}
                  {issues.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{issues.length - 3} more issue{issues.length - 3 !== 1 ? 's' : ''}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap pt-2 border-t">
              <Button onClick={handleViewDetails} size="sm" className="gap-1">
                <Eye className="h-4 w-4" />
                View Full Report
              </Button>
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                {isExpanded ? 'Hide' : 'Show'} Issues
              </Button>
              <Button onClick={handleDismiss} variant="ghost" size="sm">
                <MessageSquare className="h-4 w-4" />
                Comment on PR
              </Button>
            </div>

            {/* Info text */}
            <p className="text-xs text-muted-foreground">
              This PR cannot be merged until issues are resolved. Fix the code and push again.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

export default BlockedPRAlert
