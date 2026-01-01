'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PersonaBadgeProps {
  persona: 'founder' | 'enterprise-cto' | 'junior-developer' | 'open-source-maintainer' | 'agency-freelancer' | 'startup-cto'
  className?: string
}

const personaConfig = {
  founder: {
    label: 'Founder',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  'enterprise-cto': {
    label: 'Enterprise CTO',
    className: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  'junior-developer': {
    label: 'Junior Developer',
    className: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800',
  },
  'open-source-maintainer': {
    label: 'OSS Maintainer',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  'agency-freelancer': {
    label: 'Agency/Freelancer',
    className: 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  },
  'startup-cto': {
    label: 'Startup CTO',
    className: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
}

export function PersonaBadge({ persona, className }: PersonaBadgeProps) {
  const config = personaConfig[persona]
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 text-xs font-semibold rounded border',
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}
