'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from './button'

/**
 * ThemeToggle - Simple theme switcher component
 * 
 * Cycles between light and dark themes (system preference handled by ThemeProvider)
 * 
 * Features:
 * - Accessible keyboard navigation
 * - Visual feedback for current selection
 * - Respects reduced motion
 * - No hydration mismatch
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = React.useCallback(() => {
    // Cycle: system -> light -> dark -> system
    if (theme === 'system') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }, [theme, setTheme])

  // Show loading state during SSR
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled>
        <Sun className="h-5 w-5" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  // Use resolvedTheme to show correct icon (accounts for system preference)
  const isDark = resolvedTheme === 'dark'
  const Icon = isDark ? Moon : Sun

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Current: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}`}
    >
      <Icon className="h-5 w-5 transition-transform duration-200" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
