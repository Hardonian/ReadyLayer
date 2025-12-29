import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const badges = await prisma.badge.findMany({
      include: {
        userBadges: {
          where: { userId: params.userId },
          take: 1,
        },
      },
    })

    const progress = badges.map((badge: { id: string; code: string; name: string; userBadges: Array<{ progress: number }> }) => ({
      badgeId: badge.id,
      badgeCode: badge.code,
      badgeName: badge.name,
      progress: badge.userBadges[0]?.progress ?? 0,
      earned: badge.userBadges[0]?.progress === 100,
    }))

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error fetching badge progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch badge progress' },
      { status: 500 }
    )
  }
}
