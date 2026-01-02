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
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { 
  Shield, 
  ArrowLeft,
  Save,
  Code,
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
}

export default function EditPolicyPage() {
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const packId = params.packId as string

  const [policy, setPolicy] = useState<PolicyPack | null>(null)
  const [version, setVersion] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
        setVersion(data.version)
        setSource(data.source)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setSaving(false)
        return
      }

      const response = await fetch(`/api/v1/policies/${packId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version,
          source,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Failed to update policy')
      }

      toast({
        title: 'Success',
        description: 'Policy pack updated successfully',
      })

      router.push(`/dashboard/policies/${packId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy')
      setSaving(false)
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
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/policies/${packId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Edit Policy Pack</h1>
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
                <CardTitle>Policy Source</CardTitle>
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
                  Policy source in JSON format
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href={`/dashboard/policies/${packId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </motion.div>
    </Container>
  )
}
