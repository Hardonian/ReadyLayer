import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { kudosSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/auth-server'
import { rateLimit, rateLimiters } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, rateLimiters.api)
    if (rateLimitResponse) return rateLimitResponse

    // Authentication
    const fromUserId = await requireAuth(request)

    const body = await request.json()
    const validated = kudosSchema.parse(body)

    if (fromUserId === validated.toUserId) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Cannot give kudos to yourself',
          },
        },
        { status: 400 }
      )
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validated.toUserId },
    })

    if (!targetUser) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Target user not found',
          },
        },
        { status: 404 }
      )
    }

    const kudos = await prisma.kudos.create({
      data: {
        fromUserId,
        toUserId: validated.toUserId,
        type: validated.type,
        message: validated.message,
        contextType: validated.contextType,
        contextId: validated.contextId,
        prId: validated.contextType === 'pr' ? validated.contextId : undefined,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        toUser: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    })

    logger.info({ kudosId: kudos.id, fromUserId, toUserId: validated.toUserId }, 'Kudos created')

    // Update gamification stats
    await prisma.userStats.upsert({
      where: { userId: validated.toUserId },
      create: {
        userId: validated.toUserId,
        prsReviewed: 0,
        issuesCaught: 0,
        testsGenerated: 0,
      },
      update: {},
    })

    return NextResponse.json({ kudos })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.UNAUTHORIZED,
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    logger.error({ error: error.message, stack: error.stack }, 'Error creating kudos')
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to create kudos',
        },
      },
      { status: 500 }
    )
  }
}
