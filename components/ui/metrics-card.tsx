'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface MetricsCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    label: string
    trend: 'up' | 'down' | 'neutral'
  }
  icon?: LucideIcon
  description?: string
  className?: string
  glass?: boolean
}

export function MetricsCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  className,
  glass = true,
}: MetricsCardProps) {
  const trendColor = change?.trend === 'up' 
    ? 'text-success' 
    : change?.trend === 'down' 
    ? 'text-destructive' 
    : 'text-text-muted'

  return (
    <Card className={cn(
      glass && 'glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-text-muted">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-text-muted" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-3xl font-bold text-text-primary">{value}</div>
          {change && (
            <div className={cn('text-xs font-medium', trendColor)}>
              {change.trend === 'up' && '↑'} 
              {change.trend === 'down' && '↓'} 
              {change.value > 0 && '+'}
              {change.value}% {change.label}
            </div>
          )}
          {description && (
            <p className="text-xs text-text-muted mt-2">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ChartCardProps {
  title: string
  children: React.ReactNode
  className?: string
  glass?: boolean
}

export function ChartCard({ title, children, className, glass = true }: ChartCardProps) {
  return (
    <Card className={cn(
      glass && 'glass-strong backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50',
      className
    )}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
