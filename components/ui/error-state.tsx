'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { slideUp } from '@/lib/design/motion'
import { Button } from './button'
import { AlertCircle } from 'lucide-react'

export interface ErrorStateProps {
  title?: string
  message: string
  action?: {
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
  action,
  className,
  showDetails = false,
  details,
}: ErrorStateProps) {
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
      <motion.div
        className="mb-4 text-destructive"
        variants={slideUp}
      >
        <AlertCircle className="h-12 w-12" strokeWidth={1.5} />
      </motion.div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {message}
      </p>
      {showDetails && details && (
        <div className="mb-6 p-4 bg-muted rounded-md text-left max-w-md">
          <p className="text-xs font-mono text-muted-foreground break-all">
            {details}
          </p>
        </div>
      )}
      {action && (
        <Button onClick={action.onClick} variant="default">
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}
