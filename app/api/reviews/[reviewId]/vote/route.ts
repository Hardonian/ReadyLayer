import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const body = await request.json()
    const { userId, vote } = body

    if (!['approve', 'reject', 'needs_discussion'].includes(vote)) {
      return NextResponse.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      )
    }

    const reviewVote = await prisma.reviewVote.upsert({
      where: {
        reviewId_userId: {
          reviewId: params.reviewId,
          userId,
        },
      },
      create: {
        reviewId: params.reviewId,
        userId,
        vote,
      },
      update: {
        vote,
      },
    })

    return NextResponse.json({ vote: reviewVote })
  } catch (error) {
    console.error('Error creating vote:', error)
    return NextResponse.json(
      { error: 'Failed to create vote' },
      { status: 500 }
    )
  }
}
