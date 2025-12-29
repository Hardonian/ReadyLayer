import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: params.userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // TODO: Implement authentication middleware
    // const authenticatedUserId = await getAuthenticatedUserId(request)
    // if (!authenticatedUserId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    // if (authenticatedUserId !== params.userId) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    // TODO: Remove this hardcoded userId once auth is implemented
    const authenticatedUserId = 'temp-user-id' // Should come from auth middleware
    
    // Authorization check: Users can only update their own profile
    if (authenticatedUserId !== params.userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own profile' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { username, displayName, bio, avatarUrl, bannerUrl, isPublic } = body

    const profile = await prisma.userProfile.upsert({
      where: { userId: params.userId },
      update: {
        ...(username && { username }),
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(isPublic !== undefined && { isPublic }),
      },
      create: {
        userId: params.userId,
        username: username || `user-${params.userId.slice(0, 8)}`,
        displayName,
        bio,
        avatarUrl,
        bannerUrl,
        isPublic: isPublic ?? true,
      },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
