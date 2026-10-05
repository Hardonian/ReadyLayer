'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { Shield, AlertTriangle, CheckCircle2, XCircle, Plus } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { useOrganizationId } from '@/lib/hooks/use-organization-id'

interface PolicyGate {
  id: string
  name: string
  template: string
  enforcementMode: 'warn' | 'block'
  exceptions: {
    repos?: string[]
    branches?: string[]
  }
  enabled: boolean
}

const GATE_TEMPLATES = [
  {
    id: 'ai-touched-requires-review',
    name: 'AI-Touched Diffs Require Review',
    description: 'Block merges if AI-touched files are detected without human review',
  },
  {
    id: 'critical-issues-block',
    name: 'Critical Issues Block Merge',
    description: 'Block merges if critical security or quality issues are found',
  },
  {
    id: 'coverage-threshold',
    name: 'Coverage Threshold',
    description: 'Require minimum test coverage for AI-touched files',
  },
  {
    id: 'doc-drift-block',
    name: 'Documentation Drift Blocks Merge',
    description: 'Block merges if documentation drift is detected',
  },
]

export default function PolicyGatesPage() {
  const { organizationId, loading: organizationLoading, error: organizationError } = useOrganizationId()
  const [gates, setGates] = useState<PolicyGate[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [enforcementMode, setEnforcementMode] = useState<'warn' | 'block'>('block')
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchGates() {
      if (!organizationId) {
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

        const response = await fetch(`/api/v1/policies/gates?organizationId=${encodeURIComponent(organizationId)}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'x-organization-id': organizationId,
          },
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>
          throw new Error(getApiErrorMessage(errorData))
        }

        const data = (await response.json()) as { gates?: PolicyGate[] }
        setGates(data.gates || [])
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policy gates')
        setLoading(false)
      }
    }

    void fetchGates()
  }, [organizationId])

  const createGate = async (): Promise<void> => {
    if (!organizationId || !selectedTemplate) return
    setCreating(true)
    setError(null)
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session has expired. Sign in again to configure a gate.')

      const response = await fetch(`/api/v1/policies/gates?organizationId=${encodeURIComponent(organizationId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          organizationId,
          template: selectedTemplate,
          enforcementMode,
          enabled: true,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { gate?: PolicyGate }
        error?: unknown
      }
      if (!response.ok) throw new Error(getApiErrorMessage(payload as Record<string, unknown>))
      if (payload.data?.gate) setGates((current) => [payload.data!.gate!, ...current])
      setSelectedTemplate(null)
      toast({ title: 'Policy gate created', description: 'The gate is now represented in a versioned policy pack.' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy gate')
    } finally {
      setCreating(false)
    }
  }

  if (organizationLoading || loading) {
    return (
      <Container className="py-8">
        <div className="space-y-4">
          <div className="h-10 w-64 bg-surface-muted rounded animate-pulse" />
          <div className="h-96 bg-surface-muted rounded animate-pulse" />
        </div>
      </Container>
    )
  }

  if (error || organizationError) {
    return (
      <Container className="py-8">
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error || organizationError}</span>
            </div>
          </CardContent>
        </Card>
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
            <h1 className="text-3xl font-bold">Policy Gates</h1>
            <p className="text-muted-foreground">
              Configure enforcement rules to block or warn on policy violations
            </p>
          </div>
          <Button onClick={() => setSelectedTemplate(GATE_TEMPLATES[0]?.id || null)} disabled={!organizationId}>
            <Plus className="h-4 w-4 mr-2" />
            Create Gate
          </Button>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>About Policy Gates</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Policy gates enforce rules during ReadyLayer runs. Gates can be set to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Block:</strong> Prevent merges if gate fails</li>
                <li><strong>Warn:</strong> Allow merges but show warnings</li>
              </ul>
              <p className="pt-2">
                Each gate is stored as a versioned Policy Pack rule, so enforcement and audit evidence share one source of truth. Use the{' '}
                <Link href="/dashboard/policies" className="text-primary hover:underline">
                  Policy Packs
                </Link>{' '}
                page to configure enforcement rules.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Gate Templates */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Gate Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GATE_TEMPLATES.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedTemplate(template.id)}>
                    Configure Gate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {selectedTemplate && (
          <Card>
            <CardHeader>
              <CardTitle>Configure {GATE_TEMPLATES.find((template) => template.id === selectedTemplate)?.name}</CardTitle>
              <CardDescription>Choose how this gate behaves when a governed run evaluates it.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-end gap-4">
              <label className="space-y-2 text-sm font-medium">
                <span>Enforcement mode</span>
                <select
                  value={enforcementMode}
                  onChange={(event) => setEnforcementMode(event.target.value as 'warn' | 'block')}
                  className="block h-10 rounded-md border border-border bg-surface px-3 text-sm"
                  disabled={creating}
                >
                  <option value="block">Block merges</option>
                  <option value="warn">Warn only</option>
                </select>
              </label>
              <div className="flex gap-2">
                <Button onClick={() => void createGate()} disabled={creating}>
                  {creating ? 'Creating...' : 'Create gate'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedTemplate(null)} disabled={creating}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Gates */}
        {gates.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Active Gates</h2>
            <div className="space-y-2">
              {gates.map((gate) => (
                <Card key={gate.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{gate.name}</span>
                          {gate.enabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-500/10 text-green-600 rounded">
                              <CheckCircle2 className="h-3 w-3" />
                              Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-gray-500/10 text-gray-600 rounded">
                              <XCircle className="h-3 w-3" />
                              Disabled
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${
                            gate.enforcementMode === 'block'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-yellow-500/10 text-yellow-600'
                          }`}>
                            {gate.enforcementMode === 'block' ? 'Block' : 'Warn'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Template: {gate.template}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </Container>
  )
}
