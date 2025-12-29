import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const streaks = await prisma.userStreak.findMany({
      where: { userId: params.userId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ streaks })
  } catch (error) {
    console.error('Error fetching user streaks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user streaks' },
      { status: 500 }
    )
  }
}
