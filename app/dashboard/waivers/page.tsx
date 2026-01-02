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
  ShieldCheck, 
  Plus,
  Calendar,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/lib/hooks/use-toast'
import { useGitProvider } from '@/lib/git-provider-ui/hooks'

interface Waiver {
  id: string
  organizationId: string
  repositoryId: string | null
  ruleId: string
  scope: 'repo' | 'branch' | 'path'
  scopeValue: string | null
  reason: string
  expiresAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export default function WaiversPage() {
  const { toast } = useToast()
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeOnly, setActiveOnly] = useState(false)
  
  // Get provider theme for adaptive styling
  const { theme } = useGitProvider()

  const fetchWaivers = useCallback(async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const url = `/api/v1/waivers${activeOnly ? '?activeOnly=true' : ''}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to fetch waivers')
      }

      const data = await response.json()
      setWaivers(data.waivers || [])
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load waivers')
      setLoading(false)
    }
  }, [activeOnly])

  useEffect(() => {
    fetchWaivers()
  }, [fetchWaivers])

  const handleRevoke = async (waiverId: string) => {
    if (!confirm('Are you sure you want to revoke this waiver?')) {
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

      const response = await fetch(`/api/v1/waivers/${waiverId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to revoke waiver')
      }

      toast({
        title: 'Success',
        description: 'Waiver revoked successfully',
      })
      fetchWaivers()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to revoke waiver',
        variant: 'destructive',
      })
    }
  }

  const isExpired = (waiver: Waiver) => {
    if (!waiver.expiresAt) return false
    return new Date(waiver.expiresAt) < new Date()
  }

  const isActive = (waiver: Waiver) => {
    return !isExpired(waiver)
  }

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-full mb-2" />
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
              fetchWaivers()
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
              <ShieldCheck 
                className="h-8 w-8" 
                style={{ color: theme?.colors.primary || 'currentColor' }}
              />
              <h1 className="text-3xl font-bold">Waivers</h1>
            </div>
            <p className="text-muted-foreground">
              Manage temporary exceptions for policy findings
            </p>
          </div>
          <Link href="/dashboard/waivers/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Waiver
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show active waivers only</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Waivers List */}
        {waivers.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No waivers"
            description={activeOnly ? 'No active waivers found' : 'Create a waiver to temporarily suppress policy findings'}
            action={{
              label: 'Create Waiver',
              onClick: () => {
                window.location.href = '/dashboard/waivers/new'
              },
            }}
          />
        ) : (
          <motion.div
            className="space-y-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {waivers.map((waiver) => (
              <motion.div key={waiver.id} variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{waiver.ruleId}</CardTitle>
                          {isActive(waiver) ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Expired</Badge>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {waiver.scope}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {waiver.reason}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {waiver.scopeValue && (
                            <div className="flex items-center gap-1">
                              <span className="capitalize">{waiver.scope}:</span>
                              <code className="text-xs">{waiver.scopeValue}</code>
                            </div>
                          )}
                          {waiver.expiresAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires: {new Date(waiver.expiresAt).toLocaleDateString()}
                            </div>
                          )}
                          <div>
                            Created: {new Date(waiver.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {isActive(waiver) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevoke(waiver.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </Container>
  )
}
