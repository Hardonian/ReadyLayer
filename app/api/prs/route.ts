import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-server'
import { rateLimit, rateLimiters } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { ErrorCodes } from '@/lib/errors'
import { z } from 'zod'

const createPRSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1).max(500),
  repository: z.string().min(1),
  repositoryUrl: z.string().url().optional(),
  authorUsername: z.string().optional(),
  baseBranch: z.string().optional(),
  headBranch: z.string().optional(),
  isAIGenerated: z.boolean().default(false),
  aiConfidence: z.number().min(0).max(100).optional(),
  diffStats: z
    .object({
      additions: z.number().int().min(0),
      deletions: z.number().int().min(0),
      files: z.number().int().min(0),
    })
    .optional(),
})

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, rateLimiters.api)
    if (rateLimitResponse) return rateLimitResponse

    await requireAuth(request)

    const searchParams = request.nextUrl.searchParams
    const repository = searchParams.get('repository')
    const status = searchParams.get('status')
    const isAIGenerated = searchParams.get('isAIGenerated')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}
    if (repository) where.repository = repository
    if (status) where.status = status
    if (isAIGenerated !== null) where.isAIGenerated = isAIGenerated === 'true'

    const [prs, total] = await Promise.all([
      prisma.pullRequest.findMany({
        where,
        include: {
          author: {
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
              reviews: true,
              codeReviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.pullRequest.count({ where }),
    ])

    return NextResponse.json({
      prs,
      total,
      limit,
      offset,
    })
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

    logger.error({ error: error.message }, 'Error fetching PRs')
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to fetch PRs',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, rateLimiters.api)
    if (rateLimitResponse) return rateLimitResponse

    const userId = await requireAuth(request)

    const body = await request.json()
    const validated = createPRSchema.parse(body)

    // Check if PR already exists
    const existingPR = await prisma.pullRequest.findUnique({
      where: {
        repository_number: {
          repository: validated.repository,
          number: validated.number,
        },
      },
    })

    if (existingPR) {
      // Update existing PR
      const pr = await prisma.pullRequest.update({
        where: { id: existingPR.id },
        data: {
          title: validated.title,
          repositoryUrl: validated.repositoryUrl,
          authorUsername: validated.authorUsername,
          baseBranch: validated.baseBranch,
          headBranch: validated.headBranch,
          status: validated.status || existingPR.status,
          isAIGenerated: validated.isAIGenerated,
          aiConfidence: validated.aiConfidence,
          diffStats: validated.diffStats as any,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })

      logger.info({ prId: pr.id, userId }, 'PR updated')
      return NextResponse.json({ pr })
    }

    // Create new PR
    const pr = await prisma.pullRequest.create({
      data: {
        number: validated.number,
        title: validated.title,
        repository: validated.repository,
        repositoryUrl: validated.repositoryUrl,
        authorId: userId,
        authorUsername: validated.authorUsername,
        baseBranch: validated.baseBranch,
        headBranch: validated.headBranch,
        isAIGenerated: validated.isAIGenerated,
        aiConfidence: validated.aiConfidence,
        diffStats: validated.diffStats as any,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    logger.info({ prId: pr.id, userId }, 'PR created')

    // Update user stats
    await prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        prsReviewed: 0,
        issuesCaught: 0,
        testsGenerated: 0,
      },
      update: {},
    })

    return NextResponse.json({ pr }, { status: 201 })
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

    logger.error({ error: error.message }, 'Error creating PR')
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to create PR',
        },
      },
      { status: 500 }
    )
  }
}
