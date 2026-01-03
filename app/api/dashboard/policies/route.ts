/**
 * Dashboard Policies Snapshot API
 * 
 * GET /api/dashboard/policies - Get policy management snapshot
 */

import { prisma } from '@/lib/prisma'
import {
  createRouteHandler,
  errorResponse,
  successResponse,
  RouteContext,
  parsePagination,
} from '@/lib/api-route-helpers'
import { snapshotQuerySchema, policySnapshotSchema } from '@/lib/dashboard/schemas'

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
    })

    if (!membership) {
      return errorResponse('FORBIDDEN', 'Access denied', 403)
    }

    try {
      // Build where clause
      const where: {
        organizationId: string
        repositoryId?: string | null
      } = {
        organizationId,
      }

      if (repositoryId) {
        where.repositoryId = repositoryId
      }

      // Get total count
      const total = await prisma.policyPack.count({ where })

      // Get policy packs
      const policyPacks = await prisma.policyPack.findMany({
        where,
        include: {
          rules: true,
          repository: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      })

      // Get total repos for coverage calculation
      const totalRepos = await prisma.repository.count({
        where: { organizationId },
      })

      const policies = policyPacks.map((pack: {
        id: string
        organizationId: string
        repositoryId: string | null
        version: string
        rules: Array<{
          id: string
          ruleId: string
          enabled: boolean
          severityMapping: unknown
        }>
        createdAt: Date
        updatedAt: Date
      }) => {
        // Calculate coverage
        const reposCovered = pack.repositoryId ? 1 : totalRepos // Simplified

        return {
          id: pack.id,
          organizationId: pack.organizationId,
          repositoryId: pack.repositoryId,
          version: pack.version,
          rules: pack.rules.map((rule: {
            id: string
            ruleId: string
            enabled: boolean
            severityMapping: unknown
          }) => ({
            id: rule.id,
            ruleId: rule.ruleId,
            enabled: rule.enabled,
            severityMapping: rule.severityMapping as Record<string, string>,
          })),
          coverage: {
            reposCovered,
            totalRepos,
          },
          createdAt: pack.createdAt.toISOString(),
          updatedAt: pack.updatedAt.toISOString(),
        }
      })

      const snapshot = {
        policies,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      }

      const validated = policySnapshotSchema.parse(snapshot)

      log.info({ organizationId, repositoryId: repositoryId || undefined, total }, 'Policies snapshot generated')

      return successResponse(validated)
    } catch (error) {
      log.error(error, 'Failed to generate policies snapshot')
      return errorResponse(
        'POLICIES_SNAPSHOT_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        500
      )
    }
  },
  { authz: { requiredScopes: ['read'] } }
)
