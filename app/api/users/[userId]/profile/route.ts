import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, canAccessResource } from '@/lib/auth-server'
import { rateLimit, rateLimiters } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { ErrorCodes } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const rateLimitResponse = await rateLimit(request, rateLimiters.api)
    if (rateLimitResponse) return rateLimitResponse

    // Try to get authenticated user, but allow public profiles
    let authenticatedUserId: string | null = null
    try {
      authenticatedUserId = await requireAuth(request)
    } catch {
      // Not authenticated, but may still view public profiles
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: params.userId },
      include: {
        user: {
          select: {
            id: true,
            email: authenticatedUserId === params.userId ? true : false, // Only show email to self
            createdAt: true,
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Profile not found',
          },
        },
        { status: 404 }
      )
    }

    // Check if profile is public or user is viewing their own
    if (!profile.isPublic && authenticatedUserId !== params.userId) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.FORBIDDEN,
            message: 'Profile is private',
          },
        },
        { status: 403 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    logger.error({ error: error.message, userId: params.userId }, 'Error fetching profile')
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to fetch profile',
        },
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const rateLimitResponse = await rateLimit(request, rateLimiters.api)
    if (rateLimitResponse) return rateLimitResponse

    const authenticatedUserId = await requireAuth(request)
    
    // Authorization check: Users can only update their own profile
    if (!canAccessResource(authenticatedUserId, params.userId)) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.FORBIDDEN,
            message: 'You can only update your own profile',
          },
        },
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

    logger.info({ userId: params.userId }, 'Profile updated')
    return NextResponse.json({ profile })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.UNAUTHORIZED,
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    logger.error({ error: error.message, userId: params.userId }, 'Error updating profile')
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to update profile',
        },
      },
      { status: 500 }
    )
  }
}
