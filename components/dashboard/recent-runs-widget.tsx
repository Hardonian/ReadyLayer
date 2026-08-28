'use client'

import React, { useMemo, memo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export interface RecentRun {
  id: string
  correlationId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  conclusion?: 'success' | 'failure' | 'partial_success' | 'cancelled'
  reviewGuardStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  testEngineStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  docSyncStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  startedAt: string
  sandboxId?: string | null
}

interface RecentRunsWidgetProps {
  runs: RecentRun[]
  maxRuns?: number
}

// Status constants defined outside component to prevent re-creation
const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  completed: CheckCircle2,
  failed: XCircle,
  running: Clock,
  pending: Clock,
  cancelled: XCircle,
}

const STAGE_STATUS_MAP: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  succeeded: { icon: CheckCircle2, color: 'text-green-500' },
  failed: { icon: XCircle, color: 'text-red-500' },
  running: { icon: Clock, color: 'text-blue-500' },
  pending: { icon: Clock, color: 'text-muted-foreground' },
  skipped: { icon: Clock, color: 'text-muted-foreground' },
}

// Memoized status helpers defined outside component
const getStatusIcon = (status: string) => STATUS_ICONS[status] || Clock

const getStatusColor = (status: string, conclusion?: string): string => {
  if (status === 'completed') {
    if (conclusion === 'success') return 'text-green-500'
    if (conclusion === 'failure') return 'text-red-500'
    return 'text-yellow-500'
  }
  if (status === 'failed') return 'text-red-500'
  if (status === 'running') return 'text-blue-500'
  return 'text-muted-foreground'
}

const getStageStatus = (stageStatus: string) => {
  return STAGE_STATUS_MAP[stageStatus] || STAGE_STATUS_MAP.pending
}

// Memoized individual run item component
const RunItem = memo(function RunItem({
  run,
  index
}: {
  run: RecentRun;
  index: number
}) {
  const StatusIcon = useMemo(() => getStatusIcon(run.status), [run.status])
  const statusColor = useMemo(() => getStatusColor(run.status, run.conclusion), [run.status, run.conclusion])
  const reviewGuard = useMemo(() => getStageStatus(run.reviewGuardStatus), [run.reviewGuardStatus])
  const testEngine = useMemo(() => getStageStatus(run.testEngineStatus), [run.testEngineStatus])
  const docSync = useMemo(() => getStageStatus(run.docSyncStatus), [run.docSyncStatus])

  const formattedDate = useMemo(() =>
    new Date(run.startedAt).toLocaleDateString(),
    [run.startedAt]
  )

  const displayTitle = useMemo(() =>
    run.sandboxId ? 'Sandbox Demo Run' : `Run ${run.correlationId.slice(0, 8)}`,
    [run.sandboxId, run.correlationId]
  )

  return (
    <motion.div
      key={run.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/dashboard/runs/${run.id}`}
        className="block p-4 border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon className={`h-4 w-4 ${statusColor}`} />
              <span className="font-medium truncate">
                {displayTitle}
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {run.correlationId}
            </div>
          </div>
          <div className="text-xs text-muted-foreground ml-2">
            {formattedDate}
          </div>
        </div>

        {/* Stage timeline preview */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1">
            {React.createElement(reviewGuard.icon, { className: `h-3 w-3 ${reviewGuard.color}` })}
            <span className="text-xs text-muted-foreground">RG</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center gap-1">
            {React.createElement(testEngine.icon, { className: `h-3 w-3 ${testEngine.color}` })}
            <span className="text-xs text-muted-foreground">TE</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center gap-1">
            {React.createElement(docSync.icon, { className: `h-3 w-3 ${docSync.color}` })}
            <span className="text-xs text-muted-foreground">DS</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
})

// Main component with React.memo
export const RecentRunsWidget = memo(function RecentRunsWidget({
  runs,
  maxRuns = 5
}: RecentRunsWidgetProps): React.JSX.Element {
  // Memoize the sliced array to prevent re-computation on every render
  const displayRuns = useMemo(() => runs.slice(0, maxRuns), [runs, maxRuns])

  // Memoize empty state check
  const isEmpty = useMemo(() => displayRuns.length === 0, [displayRuns.length])

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No runs yet. Start a demo run to see results here.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Runs</CardTitle>
          <Link
            href="/dashboard/runs"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayRuns.map((run, index) => (
            <RunItem key={run.id} run={run} index={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
