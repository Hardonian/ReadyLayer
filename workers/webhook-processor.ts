/**
 * Webhook Processor Worker
 *
 * Processes queued webhook events with full type safety
 */

import { queueService } from '../queue';
import { runPipelineService, RunRequest } from '../services/run-pipeline';
import { getGitProviderPRAdapter } from '../integrations/git-provider-pr-adapter';
import { formatPolicyComment } from '../lib/git-provider-ui/comment-formatter';
import { detectGitProvider } from '../lib/git-provider-ui';
import { prisma } from '../lib/prisma';
import { logger } from '../observability/logging';
import { metrics } from '../observability/metrics';
import { ingestDocument, isIngestEnabled } from '../lib/rag';
import { getInstallationWithDecryptedToken } from '../lib/secrets/installation-helpers';
import { checkBillingLimits } from '../lib/billing-middleware';
import { redactSecret } from '../lib/crypto';
import { isKeyConfigured } from '../lib/crypto';
import { testEngineService } from '../services/test-engine';
import { docSyncService } from '../services/doc-sync';
import {
  WebhookEvent,
  validateWebhookEvent,
  isWebhookPROpened,
  isWebhookPRUpdated,
  isWebhookMergeCompleted,
  isWebhookCICompleted,
} from '../lib/contracts/webhooks';
import { ValidationError } from '../lib/errors';
import { createHmac } from 'crypto';
import { getCachedRepository } from '../lib/db/repository-cache';

/**
 * Validate webhook signature
 * Supports sha256 and sha1 signatures
 * Returns true if signature is valid, false otherwise
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    // Extract algorithm and signature value
    const parts = signature.split('=');
    if (parts.length !== 2) {
      return false;
    }

    const [algorithm, signatureValue] = parts;

    // Supported algorithms
    if (algorithm !== 'sha256' && algorithm !== 'sha1') {
      return false;
    }

    // Compute expected signature
    const expectedSignature = createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (signatureValue.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signatureValue.length; i++) {
      result |= signatureValue.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Process webhook by event type
 * Wraps processWebhookEvent with event type routing
 */
export async function processWebhook(
  eventType: string,
  event: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  try {
    // Transform event to WebhookEvent format based on type
    const webhookEvent = transformEventToWebhookEvent(eventType, event);

    if (!webhookEvent) {
      return { success: false, message: `Unsupported event type: ${eventType}` };
    }

    await processWebhookEvent(webhookEvent);
    return { success: true, message: 'Webhook processed successfully' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message };
  }
}

/**
 * Transform provider-specific events to WebhookEvent format
 */
function transformEventToWebhookEvent(
  eventType: string,
  event: Record<string, unknown>
): unknown {
  // Handle GitHub events
  if (eventType === 'pull_request') {
    const action = event.action as string;
    const pr = event.pull_request as Record<string, unknown> | undefined;

    if (!pr) {
      return null;
    }

    const head = pr.head as Record<string, unknown> | undefined;
    const base = pr.base as Record<string, unknown> | undefined;
    const repo = base?.repo as Record<string, unknown> | undefined;
    const owner = repo?.owner as Record<string, unknown> | undefined;

    return {
      type: action === 'opened' ? 'pr.opened' : 'pr.updated',
      installation: {
        installationId: 0, // Would be extracted from event
      },
      repository: {
        id: typeof pr.id === 'number' ? pr.id : 0,
        fullName: repo?.full_name as string || `${owner?.login}/${repo?.name}`,
        provider: 'github',
        url: repo?.html_url as string || '',
      },
      pr: {
        number: typeof pr.number === 'number' ? pr.number : 0,
        title: pr.title as string || '',
        head: {
          sha: (head?.sha as string) || '',
        },
        base: {
          ref: (base?.ref as string) || '',
        },
      },
    };
  }

  if (eventType === 'push') {
    const repo = event.repository as Record<string, unknown> | undefined;

    return {
      type: 'merge.completed',
      installation: {
        installationId: 0,
      },
      repository: {
        id: typeof repo?.id === 'number' ? repo.id : 0,
        fullName: repo?.full_name as string || '',
        provider: 'github',
        url: repo?.html_url as string || '',
      },
      pr: {
        number: 0,
        title: '',
        head: {
          sha: (event.after as string) || '',
        },
        base: {
          ref: (event.ref as string)?.replace('refs/heads/', '') || '',
        },
      },
    };
  }

  // Handle GitLab events
  if (eventType === 'merge_request') {
    const attrs = event.object_attributes as Record<string, unknown> | undefined;
    const project = event.project as Record<string, unknown> | undefined;

    if (!attrs) {
      return null;
    }

    const lastCommit = attrs.last_commit as Record<string, unknown> | undefined;

    return {
      type: 'pr.opened',
      installation: {
        installationId: 0,
      },
      repository: {
        id: typeof project?.id === 'number' ? project.id : 0,
        fullName: project?.path_with_namespace as string || '',
        provider: 'gitlab',
        url: project?.web_url as string || '',
      },
      pr: {
        number: typeof attrs.iid === 'number' ? attrs.iid : 0,
        title: attrs.title as string || '',
        head: {
          sha: (lastCommit?.id as string) || '',
        },
        base: {
          ref: attrs.target_branch as string || '',
        },
      },
    };
  }

  // Handle Bitbucket events
  if (eventType === 'pullrequest:created') {
    const pr = event.pullRequest as Record<string, unknown> | undefined;
    const toRef = pr?.toRef as Record<string, unknown> | undefined;
    const repository = toRef?.repository as Record<string, unknown> | undefined;
    const project = repository?.project as Record<string, unknown> | undefined;
    const fromRef = pr?.fromRef as Record<string, unknown> | undefined;
    const fromCommit = fromRef?.commit as Record<string, unknown> | undefined;
    const repoLinks = repository?.links as Record<string, unknown> | undefined;
    const selfLinks = repoLinks?.self as Array<{ href: string }> | undefined;

    if (!pr) {
      return null;
    }

    return {
      type: 'pr.opened',
      installation: {
        installationId: 0,
      },
      repository: {
        id: typeof pr.id === 'number' ? pr.id : 0,
        fullName: `${project?.key as string}/${repository?.name as string}`,
        provider: 'bitbucket',
        url: selfLinks?.[0]?.href || '',
      },
      pr: {
        number: typeof pr.id === 'number' ? pr.id : 0,
        title: pr.title as string || '',
        head: {
          sha: (fromCommit?.hash as string) || '',
        },
        base: {
          ref: (toRef?.displayId as string) || '',
        },
      },
    };
  }

  if (eventType === 'repo:push') {
    const repository = event.repository as Record<string, unknown> | undefined;
    const repoProject = repository?.project as Record<string, unknown> | undefined;
    const repoLinks = repository?.links as Record<string, unknown> | undefined;
    const selfLinks = repoLinks?.self as Array<{ href: string }> | undefined;

    return {
      type: 'merge.completed',
      installation: {
        installationId: 0,
      },
      repository: {
        id: typeof repository?.id === 'number' ? repository.id : 0,
        fullName: `${repoProject?.key as string}/${repository?.name as string}`,
        provider: 'bitbucket',
        url: selfLinks?.[0]?.href || '',
      },
      pr: {
        number: 0,
        title: '',
        head: {
          sha: '',
        },
        base: {
          ref: '',
        },
      },
    };
  }

  return null;
}


/**
 * Generate suggested fix as unified diff (minimal, safe fixes only)
 * Only generates fixes for trivial deterministic issues
 *
 * Note: Currently, GitHub check runs include fix suggestions in annotation raw_details.
 * This function is kept for potential future use (e.g., creating patch files).
 */
// Reserved for future use
/*
function generateSuggestedFix(issue: Issue, fileContent: string): string | null {
  if (!issue.fix) {
    return null;
  }

  // Only generate fixes for safe, deterministic issues
  const safeRulePatterns = [
    /^security\.(sql-injection|unsafe-eval|missing-await)$/,
    /^quality\.(missing-await|unused-import)$/,
  ];

  const isSafe = safeRulePatterns.some(pattern => pattern.test(issue.ruleId));
  if (!isSafe) {
    return null;
  }

  const lines = fileContent.split('\n');
  const lineIndex = issue.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return null;
  }

  const originalLine = lines[lineIndex];
  const fixedLine = issue.fix;

  // Generate minimal unified diff
  return `--- a/${issue.file}\n+++ b/${issue.file}\n@@ -${issue.line},1 +${issue.line},1 @@\n-${originalLine}\n+${fixedLine}`;
}
*/

/**
 * Process webhook event
 * Validates payload, extracts typed event, and routes to appropriate handler
 */
async function processWebhookEvent(rawPayload: unknown): Promise<void> {
  const requestId = `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Validate webhook payload against schema
  const validation = validateWebhookEvent(rawPayload);
  if (!validation.success) {
    logger.error(
      { requestId, errors: validation.error.issues },
      'Invalid webhook payload - validation failed'
    );
    throw new ValidationError('Invalid webhook payload', {
      errors: validation.error.issues.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
  }

  const event: WebhookEvent = validation.data;
  const log = logger.child({ requestId, type: event.type, repositoryId: String(event.repository.id) });

  try {
    log.info({ type: event.type }, 'Processing webhook event');

    // Check if encryption keys are configured
    if (!isKeyConfigured()) {
      log.error('Encryption keys not configured - cannot decrypt installation tokens');
      throw new Error('Encryption keys not configured - provider calls disabled');
    }

    // Get installation with decrypted token
    const installation = await getInstallationWithDecryptedToken(event.installation.installationId);

    if (!installation) {
      log.error({ installationId: event.installation.installationId }, 'Installation not found');
      throw new Error(`Installation ${event.installation.installationId} not found`);
    }

    if (!installation.isActive) {
      log.warn({ installationId: event.installation.installationId }, 'Installation is inactive');
      throw new Error(`Installation ${event.installation.installationId} is inactive`);
    }

    const accessToken = installation.accessToken; // Already decrypted
    // Never log the token - use redacted version if needed
    log.debug({ tokenPreview: redactSecret(accessToken) }, 'Using installation token');

    // Route event to appropriate handler using type guards
    if (isWebhookPROpened(event) || isWebhookPRUpdated(event)) {
      await processPREvent(event, accessToken, log, requestId);
    } else if (isWebhookMergeCompleted(event)) {
      await processMergeEvent(event, accessToken, log, requestId);
    } else if (isWebhookCICompleted(event)) {
      await processCIEvent(event, accessToken, log);
    } else {
      // TypeScript exhaustiveness check: this should never happen
      const _exhaustive: never = event;
      log.warn({ event: _exhaustive }, 'Unknown webhook event type');
    }

    metrics.increment('webhooks.processed', { type: event.type, status: 'success' });
  } catch (error) {
    // Redact any secrets from error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    const redactedMessage = errorMessage.replace(/token[=:]\s*[\w-]+/gi, (match) => {
      const tokenValue = match.split(/[=:]\s*/)[1];
      return match.replace(tokenValue, redactSecret(tokenValue));
    });
    log.error({ err: error, message: redactedMessage }, 'Webhook processing failed');
    metrics.increment('webhooks.processed', { type: event.type, status: 'failed' });
    throw error;
  }
}

/**
 * Process PR opened/updated event
 */
async function processPREvent(
  event: import('../lib/contracts/webhooks').WebhookPROpened | import('../lib/contracts/webhooks').WebhookPRUpdated,
  accessToken: string,
  log: ReturnType<typeof logger.child>,
  requestId?: string
): Promise<void> {
  const traceId = requestId || `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  log.info({ prNumber: event.pr.number, requestId: traceId }, 'Processing PR event');

  const { repository, pr } = event;

  // Get provider-specific adapter
  const detectedProvider = detectGitProvider({
    provider: repository.provider,
    url: repository.url,
  });
  // Map detected provider to adapter type
  const provider = (detectedProvider === 'generic' ? 'github' : detectedProvider) as 'github' | 'gitlab' | 'bitbucket';
  const prAdapter = getGitProviderPRAdapter(provider);

  // Get PR diff
  const diff = await prAdapter.getPRDiff(
    repository.fullName,
    pr.number,
    accessToken
  );

  // Get changed files
  const prDetails = await prAdapter.getPR(
    repository.fullName,
    pr.number,
    accessToken
  );

  const files: Array<{ path: string; content: string; beforeContent?: string | null }> = [];

  // Fetch file contents (simplified - would fetch all changed files)
  for (const file of prDetails.files || []) {
    try {
      const content = await prAdapter.getFileContent(
        repository.fullName,
        file.filename,
        pr.head.sha,
        accessToken
      );
      files.push({
        path: file.filename,
        content,
        beforeContent: null, // Would fetch from base branch
      });
    } catch (error) {
      log.warn({ file: file.filename, error }, 'Failed to fetch file content');
    }
  }

  // Check billing limits before processing review (with caching)
  const repoRecord = await getCachedRepository(String(repository.id));

  if (!repoRecord) {
    throw new Error(`Repository ${repository.id} not found`);
  }

  // Check billing limits (this will throw if exceeded, which is caught below)
  const billingCheck = await checkBillingLimits(repoRecord.organizationId, {
    requireFeature: 'reviewGuard',
    checkLLMBudget: true,
  });
  if (billingCheck) {
    // Billing check failed - create check run and return
    try {
      await prAdapter.createOrUpdateCheckRun(
        repository.fullName,
        pr.head.sha,
        {
          name: 'ReadyLayer Report',
          head_sha: pr.head.sha,
          status: 'completed',
          conclusion: 'action_required',
          output: {
            title: 'Billing limit exceeded',
            summary: '⚠️ Billing limit exceeded - please upgrade',
          },
        },
        accessToken
      );
    } catch (error) {
      log.error({ error }, 'Failed to create check run for billing error');
      // Degrade gracefully - don't crash worker
    }
    throw new Error(`Billing limit exceeded for organization ${repoRecord.organizationId}`);
  }

  // Execute ReadyLayer Run (Review Guard → Test Engine → Doc Sync)
  // This will automatically post status updates to the provider during each stage
  try {
    const runRequest: RunRequest = {
      repositoryId: String(repository.id),
      trigger: 'webhook',
      triggerMetadata: {
        prNumber: pr.number,
        prSha: pr.head.sha,
        prTitle: pr.title,
        diff,
        files,
      },
    };

    const runResult = await runPipelineService.executeRun(runRequest);

    log.info({ runId: runResult.id, conclusion: runResult.conclusion }, 'ReadyLayer Run completed');

    // Post PR comment only when blocked (status updates are handled by provider-status service)
    if (!runResult.gatesPassed && runResult.reviewGuardResult?.isBlocked) {
      try {
        const review = await prisma.review.findUnique({
          where: { id: runResult.reviewGuardResult.reviewId },
        });

        if (review) {
          const reviewResult = review.result as { policyScore?: number; rulesFired?: string[] } | null;
          const issuesFound = (review.issuesFound as Array<Record<string, unknown>> | null) ?? [];

          const commentBody = formatPolicyComment(
            {
              blocked: runResult.reviewGuardResult.isBlocked,
              score: reviewResult?.policyScore ?? 100,
              rulesFired: reviewResult?.rulesFired ?? [],
              nonWaivedFindings: issuesFound.map((issue) => ({
                ruleId: typeof issue.ruleId === 'string' ? issue.ruleId : 'unknown',
                severity: typeof issue.severity === 'string' ? issue.severity : 'medium',
                message: typeof issue.message === 'string' ? issue.message : '',
                file: typeof issue.file === 'string' ? issue.file : undefined,
                line: typeof issue.line === 'number' ? issue.line : 0,
              })),
            },
            {
              provider,
              repository: {
                provider: repository.provider,
                url: repository.url || undefined,
              },
            }
          );

          await prAdapter.postPRComment(
            repository.fullName,
            pr.number,
            { body: commentBody },
            accessToken
          );
        }
      } catch (error) {
        log.error({ error }, 'Failed to post PR comment');
        // Degrade gracefully - status updates already posted
      }
    }

    // Ingest review result into evidence index (idempotent, safe)
    if (isIngestEnabled() && runResult.reviewGuardResult?.reviewId) {
      try {
        const repo = await getCachedRepository(String(repository.id));

        if (repo) {
          await ingestDocument({
            organizationId: repo.organizationId,
            repositoryId: String(repository.id),
            sourceType: 'review_result',
            sourceRef: `pr-${pr.number}`,
            title: `Review for PR #${pr.number}: ${pr.title}`,
            content: JSON.stringify({
              summary: runResult.reviewGuardResult.summary,
              issuesFound: runResult.reviewGuardResult.issuesFound,
              isBlocked: runResult.reviewGuardResult.isBlocked,
            }),
            metadata: {
              prNumber: pr.number,
              prSha: pr.head.sha,
              reviewId: runResult.reviewGuardResult.reviewId,
              runId: runResult.id,
            },
          }, requestId);
        }
      } catch (error) {
        // Ingestion failure should not block PR processing
        log.warn({ error }, 'Failed to ingest review result into evidence index');
      }
    }
  } catch (error) {
    log.error(error, 'ReadyLayer Run failed');

    // Check if this is a usage limit error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isUsageLimitError = errorMessage.includes('Usage limit exceeded') ||
                              errorMessage.includes('usage limit') ||
                              errorMessage.includes('Billing limit exceeded');

    // Create check run with error status
    try {
      await prAdapter.createOrUpdateCheckRun(
        repository.fullName,
        pr.head.sha,
        {
          name: 'ReadyLayer',
          head_sha: pr.head.sha,
          status: 'completed',
          conclusion: isUsageLimitError ? 'action_required' : 'failure',
          output: {
            title: isUsageLimitError ? 'Usage Limit Exceeded' : 'Run failed',
            summary: isUsageLimitError
              ? `⚠️ **Usage limit exceeded**\n\n${errorMessage}\n\n**Next steps:**\n- Upgrade your plan at /dashboard/billing\n- Wait for limits to reset (daily/monthly)\n- Contact support@readylayer.com for help`
              : '⚠️ ReadyLayer Run failed - please check logs or contact support',
          },
        },
        accessToken
      );
    } catch (checkRunError) {
      log.error({ error: checkRunError }, 'Failed to create check run for run error');
      // Degrade gracefully - log error but don't crash worker
    }
  }

  // Run Test Engine
  try {
    const aiTouchedFiles = await testEngineService.detectAITouchedFiles(String(repository.id), files);

    for (const file of aiTouchedFiles) {
      const fileContent = files.find(f => f.path === file.path)?.content;
      if (fileContent) {
        const testResult = await testEngineService.generateTests({
          repositoryId: String(repository.id),
          prNumber: pr.number,
          prSha: pr.head.sha,
          filePath: file.path,
          fileContent,
        });

        // Ingest test precedent into evidence index (idempotent, safe)
        if (isIngestEnabled() && testResult.testContent) {
          try {
            const repo = await getCachedRepository(String(repository.id));

            if (repo) {
              await ingestDocument({
                organizationId: repo.organizationId,
                repositoryId: String(repository.id),
                sourceType: 'test_precedent',
                sourceRef: file.path,
                title: `Test for ${file.path}`,
                content: testResult.testContent,
                metadata: {
                  filePath: file.path,
                  framework: testResult.framework,
                  placement: testResult.placement,
                  prNumber: pr.number,
                },
              }, requestId);
            }
          } catch (error) {
            // Ingestion failure should not block test generation
            log.warn({ error, filePath: file.path }, 'Failed to ingest test precedent');
          }
        }
      }
    }
  } catch (error) {
    log.error(error, 'Test Engine failed');
  }

    // Run Doc Sync drift check on PR (before merge)
    // This checks for drift between code and docs, but doesn't generate new docs
    try {
      const repo = await getCachedRepository(String(repository.id));

      if (repo) {
        // Check for drift without generating new docs
        const driftResult = await docSyncService.checkDrift(
          String(repository.id),
          pr.head.sha,
          {
            driftPrevention: {
              enabled: true,
              action: 'block', // Block PR if drift detected
              checkOn: 'pr',
            },
            updateStrategy: 'pr',
            branch: 'main',
          }
        );

        if (driftResult.isBlocked) {
          // Create check run for drift
          const detectedProvider = detectGitProvider({
            provider: repository.provider,
            url: repository.url || undefined,
          });
          // Cast 'generic' to adapter type (adapter doesn't support generic)
          const provider = (detectedProvider === 'generic' ? 'github' : detectedProvider) as 'github' | 'gitlab' | 'bitbucket';
          const prAdapter = getGitProviderPRAdapter(provider);

          await prAdapter.createOrUpdateCheckRun(
            repository.fullName,
            pr.head.sha,
            {
              name: 'ReadyLayer Doc Sync',
              head_sha: pr.head.sha,
              status: 'completed',
              conclusion: 'failure',
              output: {
                title: 'Documentation drift detected',
                summary: `?? **Documentation drift detected**\n\n` +
                  `${driftResult.missingEndpoints.length} endpoint(s) missing from documentation\n` +
                  `${driftResult.changedEndpoints.length} endpoint(s) changed but docs not updated\n\n` +
                  `**Next steps:**\n` +
                  `- Update documentation to match code changes\n` +
                  `- Or merge PR and docs will be auto-generated`,
              },
            },
            accessToken
          );
        }
      }
    } catch (error) {
      log.warn({ err: error }, 'Doc Sync drift check failed (non-blocking)');
      // Don't block PR on drift check failure - it's advisory
    }

    // Ingest PR diff into evidence index (idempotent, safe)
    if (isIngestEnabled() && diff) {
    try {
      const repo = await getCachedRepository(String(repository.id));

      if (repo && diff.length > 0 && diff.length < 50000) { // Limit diff size
        await ingestDocument({
          organizationId: repo.organizationId,
          repositoryId: String(repository.id),
          sourceType: 'pr_diff',
          sourceRef: `pr-${pr.number}`,
          title: `PR #${pr.number}: ${pr.title}`,
          content: diff.substring(0, 50000), // Cap at 50KB
          metadata: {
            prNumber: pr.number,
            prSha: pr.head.sha,
            fileCount: files.length,
          },
        }, requestId);
      }
    } catch (error) {
      // Ingestion failure should not block PR processing
      log.warn({ error }, 'Failed to ingest PR diff into evidence index');
    }
  }
}

/**
 * Process merge event
 */
async function processMergeEvent(
  event: import('../lib/contracts/webhooks').WebhookMergeCompleted,
  _accessToken: string,
  log: ReturnType<typeof logger.child>,
  requestId?: string
): Promise<void> {
    const { repository, pr } = event;
    const traceId = requestId || `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    log.info({ prNumber: pr.number, requestId: traceId }, 'Processing merge event');

  // Run Doc Sync (on merge)
  try {
    const docResult = await docSyncService.generateDocs({
      repositoryId: String(repository.id),
      ref: pr.head.sha,
      format: 'openapi',
    });

    // Ingest doc convention into evidence index (idempotent, safe)
    if (isIngestEnabled() && docResult.content) {
      try {
        const repo = await getCachedRepository(String(repository.id));

        if (repo) {
          await ingestDocument({
            organizationId: repo.organizationId,
            repositoryId: String(repository.id),
            sourceType: 'doc_convention',
            sourceRef: `openapi-${pr.head.sha.substring(0, 8)}`,
            title: `OpenAPI Spec for ${pr.head.sha.substring(0, 8)}`,
            content: docResult.content.substring(0, 50000), // Cap at 50KB
            metadata: {
              format: docResult.format,
              ref: pr.head.sha,
              prNumber: pr.number,
            },
          }, traceId);
        }
      } catch (error) {
        // Ingestion failure should not block doc generation
        log.warn({ error }, 'Failed to ingest doc convention into evidence index');
      }
    }
  } catch (error) {
    log.error(error, 'Doc Sync failed');
  }
}

/**
 * Process CI completed event
 */
async function processCIEvent(
  event: import('../lib/contracts/webhooks').WebhookCICompleted,
  _accessToken: string,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  const { repository } = event;
  const ciRun = event.run;
  log.info({ repositoryId: String(repository.id), ciRunName: ciRun?.name }, 'Processing CI event');

  // Check coverage when CI workflow completes
  // This integrates with GitHub Actions coverage reports
  if (ciRun?.headSha && repository.id) {
    try {
      // Get repository to find organization (with caching)
      const repo = await getCachedRepository(String(repository.id));

      if (!repo) {
        log.warn({ repositoryId: String(repository.id) }, 'Repository not found for CI event');
        return;
      }

      // Parse coverage from CI artifacts (would fetch from GitHub Actions artifacts)
      // For now, this is a placeholder - actual implementation would:
      // 1. Fetch coverage report from GitHub Actions artifacts
      // 2. Parse lcov or coverage JSON
      // 3. Call testEngineService.checkCoverage()
      // 4. Create GitHub check run if coverage below threshold

      log.info({ repositoryId: String(repository.id), headSha: ciRun?.headSha }, 'CI event processed (coverage check placeholder)');
    } catch (error) {
      log.error({ err: error, repositoryId: String(repository.id) }, 'Failed to process CI event');
      // Don't throw - CI event processing is non-blocking
    }
  }
}


/**
 * Start webhook processor worker
 */
export async function startWebhookProcessor(): Promise<void> {
  logger.info('Starting webhook processor worker');

  await queueService.processQueue('webhook', async (payload) => {
    await processWebhookEvent(payload);
  });
}

// Start worker if run directly
if (require.main === module) {
  startWebhookProcessor().catch((error: unknown) => {
    logger.error('Webhook processor failed', { error: String(error) });
    process.exit(1);
  });
}
