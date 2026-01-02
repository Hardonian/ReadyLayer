import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { reviewGuardService } from '../../../../../services/review-guard';
import { errorResponse, successResponse, validateBody } from '../../../../../lib/api-route-helpers';

const reviewSchema = z.object({
  repositoryId: z.string().min(1),
  filePath: z.string().min(1),
  fileContent: z.string(),
  ref: z.string().optional(),
  line: z.number().optional(),
});

/**
 * POST /api/v1/ide/review
 * Review a file for IDE/CLI integration
 * 
 * Lightweight endpoint for IDE extensions and CLI tools
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Parse and validate body
    const bodyResult = await validateBody(
      await request.json().catch(() => null),
      reviewSchema
    );
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const { repositoryId, filePath, fileContent, ref, line } = bodyResult.data;

    // Get repository with tenant isolation
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!repository) {
      return errorResponse('NOT_FOUND', 'Repository not found', 404);
    }

    // Verify user has access
    if (repository.organization.members.length === 0) {
      return errorResponse('FORBIDDEN', 'Access denied to repository', 403);
    }

    // Run review (lightweight, no PR context needed)
    const reviewResult = await reviewGuardService.review({
      repositoryId: repository.id,
      prNumber: 0, // IDE review doesn't have a PR number
      prSha: ref || 'HEAD',
      files: [
        {
          path: filePath,
          content: fileContent,
        },
      ],
    });

    // Filter by line if specified
    const issues = line
      ? reviewResult.issues.filter((issue) => issue.line === line)
      : reviewResult.issues;

    log.info(
      {
        repositoryId,
        filePath,
        issuesCount: issues.length,
        line,
      },
      'IDE review completed'
    );

    return successResponse({
      status: reviewResult.isBlocked ? 'blocked' : 'passed',
      issuesCount: issues.length,
      issues: issues.map((issue) => ({
        severity: issue.severity,
        ruleId: issue.ruleId,
        file: issue.file,
        line: issue.line,
        column: issue.column,
        message: issue.message,
        fix: issue.fix,
      })),
      isBlocked: reviewResult.isBlocked,
    });
  } catch (error) {
    log.error(error, 'IDE review failed');
    return errorResponse(
      'REVIEW_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
