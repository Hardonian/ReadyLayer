/**
 * Server-Sent Events (SSE) Stream API
 * 
 * GET /api/stream - Real-time delta updates for dashboard
 * 
 * Features:
 * - Tenant isolation (org_id filtering)
 * - Backpressure handling (batch/coalesce events)
 * - Heartbeat + reconnect
 * - Channel filtering (org_id, repo_id)
 */

import { NextRequest } from 'next/server'
import { createRouteContext } from '@/lib/api-route-helpers'
import { streamQuerySchema, deltaEventSchema } from '@/lib/dashboard/schemas'
import { logger } from '@/observability/logging'
import { prisma } from '@/lib/prisma'

// Event queue with backpressure
interface QueuedEvent {
  event: ReturnType<typeof deltaEventSchema.parse>
  timestamp: number
}

class EventQueue {
  private queue: QueuedEvent[] = []
  private batchInterval = 500 // 500ms batching window
  private maxBatchSize = 10
  private lastFlush = Date.now()

  add(event: QueuedEvent['event']) {
    this.queue.push({
      event,
      timestamp: Date.now(),
    })

    // Auto-flush if batch is full
    if (this.queue.length >= this.maxBatchSize) {
      return this.flush()
    }

    return []
  }

  flush(): QueuedEvent['event'][] {
    const now = Date.now()
    const shouldFlush = now - this.lastFlush >= this.batchInterval || this.queue.length > 0

    if (!shouldFlush) {
      return []
    }

    const events = this.queue.splice(0, this.maxBatchSize)
    this.lastFlush = now

    // Coalesce events by type
    const coalesced = new Map<string, QueuedEvent['event']>()
    events.forEach(({ event }) => {
      const key = `${event.type}:${event.organizationId}:${event.repositoryId || 'all'}`
      const existing = coalesced.get(key)
      if (existing) {
        // Merge data (simplified - would do smarter merging in production)
        existing.data = { ...existing.data, ...event.data }
        existing.timestamp = event.timestamp
      } else {
        coalesced.set(key, event)
      }
    })

    return Array.from(coalesced.values())
  }

  getPendingCount(): number {
    return this.queue.length
  }
}

// Per-connection state
interface ConnectionState {
  organizationId: string
      repositoryId?: string
  queue: EventQueue
  lastHeartbeat: number
  closed: boolean
}

const connections = new Map<string, ConnectionState>()

// Cleanup stale connections
setInterval(() => {
  const now = Date.now()
  const staleTimeout = 5 * 60 * 1000 // 5 minutes

  for (const [id, conn] of connections.entries()) {
    if (now - conn.lastHeartbeat > staleTimeout) {
      connections.delete(id)
    }
  }
}, 60 * 1000) // Check every minute

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `stream_${Date.now()}`
  const log = logger.child({ requestId })

  try {
    // Authenticate
    const contextResult = await createRouteContext(request)
    if (!contextResult.success) {
      return contextResult.response
    }
    const { user } = contextResult.context

    // Parse query params
    const { searchParams } = new URL(request.url)
    const queryResult = streamQuerySchema.safeParse({
      organizationId: searchParams.get('organizationId'),
      repositoryId: searchParams.get('repositoryId'),
      channels: searchParams.get('channels'),
    })

    if (!queryResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            context: { errors: queryResult.error.errors },
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { organizationId, repositoryId } = queryResult.data

    // Verify access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create connection state
    const connectionId = `${user.id}:${organizationId}:${Date.now()}`
    const connection: ConnectionState = {
      organizationId,
      repositoryId,
      queue: new EventQueue(),
      lastHeartbeat: Date.now(),
      closed: false,
    }
    connections.set(connectionId, connection)

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // Send initial connection event
        const sendEvent = (event: { type: string; data: unknown }) => {
          try {
            const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
            controller.enqueue(encoder.encode(`event: ${event.type}\n`))
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          } catch (error) {
            log.error(error, 'Failed to send SSE event')
          }
        }

        sendEvent({
          type: 'connected',
          data: { connectionId, timestamp: new Date().toISOString() },
        })

        // Heartbeat interval (30 seconds)
        const heartbeatInterval = setInterval(() => {
          if (connection.closed) {
            clearInterval(heartbeatInterval)
            return
          }

          connection.lastHeartbeat = Date.now()
          sendEvent({
            type: 'heartbeat',
            data: { timestamp: new Date().toISOString() },
          })

          // Flush queued events
          const events = connection.queue.flush()
          events.forEach((event) => {
            sendEvent({
              type: event.type,
              data: event,
            })
          })
        }, 30000)

        // Poll for changes (simplified - would use database triggers/pubsub in production)
        const pollInterval = setInterval(async () => {
          if (connection.closed) {
            clearInterval(pollInterval)
            return
          }

          try {
            // Check for new runs
            const recentRuns = await prisma.readyLayerRun.findMany({
              where: {
                repository: {
                  organizationId,
                  ...(repositoryId ? { id: repositoryId } : {}),
                },
                updatedAt: {
                  gte: new Date(Date.now() - 60000), // Last minute
                },
              },
              take: 10,
              orderBy: { updatedAt: 'desc' },
            }) as Array<{
              id: string
              status: string
              conclusion: string | null
              gatesPassed: boolean
            }>

            if (recentRuns.length > 0) {
              connection.queue.add({
                type: 'runs_delta',
                timestamp: new Date().toISOString(),
                organizationId,
                repositoryId,
                data: {
                  runs: recentRuns.map((r) => ({
                    id: r.id,
                    status: r.status,
                    conclusion: r.conclusion,
                    gatesPassed: r.gatesPassed,
                  })),
                },
              })
            }

            // Check for new reviews
            const recentReviews = await prisma.review.findMany({
              where: {
                repository: {
                  organizationId,
                  ...(repositoryId ? { id: repositoryId } : {}),
                },
                updatedAt: {
                  gte: new Date(Date.now() - 60000),
                },
              },
              take: 10,
              orderBy: { updatedAt: 'desc' },
            }) as Array<{
              id: string
              prNumber: number
              status: string
              isBlocked: boolean
            }>

            if (recentReviews.length > 0) {
              connection.queue.add({
                type: 'prs_delta',
                timestamp: new Date().toISOString(),
                organizationId,
                repositoryId,
                data: {
                  prs: recentReviews.map((r) => ({
                    id: r.id,
                    prNumber: r.prNumber,
                    status: r.status,
                    isBlocked: r.isBlocked,
                  })),
                },
              })
            }

            // Check for new violations
            const recentViolations = await prisma.violation.findMany({
              where: {
                repository: {
                  organizationId,
                  ...(repositoryId ? { id: repositoryId } : {}),
                },
                detectedAt: {
                  gte: new Date(Date.now() - 60000),
                },
              },
              take: 10,
              orderBy: { detectedAt: 'desc' },
            }) as Array<{
              id: string
              ruleId: string
              severity: string
            }>

            if (recentViolations.length > 0) {
              connection.queue.add({
                type: 'findings_delta',
                timestamp: new Date().toISOString(),
                organizationId,
                repositoryId,
                data: {
                  findings: recentViolations.map((v) => ({
                    id: v.id,
                    ruleId: v.ruleId,
                    severity: v.severity,
                  })),
                },
              })
            }
          } catch (error) {
            log.error(error, 'Failed to poll for changes')
          }
        }, 5000) // Poll every 5 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          connection.closed = true
          connections.delete(connectionId)
          clearInterval(heartbeatInterval)
          clearInterval(pollInterval)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    })
  } catch (error) {
    log.error(error, 'SSE stream error')
    return new Response(
      JSON.stringify({
        error: {
          code: 'STREAM_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
