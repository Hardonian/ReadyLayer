/**
 * Provider Status Service
 * 
 * Posts status updates to git providers (GitHub, GitLab, Bitbucket)
 * during ReadyLayer run stages to provide native PR/MR presence.
 */

import { getGitProviderPRAdapter, type CheckRunDetails, type CheckRunAnnotation } from '../../integrations/git-provider-pr-adapter';
import { prisma } from '../../lib/prisma';
import { logger } from '../../observability/logging';
import { getInstallationWithDecryptedToken } from '../../lib/secrets/installation-helpers';
import type { Issue } from '../static-analysis';

export interface StageStatusUpdate {
  runId: string;
  repositoryId: string;
  prNumber: number;
  prSha: string;
  stage: 'review_guard' | 'test_engine' | 'doc_sync' | 'complete';
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  issues?: Issue[];
  summary?: string;
  details?: {
    reviewGuard?: {
      issuesFound: number;
      isBlocked: boolean;
      summary: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
    };
    testEngine?: {
      testsGenerated: number;
      coverage?: {
        lines: number;
        branches: number;
        functions: number;
      };
    };
    docSync?: {
      driftDetected: boolean;
      missingEndpoints: number;
      changedEndpoints: number;
    };
  };
}

/**
 * Convert issues to check-run annotations (max 50 for GitHub)
 */
function issuesToAnnotations(issues: Issue[]): CheckRunAnnotation[] {
  const annotations: CheckRunAnnotation[] = [];
  
  for (const issue of issues.slice(0, 50)) { // GitHub limit is 50
    let annotationLevel: 'notice' | 'warning' | 'failure';
    switch (issue.severity) {
      case 'critical':
      case 'high':
        annotationLevel = 'failure';
        break;
      case 'medium':
        annotationLevel = 'warning';
        break;
      case 'low':
      default:
        annotationLevel = 'notice';
        break;
    }

    annotations.push({
      path: issue.file,
      start_line: issue.line || 1,
      end_line: issue.line || 1,
      start_column: issue.column,
      end_column: issue.column,
      annotation_level: annotationLevel,
      message: issue.message,
      title: `${issue.ruleId}: ${issue.severity}`,
      raw_details: issue.fix ? `Suggested fix: ${issue.fix}` : undefined,
    });
  }

  return annotations;
}

/**
 * Generate check run summary text
 */
function generateSummary(stage: string, details?: StageStatusUpdate['details']): string {
  if (!details) {
    return `${stage} completed`;
  }

  if (stage === 'review_guard' && details.reviewGuard) {
    const { issuesFound, isBlocked, summary } = details.reviewGuard;
    if (isBlocked) {
      return `Policy check failed: ${issuesFound} issue(s) found (${summary.critical} critical, ${summary.high} high)`;
    }
    return `Policy check passed: ${issuesFound} issue(s) found`;
  }

  if (stage === 'test_engine' && details.testEngine) {
    const { testsGenerated, coverage } = details.testEngine;
    if (coverage) {
      return `${testsGenerated} test(s) generated, ${coverage.lines}% coverage`;
    }
    return `${testsGenerated} test(s) generated`;
  }

  if (stage === 'doc_sync' && details.docSync) {
    const { driftDetected, missingEndpoints, changedEndpoints } = details.docSync;
    if (driftDetected) {
      return `Documentation drift detected: ${missingEndpoints} missing, ${changedEndpoints} changed`;
    }
    return 'Documentation in sync';
  }

  return `${stage} completed`;
}

/**
 * Provider Status Service
 */
export class ProviderStatusService {
  /**
   * Post status update to provider
   */
  async postStatusUpdate(update: StageStatusUpdate): Promise<void> {
    const log = logger.child({ runId: update.runId, stage: update.stage });
    
    try {
      // Get repository and installation
      const repository = await prisma.repository.findUnique({
        where: { id: update.repositoryId },
        select: {
          id: true,
          fullName: true,
          provider: true,
          organizationId: true,
        },
      });

      if (!repository) {
        log.warn('Repository not found');
        return;
      }

      // Get installation for this organization and provider
      const installationRecord = await prisma.installation.findFirst({
        where: {
          organizationId: repository.organizationId,
          provider: repository.provider,
          isActive: true,
        },
      });

      if (!installationRecord) {
        log.warn('Installation not found');
        return;
      }

      // Decrypt token
      const installation = await getInstallationWithDecryptedToken(installationRecord.id);

      if (!installation || !installation.accessToken) {
        log.warn('Failed to decrypt installation token');
        return;
      }

      // Get PR adapter
      const prAdapter = getGitProviderPRAdapter(repository.provider as 'github' | 'gitlab' | 'bitbucket');

      // Generate check run details
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://readylayer.com';
      const runUrl = `${appUrl}/dashboard/runs/${update.runId}`;

      // Determine check run name based on stage
      let checkRunName: string;
      let checkRunTitle: string;
      let checkRunSummary: string;

      if (update.stage === 'complete') {
        checkRunName = 'ReadyLayer';
        checkRunTitle = 'ReadyLayer Run';
        
        // Aggregate summary from all stages
        const parts: string[] = [];
        if (update.details?.reviewGuard) {
          const rg = update.details.reviewGuard;
          parts.push(`Review Guard: ${rg.issuesFound} issue(s)`);
        }
        if (update.details?.testEngine) {
          const te = update.details.testEngine;
          parts.push(`Test Engine: ${te.testsGenerated} test(s)`);
        }
        if (update.details?.docSync) {
          const ds = update.details.docSync;
          parts.push(`Doc Sync: ${ds.driftDetected ? 'drift detected' : 'in sync'}`);
        }
        checkRunSummary = parts.join(' • ') || 'Run completed';
      } else {
        // Stage-specific check runs
        switch (update.stage) {
          case 'review_guard':
            checkRunName = 'ReadyLayer/ReviewGuard';
            checkRunTitle = 'Review Guard';
            checkRunSummary = generateSummary('review_guard', update.details);
            break;
          case 'test_engine':
            checkRunName = 'ReadyLayer/TestEngine';
            checkRunTitle = 'Test Engine';
            checkRunSummary = generateSummary('test_engine', update.details);
            break;
          case 'doc_sync':
            checkRunName = 'ReadyLayer/DocSync';
            checkRunTitle = 'Doc Sync';
            checkRunSummary = generateSummary('doc_sync', update.details);
            break;
          default:
            checkRunName = 'ReadyLayer';
            checkRunTitle = 'ReadyLayer';
            checkRunSummary = update.summary || `${update.stage} ${update.status}`;
        }
      }

      // Map status to check run status
      let checkRunStatus: 'queued' | 'in_progress' | 'completed';
      if (update.status === 'queued') {
        checkRunStatus = 'queued';
      } else if (update.status === 'in_progress') {
        checkRunStatus = 'in_progress';
      } else {
        checkRunStatus = 'completed';
      }

      // Map conclusion
      let checkRunConclusion: CheckRunDetails['conclusion'] | undefined;
      if (update.status === 'completed') {
        checkRunConclusion = update.conclusion || 'success';
      }

      // Build annotations from issues
      const annotations = update.issues ? issuesToAnnotations(update.issues) : undefined;

      // Build check run details
      const checkRunDetails: CheckRunDetails = {
        name: checkRunName,
        head_sha: update.prSha,
        status: checkRunStatus,
        conclusion: checkRunConclusion,
        output: {
          title: checkRunTitle,
          summary: checkRunSummary,
          annotations: annotations && annotations.length > 0 ? annotations : undefined,
        },
        details_url: runUrl,
        external_id: update.runId, // For idempotency
      };

      // Post to provider
      await prAdapter.createOrUpdateCheckRun(
        repository.fullName,
        update.prSha,
        checkRunDetails,
        installation.accessToken
      );

      log.info({ checkRunName, status: update.status }, 'Status update posted to provider');

      // Also post commit status as fallback (for branch protection)
      if (update.stage === 'complete' && update.status === 'completed') {
        try {
          const statusState = update.conclusion === 'success' ? 'success' :
                             update.conclusion === 'failure' ? 'failure' :
                             update.conclusion === 'cancelled' ? 'error' : 'pending';
          
          await prAdapter.updateStatusCheck(
            repository.fullName,
            update.prSha,
            {
              state: statusState,
              description: checkRunSummary.substring(0, 140), // GitHub limit
              context: 'readylayer/review',
              targetUrl: runUrl,
            },
            installation.accessToken
          );
        } catch (error) {
          log.warn({ err: error }, 'Failed to post commit status (non-critical)');
        }
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to post status update to provider');
      // Don't throw - status updates are non-critical
    }
  }

  /**
   * Post initial "in progress" status when run starts
   */
  async postRunStarted(runId: string, repositoryId: string, prNumber: number, prSha: string): Promise<void> {
    await this.postStatusUpdate({
      runId,
      repositoryId,
      prNumber,
      prSha,
      stage: 'review_guard',
      status: 'in_progress',
    });
  }

  /**
   * Post stage completion status
   */
  async postStageCompleted(
    runId: string,
    repositoryId: string,
    prNumber: number,
    prSha: string,
    stage: 'review_guard' | 'test_engine' | 'doc_sync',
    conclusion: 'success' | 'failure',
    details?: StageStatusUpdate['details'],
    issues?: Issue[]
  ): Promise<void> {
    await this.postStatusUpdate({
      runId,
      repositoryId,
      prNumber,
      prSha,
      stage,
      status: 'completed',
      conclusion,
      details,
      issues,
    });
  }

  /**
   * Post final run completion status
   */
  async postRunCompleted(
    runId: string,
    repositoryId: string,
    prNumber: number,
    prSha: string,
    conclusion: 'success' | 'failure' | 'partial_success',
    details?: StageStatusUpdate['details']
  ): Promise<void> {
    await this.postStatusUpdate({
      runId,
      repositoryId,
      prNumber,
      prSha,
      stage: 'complete',
      status: 'completed',
      conclusion: conclusion === 'partial_success' ? 'neutral' : conclusion,
      details,
    });
  }
}

export const providerStatusService = new ProviderStatusService();
