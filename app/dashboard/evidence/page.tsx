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
  FileSearch, 
  Download,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/lib/hooks/use-toast'

interface EvidenceBundle {
  id: string
  reviewId: string | null
  testId: string | null
  docId: string | null
  rulesFired: string[]
  deterministicScore: number
  policyChecksum: string
  createdAt: string
}

export default function EvidencePage() {
  const { toast } = useToast()
  const [evidence, setEvidence] = useState<EvidenceBundle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvidence = useCallback(async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch('/api/v1/evidence?limit=50', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to fetch evidence')
      }

      const data = await response.json()
      setEvidence(data.evidence || [])
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvidence()
  }, [fetchEvidence])

  const handleExport = async (bundleId: string) => {
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

      const response = await fetch(`/api/v1/evidence/${bundleId}/export`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to export evidence')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `evidence-${bundleId}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: 'Evidence bundle exported',
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to export evidence',
        variant: 'destructive',
      })
    }
  }

  const getResourceLink = (bundle: EvidenceBundle) => {
    if (bundle.reviewId) {
      return `/dashboard/reviews/${bundle.reviewId}`
    }
    if (bundle.testId) {
      return `/dashboard/tests/${bundle.testId}`
    }
    if (bundle.docId) {
      return `/dashboard/docs/${bundle.docId}`
    }
    return null
  }

  const getResourceType = (bundle: EvidenceBundle) => {
    if (bundle.reviewId) return 'Review'
    if (bundle.testId) return 'Test'
    if (bundle.docId) return 'Doc'
    return 'Unknown'
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
              fetchEvidence()
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
            <FileSearch className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Evidence Bundles</h1>
          </div>
          <p className="text-muted-foreground">
            Auditable decision records for all policy evaluations
          </p>
        </div>

        {/* Evidence List */}
        {evidence.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No evidence bundles"
            description="Evidence bundles will appear here after policy evaluations run"
          />
        ) : (
          <motion.div
            className="space-y-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {evidence.map((bundle) => {
              const resourceLink = getResourceLink(bundle)
              const resourceType = getResourceType(bundle)
              const scoreColor = bundle.deterministicScore >= 80 ? 'success' :
                                bundle.deterministicScore >= 60 ? 'default' : 'destructive'

              return (
                <motion.div key={bundle.id} variants={staggerItem}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">
                              {resourceType} Evidence
                            </CardTitle>
                            <Badge variant={scoreColor === 'success' ? 'default' : scoreColor === 'destructive' ? 'destructive' : 'secondary'}>
                              Score: {bundle.deterministicScore.toFixed(1)}
                            </Badge>
                            <Badge variant="outline">
                              {bundle.rulesFired.length} {bundle.rulesFired.length === 1 ? 'rule' : 'rules'}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">
                              Policy Checksum: <code className="text-xs">{bundle.policyChecksum.slice(0, 16)}...</code>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Created: {new Date(bundle.createdAt).toLocaleString()}
                            </div>
                            {bundle.rulesFired.length > 0 && (
                              <div className="text-sm">
                                <span className="font-medium">Rules Fired: </span>
                                <span className="text-muted-foreground">
                                  {bundle.rulesFired.slice(0, 3).join(', ')}
                                  {bundle.rulesFired.length > 3 && ` +${bundle.rulesFired.length - 3} more`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {resourceLink && (
                            <Link href={resourceLink}>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View {resourceType}
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(bundle.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </motion.div>
    </Container>
  )
}
