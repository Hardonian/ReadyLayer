import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: params.userId },
      include: {
        achievement: true,
      },
      orderBy: { earnedAt: 'desc' },
    })

    return NextResponse.json({ achievements: userAchievements })
  } catch (error) {
    console.error('Error fetching user achievements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user achievements' },
      { status: 500 }
    )
  }
}
