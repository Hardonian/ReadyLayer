'use client'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  Button,
  ErrorState,
  LoadingState,
  EmptyState,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { 
  GitBranch, 
  CheckCircle2, 
  Plus,
  Search,
  Settings,
} from 'lucide-react'
import Link from 'next/link'

interface Repository {
  id: string
  name: string
  fullName: string
  provider: string
  enabled: boolean
  createdAt: string
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchRepos() {
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

        const response = await fetch('/api/v1/repos?limit=100', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>
          throw new Error(getApiErrorMessage(errorData))
        }

        const data = (await response.json()) as { repositories?: Repository[] }
        setRepos(data.repositories || [])
        setLoading(false)
      } catch (err) {
        if (err instanceof Error && err.name === 'TimeoutError') {
          setError('Request timed out while fetching repositories')
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load repositories')
        }
        setLoading(false)
      }
    }

    fetchRepos()
  }, [])

  const filteredRepos = repos.filter((repo) => 
    searchQuery === '' || 
    repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <Container className="py-8">
        <LoadingState message="Loading repositories..." />
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-8">
        <ErrorState
          message={error}
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
            <h1 className="text-3xl font-bold" id="repos-heading">Repositories</h1>
            <p className="text-text-muted">
              Manage your connected repositories and verification settings
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/repos/connect">
              <Plus className="h-4 w-4 mr-2" />
              Connect Repository
            </Link>
          </Button>
        </div>

        {/* Search */}
        <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                aria-label="Search repositories"
              />
            </div>
          </CardContent>
        </Card>

        {/* Repositories List */}
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          role="list"
          aria-label="Repositories"
        >
          {filteredRepos.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <EmptyState
                  icon={GitBranch}
                  title={searchQuery ? "No repositories found" : "No repositories"}
                  description={
                    searchQuery
                      ? "Try adjusting your search query"
                      : "Connect a repository to start verifying AI-generated code."
                  }
                  action={
                    !searchQuery
                      ? {
                          label: 'Connect Repository',
                          onClick: () => {
                            // Navigate to connect page (will be created)
                            window.location.href = '/dashboard/repos/connect'
                          },
                        }
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          ) : (
            filteredRepos.map((repo) => (
              <motion.div key={repo.id} variants={staggerItem} role="listitem">
                <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <Link
                      href={`/dashboard/repos/${repo.id}`}
                      className="block"
                      aria-label={`View repository ${repo.fullName}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              {repo.fullName}
                            </h3>
                            {repo.enabled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-success-muted text-success rounded border border-success/20">
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-surface-muted text-text-muted rounded border border-border">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-text-muted">
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" aria-hidden="true" />
                              {repo.provider}
                            </span>
                            <span>
                              Connected {new Date(repo.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <span>
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </span>
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
