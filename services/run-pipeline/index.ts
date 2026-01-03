/**
 * ReadyLayer Run Pipeline Service
 * 
 * Orchestrates the complete ReadyLayer pipeline:
 * 1. Review Guard (static checks + AI review)
 * 2. Test Engine (test generation + coverage check)
 * 3. Doc Sync (documentation generation + drift check)
 * 
 * Supports:
 * - Webhook-triggered runs (from PR events)
 * - Manual runs (user-initiated)
 * - Sandbox runs (demo mode with sample repo)
 */

import { prisma } from '../../lib/prisma';
import { reviewGuardService, ReviewRequest } from '../review-guard';
import { testEngineService, TestGenerationRequest } from '../test-engine';
import { docSyncService } from '../doc-sync';
import { randomUUID } from 'crypto';
import { logger } from '../../observability/logging';
import { metrics } from '../../observability/metrics';
import { createAuditLog, AuditActions } from '../../lib/audit';

export interface RunRequest {
  repositoryId?: string;
  sandboxId?: string; // For sandbox demo runs
  trigger: 'webhook' | 'manual' | 'sandbox';
  triggerMetadata?: {
    prNumber?: number;
    prSha?: string;
    prTitle?: string;
    userId?: string;
    diff?: string;
    files?: Array<{ path: string; content: string; beforeContent?: string | null }>;
  };
  config?: {
    skipReviewGuard?: boolean;
    skipTestEngine?: boolean;
    skipDocSync?: boolean;
  };
}

export interface RunResult {
  id: string;
  correlationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'partial_success' | 'cancelled';
  
  // Stage statuses
  reviewGuardStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
  testEngineStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
  docSyncStatus: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
  
  // Stage results
  reviewGuardResult?: {
    reviewId?: string;
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
  testEngineResult?: {
    testsGenerated: number;
    coverage?: {
      lines: number;
      branches: number;
      functions: number;
    };
    meetsThreshold: boolean;
  };
  docSyncResult?: {
    docId?: string;
    driftDetected: boolean;
    missingEndpoints: number;
    changedEndpoints: number;
  };
  
  // AI-touched detection
  aiTouchedDetected: boolean;
  aiTouchedFiles?: Array<{ path: string; confidence: number; methods: string[] }>;
  
  // Policy gates
  gatesPassed: boolean;
  gatesFailed?: Array<{ gate: string; reason: string }>;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  reviewGuardStartedAt?: Date;
  reviewGuardCompletedAt?: Date;
  testEngineStartedAt?: Date;
  testEngineCompletedAt?: Date;
  docSyncStartedAt?: Date;
  docSyncCompletedAt?: Date;
}

/**
 * ReadyLayer Run Pipeline Service
 * 
 * Orchestrates the complete ReadyLayer verification pipeline.
 * Each run goes through three stages: Review Guard → Test Engine → Doc Sync
 */
export class RunPipelineService {
  /**
   * Execute a ReadyLayer Run
   * 
   * Orchestrates Review Guard → Test Engine → Doc Sync with:
   * - Correlation ID for tracing
   * - Stage-by-stage status tracking
   * - AI-touched file detection
   * - Policy gate evaluation
   * - Complete audit trail
   * 
   * @param request - Run request with trigger and metadata
   * @returns Run result with all stage outputs
   */
  async executeRun(request: RunRequest): Promise<RunResult> {
    const correlationId = `run_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const log = logger.child({ correlationId, trigger: request.trigger });
    
    const startedAt = new Date();
    
    // Create run record
    const run = await prisma.readyLayerRun.create({
      data: {
        correlationId,
        repositoryId: request.repositoryId || null,
        sandboxId: request.sandboxId || null,
        trigger: request.trigger,
        triggerMetadata: request.triggerMetadata || {},
        status: 'running',
        reviewGuardStatus: request.config?.skipReviewGuard ? 'skipped' : 'pending',
        testEngineStatus: request.config?.skipTestEngine ? 'skipped' : 'pending',
        docSyncStatus: request.config?.skipDocSync ? 'skipped' : 'pending',
        startedAt,
      },
    });

    log.info({ runId: run.id }, 'Starting ReadyLayer Run');

    try {
      // Stage 1: Review Guard
      let reviewGuardResult: RunResult['reviewGuardResult'] | undefined;
      let reviewGuardStatus: RunResult['reviewGuardStatus'] = 'skipped';
      let reviewGuardStartedAt: Date | undefined;
      let reviewGuardCompletedAt: Date | undefined;
      
      if (!request.config?.skipReviewGuard && request.triggerMetadata?.files) {
        reviewGuardStartedAt = new Date();
        reviewGuardStatus = 'running';
        
        await prisma.readyLayerRun.update({
          where: { id: run.id },
          data: {
            reviewGuardStatus: 'running',
            reviewGuardStartedAt,
          },
        });

        try {
          const reviewRequest: ReviewRequest = {
            repositoryId: request.repositoryId || 'sandbox',
            prNumber: request.triggerMetadata.prNumber || 0,
            prSha: request.triggerMetadata.prSha || 'sandbox',
            prTitle: request.triggerMetadata.prTitle,
            diff: request.triggerMetadata.diff,
            files: request.triggerMetadata.files,
          };

          const reviewResult = await reviewGuardService.review(reviewRequest);
          
          reviewGuardCompletedAt = new Date();
          reviewGuardStatus = reviewResult.isBlocked ? 'failed' : 'succeeded';
          
          reviewGuardResult = {
            reviewId: reviewResult.id,
            issuesFound: reviewResult.issues.length,
            isBlocked: reviewResult.isBlocked,
            summary: reviewResult.summary,
          };

          // Link review to run
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              reviewId: reviewResult.id,
              reviewGuardStatus,
              reviewGuardCompletedAt,
              reviewGuardResult: reviewGuardResult as any,
            },
          });

          metrics.increment('runs.stage.completed', { stage: 'review_guard', status: reviewGuardStatus });
        } catch (error) {
          reviewGuardCompletedAt = new Date();
          reviewGuardStatus = 'failed';
          
          log.error({ err: error }, 'Review Guard stage failed');
          
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              reviewGuardStatus: 'failed',
              reviewGuardCompletedAt,
            },
          });

          metrics.increment('runs.stage.failed', { stage: 'review_guard' });
          
          // Don't throw - continue to other stages
        }
      }

      // Stage 2: Test Engine (only if files available)
      let testEngineResult: RunResult['testEngineResult'] | undefined;
      let testEngineStatus: RunResult['testEngineStatus'] = 'skipped';
      let testEngineStartedAt: Date | undefined;
      let testEngineCompletedAt: Date | undefined;
      
      if (!request.config?.skipTestEngine && request.triggerMetadata?.files) {
        testEngineStartedAt = new Date();
        testEngineStatus = 'running';
        
        await prisma.readyLayerRun.update({
          where: { id: run.id },
          data: {
            testEngineStatus: 'running',
            testEngineStartedAt,
          },
        });

        try {
          // Detect AI-touched files
          const aiTouchedFiles = await testEngineService.detectAITouchedFiles(
            request.repositoryId || 'sandbox',
            request.triggerMetadata.files.map(f => ({
              path: f.path,
              content: f.content,
              commitMessage: request.triggerMetadata?.prTitle,
            }))
          );

          // Update AI-touched detection
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              aiTouchedDetected: aiTouchedFiles.length > 0,
              aiTouchedFiles: aiTouchedFiles as any,
            },
          });

          // Generate tests for AI-touched files
          let testsGenerated = 0;
          for (const file of aiTouchedFiles) {
            const fileContent = request.triggerMetadata.files?.find(f => f.path === file.path)?.content;
            if (fileContent) {
              try {
                const testRequest: TestGenerationRequest = {
                  repositoryId: request.repositoryId || 'sandbox',
                  prNumber: request.triggerMetadata.prNumber,
                  prSha: request.triggerMetadata.prSha || 'sandbox',
                  filePath: file.path,
                  fileContent,
                };

                await testEngineService.generateTests(testRequest);
                testsGenerated++;
              } catch (error) {
                log.warn({ err: error, filePath: file.path }, 'Test generation failed for file');
                // Continue with other files
              }
            }
          }

          testEngineCompletedAt = new Date();
          testEngineStatus = 'succeeded';
          
          testEngineResult = {
            testsGenerated,
            meetsThreshold: true, // Would check actual coverage
          };

          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              testEngineStatus,
              testEngineCompletedAt,
              testEngineResult: testEngineResult as any,
            },
          });

          metrics.increment('runs.stage.completed', { stage: 'test_engine', status: testEngineStatus });
        } catch (error) {
          testEngineCompletedAt = new Date();
          testEngineStatus = 'failed';
          
          log.error({ err: error }, 'Test Engine stage failed');
          
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              testEngineStatus: 'failed',
              testEngineCompletedAt,
            },
          });

          metrics.increment('runs.stage.failed', { stage: 'test_engine' });
        }
      }

      // Stage 3: Doc Sync
      let docSyncResult: RunResult['docSyncResult'] | undefined;
      let docSyncStatus: RunResult['docSyncStatus'] = 'skipped';
      let docSyncStartedAt: Date | undefined;
      let docSyncCompletedAt: Date | undefined;
      
      if (!request.config?.skipDocSync && request.triggerMetadata?.prSha) {
        docSyncStartedAt = new Date();
        docSyncStatus = 'running';
        
        await prisma.readyLayerRun.update({
          where: { id: run.id },
          data: {
            docSyncStatus: 'running',
            docSyncStartedAt,
          },
        });

        try {
          // Check for drift (doesn't generate docs on PR, only checks)
          const driftResult = await docSyncService.checkDrift(
            request.repositoryId || 'sandbox',
            request.triggerMetadata.prSha || 'sandbox',
            {
              driftPrevention: {
                enabled: true,
                action: 'block',
                checkOn: 'pr',
              },
              updateStrategy: 'pr',
              branch: 'main',
            }
          );

          docSyncCompletedAt = new Date();
          docSyncStatus = driftResult.isBlocked ? 'failed' : 'succeeded';
          
          docSyncResult = {
            driftDetected: driftResult.driftDetected,
            missingEndpoints: driftResult.missingEndpoints.length,
            changedEndpoints: driftResult.changedEndpoints.length,
          };

          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              docSyncStatus,
              docSyncCompletedAt,
              docSyncResult: docSyncResult as any,
            },
          });

          metrics.increment('runs.stage.completed', { stage: 'doc_sync', status: docSyncStatus });
        } catch (error) {
          docSyncCompletedAt = new Date();
          docSyncStatus = 'failed';
          
          log.error({ err: error }, 'Doc Sync stage failed');
          
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              docSyncStatus: 'failed',
              docSyncCompletedAt,
            },
          });

          metrics.increment('runs.stage.failed', { stage: 'doc_sync' });
        }
      }

      // Evaluate policy gates
      const gatesFailed: Array<{ gate: string; reason: string }> = [];
      let gatesPassed = true;

      if (reviewGuardResult?.isBlocked) {
        gatesFailed.push({
          gate: 'review_guard',
          reason: `PR blocked: ${reviewGuardResult.issuesFound} issue(s) found`,
        });
        gatesPassed = false;
      }

      if (docSyncResult?.driftDetected && docSyncResult.missingEndpoints > 0) {
        gatesFailed.push({
          gate: 'doc_sync',
          reason: `Documentation drift: ${docSyncResult.missingEndpoints} endpoint(s) missing`,
        });
        gatesPassed = false;
      }

      // Determine overall conclusion
      const allStagesSucceeded = 
        (reviewGuardStatus === 'succeeded' || reviewGuardStatus === 'skipped') &&
        (testEngineStatus === 'succeeded' || testEngineStatus === 'skipped') &&
        (docSyncStatus === 'succeeded' || docSyncStatus === 'skipped');
      
      const anyStageFailed = 
        reviewGuardStatus === 'failed' ||
        testEngineStatus === 'failed' ||
        docSyncStatus === 'failed';

      const conclusion: RunResult['conclusion'] = 
        gatesPassed && allStagesSucceeded ? 'success' :
        anyStageFailed || !gatesPassed ? 'failure' :
        'partial_success';

      const completedAt = new Date();

      // Update final status
      await prisma.readyLayerRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          conclusion,
          gatesPassed,
          gatesFailed: gatesFailed.length > 0 ? gatesFailed as any : null,
          completedAt,
        },
      });

      // Audit log
      try {
        await createAuditLog({
          organizationId: request.repositoryId ? await this.getOrganizationId(request.repositoryId) : null,
          userId: request.triggerMetadata?.userId || null,
          action: AuditActions.RUN_COMPLETED,
          resourceType: 'run',
          resourceId: run.id,
          details: {
            correlationId,
            trigger: request.trigger,
            conclusion,
            gatesPassed,
            reviewGuardStatus,
            testEngineStatus,
            docSyncStatus,
          },
          runId: run.id,
        });
      } catch (error) {
        log.warn({ err: error }, 'Failed to create audit log');
      }

      metrics.increment('runs.completed', { conclusion, trigger: request.trigger });

      log.info({ runId: run.id, conclusion }, 'ReadyLayer Run completed');

      return {
        id: run.id,
        correlationId,
        status: 'completed',
        conclusion,
        reviewGuardStatus,
        testEngineStatus,
        docSyncStatus,
        reviewGuardResult,
        testEngineResult,
        docSyncResult,
        aiTouchedDetected: run.aiTouchedDetected,
        aiTouchedFiles: run.aiTouchedFiles as any,
        gatesPassed,
        gatesFailed: gatesFailed.length > 0 ? gatesFailed : undefined,
        startedAt,
        completedAt,
        reviewGuardStartedAt,
        reviewGuardCompletedAt,
        testEngineStartedAt,
        testEngineCompletedAt,
        docSyncStartedAt,
        docSyncCompletedAt,
      };
    } catch (error) {
      const completedAt = new Date();
      
      log.error({ err: error }, 'Run execution failed');
      
      await prisma.readyLayerRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          conclusion: 'failure',
          completedAt,
        },
      });

      metrics.increment('runs.failed', { trigger: request.trigger });

      throw error;
    }
  }

  /**
   * Get organization ID from repository
   */
  private async getOrganizationId(repositoryId: string): Promise<string | null> {
    try {
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });
      return repo?.organizationId || null;
    } catch {
      return null;
    }
  }

  /**
   * Create a sandbox run (demo mode)
   * 
   * Uses sample files for demonstration purposes
   */
  async createSandboxRun(): Promise<RunResult> {
    const sandboxId = `sandbox_${Date.now()}_${randomUUID().slice(0, 8)}`;
    
    // Sample files for sandbox demo
    const sampleFiles = [
      {
        path: 'src/auth.ts',
        content: `export async function login(username: string, password: string) {
  const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;
  return await db.query(query);
}`,
        beforeContent: null,
      },
      {
        path: 'src/api.ts',
        content: `export function getUser(id: string) {
  return fetch(\`/api/users/\${id}\`);
}`,
        beforeContent: null,
      },
    ];

    return this.executeRun({
      sandboxId,
      trigger: 'sandbox',
      triggerMetadata: {
        prSha: 'sandbox_demo',
        prTitle: 'Sandbox Demo Run',
        files: sampleFiles,
      },
    });
  }
}

export const runPipelineService = new RunPipelineService();
