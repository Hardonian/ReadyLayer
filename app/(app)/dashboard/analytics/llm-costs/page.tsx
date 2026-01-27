'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const costsByModel = [
  { model: 'GPT-4', cost: 142.50 },
  { model: 'GPT-3.5', cost: 48.30 },
  { model: 'Embeddings', cost: 16.20 },
  { model: 'Other', cost: 5.00 },
]

const costsByDay = [
  { date: 'Day 1', cost: 24 },
  { date: 'Day 2', cost: 19 },
  { date: 'Day 3', cost: 28 },
  { date: 'Day 4', cost: 31 },
  { date: 'Day 5', cost: 26 },
  { date: 'Day 6', cost: 35 },
  { date: 'Day 7', cost: 44 },
]

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981']

export default function LLMCostsPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LLM Spending</h1>
        <p className="text-muted-foreground mt-2">
          Track LLM costs by model and usage patterns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total LLM Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground mt-1">
              ↑ 12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">847.2k</div>
            <p className="text-xs text-muted-foreground mt-1">
              Input + output tokens this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Call</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0.073</div>
            <p className="text-xs text-muted-foreground mt-1">
              ↓ 3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Spending Trend</CardTitle>
          <CardDescription>
            LLM costs over the past 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cost" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
            <CardDescription>
              Spending breakdown by LLM model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costsByModel}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) =>
                    `${(entry as unknown as { model?: string; cost?: number }).model ?? 'Unknown'}: $${(entry as unknown as { model?: string; cost?: number }).cost ?? 0}`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost"
                >
                  {costsByModel.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Efficiency</CardTitle>
            <CardDescription>
              Tokens per dollar by model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">GPT-4</span>
              <span className="font-medium">2,845 tokens/$</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">GPT-3.5</span>
              <span className="font-medium">18,923 tokens/$</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Embeddings</span>
              <span className="font-medium">50,000+ tokens/$</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
