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
  ShieldCheck, 
  ArrowLeft,
  Save,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/lib/hooks/use-toast'

export default function NewWaiverPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState('')
  const [repositoryId, setRepositoryId] = useState('')
  const [ruleId, setRuleId] = useState('')
  const [scope, setScope] = useState<'repo' | 'branch' | 'path'>('repo')
  const [scopeValue, setScopeValue] = useState('')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      const response = await fetch('/api/v1/waivers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          repositoryId: repositoryId || null,
          ruleId,
          scope,
          scopeValue: scopeValue || null,
          reason,
          expiresAt: expiresAt || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to create waiver')
      }

      toast({
        title: 'Success',
        description: 'Waiver created successfully',
      })

      router.push('/dashboard/waivers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create waiver')
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
          <Link href="/dashboard/waivers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Create Waiver</h1>
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
          <Card>
            <CardHeader>
              <CardTitle>Waiver Details</CardTitle>
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
                  placeholder="Leave empty for org-level waiver"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Rule ID *
                </label>
                <input
                  type="text"
                  value={ruleId}
                  onChange={(e) => setRuleId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="security.sql-injection"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The rule ID to waive findings for
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Scope *
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as 'repo' | 'branch' | 'path')}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="repo">Repository</option>
                  <option value="branch">Branch</option>
                  <option value="path">Path</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Scope of the waiver
                </p>
              </div>

              {(scope === 'branch' || scope === 'path') && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {scope === 'branch' ? 'Branch Name' : 'Path Pattern'} *
                  </label>
                  <input
                    type="text"
                    value={scopeValue}
                    onChange={(e) => setScopeValue(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={scope === 'branch' ? 'main' : 'src/**/*.ts'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Explain why this waiver is needed..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for permanent waiver
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/dashboard/waivers">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Waiver'}
            </Button>
          </div>
        </form>
      </motion.div>
    </Container>
  )
}
