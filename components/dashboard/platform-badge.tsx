'use client'

import React from 'react'
import { GitProvider } from '@/lib/platform-themes'
import { Github, Gitlab } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PlatformBadgeProps {
  provider: GitProvider | string
  className?: string
}

export function PlatformBadge({ provider, className }: PlatformBadgeProps): React.JSX.Element {
  const normalizedProvider = provider.toLowerCase() as GitProvider

  const getProviderConfig = () => {
    switch (normalizedProvider) {
      case 'github':
        return {
          icon: Github,
          label: 'GitHub',
          className: 'bg-[hsl(var(--provider-github)/0.1)] text-[hsl(var(--provider-github))] border-[hsl(var(--provider-github)/0.2)]',
        }
      case 'gitlab':
        return {
          icon: Gitlab,
          label: 'GitLab',
          className: 'bg-[hsl(var(--provider-gitlab)/0.1)] text-[hsl(var(--provider-gitlab))] border-[hsl(var(--provider-gitlab)/0.2)]',
        }
      case 'bitbucket':
        return {
          icon: Gitlab,
          label: 'Bitbucket',
          className: 'bg-[hsl(var(--provider-bitbucket)/0.1)] text-[hsl(var(--provider-bitbucket))] border-[hsl(var(--provider-bitbucket)/0.2)]',
        }
      default:
        return {
          icon: Github,
          label: 'Git',
          className: 'bg-surface-muted text-text-muted border-border',
        }
    }
  }

  const config = getProviderConfig()
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn('flex items-center gap-1.5', config.className, className)}>
      <Icon className="h-3 w-3" />
      <span className="text-xs">{config.label}</span>
    </Badge>
  )
}
