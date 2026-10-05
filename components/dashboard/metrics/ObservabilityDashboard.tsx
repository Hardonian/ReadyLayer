'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, TrendingUp, Activity, Zap, Loader2 } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'

export interface MetricData {
  label: string
  value: number
  unit: string
  trend?: number
  status?: 'healthy' | 'warning' | 'critical'
}

export interface ObservabilityDashboardProps {
  organizationId?: string
  refreshInterval?: number
}

interface ReadinessMetricsResponse {
  data?: {
    metrics?: {
      totalRuns: number
      gatePassRate: number | null
      blockedRuns: number
      meanRunDurationMinutes: number | null
    }
  }
  error?: unknown
}

export function ObservabilityDashboard({
  organizationId,
  refreshInterval = 30000,
}: ObservabilityDashboardProps): React.JSX.Element {
  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async (): Promise<void> => {
    if (!organizationId) {
      setMetrics([])
      setLoading(false)
      return
    }

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session has expired. Sign in again to view telemetry.')

      const response = await fetch(`/api/v1/metrics?organizationId=${encodeURIComponent(organizationId)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'x-organization-id': organizationId,
        },
      })
      const payload = (await response.json().catch(() => ({}))) as ReadinessMetricsResponse
      if (!response.ok) throw new Error('Readiness telemetry is temporarily unavailable.')

      const readiness = payload.data?.metrics
      if (!readiness) throw new Error('No readiness telemetry is available yet.')

      setMetrics([
        { label: 'Governed Runs', value: readiness.totalRuns, unit: '', status: 'healthy' },
        {
          label: 'Gate Pass Rate',
          value: readiness.gatePassRate === null ? 0 : Number((readiness.gatePassRate * 100).toFixed(1)),
          unit: '%',
          status: readiness.gatePassRate !== null && readiness.gatePassRate < 0.8 ? 'warning' : 'healthy',
        },
        { label: 'Blocked Runs', value: readiness.blockedRuns, unit: '', status: readiness.blockedRuns > 0 ? 'warning' : 'healthy' },
        {
          label: 'Mean Run Time',
          value: readiness.meanRunDurationMinutes ?? 0,
          unit: 'm',
          status: 'healthy',
        },
      ])
      setError(null)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load readiness telemetry.')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void fetchMetrics()
    const interval = setInterval(() => {
      void fetchMetrics()
    }, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchMetrics, refreshInterval])

  const getIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'queue depth':
        return <Activity className="h-5 w-5" />
      case 'worker latency':
        return <Zap className="h-5 w-5" />
      case 'error rate':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <TrendingUp className="h-5 w-5" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-50'
      case 'warning':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-green-600 bg-green-50'
    }
  }

  return (
    <>
      {error && <p className="mb-4 text-sm text-muted-foreground" role="status">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading readiness telemetry...</div>
      ) : metrics.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Activity className="h-4 w-4" /> Connect a repository to see readiness telemetry.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className={getStatusColor(metric.status)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getIcon(metric.label)}
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.value}{metric.unit || ''}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
