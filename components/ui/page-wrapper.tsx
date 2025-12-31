'use client'

import * as React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { pageVariants } from '@/lib/design/motion'

export interface PageWrapperProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
}

/**
 * Page Wrapper Component
 * 
 * Provides consistent page-level motion and layout
 * Respects reduced motion preferences
 */
export function PageWrapper({ 
  children, 
  className,
  ...props 
}: PageWrapperProps) {
  return (
    <motion.div
      className={cn('min-h-screen', className)}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      {...props}
    >
      {children}
    </motion.div>
  )
}
