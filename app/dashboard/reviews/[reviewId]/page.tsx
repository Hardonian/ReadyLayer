'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  ErrorState,
  LoadingState,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  MessageSquare,
  Clock,
  User,
  FileCode,
  ChevronRight,
  GitCommit,
  AlertCircle,
  Info,
} from 'lucide-react'
import Link from 'next/link'

interface ReviewIssue {
  id: string
  ruleId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  file?: string
  line?: number
  fix?: string
}

interface ReviewComment {
  id: string
  issueId: string
  author: string
  content: string
  createdAt: string
  resolved: boolean
}

interface Review {
  id: string
  repositoryId: string
  prNumber: number
  prSha: string
  status: string
  issues: ReviewIssue[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
  }
  isBlocked: boolean
  blockedReason?: string
  createdAt: string
  completedAt?: string
}

export default function ReviewDetailPage() {
  const params = useParams()
  const reviewId = params.reviewId as string
  const [review, setReview] = useState<Review | null>(null)
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const [newComment, setNewComment] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchReview() {
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

        const response = await fetch(`/api/v1/reviews/${reviewId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error?.message || 'Failed to fetch review')
        }

        const data = await response.json()
        setReview(data)
        
        // Mock comments for now - in production, fetch from API
        setComments([
          {
            id: '1',
            issueId: data.issues?.[0]?.id || '',
            author: 'Review Bot',
            content: 'This issue was automatically detected. Please review the suggested fix.',
            createdAt: new Date().toISOString(),
            resolved: false,
          },
        ])
        
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load review')
        setLoading(false)
      }
    }

    if (reviewId) {
      fetchReview()
    }
  }, [reviewId])

  const handleAddComment = async (issueId: string) => {
    const comment = newComment[issueId]?.trim()
    if (!comment) return

    // In production, this would POST to /api/v1/reviews/:reviewId/comments
    const newCommentObj: ReviewComment = {
      id: Date.now().toString(),
      issueId,
      author: 'You',
      content: comment,
      createdAt: new Date().toISOString(),
      resolved: false,
    }

    setComments([...comments, newCommentObj])
    setNewComment({ ...newComment, [issueId]: '' })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-destructive bg-destructive/10 border-destructive/20'
      case 'high':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
      case 'medium':
        return 'text-warning bg-warning-muted border-warning/20'
      case 'low':
        return 'text-info bg-info-muted border-info/20'
      default:
        return 'text-text-muted bg-surface-muted border-border'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4" />
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      case 'medium':
        return <AlertCircle className="h-4 w-4" />
      case 'low':
        return <Info className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Container className="py-8">
        <LoadingState message="Loading review details..." />
      </Container>
    )
  }

  if (error || !review) {
    return (
      <Container className="py-8">
        <ErrorState
          message={error || 'Review not found'}
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
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors">
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4 text-text-muted" />
              <Link href={`/dashboard/repos/${review.repositoryId}`} className="text-text-muted hover:text-text-primary transition-colors">
                Repository
              </Link>
              <ChevronRight className="h-4 w-4 text-text-muted" />
              <span className="text-text-primary font-medium">PR #{review.prNumber}</span>
            </div>
            <h1 className="text-3xl font-bold">Review #{review.id.slice(0, 8)}</h1>
            <p className="text-text-muted">
              Pull Request #{review.prNumber} • {new Date(review.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {review.isBlocked ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <XCircle className="h-5 w-5" />
                <span className="font-semibold">Blocked</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-success-muted text-success rounded-lg border border-success/20">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Approved</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {review.isBlocked && review.blockedReason && (
          <motion.div variants={fadeIn}>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-destructive mb-1">PR Blocked</div>
                    <p className="text-sm text-text-muted">{review.blockedReason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Summary Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={staggerItem}>
            <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-muted mb-1">Critical Issues</div>
                    <div className="text-2xl font-bold text-destructive">{review.summary.critical}</div>
                  </div>
                  <XCircle className="h-8 w-8 text-destructive/50" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-muted mb-1">High Priority</div>
                    <div className="text-2xl font-bold text-orange-600">{review.summary.high}</div>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600/50" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-muted mb-1">Medium Priority</div>
                    <div className="text-2xl font-bold text-warning">{review.summary.medium}</div>
                  </div>
                  <AlertCircle className="h-8 w-8 text-warning/50" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-muted mb-1">Low Priority</div>
                    <div className="text-2xl font-bold text-info">{review.summary.low}</div>
                  </div>
                  <Info className="h-8 w-8 text-info/50" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Issues List with Thread Management */}
        <motion.div variants={fadeIn}>
          <Card className="glass-strong backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Issues Found ({review.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {review.issues.map((issue, index) => {
                  const issueComments = comments.filter(c => c.issueId === issue.id)
                  const isExpanded = selectedIssue === issue.id

                  return (
                    <motion.div
                      key={issue.id || index}
                      variants={staggerItem}
                      className="border border-border rounded-lg overflow-hidden hover:border-border-strong transition-colors"
                    >
                      {/* Issue Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-surface-hover transition-colors"
                        onClick={() => setSelectedIssue(isExpanded ? null : issue.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${getSeverityColor(issue.severity)}`}>
                              {getSeverityIcon(issue.severity)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getSeverityColor(issue.severity)}`}>
                                  {issue.severity.toUpperCase()}
                                </span>
                                {issue.ruleId && (
                                  <span className="text-xs text-text-muted font-mono">
                                    {issue.ruleId}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-text-primary mb-1">
                                {issue.message}
                              </p>
                              {issue.file && (
                                <div className="flex items-center gap-2 text-xs text-text-muted">
                                  <FileCode className="h-3 w-3" />
                                  <span className="font-mono">{issue.file}</span>
                                  {issue.line && (
                                    <>
                                      <span>•</span>
                                      <span>Line {issue.line}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {issueComments.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-text-muted">
                                <MessageSquare className="h-4 w-4" />
                                <span>{issueComments.length}</span>
                              </div>
                            )}
                            <ChevronRight
                              className={`h-5 w-5 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border bg-surface-muted/50"
                        >
                          <div className="p-4 space-y-4">
                            {/* Fix Suggestion */}
                            {issue.fix && (
                              <div className="p-3 bg-accent-muted rounded-lg border border-accent/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <Info className="h-4 w-4 text-accent" />
                                  <span className="text-sm font-semibold text-accent">Suggested Fix</span>
                                </div>
                                <p className="text-sm text-text-primary">{issue.fix}</p>
                              </div>
                            )}

                            {/* Comments Thread */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                <MessageSquare className="h-4 w-4" />
                                Comments ({issueComments.length})
                              </div>

                              {issueComments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="flex gap-3 p-3 bg-surface rounded-lg border border-border"
                                >
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                                      <User className="h-4 w-4 text-accent" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-text-primary">
                                        {comment.author}
                                      </span>
                                      <span className="text-xs text-text-muted">
                                        {new Date(comment.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-text-primary whitespace-pre-wrap">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              ))}

                              {/* Add Comment Form */}
                              <div className="space-y-2">
                                <textarea
                                  value={newComment[issue.id] || ''}
                                  onChange={(e) =>
                                    setNewComment({ ...newComment, [issue.id]: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                      e.preventDefault()
                                      handleAddComment(issue.id)
                                    }
                                  }}
                                  placeholder="Add a comment... (Ctrl/Cmd+Enter to submit)"
                                  className="w-full p-3 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                                  rows={3}
                                  aria-label="Add a comment"
                                />
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddComment(issue.id)}
                                    disabled={!newComment[issue.id]?.trim()}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Add Comment
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}

                {review.issues.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                    <p className="text-text-muted font-medium">No issues found</p>
                    <p className="text-sm text-text-muted mt-1">This PR is ready to merge!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Metadata */}
        <motion.div variants={fadeIn}>
          <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle>Review Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <GitCommit className="h-4 w-4 text-text-muted" />
                  <span className="text-text-muted">Commit SHA:</span>
                  <span className="font-mono text-xs">{review.prSha.slice(0, 7)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-text-muted" />
                  <span className="text-text-muted">Created:</span>
                  <span>{new Date(review.createdAt).toLocaleString()}</span>
                </div>
                {review.completedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-text-muted" />
                    <span className="text-text-muted">Completed:</span>
                    <span>{new Date(review.completedAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-text-muted" />
                  <span className="text-text-muted">Status:</span>
                  <span className="font-semibold capitalize">{review.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Container>
  )
}
