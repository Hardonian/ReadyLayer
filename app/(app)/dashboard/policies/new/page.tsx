'use client'

import { useState } from 'react'
import { dump as dumpYaml, load as loadYaml } from 'js-yaml'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  ErrorState,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { 
  Shield, 
  ArrowLeft,
  Save,
  Code,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/lib/hooks/use-toast'
import { useGitProvider } from '@/lib/git-provider-ui/hooks'
import { useOrganizationId } from '@/lib/hooks/use-organization-id'

export default function NewPolicyPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { organizationId, organizationName, loading: organizationLoading, error: organizationError } = useOrganizationId()
  const [repositoryId, setRepositoryId] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [source, setSource] = useState(`{
  "version": "1.0.0",
  "rules": []
}`)
  const [viewMode, setViewMode] = useState<'json' | 'yaml'>('json')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get provider theme (will adapt when repository is selected)
  const { theme } = useGitProvider()

  const switchViewMode = (nextMode: 'json' | 'yaml'): void => {
    if (nextMode === viewMode) return
    try {
      const parsed: unknown = viewMode === 'json' ? (JSON.parse(source) as unknown) : (loadYaml(source) as unknown)
      setSource(nextMode === 'json' ? JSON.stringify(parsed, null, 2) : dumpYaml(parsed))
      setViewMode(nextMode)
      setError(null)
    } catch {
      setError(`Fix the ${viewMode.toUpperCase()} source before switching formats.`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      if (!organizationId) throw new Error('No organization is available for this account.')

      // Parse source to extract rules and keep the stored source/version aligned.
      let parsedSource: Record<string, unknown>
      try {
        const parsed: unknown = viewMode === 'json' ? (JSON.parse(source) as unknown) : (loadYaml(source) as unknown)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Policy source must be an object.')
        }
        parsedSource = parsed as Record<string, unknown>
      } catch {
        setError(`Invalid ${viewMode.toUpperCase()} in policy source`)
        setLoading(false)
        return
      }

      if (!Array.isArray(parsedSource.rules)) {
        setError('Policy source must include a rules array.')
        setLoading(false)
        return
      }
      parsedSource.version = version
      const rules = parsedSource.rules
      const normalizedSource = viewMode === 'json'
        ? JSON.stringify(parsedSource, null, 2)
        : dumpYaml(parsedSource)

      const response = await fetch(`/api/v1/policies?organizationId=${encodeURIComponent(organizationId)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          organizationId,
          repositoryId: repositoryId || null,
          version,
          source: normalizedSource,
          rules,
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(getApiErrorMessage(errorData))
      }

      const policy = (await response.json()) as { data?: { id?: string } }
      if (!policy.data?.id) throw new Error('Policy pack was created but no ID was returned.')

      toast({
        title: 'Success',
        description: 'Policy pack created successfully',
      })

      router.push(`/dashboard/policies/${policy.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy pack')
      setLoading(false)
    }
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
        <div className="flex items-center gap-4">
          <Link href="/dashboard/policies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Shield 
              className="h-8 w-8" 
              style={{ color: theme?.colors.primary || 'currentColor' }}
            />
            <h1 className="text-3xl font-bold">Create Policy Pack</h1>
          </div>
        </div>

        {(error || organizationError) && (
          <ErrorState
            message={error || organizationError || 'Unable to load your organization.'}
            action={{
              label: 'Try Again',
              onClick: () => setError(null),
            }}
          />
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Organization
                  </label>
                  <div className="rounded-lg border border-border bg-surface-muted px-4 py-2 text-sm">
                    {organizationLoading ? 'Loading organization...' : organizationName || 'No organization selected'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">The policy is scoped to your current organization.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Repository ID (optional)
                  </label>
                  <input
                    type="text"
                    value={repositoryId}
                    onChange={(e) => setRepositoryId(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Leave empty for org-level policy"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to create an organization-level policy
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Version *
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    required
                    pattern="^\d+\.\d+\.\d+$"
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="1.0.0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Semantic version (e.g., 1.0.0)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Policy Source */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Policy Source</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={viewMode === 'json' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => switchViewMode('json')}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === 'yaml' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => switchViewMode('yaml')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      YAML
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <textarea
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  required
                  rows={15}
                  className="w-full px-4 py-2 border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={viewMode === 'json' ? '{"version": "1.0.0", "rules": []}' : 'version: 1.0.0\nrules: []'}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Policy source in {viewMode.toUpperCase()} format. Rules must be an array of ruleId, severityMapping, and enabled values.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/dashboard/policies">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || organizationLoading || !organizationId}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Policy Pack'}
            </Button>
          </div>
        </form>
      </motion.div>
    </Container>
  )
}
