import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: params.userId },
      include: {
        badge: true,
      },
      orderBy: { earnedAt: 'desc' },
    })

    return NextResponse.json({ badges: userBadges })
  } catch (error) {
    console.error('Error fetching user badges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user badges' },
      { status: 500 }
    )
  }
}
