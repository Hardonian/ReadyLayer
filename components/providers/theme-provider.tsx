'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'

/**
 * ThemeProvider - Wraps next-themes with proper configuration
 * 
 * Features:
 * - System preference detection
 * - Persisted user choice (localStorage)
 * - No flash on initial load (suppressHydrationWarning)
 * - Graceful degradation to safe theme
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="readylayer-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
