import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const rankings = await prisma.leaderboardRanking.findMany({
      where: { leaderboardId: params.id },
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
      orderBy: { rank: 'asc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.leaderboardRanking.count({
      where: { leaderboardId: params.id },
    })

    return NextResponse.json({
      rankings,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching leaderboard rankings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard rankings' },
      { status: 500 }
    )
  }
}
