import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userId } = body

    const existing = await prisma.insightInteraction.findUnique({
      where: {
        insightId_userId_type: {
          insightId: params.id,
          userId,
          type: 'like',
        },
      },
    })

    if (existing) {
      await prisma.insightInteraction.delete({
        where: {
          insightId_userId_type: {
            insightId: params.id,
            userId,
            type: 'like',
          },
        },
      })

      await prisma.insight.update({
        where: { id: params.id },
        data: {
          likesCount: { decrement: 1 },
        },
      })

      return NextResponse.json({ liked: false })
    }

    await prisma.insightInteraction.create({
      data: {
        insightId: params.id,
        userId,
        type: 'like',
      },
    })

    await prisma.insight.update({
      where: { id: params.id },
      data: {
        likesCount: { increment: 1 },
      },
    })

    return NextResponse.json({ liked: true })
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    )
  }
}
