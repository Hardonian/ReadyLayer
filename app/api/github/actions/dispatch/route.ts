import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';
import { getGitProviderAdapter } from '../../../../integrations/git-provider-adapter';
import { getInstallationByProviderWithDecryptedToken } from '../../../../lib/secrets/installation-helpers';
import { errorResponse, successResponse, validateBody } from '../../../../lib/api-route-helpers';

const dispatchSchema = z.object({
  repositoryId: z.string().min(1),
  workflowId: z.string().optional(), // GitHub workflow file path (optional for GitLab/Bitbucket)
  ref: z.string().min(1), // Branch or commit SHA
  inputs: z.record(z.string()).optional(), // Pipeline variables
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

    // Verify repository provider is supported
    if (!['github', 'gitlab', 'bitbucket'].includes(repository.provider)) {
      return errorResponse(
        'INVALID_PROVIDER',
        `Provider ${repository.provider} is not supported. Supported providers: github, gitlab, bitbucket`,
        400
      );
    }

    // Get installation for the provider
    const installation = await prisma.installation.findFirst({
      where: {
        provider: repository.provider,
        organizationId: repository.organizationId,
        isActive: true,
      },
    });

    if (!installation) {
      const providerName = repository.provider === 'github' ? 'GitHub' : repository.provider === 'gitlab' ? 'GitLab' : 'Bitbucket';
      return errorResponse(
        'INSTALLATION_NOT_FOUND',
        `${providerName} installation not found. Please install the ReadyLayer ${providerName} App.`,
        404,
        {
          fix: `Install the ReadyLayer ${providerName} App`,
        }
      );
    }

    // Get decrypted installation token
    const installationWithToken = await getInstallationByProviderWithDecryptedToken(
      repository.provider,
      installation.providerId
    );

    if (!installationWithToken || !installationWithToken.accessToken) {
      return errorResponse(
        'INSTALLATION_TOKEN_ERROR',
        'Failed to retrieve installation token',
        500
      );
    }

    // Get provider adapter
    const adapter = getGitProviderAdapter(repository.provider as 'github' | 'gitlab' | 'bitbucket');

    // Convert inputs to pipeline variables
    const variables = inputs
      ? Object.entries(inputs).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [];

    // Trigger pipeline/workflow
    try {
      const pipelineRun = await adapter.triggerPipeline(
        repository.fullName,
        ref,
        variables,
        installationWithToken.accessToken
      );

      // Create TestRun record
      const testRun = await prisma.testRun.create({
        data: {
          repositoryId: repository.id,
          prSha: ref,
          workflowRunId: pipelineRun.id,
          status: pipelineRun.status,
          conclusion: pipelineRun.conclusion || null,
          startedAt: new Date(),
        },
      });

      log.info(
        {
          repositoryId,
          provider: repository.provider,
          ref,
          testRunId: testRun.id,
          pipelineRunId: pipelineRun.id,
        },
        'Pipeline triggered successfully'
      );

      return successResponse(
        {
          testRunId: testRun.id,
          repositoryId: repository.id,
          provider: repository.provider,
          pipelineRunId: pipelineRun.id,
          ref,
          status: 'dispatched',
          url: pipelineRun.url,
        },
        202
      );
    } catch (error) {
      log.error(error, 'Failed to trigger pipeline');
      
      // Handle pipeline not found gracefully
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
        const providerName = repository.provider === 'github' ? 'GitHub' : repository.provider === 'gitlab' ? 'GitLab' : 'Bitbucket';
        return errorResponse(
          'PIPELINE_NOT_FOUND',
          `${providerName} pipeline/workflow not found. Ensure the pipeline is configured correctly.`,
          404,
          {
            provider: repository.provider,
            fix: `Configure ${providerName} CI/CD pipeline for this repository`,
          }
        );
      }

      // Handle permission errors
      if (error instanceof Error && (error.message.includes('403') || error.message.includes('Forbidden'))) {
        const providerName = repository.provider === 'github' ? 'GitHub' : repository.provider === 'gitlab' ? 'GitLab' : 'Bitbucket';
        return errorResponse(
          'PIPELINE_PERMISSION_DENIED',
          `Insufficient permissions to trigger pipeline. Ensure the ${providerName} App has required permissions.`,
          403,
          {
            fix: `Update ${providerName} App permissions`,
          }
        );
      }

      throw error;
    }

  } catch (error) {
    log.error(error, 'Failed to dispatch workflow');
    return errorResponse(
      'DISPATCH_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
