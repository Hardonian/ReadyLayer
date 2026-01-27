'use client'

import { ObservabilityDashboard } from '@/components/dashboard/metrics/ObservabilityDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertTriangle } from 'lucide-react'

export default function HealthPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground mt-2">
          Monitor queue depth, worker latency, and error rates
        </p>
      </div>

      <ObservabilityDashboard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Services Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>API Server</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Worker Nodes</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Database</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Cache Layer</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                Healthy
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="font-medium">High queue depth detected</p>
              <p className="text-xs text-muted-foreground">
                42 jobs pending - scaling workers
              </p>
            </div>
            <div className="text-sm p-2 bg-green-50 border border-green-200 rounded">
              <p className="font-medium">Error rate normalized</p>
              <p className="text-xs text-muted-foreground">
                Returned to healthy levels
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>
            Key performance indicators over the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">P95 Latency</p>
              <p className="text-2xl font-bold">145ms</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Throughput</p>
              <p className="text-2xl font-bold">1.2k/s</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPU Usage</p>
              <p className="text-2xl font-bold">42%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Memory</p>
              <p className="text-2xl font-bold">68%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
