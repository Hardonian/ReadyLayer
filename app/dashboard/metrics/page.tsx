'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { TrendingUp, Shield, TestTube, FileText, DollarSign } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'

interface Metrics {
  providerMetrics: {
    prCycleTime: number | null
    reviewLatency: number | null
    approvalsCount: number | null
    pipelinePassRate: number | null
  }
  readylayerMetrics: {
    runsPerDay: number
    stageDurationP95: {
      reviewGuard: number
      testEngine: number
    }
    findingCounts: {
      critical: number
      high: number
      medium: number
      low: number
    }
    gateBlockRate: number
    overrideRate: number
    rerunRate: number
    flakyTestRate: number
  }
  proofMetrics: {
    blockedRiskyMerges: number
    docsKeptInSync: number
    testsGenerated: number
    timeToSignal: number
  }
  tokenUsage: {
    totalTokens: number
    totalCost: number
    byService: Record<string, number>
  }
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        const response = await fetch('/api/v1/metrics', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(getApiErrorMessage(errorData))
        }

        const data = await response.json()
        setMetrics(data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics')
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-4">
          <div className="h-10 w-64 bg-surface-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-surface-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Container>
    )
  }

  if (error || !metrics) {
    return (
      <Container className="py-8">
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="text-red-600">{error || 'Failed to load metrics'}</div>
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Metrics</h1>
          <p className="text-muted-foreground">
            View ReadyLayer performance and usage metrics
          </p>
        </div>

        {/* Proof Metrics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Proof Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Blocked Risky Merges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.proofMetrics.blockedRiskyMerges}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Docs Kept In Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.proofMetrics.docsKeptInSync}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Tests Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.proofMetrics.testsGenerated}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Time to Signal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.proofMetrics.timeToSignal}ms</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ReadyLayer Metrics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">ReadyLayer Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Runs Per Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.readylayerMetrics.runsPerDay}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Gate Block Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.readylayerMetrics.gateBlockRate}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Review Guard P95</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(metrics.readylayerMetrics.stageDurationP95.reviewGuard / 1000)}s
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Test Engine P95</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(metrics.readylayerMetrics.stageDurationP95.testEngine / 1000)}s
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Finding Counts */}
        <Card>
          <CardHeader>
            <CardTitle>Finding Counts by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Critical</div>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.readylayerMetrics.findingCounts.critical}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">High</div>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.readylayerMetrics.findingCounts.high}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Medium</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.readylayerMetrics.findingCounts.medium}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Low</div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.readylayerMetrics.findingCounts.low}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Token Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Tokens</div>
                <div className="text-2xl font-bold">{metrics.tokenUsage.totalTokens.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-2xl font-bold">${metrics.tokenUsage.totalCost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">By Service</div>
                <div className="space-y-2">
                  {Object.entries(metrics.tokenUsage.byService).map(([service, tokens]) => (
                    <div key={service} className="flex justify-between">
                      <span className="capitalize">{service}</span>
                      <span className="font-medium">{tokens.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
