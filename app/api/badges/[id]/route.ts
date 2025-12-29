import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const badge = await prisma.badge.findUnique({
      where: { id: params.id },
      include: {
        userBadges: {
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
          orderBy: { earnedAt: 'desc' },
        },
      },
    })

    if (!badge) {
      return NextResponse.json(
        { error: 'Badge not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ badge })
  } catch (error) {
    console.error('Error fetching badge:', error)
    return NextResponse.json(
      { error: 'Failed to fetch badge' },
      { status: 500 }
    )
  }
}
