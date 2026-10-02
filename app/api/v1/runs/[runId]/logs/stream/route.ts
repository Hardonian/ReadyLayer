/**
 * Real-Time CI Run Log Streaming Endpoint
 *
 * GET /api/v1/runs/[runId]/logs/stream
 * Server-Sent Events (SSE) endpoint providing real-time streaming terminal logs
 * for active and completed ReadyLayer governance runs with Redis Pub/Sub integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from 'redis';
import { logger } from '@/observability/logging';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  let user: AuthUser;
  try {
    user = await requireAuth(request);
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { runId } = await params;
  if (!runId) {
    return new NextResponse(JSON.stringify({ error: 'runId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Tenant access verification
  const run = await prisma.readyLayerRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      status: true,
      conclusion: true,
      repository: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!run) {
    return new NextResponse(JSON.stringify({ error: 'Run not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (
    run.repository?.organizationId &&
    !user.organizationIds.includes(run.repository.organizationId)
  ) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let redisSubscriber: ReturnType<typeof createClient> | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send initial handshake and run metadata
      controller.enqueue(
        encoder.encode(
          `event: init\ndata: ${JSON.stringify({
            runId: run.id,
            status: run.status,
            conclusion: run.conclusion,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      // 2. Stream historical audit log events for this run
      try {
        const auditLogs = await prisma.auditLog.findMany({
          where: { resourceId: runId },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });

        for (const log of auditLogs) {
          const chunk = `event: log\ndata: ${JSON.stringify({
            id: log.id,
            action: log.action,
            message: log.details ? JSON.stringify(log.details) : log.action,
            timestamp: log.createdAt.toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        logger.warn({ err, runId }, 'Failed to load historical audit logs for run stream');
      }

      // If run is already completed, send end-of-stream event
      if (run.status === 'completed' || run.status === 'failed' || run.conclusion) {
        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify({
              runId: run.id,
              status: run.status,
              conclusion: run.conclusion,
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        );
        controller.close();
        return;
      }

      // 3. Connect to Redis Pub/Sub for live logs
      const redisUrl = process.env.REDIS_URL;
      const channel = `run:${runId}:logs`;

      if (redisUrl) {
        try {
          redisSubscriber = createClient({ url: redisUrl });
          await redisSubscriber.connect();

          await redisSubscriber.subscribe(channel, (message: string) => {
            try {
              controller.enqueue(
                encoder.encode(`event: log\ndata: ${message}\n\n`)
              );
            } catch {
              // Controller may be closed
            }
          });
        } catch (err) {
          logger.warn({ err, runId }, 'Redis subscription for run stream unavailable, using fallback');
        }
      }

      // 4. Heartbeat interval
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: {"time":"${new Date().toISOString()}"}\n\n`));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 15000);

      // 5. Cleanup on abort
      request.signal.addEventListener('abort', async () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (redisSubscriber) {
          try {
            await redisSubscriber.unsubscribe(channel);
            await redisSubscriber.quit();
          } catch {
            // Ignore disconnect error
          }
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
