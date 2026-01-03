/**
 * Webhook Processor Worker
 * 
 * Processes queued webhook events
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
 */
async function processWebhookEvent(payload: any): Promise<void> {
  const { type, repository, pr, installationId } = payload;
  const requestId = `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const log = logger.child({ requestId, type, repositoryId: repository.id });

  try {
    log.info({ type }, 'Processing webhook event');

    // Check if encryption keys are configured
    if (!isKeyConfigured()) {
      log.error('Encryption keys not configured - cannot decrypt installation tokens');
      throw new Error('Encryption keys not configured - provider calls disabled');
    }

    // Get installation with decrypted token
    const installation = await getInstallationWithDecryptedToken(installationId);

    if (!installation) {
      log.error({ installationId }, 'Installation not found');
      throw new Error(`Installation ${installationId} not found`);
    }

    if (!installation.isActive) {
      log.warn({ installationId }, 'Installation is inactive');
      throw new Error(`Installation ${installationId} is inactive`);
    }

    const accessToken = installation.accessToken; // Already decrypted
    // Never log the token - use redacted version if needed
    log.debug({ tokenPreview: redactSecret(accessToken) }, 'Using installation token');

    switch (type) {
      case 'pr.opened':
      case 'pr.updated':
        await processPREvent(repository, pr, accessToken, log, requestId);
        break;

      case 'merge.completed':
        await processMergeEvent(repository, pr, accessToken, log, requestId);
        break;

      case 'ci.completed':
        await processCIEvent(repository, pr, accessToken, log);
        break;

      default:
        log.warn({ type }, 'Unknown webhook event type');
    }

    metrics.increment('webhooks.processed', { type, status: 'success' });
  } catch (error) {
    // Redact any secrets from error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    const redactedMessage = errorMessage.replace(/token[=:]\s*[\w-]+/gi, (match) => {
      const tokenValue = match.split(/[=:]\s*/)[1];
      return match.replace(tokenValue, redactSecret(tokenValue));
    });
    log.error({ err: error, message: redactedMessage }, 'Webhook processing failed');
    metrics.increment('webhooks.processed', { type, status: 'failed' });
    throw error;
  }
}

/**
 * Process PR opened/updated event
 */
async function processPREvent(
  repository: any,
  pr: any,
  accessToken: string,
  log: any,
  requestId?: string
): Promise<void> {
  const traceId = requestId || `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  log.info({ prNumber: pr.number, requestId: traceId }, 'Processing PR event');

  // Get provider-specific adapter
  const detectedProvider = detectGitProvider({
    provider: repository.provider,
    url: repository.url || undefined,
  });
  // Cast 'generic' to adapter type (adapter doesn't support generic)
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
        pr.sha,
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

  // Check billing limits before processing review
  const repo = await prisma.repository.findUnique({
    where: { id: repository.id },
    select: { organizationId: true },
  });

  if (!repo) {
    throw new Error(`Repository ${repository.id} not found`);
  }

  // Check billing limits (this will throw if exceeded, which is caught below)
  const billingCheck = await checkBillingLimits(repo.organizationId, {
    requireFeature: 'reviewGuard',
    checkLLMBudget: true,
  });
  if (billingCheck) {
    // Billing check failed - create check run and return
    try {
      await prAdapter.createOrUpdateCheckRun(
        repository.fullName,
        pr.sha,
        {
          name: 'ReadyLayer Report',
          head_sha: pr.sha,
          status: 'completed',
          conclusion: 'action_required',
          output: {
            title: 'Billing limit exceeded',
            summary: '?? Billing limit exceeded - please upgrade',
          },
        },
        accessToken
      );
    } catch (error) {
      log.error({ error }, 'Failed to create check run for billing error');
      // Degrade gracefully - don't crash worker
    }
    throw new Error(`Billing limit exceeded for organization ${repo.organizationId}`);
  }

  // Execute ReadyLayer Run (Review Guard → Test Engine → Doc Sync)
  // This will automatically post status updates to the provider during each stage
  try {
    const runRequest: RunRequest = {
      repositoryId: repository.id,
      trigger: 'webhook',
      triggerMetadata: {
        prNumber: pr.number,
        prSha: pr.sha,
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
          const commentBody = formatPolicyComment(
            {
              blocked: runResult.reviewGuardResult.isBlocked,
              score: (review as any)?.policyScore || 100,
              rulesFired: (review as any)?.rulesFired || [],
              nonWaivedFindings: (review.issuesFound as any[] || []).map((issue: any) => ({
                ruleId: issue.ruleId,
                severity: issue.severity,
                message: issue.message,
                file: issue.file,
                line: issue.line || 0,
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
        const repo = await prisma.repository.findUnique({
          where: { id: repository.id },
          select: { organizationId: true },
        });

        if (repo) {
          await ingestDocument({
            organizationId: repo.organizationId,
            repositoryId: repository.id,
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
              prSha: pr.sha,
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
        pr.sha,
        {
          name: 'ReadyLayer',
          head_sha: pr.sha,
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
    const aiTouchedFiles = await testEngineService.detectAITouchedFiles(repository.id, files);

    for (const file of aiTouchedFiles) {
      const fileContent = files.find(f => f.path === file.path)?.content;
      if (fileContent) {
        const testResult = await testEngineService.generateTests({
          repositoryId: repository.id,
          prNumber: pr.number,
          prSha: pr.sha,
          filePath: file.path,
          fileContent,
        });

        // Ingest test precedent into evidence index (idempotent, safe)
        if (isIngestEnabled() && testResult.testContent) {
          try {
            const repo = await prisma.repository.findUnique({
              where: { id: repository.id },
              select: { organizationId: true },
            });

            if (repo) {
              await ingestDocument({
                organizationId: repo.organizationId,
                repositoryId: repository.id,
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
      const repo = await prisma.repository.findUnique({
        where: { id: repository.id },
        select: { organizationId: true },
      });

      if (repo) {
        // Check for drift without generating new docs
        const driftResult = await docSyncService.checkDrift(
          repository.id,
          pr.sha,
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
            pr.sha,
            {
              name: 'ReadyLayer Doc Sync',
              head_sha: pr.sha,
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
      const repo = await prisma.repository.findUnique({
        where: { id: repository.id },
        select: { organizationId: true },
      });

      if (repo && diff.length > 0 && diff.length < 50000) { // Limit diff size
        await ingestDocument({
          organizationId: repo.organizationId,
          repositoryId: repository.id,
          sourceType: 'pr_diff',
          sourceRef: `pr-${pr.number}`,
          title: `PR #${pr.number}: ${pr.title}`,
          content: diff.substring(0, 50000), // Cap at 50KB
          metadata: {
            prNumber: pr.number,
            prSha: pr.sha,
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
  repository: any,
  pr: any,
  _accessToken: string,
  log: any,
  requestId?: string
): Promise<void> {
    const traceId = requestId || `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    log.info({ prNumber: pr.number, requestId: traceId }, 'Processing merge event');

  // Run Doc Sync (on merge)
  try {
    const docResult = await docSyncService.generateDocs({
      repositoryId: repository.id,
      ref: pr.sha,
      format: 'openapi',
    });

    // Ingest doc convention into evidence index (idempotent, safe)
    if (isIngestEnabled() && docResult.content) {
      try {
        const repo = await prisma.repository.findUnique({
          where: { id: repository.id },
          select: { organizationId: true },
        });

        if (repo) {
          await ingestDocument({
            organizationId: repo.organizationId,
            repositoryId: repository.id,
            sourceType: 'doc_convention',
            sourceRef: `openapi-${pr.sha.substring(0, 8)}`,
            title: `OpenAPI Spec for ${pr.sha.substring(0, 8)}`,
            content: docResult.content.substring(0, 50000), // Cap at 50KB
            metadata: {
              format: docResult.format,
              ref: pr.sha,
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
  repository: any,
  pr: any,
  _accessToken: string,
  log: any
): Promise<void> {
  log.info({ repositoryId: repository.id, prNumber: pr?.number }, 'Processing CI event');

  // Check coverage when CI workflow completes
  // This integrates with GitHub Actions coverage reports
  if (pr?.sha && repository.id) {
    try {
      // Get repository to find organization
      const repo = await prisma.repository.findUnique({
        where: { id: repository.id },
        select: { organizationId: true },
      });

      if (!repo) {
        log.warn({ repositoryId: repository.id }, 'Repository not found for CI event');
        return;
      }

      // Parse coverage from CI artifacts (would fetch from GitHub Actions artifacts)
      // For now, this is a placeholder - actual implementation would:
      // 1. Fetch coverage report from GitHub Actions artifacts
      // 2. Parse lcov or coverage JSON
      // 3. Call testEngineService.checkCoverage()
      // 4. Create GitHub check run if coverage below threshold

      log.info({ repositoryId: repository.id, prSha: pr.sha }, 'CI event processed (coverage check placeholder)');
    } catch (error) {
      log.error({ err: error, repositoryId: repository.id }, 'Failed to process CI event');
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
  startWebhookProcessor().catch((error) => {
    logger.error('Webhook processor failed', error);
    process.exit(1);
  });
}
