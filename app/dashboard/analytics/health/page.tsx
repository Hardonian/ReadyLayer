'use client'

import { ObservabilityDashboard } from '@/components/dashboard/metrics/ObservabilityDashboard'

export default function HealthAnalyticsPage() {
  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">System Health</h1>
        <p className="text-muted-foreground">
          Monitor your ReadyLayer infrastructure health, performance, and stability
        </p>
      </div>

      <ObservabilityDashboard autoRefresh={true} refreshInterval={15000} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Health Checks</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              Database connectivity
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              Redis cache
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              LLM API integration
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              Webhook processing
            </li>
          </ul>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Performance Targets</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>API Response Time (p95)</span>
              <span className="font-mono text-green-600">&lt;500ms</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Worker Latency (p95)</span>
              <span className="font-mono text-green-600">&lt;2s</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Error Rate</span>
              <span className="font-mono text-green-600">&lt;1%</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Webhook Delivery</span>
              <span className="font-mono text-green-600">99.5%</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
