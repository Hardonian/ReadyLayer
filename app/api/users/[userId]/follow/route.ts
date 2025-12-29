import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // TODO: Implement authentication middleware
    // const authenticatedUserId = await getAuthenticatedUserId(request)
    // if (!authenticatedUserId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // TODO: Remove this hardcoded userId once auth is implemented
    const authenticatedUserId = 'temp-user-id' // Should come from auth middleware
    const followerId = authenticatedUserId // Fixed: Use authenticated user, not body

    if (followerId === params.userId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if already following
    const existingFollow = await prisma.userFollow.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId: params.userId,
        },
      },
    })

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following this user' },
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
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // TODO: Implement authentication middleware
    // const authenticatedUserId = await getAuthenticatedUserId(request)
    // if (!authenticatedUserId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // TODO: Remove this hardcoded userId once auth is implemented
    const authenticatedUserId = 'temp-user-id' // Should come from auth middleware
    const followerId = authenticatedUserId // Fixed: Use authenticated user, not query param

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
