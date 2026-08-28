'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { slideUp } from '@/lib/design/motion'
import { Button } from './button'
import { AlertCircle } from 'lucide-react'
import { ErrorStateIllustration } from './optimized-image'

export interface ErrorStateProps {
  title?: string
  message: string
  illustration?: string
  illustrationAlt?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  showDetails?: boolean
  details?: string
}

/**
 * Error State Component
 *
 * Must:
 * - Reduce anxiety
 * - Never blame the user
 * - Never expose raw system errors unless in debug mode
 * - Be calm and actionable
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  illustration,
  illustrationAlt = 'Error illustration',
  action,
  secondaryAction,
  className,
  showDetails = false,
  details,
}: ErrorStateProps): React.JSX.Element {
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
          <ErrorStateIllustration
            src={illustration}
            alt={illustrationAlt}
            width={400}
            height={320}
          />
        </motion.div>
      ) : (
        <motion.div
          className="mb-6 p-4 rounded-full bg-danger-muted"
          variants={slideUp}
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <AlertCircle className="h-8 w-8 text-danger" strokeWidth={1.5} />
        </motion.div>
      )}
      <h3 className="text-xl font-semibold mb-2 text-text-primary">{title}</h3>
      <p className="text-sm text-text-muted max-w-md mb-8">
        {message}
      </p>
      {showDetails && details && (
        <div className="mb-8 p-4 bg-surface-muted rounded-lg border border-border-subtle text-left max-w-md">
          <p className="text-xs font-mono text-text-muted break-all">{details}</p>
        </div>
      )}
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
