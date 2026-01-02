import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';
import { githubAPIClient } from '../../../../integrations/github/api-client';
import { getInstallationByProviderWithDecryptedToken } from '../../../../lib/secrets/installation-helpers';
import { errorResponse, successResponse, validateBody } from '../../../../lib/api-route-helpers';

const dispatchSchema = z.object({
  repositoryId: z.string().min(1),
  workflowId: z.string().min(1), // GitHub workflow file path or workflow ID
  ref: z.string().min(1), // Branch or commit SHA
  inputs: z.record(z.string()).optional(),
});

/**
 * POST /api/github/actions/dispatch
 * Dispatch a GitHub Actions workflow
 * 
 * Requires:
 * - Authentication
 * - Repository access
 * - GitHub installation token
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
      dispatchSchema
    );
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const { repositoryId, workflowId, ref, inputs } = bodyResult.data;

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

    // Verify user has access to repository's organization
    if (repository.organization.members.length === 0) {
      return errorResponse('FORBIDDEN', 'Access denied to repository', 403);
    }

    // Verify repository is GitHub
    if (repository.provider !== 'github') {
      return errorResponse(
        'INVALID_PROVIDER',
        'This endpoint only supports GitHub repositories',
        400
      );
    }

    // Get GitHub installation
    const installation = await prisma.installation.findFirst({
      where: {
        provider: 'github',
        organizationId: repository.organizationId,
        isActive: true,
      },
    });

    if (!installation) {
      return errorResponse(
        'INSTALLATION_NOT_FOUND',
        'GitHub installation not found. Please install the ReadyLayer GitHub App.',
        404,
        {
          fix: 'Install the ReadyLayer GitHub App from https://github.com/apps/readylayer',
        }
      );
    }

    // Get decrypted installation token
    const installationWithToken = await getInstallationByProviderWithDecryptedToken(
      'github',
      installation.providerId
    );

    if (!installationWithToken || !installationWithToken.accessToken) {
      return errorResponse(
        'INSTALLATION_TOKEN_ERROR',
        'Failed to retrieve installation token',
        500
      );
    }

    // Dispatch workflow
    // workflowId can be either a workflow file path (e.g., "test.yml") or workflow ID
    // GitHub API accepts workflow file path relative to .github/workflows/ or full path
    let normalizedWorkflowId = workflowId;
    if (!workflowId.includes('/') && !workflowId.match(/^\d+$/)) {
      // If it's just a filename, assume it's in .github/workflows/
      normalizedWorkflowId = `.github/workflows/${workflowId}`;
    }

    try {
      await githubAPIClient.dispatchWorkflow(
        repository.fullName,
        normalizedWorkflowId,
        ref,
        inputs || {},
        installationWithToken.accessToken
      );
    } catch (error) {
      log.error(error, 'Failed to dispatch workflow');
      
      // Handle workflow not found gracefully
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
        return errorResponse(
          'WORKFLOW_NOT_FOUND',
          'Workflow not found. Ensure the workflow file exists and is configured correctly.',
          404,
          {
            workflowId: normalizedWorkflowId,
            fix: 'Create a workflow file at .github/workflows/readylayer-tests.yml or update workflowId parameter',
            setupInstructions: [
              '1. Create a workflow file at .github/workflows/readylayer-tests.yml',
              '2. Add workflow_dispatch trigger',
              '3. Ensure the workflow uploads coverage and test results as artifacts',
            ],
          }
        );
      }

      // Handle permission errors
      if (error instanceof Error && (error.message.includes('403') || error.message.includes('Forbidden'))) {
        return errorResponse(
          'WORKFLOW_PERMISSION_DENIED',
          'Insufficient permissions to dispatch workflow. Ensure the GitHub App has actions:write permission.',
          403,
          {
            fix: 'Update GitHub App permissions to include actions:write',
          }
        );
      }

      throw error;
    }

    // Create TestRun record
    const testRun = await prisma.testRun.create({
      data: {
        repositoryId: repository.id,
        prSha: ref,
        status: 'pending',
        startedAt: new Date(),
      },
    });

    log.info(
      {
        repositoryId,
        workflowId,
        ref,
        testRunId: testRun.id,
      },
      'Workflow dispatched successfully'
    );

    return successResponse(
      {
        testRunId: testRun.id,
        repositoryId: repository.id,
        workflowId,
        ref,
        status: 'dispatched',
      },
      202
    );
  } catch (error) {
    log.error(error, 'Failed to dispatch workflow');
    return errorResponse(
      'DISPATCH_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
