'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, LoadingState, ErrorState } from '@/components/ui'
import { useToast } from '@/lib/hooks/use-toast'
import { useCache, CACHE_KEYS } from '@/lib/hooks/use-cache'
import { MetricsCard } from '@/components/ui/metrics-card'
import { Container } from '@/components/ui/container'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { Settings, CheckCircle2, AlertTriangle, FileCode, Clock, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import { PolicyWidget } from './policy-widget'

interface Repository {
  id: string
  name: string
  fullName: string
  provider: string
  enabled: boolean
  createdAt: string
}

interface RepoMetrics {
  totalReviews: number
  blockedPRs: number
  issuesCaught: number
  criticalIssues: number
  averageReviewTime: number
  lastReview?: string
}

/**
 * Repository Detail Page
 * 
 * Shows repository details, configuration, and analytics
 */
export default function RepositoryDetailPage() {
  const params = useParams()
  const repoId = params.repoId as string
  const [repo, setRepo] = useState<Repository | null>(null)
  const [metrics, setMetrics] = useState<RepoMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [toggling, setToggling] = useState(false)
  const { toast } = useToast()
  const { invalidate } = useCache()

  useEffect(() => {
    async function fetchRepo() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!url || !key) {
        setError('Configuration not available')
        setLoading(false)
        return
      }

      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        // Fetch repository
        const repoResponse = await fetch(`/api/v1/repos/${repoId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!repoResponse.ok) {
          throw new Error('Failed to fetch repository')
        }

        const repoData = (await repoResponse.json()) as { enabled?: boolean }
        setRepo(repoData)
        setEnabled(repoData.enabled ?? false)

        // Fetch reviews for this repo
        const reviewsResponse = await fetch(`/api/v1/reviews?repositoryId=${repoId}&limit=100`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (reviewsResponse.ok) {
          const reviewsData = (await reviewsResponse.json()) as { reviews?: unknown[] }
          const reviews = reviewsData.reviews || []
          
          interface ReviewItem {
            createdAt: string
            isBlocked: boolean
            summary?: {
              critical: number
              high: number
              medium: number
              low: number
            }
          }

          const reviewsTyped = reviews as ReviewItem[]
          const blockedPRs = reviewsTyped.filter((r) => r.isBlocked).length
          const totalIssues = reviewsTyped.reduce((sum: number, r) => 
            sum + (r.summary?.critical || 0) + (r.summary?.high || 0) + (r.summary?.medium || 0) + (r.summary?.low || 0), 0
          )
          const criticalIssues = reviewsTyped.reduce((sum: number, r) => sum + (r.summary?.critical || 0), 0)

          setMetrics({
            totalReviews: reviewsTyped.length,
            blockedPRs,
            issuesCaught: totalIssues,
            criticalIssues,
            averageReviewTime: 2.5,
            lastReview: reviewsTyped.length > 0 ? reviewsTyped[0].createdAt : undefined,
          })
        }

        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load repository')
        setLoading(false)
      }
    }

    if (repoId) {
      fetchRepo()
    }
  }, [repoId])

  const handleToggleEnabled = async () => {
    if (toggling) return // Prevent double-submit
    
    const newEnabled = !enabled
    setToggling(true)
    
    // Optimistic update
    setEnabled(newEnabled)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setEnabled(enabled) // Revert
        toast({
          variant: 'destructive',
          title: 'Authentication required',
          description: 'Please sign in to update repository settings.',
        })
        setToggling(false)
        return
      }

      const response = await fetch(`/api/v1/repos/${repoId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newEnabled }),
      })

      if (response.ok) {
        // Invalidate cache for this repo and repos list
        invalidate(CACHE_KEYS.REPO(repoId))
        invalidate(CACHE_KEYS.REPOS)
        invalidate(CACHE_KEYS.DASHBOARD)
        
        toast({
          variant: 'success',
          title: newEnabled ? 'Repository enabled' : 'Repository disabled',
          description: `Verification is now ${newEnabled ? 'active' : 'inactive'} for this repository.`,
        })
      } else {
        // Revert on error
        setEnabled(enabled)
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>
        toast({
          variant: 'destructive',
          title: 'Failed to update repository',
          description: getApiErrorMessage(errorData),
        })
      }
    } catch (err) {
      // Revert on error
      setEnabled(enabled)
      toast({
        variant: 'destructive',
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Failed to update repository. Please try again.',
      })
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <Container className="py-8">
        <LoadingState message="Loading repository..." />
      </Container>
    )
  }

  if (error || !repo) {
    return (
      <Container className="py-8">
        <ErrorState
          message={error || 'Repository not found'}
          action={{
            label: 'Back to Dashboard',
            onClick: () => window.location.href = '/dashboard',
          }}
        />
      </Container>
    )
  }

  return (
    <Container className="py-8">
      <motion.div
        className="space-y-6"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors">
                Dashboard
              </Link>
              <span className="text-text-muted">/</span>
              <span className="text-text-primary font-medium">{repo.fullName}</span>
            </div>
            <h1 className="text-3xl font-bold">{repo.fullName}</h1>
            <p className="text-text-muted">
              {repo.provider} • Connected {new Date(repo.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={enabled ? "default" : "outline"}
              onClick={handleToggleEnabled}
              disabled={toggling}
              className="flex items-center gap-2"
            >
              {toggling ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {enabled ? 'Disabling...' : 'Enabling...'}
                </>
              ) : enabled ? (
                <>
                  <ToggleRight className="h-4 w-4" />
                  Enabled
                </>
              ) : (
                <>
                  <ToggleLeft className="h-4 w-4" />
                  Disabled
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Policy Widget - Git Provider Adaptive */}
        {repo && (
          <motion.div variants={fadeIn}>
            <PolicyWidget
              repository={{
                id: repo.id,
                provider: repo.provider,
                fullName: repo.fullName,
              }}
            />
          </motion.div>
        )}

        {/* Status Banner */}
        <motion.div variants={fadeIn}>
          <Card className={enabled ? "bg-success-muted border-success/20" : "bg-surface-muted border-border"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {enabled ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <div className="font-semibold text-success">Verification Active</div>
                      <div className="text-sm text-text-muted">
                        ReadyLayer is monitoring this repository for AI-generated code issues.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <div>
                      <div className="font-semibold text-warning">Verification Disabled</div>
                      <div className="text-sm text-text-muted">
                        Enable verification to start monitoring AI-generated code.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Metrics Grid */}
        {metrics && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={staggerItem}>
              <MetricsCard
                title="Total Reviews"
                value={metrics.totalReviews}
                icon={FileCode}
                description="Reviews completed"
              />
            </motion.div>

            <motion.div variants={staggerItem}>
              <MetricsCard
                title="Issues Caught"
                value={metrics.issuesCaught}
                icon={AlertTriangle}
                description="Potential issues detected"
              />
            </motion.div>

            <motion.div variants={staggerItem}>
              <MetricsCard
                title="Blocked PRs"
                value={metrics.blockedPRs}
                icon={Shield}
                description="PRs blocked before merge"
              />
            </motion.div>

            <motion.div variants={staggerItem}>
              <MetricsCard
                title="Critical Issues"
                value={metrics.criticalIssues}
                icon={AlertTriangle}
                description="Critical severity issues"
              />
            </motion.div>
          </motion.div>
        )}

        {/* Configuration */}
        <motion.div variants={fadeIn}>
          <Card className="glass-strong backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Configuration</CardTitle>
              </div>
              <CardDescription>
                Manage repository verification settings and rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <div className="font-semibold mb-1">Verification Status</div>
                    <div className="text-sm text-text-muted">
                      {enabled ? 'Active monitoring enabled' : 'Monitoring disabled'}
                    </div>
                  </div>
                  <Button
                    variant={enabled ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleEnabled}
                    disabled={toggling}
                  >
                    {toggling ? (
                      <>
                        <svg className="animate-spin h-3 w-3 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {enabled ? 'Disabling...' : 'Enabling...'}
                      </>
                    ) : enabled ? (
                      'Disable'
                    ) : (
                      'Enable'
                    )}
                  </Button>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <div className="font-semibold mb-2">Active Rules</div>
                  <div className="text-sm text-text-muted mb-3">
                    All persona-specific rules are active for this repository
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['founder.edge-runtime', 'founder.type-erosion', 'founder.auth-patterns', 'founder.error-handling'].map((rule) => (
                      <span
                        key={rule}
                        className="px-2 py-1 text-xs bg-accent-muted text-accent rounded border border-accent/20 font-mono"
                      >
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        {metrics && metrics.lastReview && (
          <motion.div variants={fadeIn}>
            <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Activity</CardTitle>
                  <Link href={`/dashboard/reviews?repositoryId=${repoId}`}>
                    <Button variant="ghost" size="sm">View All Reviews</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-text-muted" />
                  <span className="text-text-muted">Last review:</span>
                  <span className="font-medium">
                    {new Date(metrics.lastReview).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </Container>
  )
}
