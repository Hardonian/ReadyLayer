'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOrganizationId } from '@/lib/hooks'
import { runtimeUiConfigToCssVars, type RuntimeUiConfig, getDefaultRuntimeUiConfig } from '@/lib/runtime-ui-config'

type RuntimeUiConfigContextValue = {
  config: RuntimeUiConfig
  status: 'idle' | 'loading' | 'success' | 'error'
  source: 'default' | 'organization'
  updatedAt: string | null
  errorMessage: string | null
}

const RuntimeUiConfigContext = createContext<RuntimeUiConfigContextValue | undefined>(undefined)

async function fetchRuntimeUiConfig(organizationId: string) {
  const res = await fetch(`/api/ui-config?organizationId=${encodeURIComponent(organizationId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  const json = (await res.json()) as unknown
  if (!res.ok) {
    const message = (() => {
      if (typeof json !== 'object' || !json) return 'Failed to load runtime UI config'
      const maybeError = (json as { error?: unknown }).error
      if (typeof maybeError === 'object' && maybeError && 'message' in maybeError) {
        const m = (maybeError as { message?: unknown }).message
        return typeof m === 'string' && m.length > 0 ? m : 'Failed to load runtime UI config'
      }
      return 'Failed to load runtime UI config'
    })()
    throw new Error(message)
  }
  return json as {
    data: {
      organizationId: string
      source: 'default' | 'organization'
      updatedAt: string | null
      config: RuntimeUiConfig
    }
  }
}

export function RuntimeUiConfigProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { organizationId } = useOrganizationId()
  const defaults = useMemo(() => getDefaultRuntimeUiConfig(), [])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['runtime-ui-config', organizationId],
    queryFn: async () => {
      if (!organizationId) return null
      return await fetchRuntimeUiConfig(organizationId)
    },
    enabled: Boolean(organizationId),
    staleTime: 15_000,
    retry: 1,
  })

  const resolved = useMemo(() => {
    if (!organizationId) {
      return {
        config: defaults,
        status: 'idle' as const,
        source: 'default' as const,
        updatedAt: null,
      }
    }

    if (query.isLoading) {
      return {
        config: defaults,
        status: 'loading' as const,
        source: 'default' as const,
        updatedAt: null,
      }
    }

    if (query.isError) {
      return {
        config: defaults,
        status: 'error' as const,
        source: 'default' as const,
        updatedAt: null,
      }
    }

    const payload = query.data?.data
    return {
      config: payload?.config ?? defaults,
      status: 'success' as const,
      source: payload?.source ?? 'default',
      updatedAt: payload?.updatedAt ?? null,
    }
  }, [defaults, organizationId, query.data, query.isError, query.isLoading])

  useEffect(() => {
    if (query.isError) {
      setErrorMessage(query.error instanceof Error ? query.error.message : 'Failed to load runtime UI config')
    } else {
      setErrorMessage(null)
    }
  }, [query.error, query.isError])

  useEffect(() => {
    // Apply CSS variables for the currently-supported runtime tokens.
    const cssVars = runtimeUiConfigToCssVars(resolved.config)
    for (const [k, v] of Object.entries(cssVars)) {
      document.documentElement.style.setProperty(k, v)
    }
  }, [resolved.config])

  const value: RuntimeUiConfigContextValue = {
    config: resolved.config,
    status: resolved.status,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
    errorMessage,
  }

  return <RuntimeUiConfigContext.Provider value={value}>{children}</RuntimeUiConfigContext.Provider>
}

export function useRuntimeUiConfig(): RuntimeUiConfigContextValue {
  const ctx = useContext(RuntimeUiConfigContext)
  if (!ctx) throw new Error('useRuntimeUiConfig must be used within RuntimeUiConfigProvider')
  return ctx
}

