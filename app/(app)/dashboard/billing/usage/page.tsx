'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const chartData = [
  { date: 'Jan 1', cost: 24 },
  { date: 'Jan 8', cost: 42 },
  { date: 'Jan 15', cost: 38 },
  { date: 'Jan 22', cost: 55 },
  { date: 'Jan 29', cost: 48 },
]

export default function BillingUsagePage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your LLM spending and usage trends
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$207.00</div>
            <p className="text-xs text-muted-foreground mt-1">
              ↑ 8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$1,000.00</div>
            <p className="text-xs text-muted-foreground mt-1">
              20.7% of budget used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$6.90</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on current month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
          <CardDescription>
            Daily LLM spending over the past 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Breakdown</CardTitle>
          <CardDescription>
            Cost by LLM provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">OpenAI (GPT-4)</span>
              <span className="font-medium">$142.50 (68.8%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">OpenAI (GPT-3.5)</span>
              <span className="font-medium">$48.30 (23.3%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Embeddings</span>
              <span className="font-medium">$16.20 (7.8%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
