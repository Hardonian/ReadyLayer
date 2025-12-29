import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const kudos = await prisma.kudos.findMany({
      where: { toUserId: params.userId },
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
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ kudos })
  } catch (error) {
    console.error('Error fetching kudos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch kudos' },
      { status: 500 }
    )
  }
}
