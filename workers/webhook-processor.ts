/**
 * Webhook Processor Worker
 * 
 * Processes queued webhook events
 */

import { queueService } from '../queue';
import { reviewGuardService } from '../services/review-guard';
import { testEngineService } from '../services/test-engine';
import { docSyncService } from '../services/doc-sync';
import { githubAPIClient } from '../integrations/github/api-client';
import { formatPolicyComment, generateStatusCheckDescription } from '../lib/git-provider-ui/comment-formatter';
import { detectGitProvider } from '../lib/git-provider-ui';
import { prisma } from '../lib/prisma';
import { prisma } from '../lib/prisma';
import { logger } from '../observability/logging';
import { metrics } from '../observability/metrics';
import { ingestDocument, isIngestEnabled } from '../lib/rag';
import { getInstallationWithDecryptedToken } from '../lib/secrets/installation-helpers';
import { checkBillingLimits } from '../lib/billing-middleware';
import { redactSecret } from '../lib/crypto';
import { isKeyConfigured } from '../lib/crypto';

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

    if (!installation || !installation.isActive) {
      throw new Error(`Installation ${installationId} not found or inactive`);
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

  // Get PR diff
  const diff = await githubAPIClient.getPRDiff(
    repository.fullName,
    pr.number,
    accessToken
  );

  // Get changed files
  const prDetails = await githubAPIClient.getPR(
    repository.fullName,
    pr.number,
    accessToken
  );

  const files: Array<{ path: string; content: string; beforeContent?: string | null }> = [];

  // Fetch file contents (simplified - would fetch all changed files)
  for (const file of prDetails.files || []) {
    try {
      const content = await githubAPIClient.getFileContent(
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
    // Billing check failed - update status check and return
    await githubAPIClient.updateStatusCheck(
      repository.fullName,
      pr.sha,
      'error',
      '⚠️ Billing limit exceeded - please upgrade',
      'readylayer/review',
      accessToken
    );
    throw new Error(`Billing limit exceeded for organization ${repo.organizationId}`);
  }

  // Run Review Guard
  try {
    const reviewResult = await reviewGuardService.review({
      repositoryId: repository.id,
      prNumber: pr.number,
      prSha: pr.sha,
      prTitle: pr.title,
      diff,
      files,
    });

    // Post review comments with provider-aware formatting
    if (reviewResult.issues.length > 0) {
      // Try to get policy evaluation result from review
      const review = await prisma.review.findUnique({
        where: { id: reviewResult.id },
        include: {
          repository: true,
        },
      });

      const provider = detectGitProvider({
        provider: repository.provider,
        url: repository.url || undefined,
      });

      // Format comment using provider-aware formatter
      const commentBody = formatPolicyComment(
        {
          blocked: reviewResult.isBlocked,
          score: (review as any)?.policyScore || 100,
          rulesFired: (review as any)?.rulesFired || [],
          nonWaivedFindings: reviewResult.issues.map((issue) => ({
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

      await githubAPIClient.postPRComment(
        repository.fullName,
        pr.number,
        commentBody,
        accessToken
      );
    }

    // Update status check with provider-aware description
    const provider = detectGitProvider({
      provider: repository.provider,
      url: repository.url || undefined,
    });

    const review = await prisma.review.findUnique({
      where: { id: reviewResult.id },
    });

    const statusDescription = generateStatusCheckDescription(
      {
        blocked: reviewResult.isBlocked,
        score: (review as any)?.policyScore || 100,
        rulesFired: (review as any)?.rulesFired || [],
        nonWaivedFindings: reviewResult.issues.map((issue) => ({
          ruleId: issue.ruleId,
          severity: issue.severity,
          message: issue.message,
          file: issue.file,
          line: issue.line || 0,
        })),
      },
      provider
    );

    await githubAPIClient.updateStatusCheck(
      repository.fullName,
      pr.sha,
      reviewResult.isBlocked ? 'failure' : 'success',
      statusDescription,
      'readylayer/review',
      accessToken
    );

    // Ingest review result into evidence index (idempotent, safe)
    if (isIngestEnabled()) {
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
              summary: reviewResult.summary,
              issues: reviewResult.issues.slice(0, 50), // Limit to top 50 issues
              isBlocked: reviewResult.isBlocked,
            }),
            metadata: {
              prNumber: pr.number,
              prSha: pr.sha,
              reviewId: reviewResult.id,
            },
          }, requestId);
        }
      } catch (error) {
        // Ingestion failure should not block PR processing
        log.warn({ error }, 'Failed to ingest review result into evidence index');
      }
    }
  } catch (error) {
    log.error(error, 'Review Guard failed');
    // Update status check to error
    await githubAPIClient.updateStatusCheck(
      repository.fullName,
      pr.sha,
      'error',
      '⚠️ Review failed',
      'readylayer/review',
      accessToken
    );
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

  // Run Doc Sync
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
  _repository: any,
  _pr: any,
  _accessToken: string,
  log: any
): Promise<void> {
  log.info('Processing CI event'); // No context needed

  // Check coverage (would parse CI output for coverage data)
  // This is a placeholder - would integrate with actual CI coverage reports
}

/**
 * Format review comment
 */
function formatReviewComment(reviewResult: any): string {
  const { issues, summary, isBlocked } = reviewResult;

  let comment = `## 🔒 ReadyLayer Review Summary\n\n`;
  comment += `**Status:** ${isBlocked ? '❌ **BLOCKED**' : '✅ **PASSED**'}\n\n`;
  comment += `### Issues Found: ${summary.total}\n`;
  comment += `- 🔴 **Critical:** ${summary.critical}\n`;
  comment += `- 🟠 **High:** ${summary.high}\n`;
  comment += `- 🟡 **Medium:** ${summary.medium}\n`;
  comment += `- 🟢 **Low:** ${summary.low}\n\n`;

  if (issues.length > 0) {
    comment += `### Top Issues:\n\n`;
    issues.slice(0, 10).forEach((issue: any) => {
      comment += `- **${issue.severity.toUpperCase()}** ${issue.ruleId}: ${issue.message}\n`;
      comment += `  - File: \`${issue.file}:${issue.line}\`\n`;
      if (issue.fix) {
        comment += `  - Fix: ${issue.fix}\n`;
      }
      comment += `\n`;
    });
  }

  if (isBlocked) {
    comment += `\n**This PR cannot merge until all critical and high issues are resolved.**\n`;
  }

  return comment;
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
