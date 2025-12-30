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
import { prisma } from '../lib/prisma';
import { logger } from '../observability/logging';
import { metrics } from '../observability/metrics';

/**
 * Process webhook event
 */
async function processWebhookEvent(payload: any): Promise<void> {
  const { type, repository, pr, installationId } = payload;
  const requestId = `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const log = logger.child({ requestId, type, repositoryId: repository.id });

  try {
    log.info('Processing webhook event', { type });

    // Get installation
    const installation = await prisma.installation.findUnique({
      where: { id: installationId },
    });

    if (!installation || !installation.isActive) {
      throw new Error(`Installation ${installationId} not found or inactive`);
    }

    // Decrypt access token (simplified - would decrypt in production)
    const accessToken = installation.accessToken;

    switch (type) {
      case 'pr.opened':
      case 'pr.updated':
        await processPREvent(repository, pr, accessToken, log);
        break;

      case 'merge.completed':
        await processMergeEvent(repository, pr, accessToken, log);
        break;

      case 'ci.completed':
        await processCIEvent(repository, pr, accessToken, log);
        break;

      default:
        log.warn('Unknown webhook event type', { type });
    }

    metrics.increment('webhooks.processed', { type, status: 'success' });
  } catch (error) {
    log.error('Webhook processing failed', error);
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
  log: any
): Promise<void> {
  log.info('Processing PR event', { prNumber: pr.number });

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
      log.warn('Failed to fetch file content', { file: file.filename, error });
    }
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

    // Post review comments
    if (reviewResult.issues.length > 0) {
      const commentBody = formatReviewComment(reviewResult);
      await githubAPIClient.postPRComment(
        repository.fullName,
        pr.number,
        commentBody,
        accessToken
      );
    }

    // Update status check
    await githubAPIClient.updateStatusCheck(
      repository.fullName,
      pr.sha,
      reviewResult.isBlocked ? 'failure' : 'success',
      reviewResult.isBlocked
        ? `❌ ${reviewResult.summary.critical} critical, ${reviewResult.summary.high} high issues`
        : `✅ Review passed`,
      'readylayer/review',
      accessToken
    );
  } catch (error) {
    log.error('Review Guard failed', error);
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
        await testEngineService.generateTests({
          repositoryId: repository.id,
          prNumber: pr.number,
          prSha: pr.sha,
          filePath: file.path,
          fileContent,
        });
      }
    }
  } catch (error) {
    log.error('Test Engine failed', error);
  }
}

/**
 * Process merge event
 */
async function processMergeEvent(
  repository: any,
  pr: any,
  accessToken: string,
  log: any
): Promise<void> {
  log.info('Processing merge event', { prNumber: pr.number });

  // Run Doc Sync
  try {
    await docSyncService.generateDocs({
      repositoryId: repository.id,
      ref: pr.sha,
      format: 'openapi',
    });
  } catch (error) {
    log.error('Doc Sync failed', error);
  }
}

/**
 * Process CI completed event
 */
async function processCIEvent(
  repository: any,
  pr: any,
  accessToken: string,
  log: any
): Promise<void> {
  log.info('Processing CI event');

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
