'use client'

import { useEffect, useState, useCallback } from 'react'
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
  Button,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { getStatusColor as getRunStatusColor } from '@/lib/utils/color-mapping'
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
  Filter,
  Search,
  ExternalLink,
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
  hasProvenance?: boolean
  startedAt: string
  completedAt?: string
  repository?: {
    id: string
    name: string
    fullName: string
    provider?: string
  }
}

export default function RunsPage(): React.JSX.Element {
  const { registerRefetch } = useRefetch()
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    repositoryId: '',
    status: '',
    conclusion: '',
    trigger: '',
    stage: '',
    search: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const fetchRuns = useCallback(async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Build query string with filters
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (filters.repositoryId) params.set('repositoryId', filters.repositoryId)
      if (filters.status) params.set('status', filters.status)
      if (filters.conclusion) params.set('conclusion', filters.conclusion)
      if (filters.trigger) params.set('trigger', filters.trigger)
      if (filters.stage) params.set('stage', filters.stage)

      const response = await fetch(`/api/v1/runs?${params.toString()}`, {
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
  }, [filters.conclusion, filters.repositoryId, filters.stage, filters.status, filters.trigger])

  // Register refetch callback for cache invalidation
  useEffect(() => {
    const unregister = registerRefetch(CACHE_KEYS.RUNS, fetchRuns)
    return unregister
  }, [registerRefetch, fetchRuns])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns, filters])

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
      return <Clock className="h-5 w-5 text-info animate-spin" />
    }
    if (status === 'completed') {
      if (conclusion === 'success') {
        return <CheckCircle2 className="h-5 w-5 text-success" />
      }
      if (conclusion === 'failure') {
        return <XCircle className="h-5 w-5 text-danger" />
      }
      return <AlertTriangle className="h-5 w-5 text-warning" />
    }
    if (status === 'failed') {
      return <XCircle className="h-5 w-5 text-danger" />
    }
    return <Clock className="h-5 w-5 text-text-muted" />
  }

  const getStatusColorClasses = (status: Run['status'], conclusion?: Run['conclusion']) => {
    const statusMap: Record<string, 'running' | 'success' | 'failed' | 'pending' | 'warning'> = {
      'running': 'running',
      'completed-success': 'success',
      'completed-failure': 'failed',
      'completed-partial': 'warning',
      'failed': 'failed',
      'pending': 'pending',
      'cancelled': 'warning',
    }

    const key = status === 'completed' ? `completed-${conclusion || 'partial'}` : status
    const mappedStatus = statusMap[key] || 'pending'
    const colors = getRunStatusColor(mappedStatus)

    return `${colors.bg} ${colors.text}`
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
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Runs</h1>
            <p className="text-muted-foreground">
              Deterministic pipeline execution. Every run is signed, traceable, and replayable.
            </p>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mt-2">
              <div className="text-xs font-semibold text-primary mb-1">Deterministic Governance</div>
              <div className="text-xs text-muted-foreground">
                Same inputs + same policy = same outputs. Every gate execution produces immutable evidence bundles.
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="font-medium">Filters</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    {showFilters ? 'Hide' : 'Show'} Filters
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-surface"
                      >
                        <option value="">All</option>
                        <option value="pending">Pending</option>
                        <option value="running">Running</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Conclusion</label>
                      <select
                        value={filters.conclusion}
                        onChange={(e) => setFilters({ ...filters, conclusion: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-surface"
                      >
                        <option value="">All</option>
                        <option value="success">Success</option>
                        <option value="failure">Failure</option>
                        <option value="partial_success">Partial Success</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Trigger</label>
                      <select
                        value={filters.trigger}
                        onChange={(e) => setFilters({ ...filters, trigger: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-surface"
                      >
                        <option value="">All</option>
                        <option value="webhook">Webhook</option>
                        <option value="manual">Manual</option>
                        <option value="sandbox">Sandbox</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Stage</label>
                      <select
                        value={filters.stage}
                        onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-surface"
                      >
                        <option value="">All</option>
                        <option value="review_guard">Review Guard</option>
                        <option value="test_engine">Test Engine</option>
                        <option value="doc_sync">Doc Sync</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1 block">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search by correlation ID, repository..."
                          value={filters.search}
                          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-surface"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
            {(filters.search
              ? runs.filter(r =>
                  r.correlationId.toLowerCase().includes(filters.search.toLowerCase()) ||
                  r.repository?.fullName?.toLowerCase().includes(filters.search.toLowerCase())
                )
              : runs
            ).map((run) => {
              // Generate provider link if repository available
              let providerLink: string | undefined
              if (run.repository && run.repository.fullName) {
                const provider = run.repository.provider || 'github'
                if (provider === 'github') {
                  providerLink = `https://github.com/${run.repository.fullName}`
                } else if (provider === 'gitlab') {
                  providerLink = `https://gitlab.com/${run.repository.fullName}`
                } else if (provider === 'bitbucket') {
                  providerLink = `https://bitbucket.org/${run.repository.fullName}`
                }
              }

              return (
              <motion.div key={run.id} variants={staggerItem}>
                <Link href={`/dashboard/runs/${run.id}`}>
                  <Card className="hover:bg-surface-hover transition-colors cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(run.status, run.conclusion)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {run.sandboxId ? 'Sandbox Demo Run' :
                                   run.repository?.fullName || `Run ${run.correlationId.slice(0, 8)}`}
                                </span>
                                {providerLink && (
                                  <a
                                    href={providerLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
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
                                run.reviewGuardStatus === 'succeeded' ? 'text-success' :
                                run.reviewGuardStatus === 'failed' ? 'text-danger' :
                                run.reviewGuardStatus === 'running' ? 'text-info animate-pulse' :
                                'text-text-muted'
                              }`} />
                              <span className="text-muted-foreground">Review Guard</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TestTube className={`h-4 w-4 ${
                                run.testEngineStatus === 'succeeded' ? 'text-success' :
                                run.testEngineStatus === 'failed' ? 'text-danger' :
                                run.testEngineStatus === 'running' ? 'text-info animate-pulse' :
                                'text-text-muted'
                              }`} />
                              <span className="text-muted-foreground">Test Engine</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className={`h-4 w-4 ${
                                run.docSyncStatus === 'succeeded' ? 'text-success' :
                                run.docSyncStatus === 'failed' ? 'text-danger' :
                                run.docSyncStatus === 'running' ? 'text-info animate-pulse' :
                                'text-text-muted'
                              }`} />
                              <span className="text-muted-foreground">Doc Sync</span>
                            </div>
                            {run.aiTouchedDetected && (
                              <span className="text-xs px-2 py-0.5 bg-accent-muted text-accent rounded">
                                AI-touched detected
                              </span>
                            )}
                            {run.hasProvenance && (
                              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                                Provenance
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColorClasses(run.status, run.conclusion)}`}>
                            {run.status}
                          </span>
                          {run.gatesPassed ? (
                            <span className="text-xs px-2 py-1 rounded bg-success-muted text-success">
                              Gates passed
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded bg-danger-muted text-danger">
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
            )})}
          </motion.div>
        )}
      </motion.div>
    </Container>
  )
}
