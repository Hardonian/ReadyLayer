import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (userId) {
      where.OR = [
        { initiatorId: userId },
        { partnerId: userId },
      ]
    }
    if (status) where.status = status

    const sessions = await prisma.pairSession.findMany({
      where,
      include: {
        initiator: {
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
        partner: {
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

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching pair sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pair sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initiatorId, partnerId, prId } = body

    const session = await prisma.pairSession.create({
      data: {
        initiatorId,
        partnerId,
        prId,
        status: 'pending',
      },
      include: {
        initiator: {
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
        partner: {
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
    })

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error creating pair session:', error)
    return NextResponse.json(
      { error: 'Failed to create pair session' },
      { status: 500 }
    )
  }
}
