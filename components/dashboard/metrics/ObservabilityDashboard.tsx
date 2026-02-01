'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, TrendingUp, Activity, Zap } from 'lucide-react'

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

export function ObservabilityDashboard({
  organizationId,
  refreshInterval = 30000,
}: ObservabilityDashboardProps): React.JSX.Element {
  const [metrics] = useState<MetricData[]>([
    { label: 'Queue Depth', value: 42, unit: 'jobs', trend: 5, status: 'healthy' },
    { label: 'Worker Latency', value: 285, unit: 'ms', trend: -12, status: 'healthy' },
    { label: 'Error Rate', value: 0.3, unit: '%', trend: 0, status: 'healthy' },
    { label: 'Uptime', value: 99.98, unit: '%', trend: 0, status: 'healthy' },
  ])

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // TODO: Fetch actual metrics from /api/v1/metrics
        // const response = await fetch(`/api/v1/metrics?organizationId=${organizationId}`)
        // const data = await response.json()
        // setMetrics(data.metrics)
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [organizationId, refreshInterval])

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
              {metric.value}{metric.unit ? metric.unit : ''}
            </div>
            {metric.trend !== undefined && (
              <p className={`text-xs ${metric.trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metric.trend >= 0 ? '↑' : '↓'} {Math.abs(metric.trend)}% from last hour
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
