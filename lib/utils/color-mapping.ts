/**
 * Color Mapping Utilities
 * Maps status/severity to semantic color tokens for consistent theming
 * Ensures dark mode compatibility and WCAG compliance
 */

export type SeverityLevel = 'critical' | 'high' | 'warn' | 'medium' | 'low' | 'info'
export type StatusType = 'success' | 'failed' | 'running' | 'pending' | 'blocked' | 'passed' | 'warning'
export type DifficultyLevel = 'easy' | 'intermediate' | 'hard'
export type ImpactLevel = 'high' | 'medium' | 'low'

/**
 * Get semantic color classes for severity levels
 * Maps: critical→danger, high→warning, medium→info, low→info
 */
export function getSeverityColor(severity: SeverityLevel): {
  bg: string
  text: string
  border: string
  icon: string
} {
  const severityMap: Record<
    SeverityLevel,
    { bg: string; text: string; border: string; icon: string }
  > = {
    critical: {
      bg: 'bg-danger-muted',
      text: 'text-danger',
      border: 'border-danger/20',
      icon: 'text-danger',
    },
    high: {
      bg: 'bg-warning-muted',
      text: 'text-warning',
      border: 'border-warning/20',
      icon: 'text-warning',
    },
    warn: {
      bg: 'bg-warning-muted',
      text: 'text-warning',
      border: 'border-warning/20',
      icon: 'text-warning',
    },
    medium: {
      bg: 'bg-info-muted',
      text: 'text-info',
      border: 'border-info/20',
      icon: 'text-info',
    },
    low: {
      bg: 'bg-info-muted',
      text: 'text-info',
      border: 'border-info/20',
      icon: 'text-info',
    },
    info: {
      bg: 'bg-info-muted',
      text: 'text-info',
      border: 'border-info/20',
      icon: 'text-info',
    },
  }

  return severityMap[severity] || severityMap.info
}

/**
 * Get semantic color classes for run/review status
 * Maps: success→success, failed/blocked→danger, running→info, pending→warning
 */
export function getStatusColor(status: StatusType): {
  bg: string
  text: string
  border: string
  icon: string
} {
  const statusMap: Record<StatusType, { bg: string; text: string; border: string; icon: string }> = {
    success: {
      bg: 'bg-success-muted',
      text: 'text-success',
      border: 'border-success/20',
      icon: 'text-success',
    },
    passed: {
      bg: 'bg-success-muted',
      text: 'text-success',
      border: 'border-success/20',
      icon: 'text-success',
    },
    failed: {
      bg: 'bg-danger-muted',
      text: 'text-danger',
      border: 'border-danger/20',
      icon: 'text-danger',
    },
    blocked: {
      bg: 'bg-danger-muted',
      text: 'text-danger',
      border: 'border-danger/20',
      icon: 'text-danger',
    },
    running: {
      bg: 'bg-info-muted',
      text: 'text-info',
      border: 'border-info/20',
      icon: 'text-info',
    },
    pending: {
      bg: 'bg-warning-muted',
      text: 'text-warning',
      border: 'border-warning/20',
      icon: 'text-warning',
    },
    warning: {
      bg: 'bg-warning-muted',
      text: 'text-warning',
      border: 'border-warning/20',
      icon: 'text-warning',
    },
  }

  return statusMap[status] || statusMap.pending
}

/**
 * Get semantic color classes for difficulty level
 * Used in suggestion cards and task difficulty indicators
 */
export function getDifficultyColor(difficulty: DifficultyLevel): {
  bg: string
  text: string
} {
  const difficultyMap: Record<DifficultyLevel, { bg: string; text: string }> = {
    easy: {
      bg: 'bg-success-muted',
      text: 'text-success',
    },
    intermediate: {
      bg: 'bg-warning-muted',
      text: 'text-warning',
    },
    hard: {
      bg: 'bg-danger-muted',
      text: 'text-danger',
    },
  }

  return difficultyMap[difficulty] || difficultyMap.intermediate
}

/**
 * Get semantic color classes for impact level
 * Used in optimization insights and impact indicators
 */
export function getImpactColor(impact: ImpactLevel): {
  bg: string
  text: string
} {
  const impactMap: Record<ImpactLevel, { bg: string; text: string }> = {
    high: {
      bg: 'bg-danger-muted',
      text: 'text-danger',
    },
    medium: {
      bg: 'bg-info-muted',
      text: 'text-info',
    },
    low: {
      bg: 'bg-success-muted',
      text: 'text-success',
    },
  }

  return impactMap[impact] || impactMap.medium
}

/**
 * Get combined class string for background, text, and border
 * Useful for inline className usage
 */
export function getSeverityClasses(severity: SeverityLevel): string {
  const colors = getSeverityColor(severity)
  return `${colors.bg} ${colors.text} ${colors.border}`
}

export function getStatusClasses(status: StatusType): string {
  const colors = getStatusColor(status)
  return `${colors.bg} ${colors.text} ${colors.border}`
}
