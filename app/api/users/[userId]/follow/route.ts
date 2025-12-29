import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const body = await request.json()
    const { followerId } = body

    if (followerId === params.userId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    const follow = await prisma.userFollow.create({
      data: {
        followerId,
        followeeId: params.userId,
      },
    })

    return NextResponse.json({ follow })
  } catch (error) {
    console.error('Error creating follow:', error)
    return NextResponse.json(
      { error: 'Failed to create follow' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const followerId = searchParams.get('followerId')

    if (!followerId) {
      return NextResponse.json(
        { error: 'followerId is required' },
        { status: 400 }
      )
    }

    await prisma.userFollow.delete({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId: params.userId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting follow:', error)
    return NextResponse.json(
      { error: 'Failed to delete follow' },
      { status: 500 }
    )
  }
}
