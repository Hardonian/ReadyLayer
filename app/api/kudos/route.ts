import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { kudosSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // TODO: Implement authentication middleware
    // const userId = await getAuthenticatedUserId(request)
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const validated = kudosSchema.parse(body)

    // TODO: Remove this hardcoded userId once auth is implemented
    const fromUserId = 'temp-user-id' // Should come from auth middleware

    if (fromUserId === validated.toUserId) {
      return NextResponse.json(
        { error: 'Cannot give kudos to yourself' },
        { status: 400 }
      )
    }

    const kudos = await prisma.kudos.create({
      data: {
        fromUserId, // Fixed: Now uses authenticated user
        toUserId: validated.toUserId,
        type: validated.type,
        message: validated.message,
        contextType: validated.contextType,
        contextId: validated.contextId,
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

    return NextResponse.json({ kudos })
  } catch (error) {
    console.error('Error creating kudos:', error)
    return NextResponse.json(
      { error: 'Failed to create kudos' },
      { status: 500 }
    )
  }
}
