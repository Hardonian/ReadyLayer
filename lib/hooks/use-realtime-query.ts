/**
 * Realtime Query Hook
 * 
 * Combines snapshot queries with SSE delta updates
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { useStreamConnection } from './use-stream-connection'

interface UseRealtimeQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: string[]
  queryFn: () => Promise<TData>
  organizationId: string
  repositoryId?: string
  pollingInterval?: number // Fallback polling if SSE fails (default: 30000ms)
}

export interface UseRealtimeQueryReturn<TData, TError = Error> {
  data: TData | undefined
  isLoading: boolean
  isError: boolean
  error: TError | null
  status: 'pending' | 'success' | 'error'
}

export function useRealtimeQuery<TData, TError = Error>({
  queryKey,
  queryFn,
  organizationId,
  repositoryId,
  pollingInterval = 30000,
  ...queryOptions
}: UseRealtimeQueryOptions<TData, TError>): UseRealtimeQueryReturn<TData, TError> {
  // Set up SSE connection
  const { status: streamStatus } = useStreamConnection({
    organizationId,
    repositoryId,
    enabled: queryOptions.enabled !== false,
  })

  // Use polling as fallback if SSE is not connected
  const shouldPoll = streamStatus !== 'connected' && streamStatus !== 'connecting'

  return useQuery({
    ...queryOptions,
    queryKey,
    queryFn,
    refetchInterval: shouldPoll ? pollingInterval : false,
    refetchOnWindowFocus: false,
  })
}
