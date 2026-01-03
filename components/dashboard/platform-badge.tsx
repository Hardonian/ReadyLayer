'use client'

import { GitProvider } from '@/lib/platform-themes'
import { Github, Gitlab } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PlatformBadgeProps {
  provider: GitProvider | string
  className?: string
}

export function PlatformBadge({ provider, className }: PlatformBadgeProps) {
  const normalizedProvider = provider.toLowerCase() as GitProvider

  const getProviderConfig = () => {
    switch (normalizedProvider) {
      case 'github':
        return {
          icon: Github,
          label: 'GitHub',
          className: 'bg-[#238636]/10 text-[#238636] border-[#238636]/20',
        }
      case 'gitlab':
        return {
          icon: Gitlab,
          label: 'GitLab',
          className: 'bg-[#fc6d26]/10 text-[#fc6d26] border-[#fc6d26]/20',
        }
      case 'bitbucket':
        return {
          icon: Gitlab, // Bitbucket icon not in lucide-react, using GitLab as placeholder
          label: 'Bitbucket',
          className: 'bg-[#0052cc]/10 text-[#0052cc] border-[#0052cc]/20',
        }
      default:
        return {
          icon: Github,
          label: 'Git',
          className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
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
