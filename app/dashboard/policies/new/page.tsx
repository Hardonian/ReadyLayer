'use client'

import { useState } from 'react'
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

export default function NewPolicyPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState('')
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

      // Parse source to extract rules if needed
      let parsedSource: Record<string, unknown>
      try {
        parsedSource = JSON.parse(source)
      } catch {
        setError('Invalid JSON in policy source')
        setLoading(false)
        return
      }

      const rules = parsedSource.rules || []

      const response = await fetch('/api/v1/policies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          repositoryId: repositoryId || null,
          version,
          source,
          rules,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to create policy pack')
      }

      const policy = await response.json()

      toast({
        title: 'Success',
        description: 'Policy pack created successfully',
      })

      router.push(`/dashboard/policies/${policy.id}`)
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

        {error && (
          <ErrorState
            message={error}
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
                    Organization ID *
                  </label>
                  <input
                    type="text"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="org_123"
                  />
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
                      onClick={() => setViewMode('json')}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === 'yaml' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('yaml')}
                      disabled
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
                  placeholder='{"version": "1.0.0", "rules": []}'
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Policy source in JSON format. Rules can be defined here or added via the API.
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
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Policy Pack'}
            </Button>
          </div>
        </form>
      </motion.div>
    </Container>
  )
}
