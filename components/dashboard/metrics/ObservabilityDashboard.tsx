'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Zap, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

interface HealthMetric {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  value: number | string
  unit?: string
  threshold?: { warning: number; critical: number }
}

interface ObservabilityData {
  timestamp: Date
  systemHealth: HealthMetric[]
  queueDepth: number
  workerLatency: number
  errorRate: number
  llmCosts: number
  requestsPerSecond: number
}

interface ObservabilityDashboardProps {
  compact?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ObservabilityDashboard({
  compact = false,
  autoRefresh = true,
  refreshInterval = 30000,
}: ObservabilityDashboardProps) {
  const [data, setData] = useState<ObservabilityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()

    if (!autoRefresh) return

    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  async function fetchMetrics() {
    try {
      const response = await fetch('/api/v1/observability/metrics')
      if (response.ok) {
        const metrics = await response.json()
        setData(metrics)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading observability metrics...</div>
  }

  if (!data) {
    return <div className="text-center py-8">Unable to load metrics</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      case 'unhealthy':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4" />
      case 'degraded':
        return <AlertCircle className="h-4 w-4" />
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-gray-50 rounded text-center">
              <p className="text-xs text-muted-foreground">Queue Depth</p>
              <p className="text-lg font-bold">{data.queueDepth}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded text-center">
              <p className="text-xs text-muted-foreground">Error Rate</p>
              <p className="text-lg font-bold">{data.errorRate.toFixed(2)}%</p>
            </div>
            <div className="p-2 bg-gray-50 rounded text-center">
              <p className="text-xs text-muted-foreground">Latency</p>
              <p className="text-lg font-bold">{data.workerLatency}ms</p>
            </div>
            <div className="p-2 bg-gray-50 rounded text-center">
              <p className="text-xs text-muted-foreground">RPS</p>
              <p className="text-lg font-bold">{data.requestsPerSecond}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.systemHealth.map((metric, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{metric.name}</p>
                  <Badge className={getStatusColor(metric.status)}>
                    {getStatusIcon(metric.status)}
                    <span className="ml-1">{metric.status}</span>
                  </Badge>
                </div>
                <p className="text-2xl font-bold">
                  {metric.value}
                  {metric.unit && <span className="text-sm ml-1">{metric.unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Queue Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{data.queueDepth}</p>
              <p className="text-sm text-muted-foreground mt-2">jobs queued</p>
              {data.queueDepth > 100 && (
                <p className="text-xs text-orange-600 mt-2">High queue depth detected</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Worker Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{data.workerLatency}</p>
              <p className="text-sm text-muted-foreground mt-2">milliseconds (p95)</p>
              {data.workerLatency > 500 && (
                <p className="text-xs text-orange-600 mt-2">High latency warning</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-red-600">{data.errorRate.toFixed(2)}%</p>
              <p className="text-sm text-muted-foreground mt-2">last 24 hours</p>
              {data.errorRate > 5 && (
                <p className="text-xs text-red-600 mt-2">High error rate!</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Requests/Second
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{data.requestsPerSecond}</p>
              <p className="text-sm text-muted-foreground mt-2">current throughput</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LLM Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Current LLM Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-4xl font-bold text-purple-600">${data.llmCosts.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-2">this month</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
