'use client'

import React from 'react'
import { ConnectionStatus } from '@/lib/hooks/use-stream-connection'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus
  lastEventTime?: Date | null
}

export function ConnectionStatusBadge({ status, lastEventTime }: ConnectionStatusBadgeProps): React.JSX.Element {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Connected',
          className: 'bg-success-muted text-success border-success/20',
        }
      case 'connecting':
      case 'reconnecting':
        return {
          icon: Loader2,
          label: status === 'connecting' ? 'Connecting...' : 'Reconnecting...',
          className: 'bg-warning-muted text-warning border-warning/20',
          spinning: true,
        }
      case 'error':
        return {
          icon: WifiOff,
          label: 'Connection Error',
          className: 'bg-danger-muted text-danger border-danger/20',
        }
      default:
        return {
          icon: WifiOff,
          label: 'Disconnected',
          className: 'bg-surface-muted text-text-muted border-border/20',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn('flex items-center gap-1.5', config.className)}
    >
      <Icon className={cn('h-3 w-3', config.spinning && 'animate-spin')} />
      <span className="text-xs">{config.label}</span>
      {lastEventTime && status === 'connected' && (
        <span className="text-xs opacity-70">
          {formatLastEventTime(lastEventTime)}
        </span>
      )}
    </Badge>
  )
}

function formatLastEventTime(time: Date): string {
  const secondsAgo = Math.floor((Date.now() - time.getTime()) / 1000)
  if (secondsAgo < 60) {
    return `${secondsAgo}s ago`
  }
  const minutesAgo = Math.floor(secondsAgo / 60)
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`
  }
  return `${Math.floor(minutesAgo / 60)}h ago`
}
