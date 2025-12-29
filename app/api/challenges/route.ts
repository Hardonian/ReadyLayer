import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { challengeSchema } from '@/lib/validations'
import type { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamId = searchParams.get('teamId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (teamId) where.teamId = teamId
    if (status) where.status = status

    const challenges = await prisma.challenge.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        participants: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ challenges })
  } catch (error) {
    console.error('Error fetching challenges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = challengeSchema.parse(body)

    const challenge = await prisma.challenge.create({
      data: {
        teamId: validated.teamId,
        name: validated.name,
        description: validated.description,
        type: validated.type,
        goal: validated.goal as unknown as Prisma.InputJsonValue,
        startDate: validated.startDate,
        endDate: validated.endDate,
        status: 'upcoming',
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json({ challenge })
  } catch (error) {
    console.error('Error creating challenge:', error)
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    )
  }
}
