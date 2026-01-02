'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  ErrorState,
  LoadingState,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { 
  FileSearch, 
  ArrowLeft,
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
  inputsMetadata: Record<string, unknown>
  rulesFired: string[]
  deterministicScore: number
  artifacts: Record<string, string> | null
  policyChecksum: string
  toolVersions: Record<string, string> | null
  timings: Record<string, number> | null
  createdAt: string
}

export default function EvidenceDetailPage() {
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const bundleId = params.bundleId as string

  const [evidence, setEvidence] = useState<EvidenceBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvidence() {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        const response = await fetch(`/api/v1/evidence/${bundleId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error?.message || 'Failed to fetch evidence')
        }

        const data = await response.json()
        setEvidence(data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load evidence')
        setLoading(false)
      }
    }

    if (bundleId) {
      fetchEvidence()
    }
  }, [bundleId])

  const handleExport = async () => {
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

  const getResourceLink = () => {
    if (!evidence) return null
    if (evidence.reviewId) return `/dashboard/reviews/${evidence.reviewId}`
    if (evidence.testId) return `/dashboard/tests/${evidence.testId}`
    if (evidence.docId) return `/dashboard/docs/${evidence.docId}`
    return null
  }

  const getResourceType = () => {
    if (!evidence) return 'Unknown'
    if (evidence.reviewId) return 'Review'
    if (evidence.testId) return 'Test'
    if (evidence.docId) return 'Doc'
    return 'Unknown'
  }

  if (loading) {
    return (
      <Container className="py-8">
        <LoadingState message="Loading evidence bundle..." />
      </Container>
    )
  }

  if (error || !evidence) {
    return (
      <Container className="py-8">
        <ErrorState
          message={error || 'Evidence bundle not found'}
          action={{
            label: 'Back to Evidence',
            onClick: () => router.push('/dashboard/evidence'),
          }}
        />
      </Container>
    )
  }

  const resourceLink = getResourceLink()
  const resourceType = getResourceType()
  const scoreColor = evidence.deterministicScore >= 80 ? 'success' :
                    evidence.deterministicScore >= 60 ? 'default' : 'destructive'

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
          <div className="flex items-center gap-4">
            <Link href="/dashboard/evidence">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <FileSearch className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">{resourceType} Evidence</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={scoreColor === 'success' ? 'default' : scoreColor === 'destructive' ? 'destructive' : 'secondary'}>
                    Score: {evidence.deterministicScore.toFixed(1)}
                  </Badge>
                  <Badge variant="outline">
                    {evidence.rulesFired.length} {evidence.rulesFired.length === 1 ? 'rule' : 'rules'} fired
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {resourceLink && (
              <Link href={resourceLink}>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View {resourceType}
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="rules">Rules Fired</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{evidence.deterministicScore.toFixed(1)}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Deterministic policy evaluation score (0-100)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-mono break-all">
                    {evidence.policyChecksum}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Policy pack checksum used for evaluation
                  </p>
                </CardContent>
              </Card>
            </div>

            {evidence.timings && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(evidence.timings).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-sm font-medium">{value}ms</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Inputs Tab */}
          <TabsContent value="inputs">
            <Card>
              <CardHeader>
                <CardTitle>Input Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{JSON.stringify(evidence.inputsMetadata, null, 2)}</code>
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Rules Fired ({evidence.rulesFired.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {evidence.rulesFired.map((ruleId) => (
                    <div key={ruleId} className="p-3 border rounded-lg">
                      <code className="text-sm">{ruleId}</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata">
            <div className="grid gap-4 md:grid-cols-2">
              {evidence.toolVersions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tool Versions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(evidence.toolVersions).map(([tool, version]) => (
                        <div key={tool} className="flex justify-between">
                          <span className="text-sm capitalize">{tool}</span>
                          <code className="text-sm">{version}</code>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Timestamps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Created</span>
                      <span className="text-sm">{new Date(evidence.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {evidence.artifacts && Object.keys(evidence.artifacts).length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Artifacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{JSON.stringify(evidence.artifacts, null, 2)}</code>
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </Container>
  )
}
