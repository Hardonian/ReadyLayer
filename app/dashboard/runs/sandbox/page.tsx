'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  ErrorState,
  Skeleton,
  Button,
} from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { PlayCircle, ArrowRight, CheckCircle2 } from 'lucide-react'

interface SandboxRunResult {
  id: string
  correlationId: string
  status: string
  sandboxId: string
}

export default function SandboxRunPage() {
  const router = useRouter()
  const [run, setRun] = useState<SandboxRunResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const triggerSandboxRun = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/runs/sandbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(60000), // 60s timeout
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(errorData.error?.message || 'Failed to trigger sandbox run')
      }

      const data = (await response.json()) as { data?: SandboxRunResult }
      setRun(data.data || null)
      
      // Redirect to run details after a short delay
      if (data.data?.id) {
        setTimeout(() => {
          router.push(`/dashboard/runs/${data.data.id}`)
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger sandbox run')
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Sandbox Demo</h1>
          <p className="text-muted-foreground">
            Try ReadyLayer with a sample repository. No GitHub connection required.
          </p>
        </div>

        {/* Demo Card */}
        <Card>
          <CardHeader>
            <CardTitle>ReadyLayer Pipeline Demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                This demo will run the complete ReadyLayer pipeline on sample code:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Review Guard:</strong> Static analysis and AI-powered security checks</li>
                <li><strong>Test Engine:</strong> AI-touched file detection and test generation</li>
                <li><strong>Doc Sync:</strong> Documentation drift detection</li>
              </ul>
            </div>

            {loading && !run && (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="text-center text-muted-foreground">
                  Running pipeline... This may take a minute.
                </div>
              </div>
            )}

            {error && (
              <ErrorState
                message={error}
                action={{
                  label: 'Try Again',
                  onClick: triggerSandboxRun,
                }}
              />
            )}

            {run && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div className="flex-1">
                    <div className="font-semibold">Run started successfully!</div>
                    <div className="text-sm text-muted-foreground">
                      Correlation ID: {run.correlationId}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => router.push(`/dashboard/runs/${run.id}`)}
                  className="w-full"
                >
                  View Run Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {!loading && !run && !error && (
              <Button
                onClick={triggerSandboxRun}
                className="w-full"
                size="lg"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Start Sandbox Demo
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
