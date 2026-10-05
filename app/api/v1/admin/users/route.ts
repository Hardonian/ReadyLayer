import { createRouteHandler, errorResponse, successResponse, RouteContext } from '@/lib/api-route-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * List members for the selected organization. The organization is always taken
 * from the request context so a user cannot accidentally read another tenant.
 */
export const GET = createRouteHandler(
  async ({ request, user }: RouteContext) => {
    const organizationId = request.headers.get('x-organization-id')
      || new URL(request.url).searchParams.get('organizationId')

    if (!organizationId || !user.organizationIds.includes(organizationId)) {
      return errorResponse('FORBIDDEN', 'Access denied to organization', 403)
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return successResponse({
      organizationId,
      members: members.map((member) => ({
        id: member.user.id,
        name: member.user.name || member.user.email?.split('@')[0] || 'Unnamed teammate',
        email: member.user.email || '',
        image: member.user.image,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    })
  },
  {
    authz: {
      requiredScopes: ['read'],
      requireOrganization: true,
      requireRole: 'admin',
    },
  },
)
