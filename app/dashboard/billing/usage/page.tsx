'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, TrendingUp, DollarSign, Calendar, AlertTriangle } from 'lucide-react'

interface BillingData {
  monthlySpend: number
  monthlyBudget: number
  percentageUsed: number
  withinBudget: boolean
  status: 'ok' | 'warning' | 'critical'
  costBreakdown: Record<string, number>
  spendingHistory: Array<{ month: string; amount: number }>
}

export default function BillingUsagePage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBillingData()
  }, [])

  async function fetchBillingData() {
    try {
      const response = await fetch('/api/v1/billing/usage')
      if (response.ok) {
        const billingData = await response.json()
        setData(billingData)
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading billing information...</div>
  }

  if (!data) {
    return <div className="p-8">Failed to load billing data</div>
  }

  const statusColor = {
    ok: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  }

  const statusBg = {
    ok: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
  }

  const statusLabel = {
    ok: 'All good',
    warning: 'Budget warning',
    critical: 'Budget critical',
  }

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Billing & Usage</h1>
        <p className="text-muted-foreground">
          Track your AI model usage and monthly costs
        </p>
      </div>

      {/* Budget Status Card */}
      <Card className={`border-2 ${statusBg[data.status]}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data.status === 'critical' ? (
              <AlertTriangle className={`h-5 w-5 ${statusColor[data.status]}`} />
            ) : (
              <DollarSign className={`h-5 w-5 ${statusColor[data.status]}`} />
            )}
            Monthly Budget Status
          </CardTitle>
          <Badge className="w-fit">{statusLabel[data.status]}</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Budget Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Current Usage</span>
              <span className="text-2xl font-bold">
                ${data.monthlySpend.toFixed(2)} <span className="text-base text-muted-foreground">/ ${data.monthlyBudget.toFixed(2)}</span>
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  data.status === 'critical'
                    ? 'bg-red-600'
                    : data.status === 'warning'
                      ? 'bg-yellow-600'
                      : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(data.percentageUsed, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{data.percentageUsed.toFixed(1)}% used</span>
              <span>${(data.monthlyBudget - data.monthlySpend).toFixed(2)} remaining</span>
            </div>
          </div>

          {/* Alert if critical */}
          {data.status === 'critical' && (
            <div className="flex gap-3 p-4 bg-red-100 border border-red-300 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">Budget exceeded</p>
                <p>Additional AI services are paused. Upgrade your plan to continue.</p>
              </div>
            </div>
          )}

          {data.status === 'warning' && (
            <div className="flex gap-3 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold">Budget warning</p>
                <p>You're approaching your monthly limit. Consider upgrading to avoid service interruption.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      {Object.keys(data.costBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cost Breakdown by Model
            </CardTitle>
            <CardDescription>Month-to-date spending by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.costBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([model, cost]) => (
                  <div key={model} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{model}</p>
                      <p className="text-xs text-muted-foreground">
                        {((cost / data.monthlySpend) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                    <span className="font-semibold">${cost.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Spending */}
      {data.spendingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Spending History
            </CardTitle>
            <CardDescription>Monthly spending over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.spendingHistory.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm text-muted-foreground">{entry.month}</span>
                  <span className="font-medium">${entry.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Information */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Monthly AI Budget</p>
              <p className="text-2xl font-bold">${data.monthlyBudget.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Usage This Month</p>
              <p className="text-2xl font-bold">{data.percentageUsed.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
