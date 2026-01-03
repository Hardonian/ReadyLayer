'use client'

import React from 'react'
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

export function RecentRunsWidget({ runs, maxRuns = 5 }: RecentRunsWidgetProps) {
  const displayRuns = runs.slice(0, maxRuns)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle2
      case 'failed':
        return XCircle
      case 'running':
        return Clock
      default:
        return Clock
    }
  }

  const getStatusColor = (status: string, conclusion?: string) => {
    if (status === 'completed') {
      return conclusion === 'success' ? 'text-green-500' : 
             conclusion === 'failure' ? 'text-red-500' :
             'text-yellow-500'
    }
    if (status === 'failed') {
      return 'text-red-500'
    }
    if (status === 'running') {
      return 'text-blue-500'
    }
    return 'text-muted-foreground'
  }

  const getStageStatus = (stageStatus: string) => {
    if (stageStatus === 'succeeded') return { icon: CheckCircle2, color: 'text-green-500' }
    if (stageStatus === 'failed') return { icon: XCircle, color: 'text-red-500' }
    if (stageStatus === 'running') return { icon: Clock, color: 'text-blue-500' }
    return { icon: Clock, color: 'text-muted-foreground' }
  }

  if (displayRuns.length === 0) {
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
          {displayRuns.map((run, index) => {
            const StatusIcon = getStatusIcon(run.status)
            const statusColor = getStatusColor(run.status, run.conclusion)
            const reviewGuard = getStageStatus(run.reviewGuardStatus)
            const testEngine = getStageStatus(run.testEngineStatus)
            const docSync = getStageStatus(run.docSyncStatus)

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
                          {run.sandboxId ? 'Sandbox Demo Run' : `Run ${run.correlationId.slice(0, 8)}`}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {run.correlationId}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-2">
                      {new Date(run.startedAt).toLocaleDateString()}
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
          })}
        </div>
      </CardContent>
    </Card>
  )
}
