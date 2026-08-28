'use client'

import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { fadeIn } from '@/lib/design/motion'

/**
 * Loading Spinner
 * Calm, professional spinner for async operations
 */
export function LoadingSpinner({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}): React.JSX.Element {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <motion.div
      className={cn('flex items-center justify-center', className)}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className={cn(
          'border-2 border-border/20 border-t-primary rounded-full shadow-glow',
          sizeClasses[size]
        )}
        animate={{ rotate: 360 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  )
}

/**
 * Loading State Container
 * Provides consistent loading UI with optional message
 */
export function LoadingState({
  message = 'Loading...',
  className,
}: {
  message?: string
  className?: string
}): React.JSX.Element {
  return (
    <motion.div
      className={cn('flex flex-col items-center justify-center min-h-[400px] p-8', className)}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      <LoadingSpinner size="lg" className="mb-6" />
      <p className="text-base font-display font-medium text-text-muted">{message}</p>
    </motion.div>
  )
}

/**
 * Skeleton Loader
 * Structure-preserving loading state (better than spinners)
 * Properly typed to accept both HTML and motion props
 */
export function Skeleton({
  className,
  ...props
}: Omit<
  HTMLMotionProps<'div'>,
  'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>): React.JSX.Element {
  return (
    <motion.div
      className={cn('animate-pulse rounded-lg bg-surface-muted border border-border/10', className)}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      {...props}
    />
  )
}

/**
 * Skeleton Text
 * For loading text content
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}): React.JSX.Element {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Card Skeleton
 * For loading card content
 */
export function CardSkeleton({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn('rounded-lg border border-border-subtle bg-surface-raised p-6', className)}>
      <Skeleton className="h-6 w-1/3 mb-4" />
      <SkeletonText lines={3} />
    </div>
  )
}
