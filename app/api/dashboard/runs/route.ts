/**
 * Dashboard Runs Snapshot API
 * 
 * GET /api/dashboard/runs - Get runs snapshot
 */

import { prisma } from '@/lib/prisma'
import {
  createRouteHandler,
  errorResponse,
  successResponse,
  RouteContext,
  parsePagination,
} from '@/lib/api-route-helpers'
import { snapshotQuerySchema, runSnapshotSchema } from '@/lib/dashboard/schemas'

export const GET = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user, log } = context
    const { searchParams } = new URL(request.url)
    const { limit, offset } = parsePagination(request)

    // Parse and validate query params
    const queryResult = snapshotQuerySchema.safeParse({
      organizationId: searchParams.get('organizationId'),
      repositoryId: searchParams.get('repositoryId'),
      timeRange: searchParams.get('timeRange') || '24h',
      limit,
      offset,
    })

    if (!queryResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        errors: queryResult.error.errors,
      })
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
    }) as { id: string; organizationId: string; userId: string; role: string } | null

    if (!membership) {
      return errorResponse('FORBIDDEN', 'Access denied', 403)
    }

    try {
      // Build where clause
      const where: {
        repository?: { organizationId: string; id?: string }
        createdAt?: { gte: Date }
      } = {
        repository: {
          organizationId,
        },
      }

      if (repositoryId) {
        where.repository!.id = repositoryId
      }

      // Get total count
      const total = await prisma.readyLayerRun.count({ where })

      // Get runs
      const runs = await prisma.readyLayerRun.findMany({
        where,
        include: {
          repository: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }) as Array<{
        id: string
        correlationId: string
        repositoryId: string | null
        repository: { fullName: string } | null
        trigger: string
        status: string
        conclusion: string | null
        reviewGuardStatus: string
        testEngineStatus: string
        docSyncStatus: string
        gatesPassed: boolean
        aiTouchedDetected: boolean
        startedAt: Date
        completedAt: Date | null
      }>

      const runSnapshots = runs.map((run: {
        id: string
        correlationId: string
        repositoryId: string | null
        repository: { fullName: string } | null
        trigger: string
        status: string
        conclusion: string | null
        reviewGuardStatus: string
        testEngineStatus: string
        docSyncStatus: string
        gatesPassed: boolean
        aiTouchedDetected: boolean
        startedAt: Date
        completedAt: Date | null
      }) => {
        const duration = run.completedAt && run.startedAt
          ? (run.completedAt.getTime() - run.startedAt.getTime()) / 1000
          : null

        return {
          id: run.id,
          correlationId: run.correlationId,
          repositoryId: run.repositoryId,
          repositoryName: run.repository?.fullName ?? null,
          trigger: run.trigger as 'webhook' | 'manual' | 'sandbox',
          status: run.status as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
          conclusion: run.conclusion as 'success' | 'failure' | 'partial_success' | 'cancelled' | null,
          reviewGuardStatus: run.reviewGuardStatus as 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped',
          testEngineStatus: run.testEngineStatus as 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped',
          docSyncStatus: run.docSyncStatus as 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped',
          gatesPassed: run.gatesPassed,
          aiTouchedDetected: run.aiTouchedDetected,
          duration,
          startedAt: run.startedAt.toISOString(),
          completedAt: run.completedAt?.toISOString() ?? null,
        }
      })

      const snapshot = {
        runs: runSnapshots,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      }

      const validated = runSnapshotSchema.parse(snapshot)

      log.info({ organizationId, repositoryId: repositoryId || undefined, total }, 'Runs snapshot generated')

      return successResponse(validated)
    } catch (error) {
      log.error(error, 'Failed to generate runs snapshot')
      return errorResponse(
        'RUNS_SNAPSHOT_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        500
      )
    }
  },
  { authz: { requiredScopes: ['read'] } }
)
