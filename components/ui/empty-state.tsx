'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { slideUp } from '@/lib/design/motion'
import { Button } from './button'
import { LucideIcon } from 'lucide-react'
import { EmptyStateIllustration } from './optimized-image'

export interface EmptyStateProps {
  icon?: LucideIcon
  illustration?: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
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
  illustration,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps): React.JSX.Element {
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
      {illustration ? (
        <motion.div
          variants={slideUp}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <EmptyStateIllustration src={illustration} width={400} height={300} />
        </motion.div>
      ) : Icon ? (
        <motion.div
          className="mb-6 p-4 rounded-full bg-accent-muted"
          variants={slideUp}
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="h-8 w-8 text-accent" strokeWidth={1.5} />
        </motion.div>
      ) : null}
      <h3 className="text-xl font-semibold mb-2 text-text-primary">{title}</h3>
      <p className="text-sm text-text-muted max-w-md mb-8">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex gap-3 flex-wrap justify-center">
          {action && (
            <Button onClick={action.onClick} variant="default">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}
