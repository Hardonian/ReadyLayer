import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const scope = searchParams.get('scope')
    const period = searchParams.get('period')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (scope) where.scope = scope
    if (period) where.period = period

    const leaderboards = await prisma.leaderboard.findMany({
      where,
      include: {
        rankings: {
          take: 10,
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
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ leaderboards })
  } catch (error) {
    console.error('Error fetching leaderboards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboards' },
      { status: 500 }
    )
  }
}
