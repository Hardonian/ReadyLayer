import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const activities: unknown[] = []

    // Fetch achievements
    const achievements = await prisma.userAchievement.findMany({
      where: {
        earnedAt: { not: null },
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
        achievement: true,
      },
      orderBy: { earnedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    achievements.forEach((achievement: { id: string; user: unknown; achievement: unknown; earnedAt: Date | null }) => {
      activities.push({
        type: 'achievement',
        id: achievement.id,
        user: achievement.user,
        achievement: achievement.achievement,
        timestamp: achievement.earnedAt,
      })
    })

    // Fetch kudos
    const kudos = await prisma.kudos.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    kudos.forEach((kudo: { id: string; fromUser: unknown; toUser: unknown; type: string; message: string | null; createdAt: Date }) => {
      activities.push({
        type: 'kudos',
        id: kudo.id,
        fromUser: kudo.fromUser,
        toUser: kudo.toUser,
        kudosType: kudo.type,
        message: kudo.message,
        timestamp: kudo.createdAt,
      })
    })

    // Sort by timestamp
    activities.sort((a, b) => {
      const aTime = (a as { timestamp: Date }).timestamp.getTime()
      const bTime = (b as { timestamp: Date }).timestamp.getTime()
      return bTime - aTime
    })

    return NextResponse.json({
      activities: activities.slice(0, limit),
      total: activities.length,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching feed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    )
  }
}
