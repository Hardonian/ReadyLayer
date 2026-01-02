import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { getGitProviderAdapter } from '../../../../../integrations/git-provider-adapter';
import { getInstallationByProviderWithDecryptedToken } from '../../../../../lib/secrets/installation-helpers';
import { errorResponse, successResponse } from '../../../../../lib/api-route-helpers';
import { githubWebhookHandler } from '../../../../../integrations/github/webhook';
import { gitlabWebhookHandler } from '../../../../../integrations/gitlab/webhook';
import { bitbucketWebhookHandler } from '../../../../../integrations/bitbucket/webhook';

// Webhook routes must use Node runtime for signature verification and raw body access
export const runtime = 'nodejs';

/**
 * POST /api/github/actions/webhook
 * Handle CI/CD webhook events from GitHub, GitLab, and Bitbucket
 * 
 * Ingests pipeline/workflow completion events and updates TestRun records
 * with coverage and pass/fail results from artifacts.
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Detect provider from headers or path
    const path = request.nextUrl.pathname;
    let provider: 'github' | 'gitlab' | 'bitbucket' = 'github';
    let signature = '';
    let eventType = '';
    let installationId = '';

    if (path.includes('/gitlab/')) {
      provider = 'gitlab';
      signature = request.headers.get('x-gitlab-token') || '';
      eventType = request.headers.get('x-gitlab-event') || '';
      installationId = request.headers.get('x-gitlab-installation-id') || '';
    } else if (path.includes('/bitbucket/')) {
      provider = 'bitbucket';
      signature = request.headers.get('x-hub-signature') || '';
      eventType = request.headers.get('x-event-key') || '';
      installationId = request.headers.get('x-bitbucket-installation-id') || '';
    } else {
      // GitHub (default)
      signature = request.headers.get('x-hub-signature-256') || '';
      eventType = request.headers.get('x-github-event') || '';
      installationId = request.headers.get('x-github-installation-id') || '';
    }

    if (!signature || !eventType || !installationId) {
      return errorResponse(
        'VALIDATION_ERROR',
        `Missing required headers for ${provider}`,
        400
      );
    }

    // Only handle CI completion events
    const isCIEvent = 
      (provider === 'github' && eventType === 'workflow_run') ||
      (provider === 'gitlab' && eventType === 'Pipeline Hook') ||
      (provider === 'bitbucket' && (eventType === 'build:status' || eventType === 'build:completed'));

    if (!isCIEvent) {
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

    // Get installation
    const installation = await prisma.installation.findUnique({
      where: {
        provider_providerId: {
          provider,
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

    // Validate signature based on provider
    if (provider === 'github') {
      const { createHmac } = await import('crypto');
      const hmac = createHmac('sha256', installation.webhookSecret);
      hmac.update(payload);
      const expectedSignature = `sha256=${hmac.digest('hex')}`;
      if (signature !== expectedSignature) {
        log.warn({ installationId }, 'Invalid webhook signature');
        return errorResponse('INVALID_SIGNATURE', 'Invalid webhook signature', 401);
      }
    } else if (provider === 'gitlab') {
      // GitLab uses token-based validation
      if (signature !== installation.webhookSecret) {
        log.warn({ installationId }, 'Invalid webhook token');
        return errorResponse('INVALID_SIGNATURE', 'Invalid webhook token', 401);
      }
    } else if (provider === 'bitbucket') {
      const { createHmac } = await import('crypto');
      const hmac = createHmac('sha256', installation.webhookSecret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      if (signature !== expectedSignature && signature !== `sha256=${expectedSignature}`) {
        log.warn({ installationId }, 'Invalid webhook signature');
        return errorResponse('INVALID_SIGNATURE', 'Invalid webhook signature', 401);
      }
    }

    // Parse event based on provider
    let pipelineRunId: string;
    let repoFullName: string;
    let sha: string;
    let status: string;
    let conclusion: string | null = null;
    let pipelineUrl: string | undefined;

    if (provider === 'github') {
      const eventObj = event as {
        action?: string;
        workflow_run?: {
          id: number;
          status: string;
          conclusion: string | null;
          head_sha: string;
          html_url: string;
          repository?: { full_name: string };
        };
        repository?: { full_name: string };
      };

      if (eventObj.action !== 'completed' || !eventObj.workflow_run) {
        return successResponse({ ignored: true, reason: 'Event action not handled' }, 200);
      }

      const workflowRun = eventObj.workflow_run;
      pipelineRunId = String(workflowRun.id);
      repoFullName = workflowRun.repository?.full_name || (eventObj.repository?.full_name || '');
      sha = workflowRun.head_sha;
      status = workflowRun.status === 'completed' ? 'completed' : 'in_progress';
      conclusion = workflowRun.conclusion;
      pipelineUrl = workflowRun.html_url;
    } else if (provider === 'gitlab') {
      const eventObj = event as {
        object_kind?: string;
        object_attributes?: {
          id: number;
          status: string;
          sha: string;
          ref: string;
        };
        project?: {
          path_with_namespace: string;
        };
      };

      const pipeline = eventObj.object_attributes;
      if (!pipeline || pipeline.status !== 'success' && pipeline.status !== 'failed' && pipeline.status !== 'canceled') {
        return successResponse({ ignored: true, reason: 'Pipeline not completed' }, 200);
      }

      pipelineRunId = String(pipeline.id);
      repoFullName = eventObj.project?.path_with_namespace || '';
      sha = pipeline.sha;
      status = pipeline.status === 'success' ? 'completed' : pipeline.status === 'failed' ? 'failed' : 'cancelled';
      conclusion = pipeline.status === 'success' ? 'success' : pipeline.status === 'failed' ? 'failure' : 'cancelled';
    } else {
      // Bitbucket
      const eventObj = event as {
        buildStatus?: {
          state: string;
          key: string;
          url: string;
        };
        commit?: {
          hash: string;
        };
        repository?: {
          full_name?: string;
          workspace?: { slug: string };
          slug?: string;
        };
      };

      const buildStatus = eventObj.buildStatus;
      if (!buildStatus || (buildStatus.state !== 'SUCCESSFUL' && buildStatus.state !== 'FAILED')) {
        return successResponse({ ignored: true, reason: 'Build not completed' }, 200);
      }

      pipelineRunId = buildStatus.key;
      repoFullName = eventObj.repository?.full_name || 
        (eventObj.repository?.workspace?.slug && eventObj.repository?.slug 
          ? `${eventObj.repository.workspace.slug}/${eventObj.repository.slug}` 
          : '');
      sha = eventObj.commit?.hash || '';
      status = buildStatus.state === 'SUCCESSFUL' ? 'completed' : 'failed';
      conclusion = buildStatus.state === 'SUCCESSFUL' ? 'success' : 'failure';
      pipelineUrl = buildStatus.url;
    }

    if (!repoFullName) {
      return errorResponse('INVALID_EVENT', 'Repository identifier not found in event', 400);
    }

    // Find repository
    const repository = await prisma.repository.findUnique({
      where: {
        fullName_provider: {
          fullName: repoFullName,
          provider,
        },
      },
    });

    if (!repository) {
      log.warn({ repoFullName, provider }, 'Repository not found for pipeline run');
      return successResponse({ ignored: true, reason: 'Repository not found' }, 200);
    }

    // Get decrypted installation token
    const installationWithToken = await getInstallationByProviderWithDecryptedToken(
      provider,
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
        prSha: sha,
        workflowRunId: pipelineRunId,
      },
    });

    if (!testRun) {
      // Try to find by SHA only (in case workflowRunId wasn't set initially)
      testRun = await prisma.testRun.findFirst({
        where: {
          repositoryId: repository.id,
          prSha: sha,
          status: { in: ['pending', 'in_progress'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!testRun) {
        // Create new TestRun if not found
        testRun = await prisma.testRun.create({
          data: {
            repositoryId: repository.id,
            prSha: sha,
            workflowRunId: pipelineRunId,
            status: status === 'completed' ? 'completed' : status === 'in_progress' ? 'in_progress' : 'pending',
            conclusion: conclusion,
            startedAt: new Date(),
            completedAt: status === 'completed' ? new Date() : null,
          },
        });
      } else {
        // Update existing TestRun with workflowRunId
        testRun = await prisma.testRun.update({
          where: { id: testRun.id },
          data: {
            workflowRunId: pipelineRunId,
            status: status === 'completed' ? 'completed' : status === 'in_progress' ? 'in_progress' : 'pending',
            conclusion: conclusion,
            completedAt: status === 'completed' ? new Date() : null,
          },
        });
      }
    } else {
      // Update existing TestRun
      testRun = await prisma.testRun.update({
        where: { id: testRun.id },
        data: {
          status: status === 'completed' ? 'completed' : status === 'in_progress' ? 'in_progress' : 'pending',
          conclusion: conclusion,
          completedAt: status === 'completed' ? new Date() : null,
        },
      });
    }

    // Try to fetch artifacts and extract coverage/summary
    let coverage: Record<string, unknown> | null = null;
    let summary: Record<string, unknown> | null = null;
    let artifactsUrl: string | null = pipelineUrl || null;

    try {
      const adapter = getGitProviderAdapter(provider);
      const artifactsBlob = await adapter.getPipelineArtifacts(
        repoFullName,
        pipelineRunId,
        installationWithToken.accessToken
      );

      if (artifactsBlob) {
        // For MVP, we'll store the URL and let the frontend handle artifact parsing
        // In production, you'd want to extract and parse the JSON here
        artifactsUrl = pipelineUrl || artifactsUrl;
      }
    } catch (error) {
      log.warn(error, 'Failed to fetch pipeline artifacts');
      // Continue without artifacts - not a fatal error
    }

    // Update TestRun with results
    testRun = await prisma.testRun.update({
      where: { id: testRun.id },
      data: {
        status: status === 'completed' ? 'completed' : status === 'in_progress' ? 'in_progress' : 'pending',
        conclusion: conclusion,
        coverage: coverage || undefined,
        summary: summary || undefined,
        artifactsUrl: artifactsUrl || undefined,
        completedAt: status === 'completed' ? new Date() : null,
      },
    });

    log.info(
      {
        testRunId: testRun.id,
        repositoryId: repository.id,
        pipelineRunId,
        provider,
        status: testRun.status,
        conclusion: testRun.conclusion,
      },
      'TestRun updated from pipeline webhook'
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
