'use client'

import { useEffect, useState, Suspense } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Repository {
  id: string
  name: string
  fullName: string
  enabled: boolean
  organization: {
    id: string
    name: string
  }
}

interface Review {
  id: string
  status: string
  isBlocked: boolean
  repository: {
    name: string
  }
}

interface DashboardStats {
  totalRepos: number
  totalReviews: number
  blockedPRs: number
  activeRepos: number
}

function DashboardContent() {
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

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Check if Supabase env vars are available
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          setError('Dashboard not available during build')
          setLoading(false)
          return
        }
        
        const supabase = createSupabaseClient()
        if (!supabase) {
          setError('Failed to initialize client')
          setLoading(false)
          return
        }
        
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        const reposResponse = await fetch('/api/v1/repos?limit=10', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        if (!reposResponse.ok) {
          throw new Error('Failed to fetch repositories')
        }
        const reposData = await reposResponse.json()
        const repositories = reposData.repositories || []
        setRepos(repositories)

        let reviewsData: { reviews?: Review[]; pagination?: { total: number } } = {}
        const reviewsResponse = await fetch('/api/v1/reviews?limit=10', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        if (reviewsResponse.ok) {
          reviewsData = await reviewsResponse.json()
          setReviews(reviewsData.reviews || [])
        }

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
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading dashboard...</h1>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-600 mb-2">Total Repositories</h2>
            <p className="text-3xl font-bold">{stats.totalRepos}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-600 mb-2">Active Repositories</h2>
            <p className="text-3xl font-bold">{stats.activeRepos}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-600 mb-2">Total Reviews</h2>
            <p className="text-3xl font-bold">{stats.totalReviews}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-600 mb-2">Blocked PRs</h2>
            <p className="text-3xl font-bold text-red-600">{stats.blockedPRs}</p>
          </div>
        </div>

        {/* Repositories */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Repositories</h2>
          </div>
          <div className="p-6">
            {repos.length === 0 ? (
              <p className="text-gray-600">No repositories found. Connect your first repository to get started.</p>
            ) : (
              <div className="space-y-4">
                {repos.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{repo.fullName}</h3>
                      <p className="text-sm text-gray-600">{repo.organization.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${repo.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {repo.enabled ? 'Active' : 'Inactive'}
                      </span>
                      <Link
                        href={`/dashboard/repos/${repo.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Reviews</h2>
          </div>
          <div className="p-6">
            {reviews.length === 0 ? (
              <p className="text-gray-600">No reviews yet. Create your first review to get started.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{review.repository.name}</h3>
                      <p className="text-sm text-gray-600">Status: {review.status}</p>
                    </div>
                    {review.isBlocked && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                        Blocked
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading dashboard...</h1>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
