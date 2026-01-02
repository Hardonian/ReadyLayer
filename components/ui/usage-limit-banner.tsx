'use client'

import * as React from 'react'
import { Card, CardContent } from './card'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from './button'

export interface UsageStats {
  llmTokens: {
    daily: number
    monthly: number
    limits: { daily: number; monthly: number }
  }
  runs: { today: number; limit: number }
  concurrentJobs: { current: number; limit: number }
  budget: { current: number; limit: number; remaining: number }
}

interface UsageLimitBannerProps {
  stats: UsageStats
  organizationId: string
  className?: string
}

export function UsageLimitBanner({ stats, organizationId: _organizationId, className }: UsageLimitBannerProps) {
  const warnings: Array<{
    type: 'warning' | 'error'
    message: string
    limitType: string
    current: number
    limit: number
    percentage: number
  }> = []

  // Check LLM token daily limit (warn at 80%)
  const dailyTokenPercentage = stats.llmTokens.limits.daily > 0
    ? (stats.llmTokens.daily / stats.llmTokens.limits.daily) * 100
    : 0
  if (stats.llmTokens.limits.daily > 0 && dailyTokenPercentage >= 80) {
    warnings.push({
      type: dailyTokenPercentage >= 100 ? 'error' : 'warning',
      message: `Daily LLM token limit: ${stats.llmTokens.daily.toLocaleString()} / ${stats.llmTokens.limits.daily.toLocaleString()}`,
      limitType: 'llm_tokens_daily',
      current: stats.llmTokens.daily,
      limit: stats.llmTokens.limits.daily,
      percentage: dailyTokenPercentage,
    })
  }

  // Check LLM token monthly limit (warn at 80%)
  const monthlyTokenPercentage = stats.llmTokens.limits.monthly > 0
    ? (stats.llmTokens.monthly / stats.llmTokens.limits.monthly) * 100
    : 0
  if (stats.llmTokens.limits.monthly > 0 && monthlyTokenPercentage >= 80) {
    warnings.push({
      type: monthlyTokenPercentage >= 100 ? 'error' : 'warning',
      message: `Monthly LLM token limit: ${stats.llmTokens.monthly.toLocaleString()} / ${stats.llmTokens.limits.monthly.toLocaleString()}`,
      limitType: 'llm_tokens_monthly',
      current: stats.llmTokens.monthly,
      limit: stats.llmTokens.limits.monthly,
      percentage: monthlyTokenPercentage,
    })
  }

  // Check budget limit (warn at 80%)
  const budgetPercentage = stats.budget.limit > 0
    ? (stats.budget.current / stats.budget.limit) * 100
    : 0
  if (stats.budget.limit > 0 && budgetPercentage >= 80) {
    warnings.push({
      type: budgetPercentage >= 100 ? 'error' : 'warning',
      message: `LLM budget: $${stats.budget.current.toFixed(2)} / $${stats.budget.limit.toFixed(2)}`,
      limitType: 'llm_budget',
      current: stats.budget.current,
      limit: stats.budget.limit,
      percentage: budgetPercentage,
    })
  }

  // Check runs limit (warn at 80%)
  const runsPercentage = stats.runs.limit > 0
    ? (stats.runs.today / stats.runs.limit) * 100
    : 0
  if (stats.runs.limit > 0 && runsPercentage >= 80) {
    warnings.push({
      type: runsPercentage >= 100 ? 'error' : 'warning',
      message: `Daily runs: ${stats.runs.today} / ${stats.runs.limit}`,
      limitType: 'runs_daily',
      current: stats.runs.today,
      limit: stats.runs.limit,
      percentage: runsPercentage,
    })
  }

  // Check concurrent jobs limit (warn at 80%)
  const concurrentPercentage = stats.concurrentJobs.limit > 0
    ? (stats.concurrentJobs.current / stats.concurrentJobs.limit) * 100
    : 0
  if (stats.concurrentJobs.limit > 0 && concurrentPercentage >= 80) {
    warnings.push({
      type: concurrentPercentage >= 100 ? 'error' : 'warning',
      message: `Concurrent jobs: ${stats.concurrentJobs.current} / ${stats.concurrentJobs.limit}`,
      limitType: 'concurrent_jobs',
      current: stats.concurrentJobs.current,
      limit: stats.concurrentJobs.limit,
      percentage: concurrentPercentage,
    })
  }

  if (warnings.length === 0) {
    return null
  }

  const criticalWarnings = warnings.filter((w) => w.type === 'error')
  const hasCritical = criticalWarnings.length > 0

  return (
    <Card
      className={cn(
        'border-2',
        hasCritical
          ? 'border-destructive bg-destructive/5'
          : 'border-warning bg-warning/5',
        className
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={cn(
              'h-5 w-5 mt-0.5',
              hasCritical ? 'text-destructive' : 'text-warning'
            )}
          />
          <div className="flex-1">
            <div className="font-semibold mb-2">
              {hasCritical ? 'Usage Limits Exceeded' : 'Usage Limits Approaching'}
            </div>
            <div className="space-y-2 mb-4">
              {warnings.map((warning, idx) => (
                <div key={idx} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span>{warning.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {warning.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-muted rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        warning.type === 'error'
                          ? 'bg-destructive'
                          : 'bg-warning'
                      )}
                      style={{ width: `${Math.min(warning.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant={hasCritical ? 'destructive' : 'default'}>
                <Link href="/dashboard/billing">Upgrade Plan</Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                {hasCritical
                  ? 'Some features may be unavailable until limits reset or you upgrade.'
                  : 'Consider upgrading to avoid interruptions.'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
