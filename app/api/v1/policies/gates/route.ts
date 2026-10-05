/**
 * Policy gate compatibility API.
 *
 * Gates are represented by rules in immutable, versioned PolicyPacks. This
 * route exposes the operator-friendly gate shape without creating a second
 * persistence model that could drift from enforcement.
 */
import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'
import { logger } from '../../../../../observability/logging'
import { requireAuth, hasRole } from '../../../../../lib/auth'
import { createAuthzMiddleware } from '../../../../../lib/authz'
import { errorResponse, parseJsonBody, successResponse } from '../../../../../lib/api-route-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CreateGateSchema = z.object({
  organizationId: z.string().min(1),
  repositoryId: z.string().min(1).nullable().optional(),
  template: z.string().min(1).max(160),
  name: z.string().trim().min(1).max(160).optional(),
  enforcementMode: z.enum(['warn', 'block']).default('block'),
  enabled: z.boolean().default(true),
})

type EnforcementMode = 'warn' | 'block'

function readEnforcementMode(value: unknown): EnforcementMode {
  if (!value || typeof value !== 'object') return 'warn'
  const mapping = value as Record<string, unknown>
  return Object.values(mapping).some((entry) => entry === 'block') ? 'block' : 'warn'
}

function readPolicyName(source: string, fallback: string): string {
  try {
    const parsed = JSON.parse(source) as { name?: unknown }
    return typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : fallback
  } catch {
    return fallback
  }
}

function toGate(
  pack: {
    id: string
    organizationId: string
    repositoryId: string | null
    version: string
    checksum: string
    source: string
    organization: { name: string }
    repository: { fullName: string } | null
  },
  rule: { id: string; ruleId: string; enabled: boolean; severityMapping: unknown },
) {
  return {
    id: rule.id,
    name: readPolicyName(pack.source, rule.ruleId),
    template: rule.ruleId,
    enforcementMode: readEnforcementMode(rule.severityMapping),
    exceptions: {},
    enabled: rule.enabled,
    organizationId: pack.organizationId,
    organizationName: pack.organization.name,
    repositoryId: pack.repositoryId,
    repositoryName: pack.repository?.fullName ?? null,
    policyPackId: pack.id,
    policyVersion: pack.version,
    checksum: pack.checksum,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`
  const log = logger.child({ requestId })

  try {
    const user = await requireAuth(request)
    const authzResponse = await createAuthzMiddleware({ requiredScopes: ['read'] })(request)
    if (authzResponse) return authzResponse

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const repositoryId = searchParams.get('repositoryId')
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    })
    const organizationIds = memberships.map((membership) => membership.organizationId)

    if (organizationId && !organizationIds.includes(organizationId)) {
      return errorResponse('FORBIDDEN', 'Access denied to organization', 403)
    }
    const scopedOrganizationIds = organizationId ? [organizationId] : organizationIds
    if (scopedOrganizationIds.length === 0) return NextResponse.json({ gates: [] })

    const packs = await prisma.policyPack.findMany({
      where: {
        organizationId: { in: scopedOrganizationIds },
        ...(repositoryId ? { repositoryId } : {}),
      },
      include: {
        rules: true,
        organization: { select: { name: true } },
        repository: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      gates: packs.flatMap((pack) => pack.rules.map((rule) => toGate(pack, rule))),
    })
  } catch (error) {
    log.error(error, 'Failed to list policy gates')
    return errorResponse('LIST_GATES_FAILED', 'Policy gates could not be loaded. Retry the request.', 500)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`
  const log = logger.child({ requestId })

  try {
    const user = await requireAuth(request)
    const authzResponse = await createAuthzMiddleware({ requiredScopes: ['write'] })(request)
    if (authzResponse) return authzResponse

    const bodyResult = await parseJsonBody(request)
    if (!bodyResult.success) return bodyResult.response
    const validation = CreateGateSchema.safeParse(bodyResult.data)
    if (!validation.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid policy gate configuration', 400, {
        errors: validation.error.issues,
      })
    }

    const { organizationId, repositoryId, template, name, enforcementMode, enabled } = validation.data
    if (!(await hasRole(user.id, organizationId, 'admin'))) {
      return errorResponse('FORBIDDEN', 'Only organization admins can create policy gates', 403)
    }

    if (repositoryId) {
      const repository = await prisma.repository.findFirst({
        where: { id: repositoryId, organizationId },
        select: { id: true },
      })
      if (!repository) return errorResponse('NOT_FOUND', 'Repository not found in this organization', 404)
    }

    // Millisecond precision keeps rapid, repeated gate creation from colliding
    // on the PolicyPack (organization, repository, version) unique key.
    const version = `1.0.${Date.now()}`
    const gateName = name || template
    const source = JSON.stringify({
      name: gateName,
      type: 'policy-gate',
      template,
      enforcementMode,
      enabled,
      version,
    }, null, 2)
    const severityMapping = Object.fromEntries(
      ['critical', 'high', 'medium', 'low'].map((severity) => [severity, enforcementMode]),
    )
    const pack = await prisma.policyPack.create({
      data: {
        organizationId,
        repositoryId: repositoryId || null,
        version,
        source,
        checksum: createHash('sha256').update(source, 'utf8').digest('hex'),
        rules: {
          create: {
            ruleId: template,
            severityMapping,
            enabled,
            params: { template, name: gateName },
          },
        },
      },
      include: {
        rules: true,
        organization: { select: { name: true } },
        repository: { select: { fullName: true } },
      },
    })

    log.info({ organizationId, policyPackId: pack.id, template }, 'Policy gate created')
    return successResponse({ gate: toGate(pack, pack.rules[0]) }, 201)
  } catch (error) {
    log.error(error, 'Failed to create policy gate')
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return errorResponse('DUPLICATE_ENTRY', 'A gate with this configuration already exists. Retry with a new version.', 409)
    }
    return errorResponse('CREATE_GATE_FAILED', 'Policy gate could not be created. Retry the request.', 500)
  }
}
