import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  success?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, error, success, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border bg-surface px-3 py-2 text-sm transition-smooth-colors',
        'placeholder:text-text-subtle',
        'hover:border-border-strong',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-muted',
        error && 'border-danger focus-visible:ring-danger',
        success && 'border-success focus-visible:ring-success',
        !error && !success && 'border-border focus-visible:border-ring',
        className
      )}
      {...props}
    />
  )
})
