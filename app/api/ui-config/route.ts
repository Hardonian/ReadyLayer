import {
  createRouteHandler,
  parseJsonBody,
  validateBody,
  errorResponse,
  successResponse,
} from '@/lib/api-route-helpers'
import { getRuntimeUiPublicSnapshot, RuntimeUiConfigPatchSchema } from '@/lib/runtime-ui-config'
import { getRuntimeUiConfigForOrganization, updateRuntimeUiConfigForOrganization } from '@/lib/runtime-ui-config.server'

/**
 * Runtime UI configuration API
 *
 * - GET: returns a safe, public snapshot for an organization (member access)
 * - PUT: updates org runtime UI config (owner access)
 *
 * Notes:
 * - Stored in OrganizationConfig.config.ui (no migration required)
 * - Always returns safe defaults if missing/invalid
 */

export const GET = createRouteHandler(
  async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    if (!organizationId) {
      return errorResponse('BAD_REQUEST', 'organizationId is required', 400)
    }

    const { config, updatedAt, source } = await getRuntimeUiConfigForOrganization(organizationId)

    return successResponse(
      {
        organizationId,
        source,
        updatedAt,
        config: getRuntimeUiPublicSnapshot(config),
      },
      200
    )
  },
  { authz: { requireOrganization: true } }
)

export const PUT = createRouteHandler(
  async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    if (!organizationId) {
      return errorResponse('BAD_REQUEST', 'organizationId is required', 400)
    }

    const bodyResult = await parseJsonBody(request)
    if (!bodyResult.success) return bodyResult.response

    const validation = validateBody(bodyResult.data, RuntimeUiConfigPatchSchema)
    if (!validation.success) return validation.response

    try {
      const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        undefined
      const userAgent = request.headers.get('user-agent') || undefined

      const saved = await updateRuntimeUiConfigForOrganization({
        organizationId,
        userId: user.id,
        patch: validation.data,
        requestMeta: { ipAddress, userAgent },
      })

      return successResponse(
        {
          organizationId,
          updatedAt: saved.updatedAt,
          config: getRuntimeUiPublicSnapshot(saved.config),
        },
        200
      )
    } catch (err) {
      const e = err as unknown as { code?: string; details?: unknown; message?: string }
      if (e.code === 'VALIDATION_ERROR') {
        return errorResponse('VALIDATION_ERROR', 'Invalid runtime UI config patch', 400, {
          errors: e.details,
        })
      }
      return errorResponse('INTERNAL_ERROR', e.message || 'Failed to update runtime UI config', 500)
    }
  },
  { authz: { requireOrganization: true, requireRole: 'owner' } }
)

