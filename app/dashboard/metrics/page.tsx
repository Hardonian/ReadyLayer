'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { MetricsCard, ChartCard } from '@/components/ui/metrics-card'
import { Container } from '@/components/ui/container'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  FileCode,
  GitBranch,
  Zap,
} from 'lucide-react'
import { LoadingState, ErrorState } from '@/components/ui'

interface Metrics {
  totalReviews: number
  blockedPRs: number
  averageReviewTime: number
  issuesCaught: number
  criticalIssues: number
  repositories: number
  activeRepos: number
  reviewsThisWeek: number
  reviewsLastWeek: number
  issuesThisWeek: number
  issuesLastWeek: number
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
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

        // Fetch reviews for metrics calculation
        const reviewsResponse = await fetch('/api/v1/reviews?limit=100', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!reviewsResponse.ok) {
          throw new Error('Failed to fetch reviews')
        }

        // Calculate metrics
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

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

        const reviewsData = (await reviewsResponse.json()) as { reviews?: ReviewItem[] }
        const reviews = reviewsData.reviews || []
        const reviewsTyped = reviews

        const reviewsThisWeek = reviewsTyped.filter((r) => 
          new Date(r.createdAt) >= weekAgo
        ).length
        const reviewsLastWeek = reviewsTyped.filter((r) => {
          const date = new Date(r.createdAt)
          return date >= twoWeeksAgo && date < weekAgo
        }).length

        const issuesThisWeek = reviewsTyped
          .filter((r) => new Date(r.createdAt) >= weekAgo)
          .reduce((sum: number, r) => sum + (r.summary?.critical || 0) + (r.summary?.high || 0), 0)
        
        const issuesLastWeek = reviewsTyped
          .filter((r) => {
            const date = new Date(r.createdAt)
            return date >= twoWeeksAgo && date < weekAgo
          })
          .reduce((sum: number, r) => sum + (r.summary?.critical || 0) + (r.summary?.high || 0), 0)

        const blockedPRs = reviewsTyped.filter((r) => r.isBlocked).length
        const totalIssues = reviewsTyped.reduce((sum: number, r) => 
          sum + (r.summary?.critical || 0) + (r.summary?.high || 0) + (r.summary?.medium || 0) + (r.summary?.low || 0), 0
        )
        const criticalIssues = reviewsTyped.reduce((sum: number, r) => sum + (r.summary?.critical || 0), 0)

        // Fetch repositories
        const reposResponse = await fetch('/api/v1/repos', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        interface RepoItem {
          enabled: boolean
        }
        const reposData = reposResponse.ok 
          ? (await reposResponse.json()) as { repositories?: RepoItem[] }
          : { repositories: [] as RepoItem[] }

        const repos = reposData.repositories || []
        const activeRepos = repos.filter((r) => r.enabled).length

        setMetrics({
          totalReviews: reviews.length,
          blockedPRs,
          averageReviewTime: 2.5, // Mock data
          issuesCaught: totalIssues,
          criticalIssues,
          repositories: repos.length,
          activeRepos,
          reviewsThisWeek,
          reviewsLastWeek,
          issuesThisWeek,
          issuesLastWeek,
        })

        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics')
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  if (loading) {
    return (
      <Container className="py-8">
        <LoadingState message="Loading metrics..." />
      </Container>
    )
  }

  if (error || !metrics) {
    return (
      <Container className="py-8">
        <ErrorState
          message={error || 'Failed to load metrics'}
          action={{
            label: 'Back to Dashboard',
            onClick: () => window.location.href = '/dashboard',
          }}
        />
      </Container>
    )
  }

  const reviewsChange = metrics.reviewsLastWeek > 0
    ? ((metrics.reviewsThisWeek - metrics.reviewsLastWeek) / metrics.reviewsLastWeek) * 100
    : 0

  const issuesChange = metrics.issuesLastWeek > 0
    ? ((metrics.issuesThisWeek - metrics.issuesLastWeek) / metrics.issuesLastWeek) * 100
    : 0

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
          <h1 className="text-3xl font-bold">Metrics & Analytics</h1>
          <p className="text-text-muted">
            Track your code quality, review performance, and issue detection over time.
          </p>
        </div>

        {/* Key Metrics Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={staggerItem}>
            <MetricsCard
              title="Total Reviews"
              value={metrics.totalReviews.toLocaleString()}
              change={{
                value: Math.round(reviewsChange),
                label: 'vs last week',
                trend: reviewsChange >= 0 ? 'up' : 'down',
              }}
              icon={FileCode}
              description="AI code reviews completed"
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <MetricsCard
              title="Issues Caught"
              value={metrics.issuesCaught.toLocaleString()}
              change={{
                value: Math.round(issuesChange),
                label: 'vs last week',
                trend: issuesChange >= 0 ? 'up' : 'down',
              }}
              icon={AlertTriangle}
              description="Potential issues detected"
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <MetricsCard
              title="Blocked PRs"
              value={metrics.blockedPRs}
              icon={Shield}
              description="PRs blocked before production"
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <MetricsCard
              title="Active Repos"
              value={metrics.activeRepos}
              icon={GitBranch}
              description={`of ${metrics.repositories} total repositories`}
            />
          </motion.div>
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Review Activity Chart */}
          <motion.div variants={fadeIn}>
            <ChartCard title="Review Activity">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{metrics.reviewsThisWeek}</div>
                    <div className="text-sm text-text-muted">Reviews this week</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-accent" />
                </div>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const dayReviews = Math.floor(Math.random() * 10) + 1
                    const maxReviews = 15
                    const percentage = (dayReviews / maxReviews) * 100
                    return (
                      <div key={day} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">
                            {new Date(Date.now() - (6 - day) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-text-primary font-medium">{dayReviews}</span>
                        </div>
                        <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: day * 0.1 }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ChartCard>
          </motion.div>

          {/* Issue Severity Breakdown */}
          <motion.div variants={fadeIn}>
            <ChartCard title="Issue Severity Breakdown">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <span className="font-semibold text-destructive">Critical</span>
                    </div>
                    <div className="text-3xl font-bold">{metrics.criticalIssues}</div>
                  </div>
                  <div className="p-4 bg-warning-muted rounded-lg border border-warning/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      <span className="font-semibold text-warning">High</span>
                    </div>
                    <div className="text-3xl font-bold">
                      {metrics.issuesCaught - metrics.criticalIssues}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Critical Issues</span>
                    <span className="font-semibold">
                      {metrics.issuesCaught > 0 
                        ? Math.round((metrics.criticalIssues / metrics.issuesCaught) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-3 bg-surface-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-destructive to-orange-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${metrics.issuesCaught > 0 
                          ? (metrics.criticalIssues / metrics.issuesCaught) * 100 
                          : 0}%` 
                      }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              </div>
            </ChartCard>
          </motion.div>
        </div>

        {/* Performance Metrics */}
        <motion.div variants={fadeIn}>
          <ChartCard title="Performance Metrics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <Clock className="h-8 w-8 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold">{metrics.averageReviewTime}s</div>
                <div className="text-sm text-text-muted">Avg Review Time</div>
              </div>
              <div className="text-center p-4">
                <Zap className="h-8 w-8 text-success mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {metrics.totalReviews > 0 
                    ? Math.round((metrics.blockedPRs / metrics.totalReviews) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-text-muted">Block Rate</div>
              </div>
              <div className="text-center p-4">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {metrics.totalReviews > 0
                    ? Math.round(((metrics.totalReviews - metrics.blockedPRs) / metrics.totalReviews) * 100)
                    : 100}%
                </div>
                <div className="text-sm text-text-muted">Approval Rate</div>
              </div>
            </div>
          </ChartCard>
        </motion.div>
      </motion.div>
    </Container>
  )
}
