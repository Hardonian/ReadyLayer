/**
 * Git Provider UI Hooks
 * 
 * React hooks for Git provider-aware UI components
 */

import { useEffect, useState } from 'react'
import { detectGitProvider, getGitProviderUIConfig, type GitProvider, type GitProviderUIConfig } from './index'

interface UseGitProviderOptions {
  repository?: {
    provider?: string
    url?: string
  }
  defaultProvider?: GitProvider
}

/**
 * Hook to detect and get Git provider UI configuration
 */
export function useGitProvider(options: UseGitProviderOptions = {}): {
  provider: GitProvider
  config: GitProviderUIConfig | null
  theme: GitProviderUIConfig['theme'] | undefined
  integration: GitProviderUIConfig['integration'] | undefined
  workflow: GitProviderUIConfig['workflow'] | undefined
} {
  const [provider, setProvider] = useState<GitProvider>(options.defaultProvider || 'generic')
  const [config, setConfig] = useState<GitProviderUIConfig | null>(null)

  useEffect(() => {
    if (options.repository) {
      const detected = detectGitProvider(options.repository)
      setProvider(detected)
    } else if (options.defaultProvider) {
      setProvider(options.defaultProvider)
    }

    const providerConfig = getGitProviderUIConfig(provider)
    setConfig(providerConfig)
  }, [options.repository, options.defaultProvider, provider])

  return {
    provider,
    config,
    theme: config?.theme,
    integration: config?.integration,
    workflow: config?.workflow,
  }
}

/**
 * Hook to get provider-specific styles
 */
export function useProviderStyles(provider: GitProvider): {
  colors: GitProviderUIConfig['theme']['colors']
  spacing: GitProviderUIConfig['theme']['spacing']
  typography: GitProviderUIConfig['theme']['typography']
  getStatusColor: (status: 'success' | 'failure' | 'pending' | 'error') => string
} {
  const config = getGitProviderUIConfig(provider)
  
  return {
    colors: config.theme.colors,
    spacing: config.theme.spacing,
    typography: config.theme.typography,
    getStatusColor: (status: 'success' | 'failure' | 'pending' | 'error'): string => {
      const statusColors = {
        success: config.theme.colors.success,
        failure: config.theme.colors.danger,
        pending: config.theme.colors.warning,
        error: config.theme.colors.danger,
      }
      return statusColors[status]
    },
  }
}
