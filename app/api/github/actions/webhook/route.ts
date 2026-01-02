import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { githubAPIClient } from '../../../../integrations/github/api-client';
import { getInstallationByProviderWithDecryptedToken } from '../../../../lib/secrets/installation-helpers';
import { errorResponse, successResponse } from '../../../../lib/api-route-helpers';

// Webhook routes must use Node runtime for signature verification and raw body access
export const runtime = 'nodejs';

/**
 * POST /api/github/actions/webhook
 * Handle GitHub Actions workflow_run webhook events
 * 
 * Ingests workflow completion events and updates TestRun records
 * with coverage and pass/fail results from artifacts.
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const signature = request.headers.get('x-hub-signature-256') || '';
    const eventType = request.headers.get('x-github-event') || '';
    const installationId = request.headers.get('x-github-installation-id') || '';

    if (!signature || !eventType || !installationId) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Missing required headers: x-hub-signature-256, x-github-event, x-github-installation-id',
        400
      );
    }

    // Only handle workflow_run events
    if (eventType !== 'workflow_run') {
      return successResponse({ ignored: true, reason: 'Event type not handled' }, 200);
    }

    let payload: string;
    let event: unknown;

    try {
      payload = await request.text();
    } catch (error) {
      log.error(error, 'Failed to read webhook payload');
      return errorResponse('INVALID_PAYLOAD', 'Failed to read webhook payload', 400);
    }

    try {
      event = JSON.parse(payload);
    } catch (error) {
      log.error(error, 'Failed to parse webhook payload as JSON');
      return errorResponse('INVALID_JSON', 'Webhook payload is not valid JSON', 400);
    }

    if (!event || typeof event !== 'object') {
      return errorResponse('INVALID_EVENT', 'Webhook event must be an object', 400);
    }

    const eventObj = event as {
      action?: string;
      workflow_run?: {
        id: number;
        name: string;
        status: string;
        conclusion: string | null;
        head_sha: string;
        head_branch?: string;
        workflow_id: number;
        html_url: string;
        repository?: {
          full_name: string;
        };
      };
      repository?: {
        full_name: string;
      };
    };

    // Only process completed workflow runs
    if (eventObj.action !== 'completed' || !eventObj.workflow_run) {
      return successResponse({ ignored: true, reason: 'Event action not handled' }, 200);
    }

    const workflowRun = eventObj.workflow_run;
    const repoFullName = workflowRun.repository?.full_name || eventObj.repository?.full_name;

    if (!repoFullName) {
      return errorResponse('INVALID_EVENT', 'Repository full_name not found in event', 400);
    }

    // Get installation
    const installation = await prisma.installation.findUnique({
      where: {
        provider_providerId: {
          provider: 'github',
          providerId: installationId,
        },
      },
    });

    if (!installation || !installation.webhookSecret) {
      return errorResponse(
        'INSTALLATION_NOT_FOUND',
        'Installation not found or webhook secret not configured',
        404
      );
    }

    // Validate signature (reuse webhook handler logic)
    const { createHmac } = await import('crypto');
    const hmac = createHmac('sha256', installation.webhookSecret);
    hmac.update(payload);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    if (signature !== expectedSignature) {
      log.warn({ installationId }, 'Invalid webhook signature');
      return errorResponse('INVALID_SIGNATURE', 'Invalid webhook signature', 401);
    }

    // Find repository
    const repository = await prisma.repository.findUnique({
      where: {
        fullName_provider: {
          fullName: repoFullName,
          provider: 'github',
        },
      },
    });

    if (!repository) {
      log.warn({ repoFullName }, 'Repository not found for workflow run');
      return successResponse({ ignored: true, reason: 'Repository not found' }, 200);
    }

    // Get decrypted installation token
    const installationWithToken = await getInstallationByProviderWithDecryptedToken(
      'github',
      installation.providerId
    );

    if (!installationWithToken || !installationWithToken.accessToken) {
      log.error({ installationId }, 'Failed to retrieve installation token');
      return errorResponse('INSTALLATION_TOKEN_ERROR', 'Failed to retrieve installation token', 500);
    }

    // Find or create TestRun
    let testRun = await prisma.testRun.findFirst({
      where: {
        repositoryId: repository.id,
        prSha: workflowRun.head_sha,
        workflowRunId: String(workflowRun.id),
      },
    });

    if (!testRun) {
      // Try to find by SHA only (in case workflowRunId wasn't set initially)
      testRun = await prisma.testRun.findFirst({
        where: {
          repositoryId: repository.id,
          prSha: workflowRun.head_sha,
          status: { in: ['pending', 'in_progress'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!testRun) {
        // Create new TestRun if not found
        testRun = await prisma.testRun.create({
          data: {
            repositoryId: repository.id,
            prSha: workflowRun.head_sha,
            workflowRunId: String(workflowRun.id),
            status: workflowRun.status === 'completed' ? 'completed' : 'in_progress',
            conclusion: workflowRun.conclusion || null,
            startedAt: new Date(),
            completedAt: workflowRun.status === 'completed' ? new Date() : null,
          },
        });
      } else {
        // Update existing TestRun with workflowRunId
        testRun = await prisma.testRun.update({
          where: { id: testRun.id },
          data: {
            workflowRunId: String(workflowRun.id),
            status: workflowRun.status === 'completed' ? 'completed' : 'in_progress',
            conclusion: workflowRun.conclusion || null,
            completedAt: workflowRun.status === 'completed' ? new Date() : null,
          },
        });
      }
    } else {
      // Update existing TestRun
      testRun = await prisma.testRun.update({
        where: { id: testRun.id },
        data: {
          status: workflowRun.status === 'completed' ? 'completed' : 'in_progress',
          conclusion: workflowRun.conclusion || null,
          completedAt: workflowRun.status === 'completed' ? new Date() : null,
        },
      });
    }

    // Try to fetch artifacts and extract coverage/summary
    let coverage: Record<string, unknown> | null = null;
    let summary: Record<string, unknown> | null = null;
    let artifactsUrl: string | null = null;

    try {
      const artifactsResponse = await githubAPIClient.listWorkflowRunArtifacts(
        repoFullName,
        workflowRun.id,
        installationWithToken.accessToken
      );

      if (artifactsResponse.artifacts && artifactsResponse.artifacts.length > 0) {
        // Find coverage artifact
        const coverageArtifact = artifactsResponse.artifacts.find(
          (a) => a.name === 'coverage' || a.name.includes('coverage')
        );
        const summaryArtifact = artifactsResponse.artifacts.find(
          (a) => a.name === 'summary' || a.name.includes('summary') || a.name.includes('test-results')
        );

        if (coverageArtifact) {
          artifactsUrl = coverageArtifact.archive_download_url;
          
          // Try to download and parse coverage JSON
          try {
            const artifactBuffer = await githubAPIClient.downloadArtifact(
              repoFullName,
              coverageArtifact.id,
              installationWithToken.accessToken
            );
            
            // Note: Artifacts are ZIP files, so we'd need to extract them
            // For MVP, we'll store the URL and let the frontend handle it
            // In production, you'd want to extract and parse the JSON here
          } catch (error) {
            log.warn(error, 'Failed to download coverage artifact');
          }
        }

        if (summaryArtifact && !artifactsUrl) {
          artifactsUrl = summaryArtifact.archive_download_url;
        }
      }
    } catch (error) {
      log.warn(error, 'Failed to fetch workflow artifacts');
      // Continue without artifacts - not a fatal error
    }

    // Update TestRun with results
    testRun = await prisma.testRun.update({
      where: { id: testRun.id },
      data: {
        status: workflowRun.status === 'completed' ? 'completed' : 'in_progress',
        conclusion: workflowRun.conclusion || null,
        coverage: coverage || undefined,
        summary: summary || undefined,
        artifactsUrl: artifactsUrl || undefined,
        completedAt: workflowRun.status === 'completed' ? new Date() : null,
      },
    });

    log.info(
      {
        testRunId: testRun.id,
        repositoryId: repository.id,
        workflowRunId: workflowRun.id,
        status: testRun.status,
        conclusion: testRun.conclusion,
      },
      'TestRun updated from workflow webhook'
    );

    return successResponse(
      {
        testRunId: testRun.id,
        status: testRun.status,
        conclusion: testRun.conclusion,
      },
      200
    );
  } catch (error) {
    log.error(error, 'Webhook handling failed');
    return errorResponse(
      'WEBHOOK_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
