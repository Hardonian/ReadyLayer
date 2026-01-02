import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { testEngineService } from '../../../../../services/test-engine';
import { errorResponse, successResponse, validateBody } from '../../../../../lib/api-route-helpers';

const testGenerateSchema = z.object({
  repositoryId: z.string().min(1),
  filePath: z.string().min(1),
  fileContent: z.string(),
  framework: z.string().optional(),
});

/**
 * POST /api/v1/ide/test
 * Generate tests for IDE/CLI integration
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Parse and validate body
    const bodyResult = await validateBody(
      await request.json().catch(() => null),
      testGenerateSchema
    );
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const { repositoryId, filePath, fileContent, framework } = bodyResult.data;

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

    // Generate tests
    const testResult = await testEngineService.generateTests({
      repositoryId: repository.id,
      filePath,
      fileContent,
      framework: framework || 'auto',
    });

    log.info(
      {
        repositoryId,
        filePath,
        framework: testResult.framework,
      },
      'IDE test generation completed'
    );

    return successResponse({
      testContent: testResult.testContent,
      framework: testResult.framework,
      placement: testResult.placement,
      status: testResult.status,
    });
  } catch (error) {
    log.error(error, 'IDE test generation failed');
    return errorResponse(
      'TEST_GENERATION_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
