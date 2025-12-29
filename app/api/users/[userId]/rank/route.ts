import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const leaderboardId = searchParams.get('leaderboardId')

    if (!leaderboardId) {
      return NextResponse.json(
        { error: 'leaderboardId is required' },
        { status: 400 }
      )
    }

    const ranking = await prisma.leaderboardRanking.findUnique({
      where: {
        leaderboardId_userId: {
          leaderboardId,
          userId: params.userId,
        },
      },
      include: {
        leaderboard: true,
      },
    })

    if (!ranking) {
      return NextResponse.json(
        { error: 'Ranking not found' },
        { status: 404 }
      )
    }

    const totalRankings = await prisma.leaderboardRanking.count({
      where: { leaderboardId },
    })

    const percentile = Math.round(((totalRankings - ranking.rank) / totalRankings) * 100)

    return NextResponse.json({
      rank: ranking.rank,
      score: ranking.score,
      total: totalRankings,
      percentile,
      leaderboard: ranking.leaderboard,
    })
  } catch (error) {
    console.error('Error fetching user rank:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user rank' },
      { status: 500 }
    )
  }
}
