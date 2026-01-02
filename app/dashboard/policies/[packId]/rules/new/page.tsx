'use client'

import { useState } from 'react'
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
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { 
  Shield, 
  ArrowLeft,
  Save,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/lib/hooks/use-toast'

export default function NewRulePage() {
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const packId = params.packId as string

  const [ruleId, setRuleId] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [severityMapping, setSeverityMapping] = useState({
    critical: 'block' as 'block' | 'warn' | 'allow',
    high: 'block' as 'block' | 'warn' | 'allow',
    medium: 'warn' as 'block' | 'warn' | 'allow',
    low: 'allow' as 'block' | 'warn' | 'allow',
  })
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

      const response = await fetch(`/api/v1/policies/${packId}/rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId,
          severityMapping,
          enabled,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to create rule')
      }

      toast({
        title: 'Success',
        description: 'Rule added successfully',
      })

      router.push(`/dashboard/policies/${packId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule')
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
          <Link href={`/dashboard/policies/${packId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Add Policy Rule</h1>
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
              <CardTitle>Rule Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  Unique identifier for this rule (e.g., security.sql-injection)
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Enabled</span>
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Disabled rules are not evaluated
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">
                  Severity Mapping *
                </label>
                <div className="space-y-4">
                  {(['critical', 'high', 'medium', 'low'] as const).map((severity) => (
                    <div key={severity} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm font-medium capitalize">{severity}</span>
                      <select
                        value={severityMapping[severity]}
                        onChange={(e) => setSeverityMapping({
                          ...severityMapping,
                          [severity]: e.target.value as 'block' | 'warn' | 'allow',
                        })}
                        className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="block">Block</option>
                        <option value="warn">Warn</option>
                        <option value="allow">Allow</option>
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Define what action to take for each severity level
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href={`/dashboard/policies/${packId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Adding...' : 'Add Rule'}
            </Button>
          </div>
        </form>
      </motion.div>
    </Container>
  )
}
