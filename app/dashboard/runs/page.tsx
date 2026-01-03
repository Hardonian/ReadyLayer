'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader,
  ErrorState,
  EmptyState,
  Skeleton,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  XCircle,
  PlayCircle,
  ArrowRight,
  Shield,
  TestTube,
  FileText,
} from 'lucide-react'
import { useRefetch, CACHE_KEYS } from '@/lib/hooks/use-refetch'

interface Run {
  id: string
  correlationId: string
  repositoryId: string | null
  sandboxId: string | null
  trigger: 'webhook' | 'manual' | 'sandbox'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  conclusion?: 'success' | 'failure' | 'partial_success' | 'cancelled'
  reviewGuardStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  testEngineStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  docSyncStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  aiTouchedDetected: boolean
  gatesPassed: boolean
  startedAt: string
  completedAt?: string
  repository?: {
    id: string
    name: string
    fullName: string
  }
}

export default function RunsPage() {
  const { registerRefetch } = useRefetch()
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch('/api/v1/runs?limit=50', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(getApiErrorMessage(errorData))
      }

      const data = (await response.json()) as { data?: Run[]; pagination?: { total: number } }
      setRuns(data.data || [])
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs')
      setLoading(false)
    }
  }, [])

  // Register refetch callback for cache invalidation
  useEffect(() => {
    const unregister = registerRefetch(CACHE_KEYS.RUNS, fetchRuns)
    return unregister
  }, [registerRefetch, fetchRuns])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
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
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-8">
        <ErrorState
          message={error}
          action={{
            label: 'Try Again',
            onClick: () => {
              setLoading(true)
              setError(null)
              fetchRuns()
            },
          }}
        />
      </Container>
    )
  }

  const getStatusIcon = (status: Run['status'], conclusion?: Run['conclusion']) => {
    if (status === 'running') {
      return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
    }
    if (status === 'completed') {
      if (conclusion === 'success') {
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      }
      if (conclusion === 'failure') {
        return <XCircle className="h-5 w-5 text-red-500" />
      }
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    }
    if (status === 'failed') {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    return <Clock className="h-5 w-5 text-gray-500" />
  }

  const getStatusColor = (status: Run['status'], conclusion?: Run['conclusion']) => {
    if (status === 'running') return 'bg-blue-500/10 text-blue-600'
    if (status === 'completed') {
      if (conclusion === 'success') return 'bg-green-500/10 text-green-600'
      if (conclusion === 'failure') return 'bg-red-500/10 text-red-600'
      return 'bg-yellow-500/10 text-yellow-600'
    }
    if (status === 'failed') return 'bg-red-500/10 text-red-600'
    return 'bg-gray-500/10 text-gray-600'
  }

  return (
    <Container className="py-8">
      <motion.div
        className="space-y-8"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Runs</h1>
          <p className="text-muted-foreground">
            View all ReadyLayer pipeline runs with complete audit trail
          </p>
        </div>

        {/* Runs List */}
        {runs.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No runs yet"
            description="Runs will appear here after you trigger a pipeline execution."
            action={{
              label: 'Try Sandbox Demo',
              onClick: () => {
                window.location.href = '/dashboard/runs/sandbox'
              },
            }}
          />
        ) : (
          <motion.div
            className="space-y-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {runs.map((run) => (
              <motion.div key={run.id} variants={staggerItem}>
                <Link href={`/dashboard/runs/${run.id}`}>
                  <Card className="hover:bg-surface-hover transition-colors cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(run.status, run.conclusion)}
                            <div>
                              <div className="font-semibold">
                                {run.sandboxId ? 'Sandbox Demo Run' : 
                                 run.repository?.fullName || `Run ${run.correlationId.slice(0, 8)}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {run.trigger} • {new Date(run.startedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Stage Status */}
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Shield className={`h-4 w-4 ${
                                run.reviewGuardStatus === 'succeeded' ? 'text-green-500' :
                                run.reviewGuardStatus === 'failed' ? 'text-red-500' :
                                run.reviewGuardStatus === 'running' ? 'text-blue-500 animate-pulse' :
                                'text-gray-400'
                              }`} />
                              <span className="text-muted-foreground">Review Guard</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TestTube className={`h-4 w-4 ${
                                run.testEngineStatus === 'succeeded' ? 'text-green-500' :
                                run.testEngineStatus === 'failed' ? 'text-red-500' :
                                run.testEngineStatus === 'running' ? 'text-blue-500 animate-pulse' :
                                'text-gray-400'
                              }`} />
                              <span className="text-muted-foreground">Test Engine</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className={`h-4 w-4 ${
                                run.docSyncStatus === 'succeeded' ? 'text-green-500' :
                                run.docSyncStatus === 'failed' ? 'text-red-500' :
                                run.docSyncStatus === 'running' ? 'text-blue-500 animate-pulse' :
                                'text-gray-400'
                              }`} />
                              <span className="text-muted-foreground">Doc Sync</span>
                            </div>
                            {run.aiTouchedDetected && (
                              <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded">
                                AI-touched detected
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(run.status, run.conclusion)}`}>
                            {run.status}
                          </span>
                          {run.gatesPassed ? (
                            <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-600">
                              Gates passed
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600">
                              Gates failed
                            </span>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </Container>
  )
}
