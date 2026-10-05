'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Shield, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { PolicyBuilder, type PolicyRule } from '@/components/admin/PolicyBuilder'
import { createSupabaseClient } from '@/lib/supabase/client'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { useOrganizationId } from '@/lib/hooks/use-organization-id'
import { useToast } from '@/lib/hooks/use-toast'

interface PolicySummary {
  id: string
  version: string
  checksum: string
  rules: Array<{ id: string; ruleId: string; enabled: boolean }>
  source: string
  createdAt: string
}

interface PoliciesResponse {
  policies?: PolicySummary[]
  error?: unknown
}

function getPolicyName(source: string, id: string): string {
  try {
    const parsed = JSON.parse(source) as { name?: unknown }
    return typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : `Policy pack ${id.slice(0, 8)}`
  } catch {
    return `Policy pack ${id.slice(0, 8)}`
  }
}

export default function PoliciesPage(): React.JSX.Element {
  const { toast } = useToast()
  const { organizationId, loading: organizationLoading, error: organizationError } = useOrganizationId()
  const [policies, setPolicies] = useState<PolicySummary[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPolicies = useCallback(async (): Promise<void> => {
    if (!organizationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session has expired. Sign in again to continue.')
      const response = await fetch(`/api/v1/policies?organizationId=${encodeURIComponent(organizationId)}&limit=50`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'x-organization-id': organizationId,
        },
      })
      const payload = (await response.json().catch(() => ({}))) as PoliciesResponse
      if (!response.ok) throw new Error(getApiErrorMessage(payload as Record<string, unknown>))
      setPolicies(payload.policies ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void loadPolicies()
  }, [loadPolicies])

  const handleSave = async (policy: { name: string; rules: PolicyRule[] }): Promise<void> => {
    if (!organizationId) return
    setSaving(true)
    setError(null)
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session has expired. Sign in again to continue.')

      const version = `1.0.${policies.length + 1}`
      const source = JSON.stringify({
        name: policy.name.trim(),
        version,
        rules: policy.rules,
      }, null, 2)
      const response = await fetch(`/api/v1/policies?organizationId=${encodeURIComponent(organizationId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          organizationId,
          version,
          source,
          rules: policy.rules.map((rule) => ({
            ruleId: rule.name,
            severityMapping: { [rule.severity]: 'block' },
            enabled: rule.enabled,
          })),
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) throw new Error(getApiErrorMessage(payload))
      toast({ title: 'Policy pack created', description: `${policy.name} is now available to your organization.` })
      setShowBuilder(false)
      await loadPolicies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy pack')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Security Policies</h1>
          </div>
          <p className="text-muted-foreground mt-2">Versioned, checksum-backed controls that keep every decision reviewable.</p>
        </div>
        <Button onClick={() => setShowBuilder((visible) => !visible)} disabled={!organizationId || saving} className="gap-2">
          <Plus className="h-4 w-4" />
          {showBuilder ? 'Close builder' : 'Create policy'}
        </Button>
      </div>

      {(organizationError || error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{organizationError || error}</AlertDescription>
        </Alert>
      )}

      {showBuilder && organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>Create a policy pack</CardTitle>
            <CardDescription>Start with the controls that matter to your team. The pack is stored with a deterministic checksum.</CardDescription>
          </CardHeader>
          <CardContent>
            {saving ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Saving policy pack...</div>
            ) : (
              <PolicyBuilder onSave={(policy) => void handleSave(policy)} onCancel={() => setShowBuilder(false)} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization policy packs</CardTitle>
          <CardDescription>{policies.length} pack{policies.length === 1 ? '' : 's'} configured</CardDescription>
        </CardHeader>
        <CardContent>
          {organizationLoading || loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading policy packs...</div>
          ) : policies.length === 0 ? (
            <div className="text-center py-10">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No policy packs yet. Create one to turn your governance intent into an enforceable contract.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {policies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{getPolicyName(policy.source, policy.id)}</p>
                    <p className="text-sm text-muted-foreground">v{policy.version} · {policy.rules.length} rule{policy.rules.length === 1 ? '' : 's'} · checksum {policy.checksum.slice(0, 10)}...</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0 gap-2">
                    <Link href={`/dashboard/policies/${policy.id}`}><ExternalLink className="h-3.5 w-3.5" /> View</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
