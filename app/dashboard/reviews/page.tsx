'use client'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  Button,
  ErrorState,
  LoadingState,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { 
  AlertTriangle, 
  CheckCircle2,
  FileCode,
  Clock,
  Search,
  Shield,
} from 'lucide-react'
import Link from 'next/link'

interface Review {
  id: string
  repositoryId: string
  prNumber: number
  status: string
  isBlocked: boolean
  summary?: {
    critical: number
    high: number
    medium: number
    low: number
  }
  createdAt: string
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'blocked' | 'approved'>('all')

  const fetchReviews = useCallback(async () => {
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

      const response = await fetch('/api/v1/reviews?limit=50', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(getApiErrorMessage(errorData))
      }

      const data = (await response.json()) as { reviews?: Review[] }
      setReviews(data.reviews || [])
      setError(null)
      setLoading(false)
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        setError('Request timed out while fetching reviews')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load reviews')
      }
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    
    return () => {
      clearTimeout(timer)
    }
  }, [searchQuery])

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const matchesSearch = debouncedSearchQuery === '' || 
        review.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        review.prNumber.toString().includes(debouncedSearchQuery)
      
      const matchesFilter = filterStatus === 'all' ||
        (filterStatus === 'blocked' && review.isBlocked) ||
        (filterStatus === 'approved' && !review.isBlocked)
      
      return matchesSearch && matchesFilter
    })
  }, [reviews, debouncedSearchQuery, filterStatus])

  if (loading) {
    return (
      <Container className="py-8">
        <LoadingState message="Loading reviews..." />
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
              fetchReviews()
            },
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" id="reviews-heading">Reviews</h1>
              <p className="text-text-muted">
                Deterministic code reviews with signed certificates. Every decision is defensible.
              </p>
            </div>
          </div>
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mt-4">
            <div className="text-xs font-semibold text-primary mb-1">ReadyLayer Verified™</div>
            <div className="text-xs text-muted-foreground">
              Every review generates a Merge Confidence Certificate. If ReadyLayer didn&apos;t review a PR, that absence is visible.
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search by PR number or review ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  aria-label="Search reviews"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                  aria-pressed={filterStatus === 'all'}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'blocked' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('blocked')}
                  aria-pressed={filterStatus === 'blocked'}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Blocked
                </Button>
                <Button
                  variant={filterStatus === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('approved')}
                  aria-pressed={filterStatus === 'approved'}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Approved
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          role="list"
          aria-label="Code reviews"
        >
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <FileCode className="h-12 w-12 text-text-muted mx-auto mb-4" aria-hidden="true" />
                <p className="text-text-muted font-medium">No reviews found</p>
                <p className="text-sm text-text-muted mt-1">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Reviews will appear here after PRs are analyzed'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredReviews.map((review) => (
              <motion.div key={review.id} variants={staggerItem} role="listitem">
                <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <Link
                      href={`/dashboard/reviews/${review.id}`}
                      className="block"
                      aria-label={`View review for PR #${review.prNumber}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              PR #{review.prNumber}
                            </h3>
                            {review.isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-destructive/10 text-destructive rounded border border-destructive/20">
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                Blocked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-success-muted text-success rounded border border-success/20">
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                ReadyLayer Verified
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded border border-primary/20">
                              <Shield className="h-3 w-3" aria-hidden="true" />
                              Certificate Available
                            </span>
                          </div>
                          {review.summary && (
                            <div className="flex items-center gap-4 text-sm text-text-muted mb-2">
                              {review.summary.critical > 0 && (
                                <span className="text-destructive">
                                  {review.summary.critical} critical
                                </span>
                              )}
                              {review.summary.high > 0 && (
                                <span className="text-orange-600">
                                  {review.summary.high} high
                                </span>
                              )}
                              {review.summary.medium > 0 && (
                                <span className="text-warning">
                                  {review.summary.medium} medium
                                </span>
                              )}
                              {review.summary.low > 0 && (
                                <span className="text-info">
                                  {review.summary.low} low
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span>{new Date(review.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Button variant="ghost" size="sm" asChild>
                            <span>View Details →</span>
                          </Button>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.div>
    </Container>
  )
}
