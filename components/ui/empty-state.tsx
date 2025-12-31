'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { slideUp } from '@/lib/design/motion'
import { Button } from './button'
import { LucideIcon } from 'lucide-react'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * Empty State Component
 * 
 * Must:
 * - Explain purpose
 * - Show example or next action
 * - Never look broken
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      variants={slideUp}
      initial="hidden"
      animate="visible"
    >
      {Icon && (
        <motion.div
          className="mb-4 text-muted-foreground"
          variants={slideUp}
        >
          <Icon className="h-12 w-12" strokeWidth={1.5} />
        </motion.div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="default">
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}
