import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: params.id },
      include: {
        participants: {
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
          },
        },
      },
    })

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      )
    }

    // Calculate progress based on challenge type and goal
    const progress = {
      totalParticipants: challenge.participants.length,
      participants: challenge.participants.map((p: { user: unknown; progress: unknown }) => ({
        user: p.user,
        progress: p.progress,
      })),
    }

    return NextResponse.json({ challenge, progress })
  } catch (error) {
    console.error('Error fetching challenge progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch challenge progress' },
      { status: 500 }
    )
  }
}
