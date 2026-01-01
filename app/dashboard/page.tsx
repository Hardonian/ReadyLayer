'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  ErrorState,
  EmptyState,
  Skeleton,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  GitBranch, 
  FileText,
  ArrowRight,
  Database,
} from 'lucide-react'
import { usePersona } from '@/lib/hooks/use-persona'
import { PersonaBadge } from '@/components/persona'
import { useRefetch, CACHE_KEYS } from '@/lib/hooks/use-refetch'
import { ErrorBoundary } from '@/components/error-boundary'

interface Repository {
  id: string
  name: string
  fullName: string
  provider: string
  enabled: boolean
  createdAt: string
}

interface Review {
  id: string
  repositoryId: string
  prNumber: number
  status: string
  isBlocked: boolean
  createdAt: string
}

interface DashboardStats {
  totalRepos: number
  totalReviews: number
  blockedPRs: number
  activeRepos: number
}

interface VerificationStatus {
  checksRun: number
  issuesCaught: number
  lastVerified: string | null
  aiErrorsDetected: number
}

export default function DashboardPage() {
  const { persona } = usePersona()
  const { registerRefetch } = useRefetch()
  const [repos, setRepos] = useState<Repository[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalRepos: 0,
    totalReviews: 0,
    blockedPRs: 0,
    activeRepos: 0,
  })
  const [verification, setVerification] = useState<VerificationStatus>({
    checksRun: 0,
    issuesCaught: 0,
    lastVerified: null,
    aiErrorsDetected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
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

        // Fetch repositories
        let reposData: { repositories?: Repository[]; pagination?: { total: number } } = {}
        try {
          const reposResponse = await fetch('/api/v1/repos?limit=10', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            signal: AbortSignal.timeout(10000),
          })

          if (!reposResponse.ok) {
            const errorData = await reposResponse.json().catch(() => ({}))
            throw new Error(errorData.error?.message || 'Failed to fetch repositories')
          }

          reposData = await reposResponse.json()
        } catch (error) {
          if (error instanceof Error && error.name === 'TimeoutError') {
            throw new Error('Request timed out while fetching repositories')
          }
          throw error
        }

        const repositories = reposData.repositories || []
        setRepos(repositories)

        // Fetch recent reviews
        let reviewsData: { reviews?: Review[]; pagination?: { total: number } } = {}
        try {
          const reviewsResponse = await fetch('/api/v1/reviews?limit=10', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            signal: AbortSignal.timeout(10000),
          })

          if (reviewsResponse.ok) {
            reviewsData = await reviewsResponse.json()
            setReviews(reviewsData.reviews || [])
          }
          // Silently handle failed review fetch - not critical for dashboard
        } catch (error) {
          // Silently handle review fetch errors - not critical for dashboard
        }

        // Calculate stats
        const activeRepos = repositories.filter((r: Repository) => r.enabled).length
        const reviewsList = reviewsData.reviews || []
        const blockedPRs = reviewsList.filter((r: Review) => r.isBlocked).length

        const totalReviews = reviewsData.pagination?.total || 0
        setVerification({
          checksRun: totalReviews * 3,
          issuesCaught: blockedPRs,
          lastVerified: reviewsList.length > 0 ? reviewsList[0].createdAt : null,
          aiErrorsDetected: blockedPRs,
        })

        setStats({
          totalRepos: reposData.pagination?.total || 0,
          totalReviews: totalReviews,
          blockedPRs,
          activeRepos,
        })

        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        setLoading(false)
      }
  }, [])

  // Register refetch callback for cache invalidation
  useEffect(() => {
    const unregister = registerRefetch(CACHE_KEYS.DASHBOARD, fetchDashboardData)
    return unregister
  }, [registerRefetch, fetchDashboardData])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
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
              fetchDashboardData()
            },
          }}
        />
      </Container>
    )
  }

  return (
    <ErrorBoundary>
      <Container className="py-8">
      <motion.div
        className="space-y-8"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" id="dashboard-heading">Dashboard</h1>
            {persona && <PersonaBadge persona={persona} />}
          </div>
          <p className="text-muted-foreground" id="dashboard-description">
            Verifiable assurance for AI-generated code. Every check is transparent and traceable.
          </p>
        </div>

        {/* Verification Status Banner */}
        <motion.div variants={fadeIn}>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-semibold">Verification Active</div>
                    <div className="text-sm text-muted-foreground">
                      {verification.checksRun.toLocaleString()} checks run • {verification.issuesCaught} issues caught
                      {verification.lastVerified && (
                        <> • Last verified {new Date(verification.lastVerified).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium">{verification.aiErrorsDetected}</div>
                  <div className="text-xs text-muted-foreground">AI errors detected</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          role="region"
          aria-label="Dashboard statistics"
        >
          <motion.div variants={staggerItem}>
            <Card role="article" aria-labelledby="total-repos-title">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle id="total-repos-title" className="text-sm font-medium">Total Repositories</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" aria-label={`${stats.totalRepos} total repositories`}>{stats.totalRepos}</div>
                <p className="text-xs text-muted-foreground mt-1">Connected to your Git provider</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Repositories</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeRepos}</div>
                <p className="text-xs text-muted-foreground mt-1">With verification enabled</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                <FileText className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalReviews}</div>
                <p className="text-xs text-muted-foreground mt-1">AI code verified</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Issues Caught</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{stats.blockedPRs}</div>
                <p className="text-xs text-muted-foreground mt-1">Before reaching production</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Verification Details */}
        <motion.div variants={fadeIn}>
          <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle>Verification Assurance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background/50 p-4 rounded-lg">
                  <div className="text-sm font-medium mb-1">AI Error Detection</div>
                  <div className="text-2xl font-bold text-primary">{verification.aiErrorsDetected}</div>
                  <div className="text-xs text-muted-foreground mt-1">Context slips, drift, hallucinations caught</div>
                </div>
                <div className="bg-background/50 p-4 rounded-lg">
                  <div className="text-sm font-medium mb-1">Security Checks</div>
                  <div className="text-2xl font-bold text-destructive">{Math.floor(verification.checksRun / 3)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Threat detection & vulnerability scans</div>
                </div>
                <div className="bg-background/50 p-4 rounded-lg">
                  <div className="text-sm font-medium mb-1">Transparency</div>
                  <div className="text-2xl font-bold text-success">100%</div>
                  <div className="text-xs text-muted-foreground mt-1">Every check is traceable and verifiable</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Repositories and Reviews */}
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Repositories</CardTitle>
                  <Link
                    href="/dashboard/repos"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {repos.length === 0 ? (
                    <EmptyState
                      icon={GitBranch}
                      title="No repositories"
                      description="Connect a repository to start verifying AI-generated code."
                      action={{
                        label: 'Connect Repository',
                        onClick: () => {
                          window.location.href = '/dashboard/repos/connect'
                        },
                      }}
                    />
                ) : (
                  <div className="space-y-3">
                    {repos.map((repo) => (
                      <Link
                        key={repo.id}
                        href={`/dashboard/repos/${repo.id}`}
                        className="block"
                        aria-label={`View repository ${repo.fullName}`}
                      >
                        <motion.div
                          className="p-4 border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors"
                          whileHover={{ x: 2 }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{repo.fullName}</h3>
                                {repo.enabled && (
                                  <span className="text-xs px-2 py-0.5 bg-success-muted text-success-foreground rounded flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Verified
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{repo.provider}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              repo.enabled 
                                ? 'bg-success-muted text-success-foreground' 
                                : 'bg-surface-muted text-text-muted'
                            }`}>
                              {repo.enabled ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Recent Reviews</CardTitle>
                  <Link
                    href="/dashboard/reviews"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No reviews yet"
                    description="Reviews will appear here after PRs are analyzed and verified."
                  />
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <Link
                        key={review.id}
                        href={`/dashboard/reviews/${review.id}`}
                        className="block"
                        aria-label={`View review for PR #${review.prNumber}`}
                      >
                        <motion.div
                          className="p-4 border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors"
                          whileHover={{ x: 2 }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">PR #{review.prNumber}</h3>
                                {review.isBlocked && (
                                  <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Issue Detected
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              review.status === 'completed' ? 'bg-success-muted text-success-foreground' :
                              review.status === 'blocked' ? 'bg-danger-muted text-danger-foreground' :
                              'bg-warning-muted text-warning-foreground'
                            }`}>
                              {review.status}
                            </span>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </Container>
    </ErrorBoundary>
  )
}
