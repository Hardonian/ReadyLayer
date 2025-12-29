import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-server'
import { rateLimit, rateLimiters } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { ErrorCodes } from '@/lib/errors'
import { z } from 'zod'

const createCodeReviewSchema = z.object({
  aiProvider: z.string().optional(),
  summary: z.string().optional(),
  issuesFound: z.array(
    z.object({
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      type: z.string(),
      file: z.string(),
      line: z.number().int().optional(),
      message: z.string(),
      confidence: z.number().min(0).max(100).optional(),
    })
  ),
  suggestions: z
    .array(
      z.object({
        type: z.string(),
        file: z.string(),
        line: z.number().int().optional(),
        suggestion: z.string(),
      })
    )
    .optional(),
  overallScore: z.number().min(0).max(100).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { prId: string } }
) {
  try {
    const rateLimitResponse = await rateLimit(request, rateLimiters.api)
    if (rateLimitResponse) return rateLimitResponse

    await requireAuth(request)

    const codeReviews = await prisma.codeReview.findMany({
      where: { prId: params.prId },
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ codeReviews })
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

    logger.error({ error: error.message, prId: params.prId }, 'Error fetching code reviews')
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to fetch code reviews',
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
    const validated = createCodeReviewSchema.parse(body)

    // Calculate issue counts
    const securityIssues = validated.issuesFound.filter(
      (issue) => issue.severity === 'critical' || issue.severity === 'high'
    ).length
    const qualityIssues = validated.issuesFound.filter(
      (issue) => issue.type.includes('quality') || issue.type.includes('style')
    ).length
    const testIssues = validated.issuesFound.filter((issue) =>
      issue.type.includes('test')
    ).length
    const docIssues = validated.issuesFound.filter((issue) =>
      issue.type.includes('doc') || issue.type.includes('documentation')
    ).length

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Create AI code review
      const codeReview = await tx.codeReview.create({
        data: {
          prId: params.prId,
          reviewerId,
          aiProvider: validated.aiProvider,
          summary: validated.summary,
          issuesFound: validated.issuesFound as any,
          suggestions: validated.suggestions as any,
          securityIssues,
          qualityIssues,
          testIssues,
          docIssues,
          overallScore: validated.overallScore,
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

      // Update user stats
      await tx.userStats.upsert({
        where: { userId: reviewerId },
        create: {
          userId: reviewerId,
          prsReviewed: 1,
          issuesCaught: validated.issuesFound.length,
          securityIssuesCaught: securityIssues,
          testsGenerated: 0,
        },
        update: {
          prsReviewed: { increment: 1 },
          issuesCaught: { increment: validated.issuesFound.length },
          securityIssuesCaught: { increment: securityIssues },
        },
      })

      return codeReview
    })

    logger.info(
      {
        codeReviewId: result.id,
        prId: params.prId,
        reviewerId,
        issuesFound: validated.issuesFound.length,
        securityIssues,
      },
      'AI code review created'
    )

    return NextResponse.json({ codeReview: result }, { status: 201 })
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

    logger.error({ error: error.message, prId: params.prId }, 'Error creating code review')
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to create code review',
        },
      },
      { status: 500 }
    )
  }
}
