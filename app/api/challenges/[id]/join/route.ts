import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userId } = body

    const participant = await prisma.challengeParticipant.create({
      data: {
        challengeId: params.id,
        userId,
      },
      include: {
        user: {
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
        challenge: true,
      },
    })

    return NextResponse.json({ participant })
  } catch (error) {
    console.error('Error joining challenge:', error)
    return NextResponse.json(
      { error: 'Failed to join challenge' },
      { status: 500 }
    )
  }
}
