import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { kudosSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = kudosSchema.parse(body)

    const kudos = await prisma.kudos.create({
      data: {
        fromUserId: validated.toUserId, // This should come from auth
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
