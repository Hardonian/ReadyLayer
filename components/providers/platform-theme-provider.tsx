'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getPlatformTheme, PlatformTheme, GitProvider } from '@/lib/platform-themes'
import { useOrganizationId } from '@/lib/hooks'
import { createSupabaseClient } from '@/lib/supabase/client'

interface PlatformThemeContextValue {
  theme: PlatformTheme
  provider: GitProvider | null
  setProvider: (provider: GitProvider | null) => void
}

const PlatformThemeContext = createContext<PlatformThemeContextValue | undefined>(undefined)

export function PlatformThemeProvider({ children }: { children: React.ReactNode }) {
  const { organizationId } = useOrganizationId()
  const [provider, setProvider] = useState<GitProvider | null>(null)
  const [theme, setTheme] = useState<PlatformTheme>(getPlatformTheme('github'))

  useEffect(() => {
    const fetchProvider = async () => {
      if (!organizationId) return

      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Get first repo to determine provider
        const response = await fetch('/api/v1/repos?limit=1', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.repositories?.[0]?.provider) {
            const repoProvider = data.repositories[0].provider.toLowerCase() as GitProvider
            setProvider(repoProvider)
            setTheme(getPlatformTheme(repoProvider))
          }
        }
      } catch {
        // Fallback to default
        setProvider('github')
        setTheme(getPlatformTheme('github'))
      }
    }

    fetchProvider()
  }, [organizationId])

  useEffect(() => {
    if (theme) {
      const style = document.createElement('style')
      style.id = 'platform-theme'
      style.textContent = `:root { ${applyPlatformTheme(theme)} }`
      document.head.appendChild(style)

      return () => {
        const existing = document.getElementById('platform-theme')
        if (existing) {
          existing.remove()
        }
      }
    }
  }, [theme])

  return (
    <PlatformThemeContext.Provider value={{ theme, provider, setProvider }}>
      {children}
    </PlatformThemeContext.Provider>
  )
}

export function usePlatformTheme() {
  const context = useContext(PlatformThemeContext)
  if (!context) {
    throw new Error('usePlatformTheme must be used within PlatformThemeProvider')
  }
  return context
}

function applyPlatformTheme(theme: PlatformTheme): string {
  return `
    --platform-primary: ${theme.colors.primary};
    --platform-secondary: ${theme.colors.secondary};
    --platform-accent: ${theme.colors.accent};
    --platform-background: ${theme.colors.background};
    --platform-surface: ${theme.colors.surface};
    --platform-text: ${theme.colors.text};
    --platform-text-muted: ${theme.colors.textMuted};
    --platform-border: ${theme.colors.border};
    --platform-success: ${theme.colors.success};
    --platform-warning: ${theme.colors.warning};
    --platform-error: ${theme.colors.error};
    --platform-font-sans: ${theme.fonts.sans.join(', ')};
    --platform-font-mono: ${theme.fonts.mono.join(', ')};
    --platform-spacing-unit: ${theme.spacing.unit}px;
    --platform-radius-sm: ${theme.borderRadius.sm};
    --platform-radius-md: ${theme.borderRadius.md};
    --platform-radius-lg: ${theme.borderRadius.lg};
  `
}
