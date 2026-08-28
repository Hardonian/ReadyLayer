/**
 * Optimized Dashboard Metrics Snapshot API
 *
 * Performance improvements:
 * - Uses database-level aggregations with groupBy (no more in-memory processing)
 * - Caches snapshot for 60 seconds
 * - Reduces data transfer with targeted selects
 * - Parallel query execution
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
import { cache, buildCacheKey } from '@/lib/db/cache'

const CACHE_TTL = 60 // 60 seconds

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
        errors: queryResult.error.issues,
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
    }) as { id: string; organizationId: string; userId: string; role: string } | null

    if (!membership) {
      return errorResponse('FORBIDDEN', 'Access denied', 403)
    }

    // Check cache first
    const cacheKey = buildCacheKey('metrics', `${timeRange}:${repositoryId || 'all'}`, organizationId)
    const cached = await cache.get(cacheKey)
    if (cached) {
      log.info({ organizationId, cached: true }, 'Metrics snapshot served from cache')
      return successResponse(cached)
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

      // Build repository filter
      const repoFilter = repositoryId ? { id: repositoryId } : {}

      // Execute all aggregations in parallel using database-level operations
      const [
        // KPIs - Aggregated counts
        runStats,
        reviewStats,
        violationStats,
        aiTouchedStats,

        // Trends - Hourly aggregations
        hourlyRuns,
        hourlyReviews,
        hourlyViolations,

        // Hot repos - Pre-aggregated by repository
        repoMetrics,
      ] = await Promise.all([
        // Total runs count
        prisma.readyLayerRun.count({
          where: {
            repository: { organizationId, ...repoFilter },
            createdAt: { gte: startTime },
          },
        }),

        // Review stats with blocking info
        prisma.review.groupBy({
          by: ['isBlocked', 'status'],
          where: {
            repository: { organizationId, ...repoFilter },
            createdAt: { gte: startTime },
          },
          _count: { id: true },
        }),

        // Violation stats by severity
        prisma.violation.groupBy({
          by: ['severity'],
          where: {
            repository: { organizationId, ...repoFilter },
            detectedAt: { gte: startTime },
          },
          _count: { id: true },
        }),

        // AI touched detections count
        prisma.readyLayerRun.count({
          where: {
            repository: { organizationId, ...repoFilter },
            createdAt: { gte: startTime },
            aiTouchedDetected: true,
          },
        }),

        // Hourly run trends (using raw query for efficiency)
        prisma.$queryRaw<Array<{ hour: string; count: number; ai_touched: number }>>`
          SELECT
            DATE_TRUNC('hour', "createdAt") as hour,
            COUNT(*) as count,
            SUM(CASE WHEN "aiTouchedDetected" = true THEN 1 ELSE 0 END) as ai_touched
          FROM "ReadyLayerRun"
          WHERE "repositoryId" IN (
            SELECT id FROM "Repository"
            WHERE "organizationId" = ${organizationId}
            ${repositoryId ? prisma.$queryRaw`AND id = ${repositoryId}` : prisma.$queryRaw``}
          )
          AND "createdAt" >= ${startTime}
          GROUP BY DATE_TRUNC('hour', "createdAt")
          ORDER BY hour
        `,

        // Hourly review trends
        prisma.$queryRaw<Array<{ hour: string; opened: number; merged: number; blocked: number }>>`
          SELECT
            DATE_TRUNC('hour', "createdAt") as hour,
            COUNT(*) as opened,
            SUM(CASE WHEN status = 'completed' AND "isBlocked" = false THEN 1 ELSE 0 END) as merged,
            SUM(CASE WHEN "isBlocked" = true THEN 1 ELSE 0 END) as blocked
          FROM "Review"
          WHERE "repositoryId" IN (
            SELECT id FROM "Repository"
            WHERE "organizationId" = ${organizationId}
            ${repositoryId ? prisma.$queryRaw`AND id = ${repositoryId}` : prisma.$queryRaw``}
          )
          AND "createdAt" >= ${startTime}
          GROUP BY DATE_TRUNC('hour', "createdAt")
          ORDER BY hour
        `,

        // Hourly violation trends by severity
        prisma.$queryRaw<Array<{ hour: string; severity: string; count: number }>>`
          SELECT
            DATE_TRUNC('hour', "detectedAt") as hour,
            severity,
            COUNT(*) as count
          FROM "Violation"
          WHERE "repositoryId" IN (
            SELECT id FROM "Repository"
            WHERE "organizationId" = ${organizationId}
            ${repositoryId ? prisma.$queryRaw`AND id = ${repositoryId}` : prisma.$queryRaw``}
          )
          AND "detectedAt" >= ${startTime}
          GROUP BY DATE_TRUNC('hour', "detectedAt"), severity
          ORDER BY hour, severity
        `,

        // Repository metrics pre-aggregated
        prisma.$queryRaw<Array<{
          repositoryId: string
          repositoryName: string
          total: number
          blocked: number
          critical: number
        }>>`
          WITH review_stats AS (
            SELECT
              r.id as "repositoryId",
              r."fullName" as "repositoryName",
              COUNT(*) as total,
              SUM(CASE WHEN rev."isBlocked" = true THEN 1 ELSE 0 END) as blocked
            FROM "Repository" r
            LEFT JOIN "Review" rev ON rev."repositoryId" = r.id
            WHERE r."organizationId" = ${organizationId}
            ${repositoryId ? prisma.$queryRaw`AND r.id = ${repositoryId}` : prisma.$queryRaw``}
            AND rev."createdAt" >= ${startTime}
            GROUP BY r.id, r."fullName"
          ),
          violation_stats AS (
            SELECT
              v."repositoryId",
              SUM(CASE WHEN v.severity = 'critical' THEN 1 ELSE 0 END) as critical
            FROM "Violation" v
            WHERE v."detectedAt" >= ${startTime}
            GROUP BY v."repositoryId"
          )
          SELECT
            rs."repositoryId",
            rs."repositoryName",
            rs.total,
            rs.blocked,
            COALESCE(vs.critical, 0) as critical
          FROM review_stats rs
          LEFT JOIN violation_stats vs ON vs."repositoryId" = rs."repositoryId"
          WHERE rs.total > 0
          ORDER BY (rs.blocked + COALESCE(vs.critical, 0)) DESC
          LIMIT 10
        `,
      ])

      // Calculate KPIs from aggregated data
      const totalRuns = runStats
      const blockedPRs = reviewStats
        .filter((r: { isBlocked: boolean }) => r.isBlocked)
        .reduce((sum: number, r: { _count: { id: number } }) => sum + r._count.id, 0)
      const criticalFindings = violationStats
        .filter((v: { severity: string }) => v.severity === 'critical')
        .reduce((sum: number, v: { _count: { id: number } }) => sum + v._count.id, 0)
      const aiRiskDetections = aiTouchedStats

      // Calculate mean time to unblock (using raw query for efficiency)
      const meanTimeToUnblockResult = await prisma.$queryRaw<[{
        meanTimeMinutes: number
      }]>`
        SELECT
          AVG(
            EXTRACT(EPOCH FROM (rev."completedAt" - rev."createdAt")) / 60
          ) as "meanTimeMinutes"
        FROM "Review" rev
        JOIN "Repository" r ON r.id = rev."repositoryId"
        WHERE r."organizationId" = ${organizationId}
        ${repositoryId ? prisma.$queryRaw`AND r.id = ${repositoryId}` : prisma.$queryRaw``}
        AND rev."isBlocked" = true
        AND rev."completedAt" IS NOT NULL
        AND rev."createdAt" >= ${startTime}
      `
      const meanTimeToUnblock = meanTimeToUnblockResult[0]?.meanTimeMinutes || 0

      // Build trends from hourly aggregations
      const prThroughput = {
        opened: hourlyReviews.reduce((sum: number, r: { opened: number }) => sum + r.opened, 0),
        merged: hourlyReviews.reduce((sum: number, r: { merged: number }) => sum + r.merged, 0),
        blocked: hourlyReviews.reduce((sum: number, r: { blocked: number }) => sum + r.blocked, 0),
      }

      // Gate outcomes from hourly runs
      const gateOutcomes: Record<string, { passed: number; failed: number }> = {}
      hourlyRuns.forEach((run: { hour: string; count: number; ai_touched: number }) => {
        // This is simplified - in production you'd track actual gate outcomes
        const hour = run.hour
        if (!gateOutcomes[hour]) {
          gateOutcomes[hour] = { passed: 0, failed: 0 }
        }
      })

      // AI touched trend
      const aiTouchedTrend = hourlyRuns
        .filter((r: { ai_touched: number }) => r.ai_touched > 0)
        .map((r: { hour: string; ai_touched: number }) => ({
          timestamp: r.hour,
          count: r.ai_touched,
        }))

      // Findings trend
      const findingsTrend = hourlyViolations.map((v: { hour: string; severity: string; count: number }) => ({
        timestamp: v.hour,
        severity: v.severity,
        count: v.count,
      }))

      // Hot repos from pre-aggregated query
      const hotRepos = repoMetrics.map((repo) => ({
        repositoryId: repo.repositoryId,
        repositoryName: repo.repositoryName,
        blockedRate: repo.total > 0 ? repo.blocked / repo.total : 0,
        criticalRate: repo.total > 0 ? repo.critical / repo.total : 0,
      }))

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

      // Cache the result
      await cache.set(cacheKey, validated, CACHE_TTL)

      log.info({ organizationId, repositoryId: repositoryId || undefined, cached: false }, 'Metrics snapshot generated')

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
