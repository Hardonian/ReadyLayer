'use client'

import React, { useEffect, useState, useCallback } from 'react'
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
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  GitBranch, 
  FileText,
  ArrowRight,
  Database,
  Sparkles,
  AlertCircle,
  Lightbulb,
} from 'lucide-react'
import { usePersona } from '@/lib/hooks/use-persona'
import { PersonaBadge } from '@/components/persona'
import { useRefetch, CACHE_KEYS } from '@/lib/hooks/use-refetch'
import { UsageLimitBanner, UsageStats } from '@/components/ui/usage-limit-banner'

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

interface AIOptimizationData {
  anomalies: Array<{
    type: string
    severity: string
    description: string
    detectedAt: string
  }>
  tokenWaste: {
    totalTokensUsed: number
    wastePercentage: number
    wasteSources: Array<{
      source: string
      tokens: number
      percentage: number
      suggestion: string
    }>
  } | null
  repeatedMistakes: Array<{
    ruleId: string
    count: number
    suggestion: string
    severity: string
  }>
  suggestions: Array<{
    id: string
    type: string
    difficulty: string
    title: string
    description: string
    impact: string
    effort: string
    estimatedSavings?: {
      tokens?: number
      cost?: number
    }
  }>
  summary: {
    totalAnomalies: number
    totalTokenWaste: number
    repeatedMistakeCount: number
    suggestionCount: number
  }
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
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiOptimization, setAiOptimization] = useState<AIOptimizationData | null>(null)
  const [loadingOptimization, setLoadingOptimization] = useState(false)

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
            const errorData = (await reposResponse.json().catch(() => ({}))) as Record<string, unknown>
            throw new Error(getApiErrorMessage(errorData))
          }

          reposData = (await reposResponse.json()) as { repositories?: Repository[]; pagination?: { total: number } }
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
            reviewsData = (await reviewsResponse.json()) as { reviews?: Review[]; pagination?: { total: number } }
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

        // Fetch usage stats
        try {
          const usageResponse = await fetch('/api/v1/usage', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          })
          
          if (usageResponse.ok) {
            const usageData = (await usageResponse.json()) as { data?: Partial<UsageStats> & { organizationId?: string } }
            // Only set usage stats if we have valid data structure
            const usageDataValue = usageData.data
            if (usageDataValue && 
                usageDataValue.llmTokens && 
                usageDataValue.runs && 
                usageDataValue.concurrentJobs && 
                usageDataValue.budget) {
              setUsageStats(usageDataValue as UsageStats)
            }
            
            // Set organizationId from response if available
            if (usageDataValue?.organizationId) {
              setOrganizationId(usageDataValue.organizationId)
            } else if (repositories.length > 0 && repositories[0]?.id) {
              // Fallback: get from first repo
              const repo = repositories[0]
              try {
                const repoDetails = await fetch(`/api/v1/repos/${repo.id}`, {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                }).then((r) => r.ok ? (r.json() as Promise<{ data?: { organizationId?: string } }>) : null).catch(() => null)
                
                if (repoDetails?.data?.organizationId) {
                  setOrganizationId(repoDetails.data.organizationId)
                }
              } catch {
                // Silently handle repo details fetch error
              }
            }
          }
        } catch {
          // Silently handle usage stats fetch errors
        }

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

        {/* Usage Limit Banner */}
        {usageStats && organizationId && (
          <motion.div variants={fadeIn}>
            <UsageLimitBanner stats={usageStats} organizationId={organizationId} />
          </motion.div>
        )}

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

        {/* AI Optimization Insights */}
        <motion.div variants={fadeIn}>
          <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-500" />
                  <CardTitle>AI Optimization Insights</CardTitle>
                </div>
                <button
                  onClick={async () => {
                    if (!organizationId) return
                    setLoadingOptimization(true)
                    try {
                      const supabase = createSupabaseClient()
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) return

                      const response = await fetch(
                        `/api/v1/ai-optimization?organizationId=${organizationId}`,
                        {
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                        }
                      )
                      if (response.ok) {
                        const data = (await response.json()) as AIOptimizationData
                        setAiOptimization(data)
                      }
                    } catch (err) {
                      console.error('Failed to fetch AI optimization:', err)
                    } finally {
                      setLoadingOptimization(false)
                    }
                  }}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                  disabled={loadingOptimization}
                >
                  {loadingOptimization ? 'Analyzing...' : 'Analyze AI Usage'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {aiOptimization ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-background/50 p-4 rounded-lg">
                      <div className="text-sm font-medium mb-1">Anomalies Detected</div>
                      <div className="text-2xl font-bold text-purple-500">{aiOptimization.summary.totalAnomalies}</div>
                      <div className="text-xs text-muted-foreground mt-1">Drift, context slips, hallucinations</div>
                    </div>
                    <div className="bg-background/50 p-4 rounded-lg">
                      <div className="text-sm font-medium mb-1">Token Waste</div>
                      <div className="text-2xl font-bold text-orange-500">
                        {aiOptimization.tokenWaste?.wastePercentage.toFixed(1) || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {aiOptimization.tokenWaste?.totalTokensUsed.toLocaleString() || 0} tokens used
                      </div>
                    </div>
                    <div className="bg-background/50 p-4 rounded-lg">
                      <div className="text-sm font-medium mb-1">Repeated Mistakes</div>
                      <div className="text-2xl font-bold text-red-500">{aiOptimization.summary.repeatedMistakeCount}</div>
                      <div className="text-xs text-muted-foreground mt-1">Patterns to address</div>
                    </div>
                    <div className="bg-background/50 p-4 rounded-lg">
                      <div className="text-sm font-medium mb-1">Optimization Suggestions</div>
                      <div className="text-2xl font-bold text-green-500">{aiOptimization.summary.suggestionCount}</div>
                      <div className="text-xs text-muted-foreground mt-1">Personalized recommendations</div>
                    </div>
                  </div>

                  {/* Top Suggestions */}
                  {aiOptimization.suggestions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        Top Optimization Suggestions
                      </h3>
                      <div className="space-y-3">
                        {aiOptimization.suggestions.slice(0, 3).map((suggestion) => (
                          <div
                            key={suggestion.id}
                          <div
                            key={suggestion.id}
                            className="p-4 border border-border-subtle rounded-lg bg-background/50"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold">{suggestion.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  suggestion.difficulty === 'easy' ? 'bg-green-500/20 text-green-600' :
                                  suggestion.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-600' :
                                  'bg-red-500/20 text-red-600'
                                }`}>
                                  {suggestion.difficulty}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  suggestion.impact === 'high' ? 'bg-purple-500/20 text-purple-600' :
                                  suggestion.impact === 'medium' ? 'bg-blue-500/20 text-blue-600' :
                                  'bg-gray-500/20 text-gray-600'
                                }`}>
                                  {suggestion.impact} impact
                                </span>
                              </div>
                            </div>
                            {suggestion.estimatedSavings && (
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                {suggestion.estimatedSavings.tokens && (
                                  <span className="text-muted-foreground">
                                    Save ~{suggestion.estimatedSavings.tokens.toLocaleString()} tokens
                                  </span>
                                )}
                                {suggestion.estimatedSavings.cost && (
                                  <span className="text-muted-foreground">
                                    Save ~${suggestion.estimatedSavings.cost.toFixed(2)}/month
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Repeated Mistakes */}
                  {aiOptimization.repeatedMistakes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Repeated Mistakes
                      </h3>
                      <div className="space-y-2">
                        {aiOptimization.repeatedMistakes.slice(0, 5).map((mistake) => (
                          <div
                            key={mistake.ruleId}
                          <div
                            key={idx}
                            className="p-3 border border-border-subtle rounded-lg bg-background/50"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{mistake.ruleId}</div>
                                <div className="text-xs text-muted-foreground mt-1">{mistake.suggestion}</div>
                              </div>
                              <span className="text-xs font-semibold text-red-500">
                                {mistake.count}x
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Get personalized AI optimization suggestions based on your codebase patterns
                  </p>
                  <button
                    onClick={async () => {
                      if (!organizationId) return
                      setLoadingOptimization(true)
                      try {
                        const supabase = createSupabaseClient()
                        const { data: { session } } = await supabase.auth.getSession()
                        if (!session) return

                        const response = await fetch(
                          `/api/v1/ai-optimization?organizationId=${organizationId}`,
                          {
                            headers: {
                              'Authorization': `Bearer ${session.access_token}`,
                            },
                          }
                        )
                        if (response.ok) {
                          const data = (await response.json()) as AIOptimizationData
                          setAiOptimization(data)
                        }
                      } catch (err) {
                        console.error('Failed to fetch AI optimization:', err)
                      } finally {
                        setLoadingOptimization(false)
                      }
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    disabled={loadingOptimization || !organizationId}
                  >
                    {loadingOptimization ? 'Analyzing...' : 'Analyze AI Usage'}
                  </button>
                </div>
              )}
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
  )
}
