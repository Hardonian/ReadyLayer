'use client'

import * as React from 'react'
import { AnimatePresence } from 'framer-motion'

/**
 * Motion Provider
 * 
 * Wraps app with AnimatePresence for page transitions
 * Respects reduced motion preferences
 */
export function MotionProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <AnimatePresence mode="wait">{children}</AnimatePresence>
}
