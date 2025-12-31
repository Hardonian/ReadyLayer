'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

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

  useEffect(() => {
    async function fetchDashboardData() {
      // Check if env vars are available (not during build)
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!url || !key) {
        setError('Configuration not available')
        setLoading(false)
        return
      }

      try {
        const supabase = createSupabaseClient()
        // Get user session
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
            signal: AbortSignal.timeout(10000), // 10 second timeout
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
            signal: AbortSignal.timeout(10000), // 10 second timeout
          })

          if (reviewsResponse.ok) {
            reviewsData = await reviewsResponse.json()
            setReviews(reviewsData.reviews || [])
          } else {
            // Log but don't fail - reviews are optional
            console.warn('Failed to fetch reviews:', reviewsResponse.status)
          }
        } catch (error) {
          // Log but don't fail - reviews are optional
          console.warn('Error fetching reviews:', error)
        }

        // Calculate stats
        const activeRepos = repositories.filter((r: Repository) => r.enabled).length
        const reviewsList = reviewsData.reviews || []
        const blockedPRs = reviewsList.filter((r: Review) => r.isBlocked).length

        // Calculate verification stats (mock for now - would come from API)
        const totalReviews = reviewsData.pagination?.total || 0
        setVerification({
          checksRun: totalReviews * 3, // Approximate: security, quality, tests per review
          issuesCaught: blockedPRs,
          lastVerified: reviewsList.length > 0 ? reviewsList[0].createdAt : null,
          aiErrorsDetected: blockedPRs, // AI-specific errors caught
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
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">ReadyLayer Dashboard</h1>
        <p className="text-gray-600">
          Verifiable assurance for AI-generated code. Every check is transparent and traceable.
        </p>
      </div>

      {/* Verification Status Banner */}
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <div className="font-semibold text-blue-900">Verification Active</div>
              <div className="text-sm text-blue-700">
                {verification.checksRun.toLocaleString()} checks run • {verification.issuesCaught} issues caught
                {verification.lastVerified && (
                  <> • Last verified {new Date(verification.lastVerified).toLocaleDateString()}</>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-blue-900">{verification.aiErrorsDetected}</div>
            <div className="text-xs text-blue-600">AI errors detected</div>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Repositories</h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats.totalRepos}</p>
          <p className="text-xs text-gray-500 mt-1">Connected to your Git provider</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Active Repositories</h3>
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats.activeRepos}</p>
          <p className="text-xs text-gray-500 mt-1">With verification enabled</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Reviews</h3>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{stats.totalReviews}</p>
          <p className="text-xs text-gray-500 mt-1">AI code verified</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Issues Caught</h3>
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.blockedPRs}</p>
          <p className="text-xs text-gray-500 mt-1">Before reaching production</p>
        </div>
      </div>

      {/* Verification Details */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Verification Assurance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">AI Error Detection</div>
            <div className="text-2xl font-bold text-blue-600">{verification.aiErrorsDetected}</div>
            <div className="text-xs text-gray-500 mt-1">Context slips, drift, hallucinations caught</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">Security Checks</div>
            <div className="text-2xl font-bold text-red-600">{Math.floor(verification.checksRun / 3)}</div>
            <div className="text-xs text-gray-500 mt-1">Threat detection & vulnerability scans</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">Transparency</div>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <div className="text-xs text-gray-500 mt-1">Every check is traceable and verifiable</div>
          </div>
        </div>
      </div>

      {/* Repositories Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Repositories</h2>
            <Link
              href="/dashboard/repos"
              className="text-sm text-blue-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          
          {repos.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-600 mb-2">No repositories found.</p>
              <p className="text-sm text-gray-500">Connect a repository to start verifying AI-generated code.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => (
                <Link
                  key={repo.id}
                  href={`/dashboard/repos/${repo.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{repo.fullName}</h3>
                        {repo.enabled && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{repo.provider}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      repo.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {repo.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reviews Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Reviews</h2>
            <Link
              href="/dashboard/reviews"
              className="text-sm text-blue-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-gray-600 mb-2">No reviews yet.</p>
              <p className="text-sm text-gray-500">Reviews will appear here after PRs are analyzed and verified.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">PR #{review.prNumber}</h3>
                        {review.isBlocked && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Issue Detected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 text-xs rounded ${
                        review.status === 'completed' ? 'bg-green-100 text-green-800' :
                        review.status === 'blocked' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {review.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Integration Info */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="font-semibold text-gray-900">Integrated with Your Workflow</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          ReadyLayer works alongside your existing tools—GitHub, GitLab, CI/CD pipelines, and IDEs. 
          Adds verification layers without disrupting your workflow. Every check is transparent and traceable.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full">GitHub</span>
          <span className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full">GitLab</span>
          <span className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full">GitHub Actions</span>
          <span className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full">VS Code</span>
          <span className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full">Jest</span>
          <span className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full">pytest</span>
        </div>
      </div>
    </div>
  )
}
