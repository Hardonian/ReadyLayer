'use client'

import * as React from 'react'
import { Button, type ButtonProps } from './button'

/**
 * IconButton Component
 * 
 * Ensures icon-only buttons meet WCAG touch target requirements (44px minimum).
 * Use this for all icon-only interactive elements (close buttons, menu toggles, etc).
 * 
 * The button automatically uses size="icon" and enforces minimum dimensions.
 * 
 * @example
 * <IconButton aria-label="Close menu" onClick={handleClose}>
 *   <X className="h-5 w-5" />
 * </IconButton>
 */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'size'> & { size?: 'sm' | 'default' | 'lg' }
>(({ className, size: _size = 'default', children, ...props }, ref) => (
  <Button
    ref={ref}
    size="icon"
    className={className}
    {...props}
  >
    {children}
  </Button>
))

IconButton.displayName = 'IconButton'

export { IconButton as default }
