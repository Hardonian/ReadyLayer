/**
 * Dashboard Metrics Snapshot API
 * 
 * GET /api/dashboard/metrics - Get aggregated metrics snapshot
 */

import { prisma } from '@/lib/prisma'
import {
  createRouteHandler,
  errorResponse,
  successResponse,
  RouteContext,
} from '@/lib/api-route-helpers'
import { snapshotQuerySchema, metricsSnapshotSchema } from '@/lib/dashboard/schemas'

export const GET = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user, log } = context
    const { searchParams } = new URL(request.url)

    // Parse and validate query params
    const queryResult = snapshotQuerySchema.safeParse({
      organizationId: searchParams.get('organizationId'),
      repositoryId: searchParams.get('repositoryId'),
      timeRange: searchParams.get('timeRange') || '24h',
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    if (!queryResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        errors: queryResult.error.errors,
      })
    }

    const { organizationId, repositoryId, timeRange } = queryResult.data

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
      return errorResponse('FORBIDDEN', 'Access denied', 403)
    }

    try {
      // Calculate time range
      const now = new Date()
      const timeRangeMap = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      }
      const startTime = new Date(now.getTime() - timeRangeMap[timeRange])

      // Build where clause
      const where: {
        repository?: { organizationId: string; id?: string }
        createdAt: { gte: Date }
      } = {
        repository: {
          organizationId,
        },
        createdAt: { gte: startTime },
      }

      if (repositoryId) {
        where.repository!.id = repositoryId
      }

      // Get runs
      const runs = await prisma.readyLayerRun.findMany({
        where,
        include: {
          repository: true,
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      // Get reviews (for PR metrics)
      const reviews = await prisma.review.findMany({
        where: {
          repository: {
            organizationId,
            ...(repositoryId ? { id: repositoryId } : {}),
          },
          createdAt: { gte: startTime },
        },
        include: {
          repository: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      // Get violations (for findings)
      const violations = await prisma.violation.findMany({
        where: {
          repository: {
            organizationId,
            ...(repositoryId ? { id: repositoryId } : {}),
          },
          detectedAt: { gte: startTime },
        },
        include: {
          repository: true,
        },
      })

      // Calculate KPIs
      const totalRuns = runs.length
      const blockedPRs = reviews.filter((r: { isBlocked: boolean }) => r.isBlocked).length
      const criticalFindings = violations.filter((v: { severity: string }) => v.severity === 'critical').length
      const aiRiskDetections = runs.filter((r: { aiTouchedDetected: boolean }) => r.aiTouchedDetected).length

      // Calculate mean time to unblock (simplified - would need more data in real implementation)
      const unblockedReviews = reviews.filter((r: { isBlocked: boolean; completedAt: Date | null }) => r.isBlocked && r.completedAt)
      const meanTimeToUnblock =
        unblockedReviews.length > 0
          ? unblockedReviews.reduce((acc: number, r: { completedAt: Date; createdAt: Date }) => {
              const blockedTime = r.completedAt.getTime() - r.createdAt.getTime()
              return acc + blockedTime
            }, 0) /
              unblockedReviews.length /
              (60 * 1000) // Convert to minutes
          : 0

      // Calculate trends (simplified - would use time buckets in production)
      const prThroughput = {
        opened: reviews.length,
        merged: reviews.filter((r: { status: string; isBlocked: boolean }) => r.status === 'completed' && !r.isBlocked).length,
        blocked: blockedPRs,
      }

      // Gate outcomes by repo
      const gateOutcomes: Record<string, { passed: number; failed: number }> = {}
      runs.forEach((run: { repository?: { fullName: string } | null; gatesPassed: boolean }) => {
        const repoName = run.repository?.fullName || 'unknown'
        if (!gateOutcomes[repoName]) {
          gateOutcomes[repoName] = { passed: 0, failed: 0 }
        }
        if (run.gatesPassed) {
          gateOutcomes[repoName].passed++
        } else {
          gateOutcomes[repoName].failed++
        }
      })

      // AI touched trend (hourly buckets)
      const aiTouchedTrend: Array<{ timestamp: string; count: number }> = []
      const hourlyBuckets: Record<string, number> = {}
      runs
        .filter((r: { aiTouchedDetected: boolean }) => r.aiTouchedDetected)
        .forEach((r: { createdAt: Date }) => {
          const hour = new Date(r.createdAt).toISOString().slice(0, 13) + ':00:00.000Z'
          hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1
        })
      Object.entries(hourlyBuckets)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([timestamp, count]) => {
          aiTouchedTrend.push({ timestamp, count })
        })

      // Findings trend
      const findingsTrend: Array<{ timestamp: string; severity: string; count: number }> = []
      const findingsBuckets: Record<string, Record<string, number>> = {}
      violations.forEach((v: { detectedAt: Date; severity: string }) => {
        const hour = new Date(v.detectedAt).toISOString().slice(0, 13) + ':00:00.000Z'
        if (!findingsBuckets[hour]) {
          findingsBuckets[hour] = {}
        }
        findingsBuckets[hour][v.severity] = (findingsBuckets[hour][v.severity] || 0) + 1
      })
      Object.entries(findingsBuckets).forEach(([timestamp, severities]) => {
        Object.entries(severities).forEach(([severity, count]) => {
          findingsTrend.push({ timestamp, severity, count })
        })
      })
      findingsTrend.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

      // Hot repos (repos with highest blocked/critical rates)
      const repoStats: Record<
        string,
        { name: string; blocked: number; critical: number; total: number }
      > = {}
      reviews.forEach((r: { repositoryId: string; repository: { fullName: string }; isBlocked: boolean }) => {
        const repoId = r.repositoryId
        if (!repoStats[repoId]) {
          repoStats[repoId] = {
            name: r.repository.fullName,
            blocked: 0,
            critical: 0,
            total: 0,
          }
        }
        repoStats[repoId].total++
        if (r.isBlocked) {
          repoStats[repoId].blocked++
        }
      })
      violations.forEach((v: { repositoryId: string; repository: { fullName: string }; severity: string }) => {
        if (v.severity === 'critical') {
          const repoId = v.repositoryId
          if (!repoStats[repoId]) {
            repoStats[repoId] = {
              name: v.repository.fullName,
              blocked: 0,
              critical: 0,
              total: 0,
            }
          }
          repoStats[repoId].critical++
        }
      })

      const hotRepos = Object.entries(repoStats)
        .map(([repositoryId, stats]) => ({
          repositoryId,
          repositoryName: stats.name,
          blockedRate: stats.total > 0 ? stats.blocked / stats.total : 0,
          criticalRate: stats.total > 0 ? stats.critical / stats.total : 0,
        }))
        .sort((a, b) => b.blockedRate + b.criticalRate - (a.blockedRate + a.criticalRate))
        .slice(0, 10)

      const snapshot = {
        timeRange,
        timestamp: now.toISOString(),
        kpis: {
          totalRuns,
          blockedPRs,
          criticalFindings,
          aiRiskDetections,
          meanTimeToUnblock: Math.round(meanTimeToUnblock * 10) / 10,
        },
        trends: {
          prThroughput,
          gateOutcomes,
          aiTouchedTrend,
          findingsTrend,
        },
        hotRepos,
      }

      // Validate snapshot structure
      const validated = metricsSnapshotSchema.parse(snapshot)

      log.info({ organizationId, repositoryId: repositoryId || undefined }, 'Metrics snapshot generated')

      return successResponse(validated)
    } catch (error) {
      log.error(error, 'Failed to generate metrics snapshot')
      return errorResponse(
        'METRICS_CALCULATION_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        500
      )
    }
  },
  { authz: { requiredScopes: ['read'] } }
)
