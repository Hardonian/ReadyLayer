'use client'

import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-smooth-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80 dark:hover:brightness-110',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 dark:hover:brightness-110',
        outline: 'text-foreground border-border-subtle hover:border-border-strong hover:bg-surface-hover',
        success:
          'border-transparent bg-success text-success-foreground hover:bg-success/80 dark:hover:brightness-110',
        warning:
          'border-transparent bg-warning text-warning-foreground hover:bg-warning/80 dark:hover:brightness-110',
        info:
          'border-transparent bg-info text-info-foreground hover:bg-info/80 dark:hover:brightness-110',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends Omit<HTMLMotionProps<'div'>, 'animate'>,
    VariantProps<typeof badgeVariants> {
  animate?: boolean
}

function Badge({ className, variant, animate = false, ...props }: BadgeProps): React.JSX.Element {
  return (
    <motion.div
      className={cn(badgeVariants({ variant }), className)}
      initial={animate ? { opacity: 0, scale: 0.8 } : false}
      animate={animate ? { opacity: 1, scale: 1 } : false}
      transition={animate ? { duration: 0.2 } : undefined}
      whileHover={animate ? { scale: 1.05 } : undefined}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
