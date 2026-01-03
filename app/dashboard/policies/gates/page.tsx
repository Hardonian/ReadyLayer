'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { Shield, AlertTriangle, CheckCircle2, XCircle, Plus } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'

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
  const [gates, setGates] = useState<PolicyGate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchGates() {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        const response = await fetch('/api/v1/policies/gates', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(getApiErrorMessage(errorData))
        }

        const data = await response.json()
        setGates(data.gates || [])
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policy gates')
        setLoading(false)
      }
    }

    fetchGates()
  }, [])

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-4">
          <div className="h-10 w-64 bg-surface-muted rounded animate-pulse" />
          <div className="h-96 bg-surface-muted rounded animate-pulse" />
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-8">
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
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
          <Button onClick={() => setShowCreateModal(true)}>
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
                Policy gates are currently implemented via Policy Packs. Use the{' '}
                <a href="/dashboard/policies" className="text-primary hover:underline">
                  Policy Packs
                </a>{' '}
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
                  <Button variant="outline" size="sm" className="w-full">
                    Configure Gate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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
