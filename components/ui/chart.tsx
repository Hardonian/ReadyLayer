'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Chart Primitives
 *
 * Simple, accessible chart components for metrics visualization.
 * Built with semantic HTML and ARIA attributes.
 *
 * NOTE: For production charts with advanced features (tooltips, zooming, etc.),
 * consider integrating a library like recharts or visx.
 *
 * These primitives are suitable for simple dashboards and metrics cards.
 */

/**
 * Chart Container
 */
interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  title?: string
}

export function ChartContainer({
  children,
  title,
  className,
  ...props
}: ChartContainerProps): React.JSX.Element {
  return (
    <div
      className={cn('w-full h-full flex flex-col', className)}
      role="img"
      aria-label={title}
      {...props}
    >
      {title && (
        <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      )}
      {children}
    </div>
  )
}

/**
 * Linear Progress/Bar Chart
 * Displays a horizontal bar representing a value within a range
 */
interface LinearProgressProps {
  value: number
  max?: number
  label?: string
  unit?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
}

export function LinearProgress({
  value,
  max = 100,
  label,
  unit = '%',
  variant = 'default',
  showLabel = true,
}: LinearProgressProps): React.JSX.Element {
  const percentage = Math.min((value / max) * 100, 100)

  const variantClasses = {
    default: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{label || 'Progress'}</span>
          <span className="font-medium">
            {value}
            {unit}
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', variantClasses[variant])}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
        />
      </div>
    </div>
  )
}

/**
 * Simple Bar Chart
 * Displays multiple bars for comparison
 */
interface BarChartData {
  label: string
  value: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

interface BarChartProps {
  data: BarChartData[]
  max?: number
  height?: 'sm' | 'md' | 'lg'
  showValues?: boolean
}

export function BarChart({
  data,
  max,
  height = 'md',
  showValues = true,
}: BarChartProps): React.JSX.Element {
  // Calculate max if not provided
  const calculatedMax = max || Math.max(...data.map(d => d.value), 100)

  const heightClasses = {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
  }

  const variantClasses = {
    default: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }

  return (
    <div className={cn('w-full flex flex-col justify-end gap-4', heightClasses[height])}>
      <div className="flex items-end justify-around gap-2 h-full" role="img" aria-label="Bar chart">
        {data.map((item, index) => {
          const percentage = (item.value / calculatedMax) * 100

          return (
            <div key={index} className="flex flex-col items-center flex-1 gap-2">
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    variantClasses[item.variant || 'default']
                  )}
                  style={{ height: `${percentage}%` }}
                  role="bar"
                  aria-valuenow={item.value}
                  aria-valuemin={0}
                  aria-valuemax={calculatedMax}
                  title={`${item.label}: ${item.value}`}
                />
              </div>

              {showValues && (
                <div className="text-xs font-medium text-text-primary">{item.value}</div>
              )}

              <div className="text-xs text-text-secondary text-center w-full truncate">
                {item.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Donut/Pie Chart (Simple SVG-based)
 * Displays distribution of values
 */
interface DonutChartData {
  label: string
  value: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

interface DonutChartProps {
  data: DonutChartData[]
  size?: 'sm' | 'md' | 'lg'
  showLegend?: boolean
}

export function DonutChart({
  data,
  size = 'md',
  showLegend = true,
}: DonutChartProps): React.JSX.Element {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const sizeMap = {
    sm: { width: 120, height: 120 },
    md: { width: 200, height: 200 },
    lg: { width: 280, height: 280 },
  }

  const { width, height } = sizeMap[size]
  const radius = Math.min(width, height) / 2 - 10
  const cx = width / 2
  const cy = height / 2

  /**
   * Chart color palette - intentionally hardcoded for data visualization
   * These are DATA colors representing semantic meaning in charts:
   * - default: Primary data series (indigo)
   * - success: Positive trends/outcomes (emerald)
   * - warning: Cautionary signals (amber)
   * - danger: Negative signals (red)
   * See: docs/DESIGN_TOKENS.md
   */
  const colorMap = {
    default: '#4F46E5',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  }

  let currentAngle = -90

  const paths = data.map((item) => {
    const sliceAngle = (item.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle

    const x1 = cx + radius * Math.cos((startAngle * Math.PI) / 180)
    const y1 = cy + radius * Math.sin((startAngle * Math.PI) / 180)
    const x2 = cx + radius * Math.cos((endAngle * Math.PI) / 180)
    const y2 = cy + radius * Math.sin((endAngle * Math.PI) / 180)

    const largeArc = sliceAngle > 180 ? 1 : 0

    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ')

    currentAngle = endAngle

    return { pathData, color: colorMap[item.variant || 'default'], item }
  })

  return (
    <div className="flex flex-col items-center gap-6">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Donut chart">
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.pathData}
            fill={path.color}
            stroke="white"
            strokeWidth={2}
          />
        ))}
      </svg>

      {showLegend && (
        <div className="flex flex-wrap gap-3 justify-center">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colorMap[item.variant || 'default'] }}
              />
              <span className="text-text-secondary">{item.label}</span>
              <span className="font-medium text-text-primary">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Simple Area/Line Chart (text-based)
 * For simple metrics sparklines
 */
interface SparklineData {
  label: string
  value: number
}

interface SparklineProps {
  data: SparklineData[]
  height?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showLabels?: boolean
}

export function Sparkline({
  data,
  height = 40,
  variant = 'default',
  showLabels = false,
}: SparklineProps): React.JSX.Element {
  if (data.length < 2) {
    return <div className="text-text-muted text-xs">Not enough data</div>
  }

  const max = Math.max(...data.map(d => d.value))
  const min = Math.min(...data.map(d => d.value))
  const range = max - min || 1

  const variantClasses = {
    default: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }

  // Simple bar-based sparkline
  return (
    <div className="flex items-end gap-1" role="img" aria-label="Sparkline chart">
      {data.map((item, index) => {
        const normalizedValue = (item.value - min) / range
        const barHeight = normalizedValue * height

        return (
          <div
            key={index}
            className={cn('flex-1 rounded-t', variantClasses[variant])}
            style={{
              height: `${Math.max(barHeight, 2)}px`,
              backgroundColor: 'currentColor',
              opacity: 0.6 + (normalizedValue * 0.4), // Vary opacity
            }}
            title={showLabels ? `${item.label}: ${item.value}` : undefined}
          />
        )
      })}
    </div>
  )
}
