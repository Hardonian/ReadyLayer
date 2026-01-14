'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface LLMCostAnalytics {
  totalCost: number
  averageDailyCost: number
  costByModel: Record<string, number>
  costTrends: Array<{ date: string; cost: number }>
  projectedMonthlyTotal: number
  costComparison: {
    previousMonth: number
    changePercent: number
  }
}

export default function LLMCostsAnalyticsPage() {
  const [data, setData] = useState<LLMCostAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCostAnalytics()
  }, [])

  async function fetchCostAnalytics() {
    try {
      const response = await fetch('/api/v1/analytics/llm-costs')
      if (response.ok) {
        const analytics = await response.json()
        setData(analytics)
      }
    } catch (error) {
      console.error('Failed to fetch cost analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading LLM cost analytics...</div>
  }

  if (!data) {
    return <div className="p-8">Unable to load analytics data</div>
  }

  const changeColor = data.costComparison.changePercent > 0 ? 'text-red-600' : 'text-green-600'
  const changeIcon = data.costComparison.changePercent > 0 ? <TrendingUp /> : <TrendingDown />

  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">LLM Cost Analytics</h1>
        <p className="text-muted-foreground">
          Analyze your AI model usage and spending patterns
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">month-to-date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.averageDailyCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Monthly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.projectedMonthlyTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">estimated total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              vs Last Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${changeColor}`}>
              {changeIcon}
              {Math.abs(data.costComparison.changePercent).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">month over month</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown by Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Breakdown by Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.costByModel)
              .sort(([, a], [, b]) => b - a)
              .map(([model, cost]) => {
                const percentage = (cost / data.totalCost) * 100
                return (
                  <div key={model}>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="font-medium text-sm">{model}</p>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}% of total
                        </p>
                      </div>
                      <Badge variant="outline">${cost.toFixed(2)}</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Cost Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Cost Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {data.costTrends.length > 0 ? (
            <div className="space-y-2">
              {data.costTrends.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
                  <span className="font-medium">${entry.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No cost data available yet</p>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">Top Model:</span> The most expensive model is{' '}
              <span className="font-mono">
                {Object.entries(data.costByModel).sort(([, a], [, b]) => b - a)[0]?.[0]}
              </span>
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">Optimization:</span> Consider using cheaper models for
              lower-complexity tasks to reduce costs.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
