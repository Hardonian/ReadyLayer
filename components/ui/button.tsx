'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { motion } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { scalePress } from '@/lib/design/motion'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-hover dark:hover:brightness-110 shadow-surface-raised hover:shadow-glow transition-all duration-300',
        destructive: 'bg-danger text-danger-foreground hover:bg-danger/90 active:bg-danger/85 dark:hover:brightness-110 shadow-surface-raised',
        outline: 'border border-border-strong bg-surface-raised hover:bg-surface-hover hover:border-border-strong active:bg-surface-hover shadow-surface-raised transition-all duration-300',
        secondary: 'bg-surface-muted text-text-primary hover:bg-surface-hover active:bg-surface-hover shadow-surface-raised transition-all duration-300',
        ghost: 'hover:bg-surface-hover active:bg-surface-hover text-text-primary transition-all duration-300',
        link: 'text-accent underline-offset-4 hover:underline hover:text-accent-hover',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-10 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends Omit<
    React.ComponentPropsWithoutRef<'button'>,
    'asChild'
  >,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...(props as React.ComponentPropsWithoutRef<'button'>)}
        />
      )
    }

return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        variants={scalePress}
        initial="rest"
        whileHover="rest"
        whileTap="pressed"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
