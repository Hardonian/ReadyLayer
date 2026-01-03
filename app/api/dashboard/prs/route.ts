/**
 * Dashboard PRs Snapshot API
 * 
 * GET /api/dashboard/prs - Get PR queue snapshot
 */

import { prisma } from '@/lib/prisma'
import {
  createRouteHandler,
  errorResponse,
  successResponse,
  RouteContext,
  parsePagination,
} from '@/lib/api-route-helpers'
import { snapshotQuerySchema, prSnapshotSchema } from '@/lib/dashboard/schemas'

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
        repository: { organizationId: string; id?: string }
        createdAt?: { gte: Date }
      } = {
        repository: {
          organizationId,
        },
      }

      if (repositoryId) {
        where.repository.id = repositoryId
      }

      // Get total count
      const total = await prisma.review.count({ where })

      // Get reviews
      const reviews = await prisma.review.findMany({
        where,
        include: {
          repository: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }) as Array<{
        id: string
        repositoryId: string
        repository: { fullName: string }
        prNumber: number
        prSha: string
        prTitle: string | null
        isBlocked: boolean
        blockedReason: string | null
        status: string
        createdAt: Date
        updatedAt: Date
      }>

      // Get runs for gate status
      const reviewIds = reviews.map((r) => r.id)
      const runs = await prisma.readyLayerRun.findMany({
        where: {
          reviewId: { in: reviewIds },
        },
      }) as Array<{
        id: string
        reviewId: string | null
        gatesPassed: boolean
        gatesFailed: unknown
        aiTouchedDetected: boolean
      }>

      const runMap = new Map(runs.map((r) => [r.reviewId, r]))

      const prs = reviews.map((review: {
        id: string
        repositoryId: string
        repository: { fullName: string }
        prNumber: number
        prSha: string
        prTitle: string | null
        isBlocked: boolean
        blockedReason: string | null
        status: string
        createdAt: Date
        updatedAt: Date
      }) => {
        const run = runMap.get(review.id)
        const gatesFailed = run && Array.isArray(run.gatesFailed)
          ? (run.gatesFailed as string[])
          : []

        return {
          id: review.id,
          repositoryId: review.repositoryId,
          repositoryName: review.repository.fullName,
          prNumber: review.prNumber,
          prSha: review.prSha,
          prTitle: review.prTitle,
          status: review.isBlocked
            ? ('blocked' as const)
            : review.status === 'completed'
              ? ('pass' as const)
              : review.status === 'failed'
                ? ('fail' as const)
                : ('needs_review' as const),
          isBlocked: review.isBlocked,
          blockedReason: review.blockedReason,
          gatesPassed: run ? run.gatesPassed : false,
          gatesFailed,
          aiTouchedDetected: run ? run.aiTouchedDetected : false,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        }
      })

      const snapshot = {
        prs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      }

      const validated = prSnapshotSchema.parse(snapshot)

      log.info({ organizationId, repositoryId: repositoryId || undefined, total }, 'PR snapshot generated')

      return successResponse(validated)
    } catch (error) {
      log.error(error, 'Failed to generate PR snapshot')
      return errorResponse(
        'PR_SNAPSHOT_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        500
      )
    }
  },
  { authz: { requiredScopes: ['read'] } }
)
