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
  Shield, 
  ArrowLeft,
  Edit,
  Plus,
  Settings,
  History,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/lib/hooks/use-toast'

interface PolicyPack {
  id: string
  organizationId: string
  repositoryId: string | null
  version: string
  source: string
  checksum: string
  rules: PolicyRule[]
  organization?: {
    id: string
    name: string
    slug: string
  }
  repository?: {
    id: string
    name: string
    fullName: string
  }
  createdAt: string
  updatedAt: string
}

interface PolicyRule {
  id: string
  ruleId: string
  severityMapping: Record<string, 'block' | 'warn' | 'allow'>
  enabled: boolean
  params?: Record<string, any>
}

export default function PolicyDetailPage() {
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const packId = params.packId as string

  const [policy, setPolicy] = useState<PolicyPack | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        const response = await fetch(`/api/v1/policies/${packId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error?.message || 'Failed to fetch policy')
        }

        const data = await response.json()
        setPolicy(data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policy')
        setLoading(false)
      }
    }

    if (packId) {
      fetchPolicy()
    }
  }, [packId])

  const handleDelete = async () => {
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

      const response = await fetch(`/api/v1/policies/${packId}`, {
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

      router.push('/dashboard/policies')
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete policy',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <Container className="py-8">
        <LoadingState message="Loading policy pack..." />
      </Container>
    )
  }

  if (error || !policy) {
    return (
      <Container className="py-8">
        <ErrorState
          message={error || 'Policy pack not found'}
          action={{
            label: 'Back to Policies',
            onClick: () => router.push('/dashboard/policies'),
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
          <div className="flex items-center gap-4">
            <Link href="/dashboard/policies">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Policy Pack v{policy.version}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {policy.repositoryId ? (
                    <Badge variant="secondary">Repo-Level</Badge>
                  ) : (
                    <Badge variant="default">Org-Level</Badge>
                  )}
                  {policy.organization && (
                    <span className="text-sm text-muted-foreground">
                      {policy.organization.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/policies/${packId}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button variant="outline" onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rules">Rules ({policy.rules.length})</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Policy Rules</h2>
              <Link href={`/dashboard/policies/${packId}/rules/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </Link>
            </div>

            {policy.rules.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No rules configured</p>
                    <Link href={`/dashboard/policies/${packId}/rules/new`}>
                      <Button className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Rule
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {policy.rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{rule.ruleId}</CardTitle>
                            {rule.enabled ? (
                              <Badge variant="default">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Enabled
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Severity Mapping</div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(rule.severityMapping).map(([severity, action]) => (
                                <Badge
                                  key={severity}
                                  variant={
                                    action === 'block' ? 'destructive' :
                                    action === 'warn' ? 'default' : 'secondary'
                                  }
                                >
                                  {severity}: {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Link href={`/dashboard/policies/${packId}/rules/${rule.ruleId}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Source Tab */}
          <TabsContent value="source">
            <Card>
              <CardHeader>
                <CardTitle>Policy Source</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{policy.source}</code>
                </pre>
                <div className="mt-4 text-sm text-muted-foreground">
                  <div>Checksum: <code className="text-xs">{policy.checksum}</code></div>
                  <div className="mt-2">
                    Created: {new Date(policy.createdAt).toLocaleString()}
                  </div>
                  <div>
                    Updated: {new Date(policy.updatedAt).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Version History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">Version {policy.version}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(policy.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <Badge>Current</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Version history will show previous versions once multiple versions exist.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </Container>
  )
}
