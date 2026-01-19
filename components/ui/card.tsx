'use client'

import * as React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { fadeIn } from '@/lib/design/motion'

const cardVariants = cva(
  'rounded-lg border bg-surface-raised text-text-primary transition-smooth-transform',
  {
    variants: {
      elevation: {
        flat: 'border-border-subtle shadow-surface-flat',
        raised: 'border-border-subtle shadow-surface-raised hover:shadow-surface-overlay',
        overlay: 'border-border-strong shadow-surface-overlay bg-surface-overlay hover:shadow-lg',
      },
    },
    defaultVariants: {
      elevation: 'raised',
    },
  }
)

export interface CardProps
  extends HTMLMotionProps<'div'>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(cardVariants({ elevation, className }))}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        whileHover={
          elevation !== 'flat'
            ? {
                y: -2,
                transition: { duration: 0.2 },
              }
            : undefined
        }
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'default' | 'compact' | 'none'
}

const CardHeader = React.forwardRef<
  HTMLDivElement,
  CardHeaderProps
>(({ className, padding = 'default', ...props }, ref) => {
  const paddingClasses = {
    default: 'p-6',
    compact: 'p-4',
    none: 'p-0',
  }
  return (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5', paddingClasses[padding], className)}
      {...props}
    />
  )
})
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-semibold leading-snug tracking-tight', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-muted leading-relaxed', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'default' | 'compact' | 'none'
}

const CardContent = React.forwardRef<
  HTMLDivElement,
  CardContentProps
>(({ className, padding = 'default', ...props }, ref) => {
  const paddingClasses = {
    default: 'p-6 pt-4',
    compact: 'p-4 pt-2',
    none: 'p-0',
  }
  return (
    <div ref={ref} className={cn(paddingClasses[padding], className)} {...props} />
  )
})
CardContent.displayName = 'CardContent'

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'default' | 'compact' | 'none'
}

const CardFooter = React.forwardRef<
  HTMLDivElement,
  CardFooterProps
>(({ className, padding = 'default', ...props }, ref) => {
  const paddingClasses = {
    default: 'p-6 pt-0',
    compact: 'p-4 pt-0',
    none: 'p-0',
  }
  return (
    <div
      ref={ref}
      className={cn('flex items-center', paddingClasses[padding], className)}
      {...props}
    />
  )
})
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
