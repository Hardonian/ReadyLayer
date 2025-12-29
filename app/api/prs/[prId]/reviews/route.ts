import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-server'
import { rateLimit, rateLimiters } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { ErrorCodes } from '@/lib/errors'
import { z } from 'zod'

const createReviewSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'needs_discussion', 'changes_requested']),
  comment: z.string().optional(),
  reviewType: z.enum(['human', 'ai_verified']).default('human'),
  issuesFound: z
    .array(
      z.object({
        severity: z.enum(['critical', 'high', 'medium', 'low']),
        type: z.string(),
        file: z.string(),
        line: z.number().int().optional(),
        message: z.string(),
      })
    )
    .optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { prId: string } }
) {
  try {
    const rateLimitResponse = await rateLimit(request, rateLimiters.api)
    if (rateLimitResponse) return rateLimitResponse

    await requireAuth(request)

    const reviews = await prisma.teamReview.findMany({
      where: { prId: params.prId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ reviews })
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

    logger.error({ error: error.message, prId: params.prId }, 'Error fetching reviews')
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to fetch reviews',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { prId: string } }
) {
  try {
    const rateLimitResponse = await rateLimit(request, rateLimiters.review)
    if (rateLimitResponse) return rateLimitResponse

    const reviewerId = await requireAuth(request)

    // Verify PR exists
    const pr = await prisma.pullRequest.findUnique({
      where: { id: params.prId },
    })

    if (!pr) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Pull request not found',
          },
        },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validated = createReviewSchema.parse(body)

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Create review
      const review = await tx.teamReview.create({
        data: {
          prId: params.prId,
          reviewerId,
          status: validated.status,
          comment: validated.comment,
          reviewType: validated.reviewType,
          issuesFound: validated.issuesFound as any,
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })

      // Update user stats based on issues found
      if (validated.issuesFound && validated.issuesFound.length > 0) {
        const stats = validated.issuesFound.reduce(
          (acc, issue) => {
            if (issue.severity === 'critical' || issue.severity === 'high') {
              acc.securityIssues++
            }
            acc.issuesCaught++
            return acc
          },
          { securityIssues: 0, issuesCaught: 0 }
        )

        await tx.userStats.upsert({
          where: { userId: reviewerId },
          create: {
            userId: reviewerId,
            prsReviewed: 1,
            issuesCaught: stats.issuesCaught,
            securityIssuesCaught: stats.securityIssues,
            testsGenerated: 0,
          },
          update: {
            prsReviewed: { increment: 1 },
            issuesCaught: { increment: stats.issuesCaught },
            securityIssuesCaught: { increment: stats.securityIssues },
          },
        })

        // Gamification updates are handled via user stats updates above
        // Full gamification processing can be done asynchronously if needed
      } else {
        // Just increment PRs reviewed
        await tx.userStats.upsert({
          where: { userId: reviewerId },
          create: {
            userId: reviewerId,
            prsReviewed: 1,
            issuesCaught: 0,
            testsGenerated: 0,
          },
          update: {
            prsReviewed: { increment: 1 },
          },
        })
      }

      return review
    })

    logger.info(
      {
        reviewId: result.id,
        prId: params.prId,
        reviewerId,
        status: validated.status,
        issuesFound: validated.issuesFound?.length || 0,
      },
      'Review created'
    )

    return NextResponse.json({ review: result }, { status: 201 })
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

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Invalid input data',
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    logger.error({ error: error.message, prId: params.prId }, 'Error creating review')
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to create review',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * Update gamification for a code review
 * Note: Currently handled via user stats updates in the transaction
 */
async function _updateGamificationForReview(
  _tx: unknown,
  _userId: string,
  _stats: { securityIssues: number; issuesCaught: number }
) {
  // Update streak for code review activity
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingStreak = await tx.userStreak.findUnique({
    where: {
      userId_type: {
        userId,
        type: 'code_review',
      },
    },
  })

  if (existingStreak) {
    const lastActivity = existingStreak.lastActivityDate
      ? new Date(existingStreak.lastActivityDate)
      : null
    lastActivity?.setHours(0, 0, 0, 0)

    const daysDiff = lastActivity
      ? Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    let newStreak = existingStreak.currentStreak
    let newLongestStreak = existingStreak.longestStreak

    if (daysDiff === 1) {
      newStreak = existingStreak.currentStreak + 1
      newLongestStreak = Math.max(existingStreak.longestStreak, newStreak)
    } else if (daysDiff > 1) {
      newStreak = 1
    } else if (daysDiff === 0) {
      // Same day, don't increment
      return
    }

    await tx.userStreak.update({
      where: {
        userId_type: {
          userId,
          type: 'code_review',
        },
      },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: today,
      },
    })
  } else {
    await tx.userStreak.create({
      data: {
        userId,
        type: 'code_review',
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      },
    })
  }

  // Check for badge eligibility (simplified - would need full badge criteria evaluation)
  // This is a placeholder for the full gamification service integration
}
