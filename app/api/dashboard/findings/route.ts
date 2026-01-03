/**
 * Dashboard Findings Snapshot API
 * 
 * GET /api/dashboard/findings - Get findings inbox snapshot
 */

import { prisma } from '@/lib/prisma'
import {
  createRouteHandler,
  errorResponse,
  successResponse,
  RouteContext,
  parsePagination,
} from '@/lib/api-route-helpers'
import { snapshotQuerySchema, findingSnapshotSchema } from '@/lib/dashboard/schemas'

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
        detectedAt?: { gte: Date }
      } = {
        repository: {
          organizationId,
        },
      }

      if (repositoryId) {
        where.repository.id = repositoryId
      }

      // Get total count
      const total = await prisma.violation.count({ where })

      // Get violations (findings)
      const violations = await prisma.violation.findMany({
        where,
        include: {
          repository: true,
          review: true,
        },
        orderBy: { detectedAt: 'desc' },
        take: limit,
        skip: offset,
      }) as Array<{
        id: string
        repositoryId: string
        repository: { fullName: string }
        reviewId: string | null
        review: { isBlocked: boolean; status: string } | null
        ruleId: string
        severity: string
        file: string
        line: number
        message: string
        detectedAt: Date
      }>

      // Get runs for evidence references
      const reviewIds = violations.map((v) => v.reviewId).filter((id): id is string => Boolean(id))
      const runs = await prisma.readyLayerRun.findMany({
        where: {
          reviewId: { in: reviewIds },
        },
      }) as Array<{
        id: string
        reviewId: string | null
      }>

      const runMap = new Map(runs.map((r) => [r.reviewId, r]))

      const findings = violations.map((violation: {
        id: string
        repositoryId: string
        repository: { fullName: string }
        reviewId: string | null
        review: { isBlocked: boolean; status: string } | null
        ruleId: string
        severity: string
        file: string
        line: number
        message: string
        detectedAt: Date
      }) => {
        const run = violation.reviewId ? runMap.get(violation.reviewId) : null

        // Determine status
        let status: 'pass' | 'fail' | 'blocked' | 'needs_review' | 'overridden' | 'resolved' =
          'needs_review'
        if (violation.review?.isBlocked) {
          status = 'blocked'
        } else if (violation.review?.status === 'completed') {
          status = 'pass'
        }

        // Evidence references (simplified - would link to evidence bundles)
        const evidenceReferences: string[] = []
        if (run && run.reviewId) {
          evidenceReferences.push(`run:${run.id}`)
        }
        if (violation.reviewId) {
          evidenceReferences.push(`review:${violation.reviewId}`)
        }

        return {
          id: violation.id,
          repositoryId: violation.repositoryId,
          repositoryName: violation.repository.fullName,
          reviewId: violation.reviewId,
          runId: run ? run.id : null,
          ruleId: violation.ruleId,
          detectorId: violation.ruleId, // Simplified - would have separate detector IDs
          severity: violation.severity as 'info' | 'warn' | 'high' | 'critical',
          status,
          file: violation.file,
          line: violation.line,
          message: violation.message,
          confidence: null, // Would come from AI detectors
          evidenceReferences,
          createdAt: violation.detectedAt.toISOString(),
          resolvedAt: null, // Would track resolution
        }
      })

      const snapshot = {
        findings,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      }

      const validated = findingSnapshotSchema.parse(snapshot)

      log.info({ organizationId, repositoryId: repositoryId || undefined, total }, 'Findings snapshot generated')

      return successResponse(validated)
    } catch (error) {
      log.error(error, 'Failed to generate findings snapshot')
      return errorResponse(
        'FINDINGS_SNAPSHOT_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        500
      )
    }
  },
  { authz: { requiredScopes: ['read'] } }
)
