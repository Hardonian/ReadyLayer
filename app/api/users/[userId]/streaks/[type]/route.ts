import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string; type: string } }
) {
  try {
    const streak = await prisma.userStreak.findUnique({
      where: {
        userId_type: {
          userId: params.userId,
          type: params.type,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    })

    if (!streak) {
      return NextResponse.json(
        { error: 'Streak not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ streak })
  } catch (error) {
    console.error('Error fetching streak:', error)
    return NextResponse.json(
      { error: 'Failed to fetch streak' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string; type: string } }
) {
  try {
    const body = await request.json()
    const activityDate = body.activityDate ? new Date(body.activityDate) : new Date()

    const existingStreak = await prisma.userStreak.findUnique({
      where: {
        userId_type: {
          userId: params.userId,
          type: params.type,
        },
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const activityDateNormalized = new Date(activityDate)
    activityDateNormalized.setHours(0, 0, 0, 0)

    if (!existingStreak) {
      const streak = await prisma.userStreak.create({
        data: {
          userId: params.userId,
          type: params.type,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: activityDateNormalized,
        },
      })

      await prisma.streakHistory.create({
        data: {
          userId: params.userId,
          streakType: params.type,
          activityDate: activityDateNormalized,
          completed: true,
        },
      })

      return NextResponse.json({ streak })
    }

    const lastActivity = existingStreak.lastActivityDate
      ? new Date(existingStreak.lastActivityDate)
      : null
    lastActivity?.setHours(0, 0, 0, 0)

    const daysDiff = lastActivity
      ? Math.floor(
          (activityDateNormalized.getTime() - lastActivity.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0

    let newStreak = existingStreak.currentStreak
    let newLongestStreak = existingStreak.longestStreak

    if (daysDiff === 1) {
      newStreak = existingStreak.currentStreak + 1
      newLongestStreak = Math.max(existingStreak.longestStreak, newStreak)
    } else if (daysDiff > 1) {
      newStreak = 1
    }

    const streak = await prisma.userStreak.update({
      where: {
        userId_type: {
          userId: params.userId,
          type: params.type,
        },
      },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: activityDateNormalized,
      },
    })

      await prisma.streakHistory.upsert({
        where: {
          userId_streakType_activityDate: {
            userId: params.userId,
            streakType: params.type,
            activityDate: activityDateNormalized,
          },
        },
      create: {
        userId: params.userId,
        streakType: params.type,
        activityDate: activityDateNormalized,
        completed: true,
      },
      update: {
        completed: true,
      },
    })

    return NextResponse.json({ streak })
  } catch (error) {
    console.error('Error updating streak:', error)
    return NextResponse.json(
      { error: 'Failed to update streak' },
      { status: 500 }
    )
  }
}
