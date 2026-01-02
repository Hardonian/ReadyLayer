'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  ErrorState,
  EmptyState,
  Skeleton,
  Badge,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { 
  Shield, 
  Plus,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/lib/hooks/use-toast'

interface PolicyPack {
  id: string
  organizationId: string
  repositoryId: string | null
  version: string
  checksum: string
  rules: PolicyRule[]
  repository?: {
    id: string
    name: string
    fullName: string
    provider?: string
    url?: string
  }
  createdAt: string
  updatedAt: string
}

interface PolicyRule {
  id: string
  ruleId: string
  severityMapping: Record<string, 'block' | 'warn' | 'allow'>
  enabled: boolean
  params?: Record<string, unknown>
}

export default function PoliciesPage() {
  const { toast } = useToast()
  const [policies, setPolicies] = useState<PolicyPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [_selectedOrg, _setSelectedOrg] = useState<string | null>(null)

  const fetchPolicies = useCallback(async (_orgId?: string | null) => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const url = `/api/v1/policies${selectedOrg ? `?organizationId=${selectedOrg}` : ''}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to fetch policies')
      }

      const data = await response.json()
      setPolicies(data.policies || [])
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPolicies()
  }, [fetchPolicies])

  const handleDelete = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy pack? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch(`/api/v1/policies/${policyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to delete policy')
      }

      toast({
        title: 'Success',
        description: 'Policy pack deleted successfully',
      })
      fetchPolicies()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete policy',
        variant: 'destructive',
      })
    }
  }

  const filteredPolicies = policies.filter((policy) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        policy.version.toLowerCase().includes(query) ||
        policy.rules.some((r) => r.ruleId.toLowerCase().includes(query))
      )
    }
    return true
  })

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
              fetchPolicies()
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
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Shield 
                className="h-8 w-8" 
                style={{ color: '#6366f1' }} // Default primary color
              />
              <h1 className="text-3xl font-bold">Policy Management</h1>
            </div>
            <p className="text-muted-foreground">
              Manage Policy-as-Code rules and configurations
            </p>
          </div>
          <Link href="/dashboard/policies/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Policy Pack
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search policies by version or rule ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policies Grid */}
        {filteredPolicies.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No policy packs"
            description={searchQuery ? 'No policies match your search' : 'Create your first policy pack to start governing code reviews'}
            action={{
              label: 'Create Policy Pack',
              onClick: () => {
                window.location.href = '/dashboard/policies/new'
              },
            }}
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {filteredPolicies.map((policy) => (
              <motion.div key={policy.id} variants={staggerItem}>
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          Version {policy.version}
                        </CardTitle>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {policy.repositoryId ? (
                            <Badge variant="secondary">Repo-Level</Badge>
                          ) : (
                            <Badge variant="default">Org-Level</Badge>
                          )}
                          <Badge variant="outline">
                            {policy.rules.length} {policy.rules.length === 1 ? 'rule' : 'rules'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-3 flex-1">
                      <div>
                        <div className="text-sm font-medium mb-2">Rules</div>
                        <div className="space-y-1">
                          {policy.rules.slice(0, 3).map((rule) => (
                            <div key={rule.id} className="flex items-center gap-2 text-sm">
                              {rule.enabled ? (
                                <CheckCircle2 className="h-3 w-3 text-success" />
                              ) : (
                                <XCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-muted-foreground">{rule.ruleId}</span>
                            </div>
                          ))}
                          {policy.rules.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{policy.rules.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated {new Date(policy.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Link href={`/dashboard/policies/${policy.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(policy.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </Container>
  )
}
