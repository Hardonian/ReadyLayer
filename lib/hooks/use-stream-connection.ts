/**
 * SSE Stream Connection Hook
 * 
 * Manages Server-Sent Events connection for real-time dashboard updates
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { deltaEventSchema, DeltaEvent } from '@/lib/dashboard/schemas'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

interface UseStreamConnectionOptions {
  organizationId: string
  repositoryId?: string
  enabled?: boolean
  onEvent?: (event: DeltaEvent) => void
}

export function useStreamConnection({
  organizationId,
  repositoryId,
  enabled = true,
  onEvent,
}: UseStreamConnectionOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const queryClient = useQueryClient()

  const connect = useCallback(() => {
    if (!enabled || !organizationId) {
      return
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setStatus('connecting')

    try {
      const params = new URLSearchParams({
        organizationId,
        ...(repositoryId && { repositoryId }),
      })

      const eventSource = new EventSource(`/api/stream?${params.toString()}`)
      eventSourceRef.current = eventSource

      eventSource.addEventListener('open', () => {
        setStatus('connected')
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      })

      eventSource.addEventListener('connected', (e) => {
        const data = JSON.parse(e.data)
        setLastEventTime(new Date(data.timestamp))
      })

      eventSource.addEventListener('heartbeat', (e) => {
        const data = JSON.parse(e.data)
        setLastEventTime(new Date(data.timestamp))
      })

      // Handle delta events
      const handleDeltaEvent = () => (e: MessageEvent) => {
        try {
          const event = deltaEventSchema.parse(JSON.parse(e.data))
          setLastEventTime(new Date(event.timestamp))

          // Invalidate relevant queries
          switch (event.type) {
            case 'metrics_delta':
              queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics', organizationId] })
              break
            case 'prs_delta':
              queryClient.invalidateQueries({ queryKey: ['dashboard', 'prs', organizationId] })
              break
            case 'runs_delta':
              queryClient.invalidateQueries({ queryKey: ['dashboard', 'runs', organizationId] })
              break
            case 'findings_delta':
              queryClient.invalidateQueries({ queryKey: ['dashboard', 'findings', organizationId] })
              break
            case 'policies_delta':
              queryClient.invalidateQueries({ queryKey: ['dashboard', 'policies', organizationId] })
              break
          }

          // Call custom handler
          if (onEvent) {
            onEvent(event)
          }
        } catch (error) {
          console.error('Failed to parse delta event:', error)
        }
      }

      eventSource.addEventListener('metrics_delta', handleDeltaEvent('metrics_delta'))
      eventSource.addEventListener('prs_delta', handleDeltaEvent('prs_delta'))
      eventSource.addEventListener('runs_delta', handleDeltaEvent('runs_delta'))
      eventSource.addEventListener('findings_delta', handleDeltaEvent('findings_delta'))
      eventSource.addEventListener('policies_delta', handleDeltaEvent('policies_delta'))

      eventSource.addEventListener('error', (e) => {
        console.error('SSE connection error:', e)
        setStatus('error')

        // Attempt reconnect with exponential backoff
        if (eventSource.readyState === EventSource.CLOSED) {
          setStatus('reconnecting')
          const delay = Math.min(30000, 1000 * Math.pow(2, 0)) // Start with 1s, max 30s
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      })
    } catch (error) {
      console.error('Failed to create SSE connection:', error)
      setStatus('error')
    }
  }, [enabled, organizationId, repositoryId, onEvent, queryClient])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setStatus('disconnected')
  }, [])

  useEffect(() => {
    if (enabled && organizationId) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, organizationId, repositoryId, connect, disconnect])

  return {
    status,
    lastEventTime,
    connect,
    disconnect,
  }
}
