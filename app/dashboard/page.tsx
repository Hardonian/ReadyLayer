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

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalRepos: 0,
    totalReviews: 0,
    blockedPRs: 0,
    activeRepos: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
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

        setStats({
          totalRepos: reposData.pagination?.total || 0,
          totalReviews: reviewsData.pagination?.total || 0,
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
  }, [supabase])

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
      <h1 className="text-3xl font-bold mb-8">ReadyLayer Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Repositories</h3>
          <p className="text-3xl font-bold">{stats.totalRepos}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Repositories</h3>
          <p className="text-3xl font-bold">{stats.activeRepos}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Reviews</h3>
          <p className="text-3xl font-bold">{stats.totalReviews}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Blocked PRs</h3>
          <p className="text-3xl font-bold text-red-600">{stats.blockedPRs}</p>
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
            <p className="text-gray-600">No repositories found. Connect a repository to get started.</p>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => (
                <Link
                  key={repo.id}
                  href={`/dashboard/repos/${repo.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{repo.fullName}</h3>
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
            <p className="text-gray-600">No reviews yet. Reviews will appear here after PRs are analyzed.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">PR #{review.prNumber}</h3>
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
                      {review.isBlocked && (
                        <span className="text-xs text-red-600">Blocked</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
