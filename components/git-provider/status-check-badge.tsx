'use client'

import { Badge } from '@/components/ui/badge'
import { getStatusCheckBadgeStyle, detectGitProvider, type GitProvider } from '@/lib/git-provider-ui'
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface StatusCheckBadgeProps {
  status: 'success' | 'failure' | 'pending' | 'error'
  provider?: GitProvider
  repository?: {
    provider?: string
    url?: string
  }
  className?: string
}

export function StatusCheckBadge({ status, provider, repository, className }: StatusCheckBadgeProps) {
  const detectedProvider = provider || (repository ? detectGitProvider(repository) : 'generic')
  const style = getStatusCheckBadgeStyle(detectedProvider, status)

  const icons = {
    success: CheckCircle2,
    failure: XCircle,
    pending: Clock,
    error: AlertTriangle,
  }

  const Icon = icons[status]

  return (
    <Badge
      variant={status === 'success' ? 'default' : status === 'failure' ? 'destructive' : 'secondary'}
      className={className}
      style={{
        backgroundColor: style.color + '15',
        color: style.color,
        borderColor: style.color + '40',
      }}
    >
      <Icon className="h-3 w-3 mr-1" />
      {status === 'success' && 'Passed'}
      {status === 'failure' && 'Failed'}
      {status === 'pending' && 'Pending'}
      {status === 'error' && 'Error'}
    </Badge>
  )
}
