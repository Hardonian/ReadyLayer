import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { insightSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}
    if (category) where.category = category

    const insights = await prisma.insight.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.insight.count({ where })

    return NextResponse.json({
      insights,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = insightSchema.parse(body)
    const userId = (body as { userId?: string }).userId || 'user-id' // Should come from auth
    
    const insight = await prisma.insight.create({
      data: {
        userId,
        title: validated.title,
        content: validated.content,
        category: validated.category,
        tags: validated.tags,
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
      },
    })

    return NextResponse.json({ insight })
  } catch (error) {
    console.error('Error creating insight:', error)
    return NextResponse.json(
      { error: 'Failed to create insight' },
      { status: 500 }
    )
  }
}
