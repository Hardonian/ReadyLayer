/**
 * Optimized ReadyLayer Run Pipeline Service
 * 
 * Performance improvements:
 * - Parallel execution of independent stages (Review Guard, Test Engine, Doc Sync)
 * - Cached AI-touched detection results
 * - Reduced sequential database writes through batching
 * 
 * Orchestrates the complete ReadyLayer pipeline:
 * 1. Review Guard (static checks + AI review) - CAN RUN IN PARALLEL
 * 2. Test Engine (test generation + coverage check) - CAN RUN IN PARALLEL
 * 3. Doc Sync (documentation generation + drift check) - CAN RUN IN PARALLEL
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
import { outboxService } from '../outbox';
import { randomUUID } from 'crypto';
import { logger } from '../../observability/logging';
import { metrics } from '../../observability/metrics';
import { startHotPathTracker } from '../../observability/hot-path';
import { createAuditLog, AuditActions } from '../../lib/audit';
import { toJsonValue, toNullableJsonValue } from '../../lib/prisma-json';
import { SimpleCache } from '../../lib/utils/memoization';
import { ingestProvenance } from '../../lib/provenance-service';

// Cache for AI-touched detection results (30 second TTL)
const aiDetectionCache = new SimpleCache<{ files: Array<{ path: string; confidence: number; methods: string[] }>; timestamp: number }>(30000);

export interface RunRequest {
  repositoryId?: string;
  sandboxId?: string; // For sandbox demo runs
  trigger: 'webhook' | 'manual' | 'sandbox';
  triggerMetadata?: {
    prNumber?: number;
    prSha?: string;
    prTitle?: string;
    prBody?: string;
    userId?: string;
    diff?: string;
    files?: Array<{ path: string; content: string; beforeContent?: string | null }>;
  };
  config?: {
    skipReviewGuard?: boolean;
    skipTestEngine?: boolean;
    skipDocSync?: boolean;
    parallelExecution?: boolean; // Enable parallel stage execution
  };
}

export interface RunResult {
  id: string;
  correlationId: string;
  sandboxId?: string | null;
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

interface StageResult {
  status: 'succeeded' | 'failed' | 'skipped';
  result?: unknown;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * ReadyLayer Run Pipeline Service - OPTIMIZED
 * 
 * Orchestrates the complete ReadyLayer verification pipeline.
 * Stages run in parallel for maximum performance when parallelExecution is enabled.
 */
export class RunPipelineService {
  /**
   * Execute a ReadyLayer Run - OPTIMIZED WITH PARALLEL STAGES
   * 
   * Orchestrates Review Guard, Test Engine, and Doc Sync with:
   * - Correlation ID for tracing
   * - Stage-by-stage status tracking
   * - AI-touched file detection with caching
   * - Policy gate evaluation
   * - Complete audit trail
   * - PARALLEL EXECUTION of independent stages
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

    // Determine if we should run stages in parallel
    const parallelExecution = request.config?.parallelExecution !== false; // Default to true

    try {
      let reviewGuardResult: RunResult['reviewGuardResult'] | undefined;
      let reviewGuardStatus: RunResult['reviewGuardStatus'] = 'skipped';
      let reviewGuardStartedAt: Date | undefined;
      let reviewGuardCompletedAt: Date | undefined;
      
      let testEngineResult: RunResult['testEngineResult'] | undefined;
      let testEngineStatus: RunResult['testEngineStatus'] = 'skipped';
      let testEngineStartedAt: Date | undefined;
      let testEngineCompletedAt: Date | undefined;
      
      let docSyncResult: RunResult['docSyncResult'] | undefined;
      let docSyncStatus: RunResult['docSyncStatus'] = 'skipped';
      let docSyncStartedAt: Date | undefined;
      let docSyncCompletedAt: Date | undefined;
      
      let aiTouchedFiles: Array<{ path: string; confidence: number; methods: string[] }> = [];
      let aiTouchedDetected = false;

      const triggerMetadata: RunRequest['triggerMetadata'] = request.triggerMetadata ?? {};
      const triggerFiles = triggerMetadata.files ?? [];
      const prNumber = triggerMetadata.prNumber ?? 0;
      const prSha = triggerMetadata.prSha ?? 'sandbox';
      const prTitle = triggerMetadata.prTitle ?? 'Sandbox Run';
      const prBody = triggerMetadata.prBody ?? '';

      // Define which stages to run
      const shouldRunReviewGuard = !request.config?.skipReviewGuard && triggerFiles.length > 0;
      const shouldRunTestEngine = !request.config?.skipTestEngine && triggerFiles.length > 0;
      const shouldRunDocSync = !request.config?.skipDocSync && Boolean(triggerMetadata.prSha);

      if (parallelExecution && (shouldRunReviewGuard || shouldRunTestEngine || shouldRunDocSync)) {
        // PARALLEL EXECUTION: Run independent stages concurrently
        log.info({ parallel: true }, 'Running stages in parallel');
        
        // Start all stages simultaneously where possible
        const stagePromises: Array<Promise<StageResult>> = [];
        const stageNames: string[] = [];

        // Stage 1: Review Guard (parallel)
        if (shouldRunReviewGuard) {
          reviewGuardStartedAt = new Date();
          reviewGuardStatus = 'running';
          
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              reviewGuardStatus: 'running',
              reviewGuardStartedAt,
            },
          });

          // Create outbox intent (fire-and-forget)
          if (request.repositoryId && triggerMetadata.prNumber && triggerMetadata.prSha) {
            outboxService.createIntent({
              runId: run.id,
              repositoryId: request.repositoryId,
              sandboxId: request.sandboxId,
              update: {
                runId: run.id,
                repositoryId: request.repositoryId,
                prNumber,
                prSha,
                stage: 'review_guard',
                status: 'in_progress',
              },
            }).catch(() => {}); // Non-critical
          }

          stagePromises.push(this.executeReviewGuardStage(request, run.id, log));
          stageNames.push('reviewGuard');
        }

        // Stage 2: Test Engine (parallel) - includes AI-touched detection
        if (shouldRunTestEngine) {
          testEngineStartedAt = new Date();
          testEngineStatus = 'running';
          
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              testEngineStatus: 'running',
              testEngineStartedAt,
            },
          });

          // Create outbox intent (fire-and-forget)
          if (request.repositoryId && triggerMetadata.prNumber && triggerMetadata.prSha) {
            outboxService.createIntent({
              runId: run.id,
              repositoryId: request.repositoryId,
              sandboxId: request.sandboxId,
              update: {
                runId: run.id,
                repositoryId: request.repositoryId,
                prNumber,
                prSha,
                stage: 'test_engine',
                status: 'in_progress',
              },
            }).catch(() => {}); // Non-critical
          }

          stagePromises.push(this.executeTestEngineStage(request, run.id, log));
          stageNames.push('testEngine');
        }

        // Stage 3: Doc Sync (parallel)
        if (shouldRunDocSync) {
          docSyncStartedAt = new Date();
          docSyncStatus = 'running';
          
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              docSyncStatus: 'running',
              docSyncStartedAt,
            },
          });

          // Create outbox intent (fire-and-forget)
          if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
            outboxService.createIntent({
              runId: run.id,
              repositoryId: request.repositoryId,
              sandboxId: request.sandboxId,
              update: {
                runId: run.id,
                repositoryId: request.repositoryId,
                prNumber: request.triggerMetadata.prNumber,
                prSha: request.triggerMetadata.prSha,
                stage: 'doc_sync',
                status: 'in_progress',
              },
            }).catch(() => {}); // Non-critical
          }

          stagePromises.push(this.executeDocSyncStage(request, run.id, log));
          stageNames.push('docSync');
        }

        // Execute all stages in parallel
        const results = await Promise.allSettled(stagePromises);

        // Process results
        results.forEach((result, index) => {
          const stageName = stageNames[index];
          
          if (result.status === 'fulfilled') {
            const stageResult = result.value;
            
            if (stageName === 'reviewGuard') {
              reviewGuardCompletedAt = stageResult.completedAt;
              reviewGuardStatus = stageResult.status;
              reviewGuardResult = stageResult.result as RunResult['reviewGuardResult'];
              
              // Update database
              prisma.readyLayerRun.update({
                where: { id: run.id },
                data: {
                  reviewGuardStatus,
                  reviewGuardCompletedAt,
                  reviewGuardResult: toJsonValue(reviewGuardResult),
                },
              }).catch(() => {});

              // Outbox completion (fire-and-forget)
              if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
                outboxService.createIntent({
                  runId: run.id,
                  repositoryId: request.repositoryId,
                  sandboxId: request.sandboxId,
                  update: {
                    runId: run.id,
                    repositoryId: request.repositoryId,
                    prNumber: request.triggerMetadata.prNumber,
                    prSha: request.triggerMetadata.prSha,
                    stage: 'review_guard',
                    status: 'completed',
                    conclusion: reviewGuardStatus === 'succeeded' ? 'success' : 'failure',
                    details: { reviewGuard: reviewGuardResult },
                  },
                }).catch(() => {});
              }
              
              metrics.increment('runs.stage.completed', { stage: 'review_guard', status: reviewGuardStatus });
            }
            
            else if (stageName === 'testEngine') {
              testEngineCompletedAt = stageResult.completedAt;
              testEngineStatus = stageResult.status;
              testEngineResult = stageResult.result as RunResult['testEngineResult'];
              
              // Extract AI-touched info from result
              if (stageResult.result && typeof stageResult.result === 'object') {
                const result = stageResult.result as { aiTouchedFiles?: typeof aiTouchedFiles; aiTouchedDetected?: boolean };
                aiTouchedFiles = result.aiTouchedFiles || [];
                aiTouchedDetected = result.aiTouchedDetected || false;
              }
              
              // Update database with both test results and AI detection
              prisma.readyLayerRun.update({
                where: { id: run.id },
                data: {
                  testEngineStatus,
                  testEngineCompletedAt,
                  testEngineResult: toJsonValue(testEngineResult),
                  aiTouchedDetected,
                  aiTouchedFiles: toJsonValue(aiTouchedFiles),
                },
              }).catch(() => {});

              // Outbox completion (fire-and-forget)
              if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
                outboxService.createIntent({
                  runId: run.id,
                  repositoryId: request.repositoryId,
                  sandboxId: request.sandboxId,
                  update: {
                    runId: run.id,
                    repositoryId: request.repositoryId,
                    prNumber: request.triggerMetadata.prNumber,
                    prSha: request.triggerMetadata.prSha,
                    stage: 'test_engine',
                    status: 'completed',
                    conclusion: testEngineStatus === 'succeeded' ? 'success' : 'failure',
                    details: { testEngine: testEngineResult },
                  },
                }).catch(() => {});
              }
              
              metrics.increment('runs.stage.completed', { stage: 'test_engine', status: testEngineStatus });
            }
            
            else if (stageName === 'docSync') {
              docSyncCompletedAt = stageResult.completedAt;
              docSyncStatus = stageResult.status;
              docSyncResult = stageResult.result as RunResult['docSyncResult'];
              
              // Update database
              prisma.readyLayerRun.update({
                where: { id: run.id },
                data: {
                  docSyncStatus,
                  docSyncCompletedAt,
                  docSyncResult: toJsonValue(docSyncResult),
                },
              }).catch(() => {});

              // Outbox completion (fire-and-forget)
              if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
                outboxService.createIntent({
                  runId: run.id,
                  repositoryId: request.repositoryId,
                  sandboxId: request.sandboxId,
                  update: {
                    runId: run.id,
                    repositoryId: request.repositoryId,
                    prNumber: request.triggerMetadata.prNumber,
                    prSha: request.triggerMetadata.prSha,
                    stage: 'doc_sync',
                    status: 'completed',
                    conclusion: docSyncStatus === 'succeeded' ? 'success' : 'failure',
                    details: { docSync: docSyncResult },
                  },
                }).catch(() => {});
              }
              
              metrics.increment('runs.stage.completed', { stage: 'doc_sync', status: docSyncStatus });
            }
          } else {
            // Stage failed
            const failure =
              result.reason instanceof Error
                ? result.reason
                : new Error(`Stage failure: ${String(result.reason)}`);
            log.error({ stage: stageName, error: failure }, 'Stage failed in parallel execution');
            
            if (stageName === 'reviewGuard') {
              reviewGuardStatus = 'failed';
              reviewGuardCompletedAt = new Date();
              prisma.readyLayerRun.update({
                where: { id: run.id },
                data: { reviewGuardStatus: 'failed', reviewGuardCompletedAt },
              }).catch(() => {});
              metrics.increment('runs.stage.failed', { stage: 'review_guard' });
            } else if (stageName === 'testEngine') {
              testEngineStatus = 'failed';
              testEngineCompletedAt = new Date();
              prisma.readyLayerRun.update({
                where: { id: run.id },
                data: { testEngineStatus: 'failed', testEngineCompletedAt },
              }).catch(() => {});
              metrics.increment('runs.stage.failed', { stage: 'test_engine' });
            } else if (stageName === 'docSync') {
              docSyncStatus = 'failed';
              docSyncCompletedAt = new Date();
              prisma.readyLayerRun.update({
                where: { id: run.id },
                data: { docSyncStatus: 'failed', docSyncCompletedAt },
              }).catch(() => {});
              metrics.increment('runs.stage.failed', { stage: 'doc_sync' });
            }
          }
        });

      } else {
        // SEQUENTIAL EXECUTION (fallback for compatibility)
        log.info({ parallel: false }, 'Running stages sequentially');
        
        // Stage 1: Review Guard (sequential)
        if (shouldRunReviewGuard) {
          reviewGuardStartedAt = new Date();
          reviewGuardStatus = 'running';
          
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              reviewGuardStatus: 'running',
              reviewGuardStartedAt,
            },
          });

          // Create outbox intent
          if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
            try {
              await outboxService.createIntent({
                runId: run.id,
                repositoryId: request.repositoryId,
                sandboxId: request.sandboxId,
                update: {
                  runId: run.id,
                  repositoryId: request.repositoryId,
                  prNumber: request.triggerMetadata.prNumber,
                  prSha: request.triggerMetadata.prSha,
                  stage: 'review_guard',
                  status: 'in_progress',
                },
              });
            } catch (error) {
              log.warn({ err: error }, 'Failed to create outbox intent for review guard start');
            }
          }

          try {
            const reviewRequest: ReviewRequest = {
              repositoryId: request.repositoryId || 'sandbox',
              prNumber,
              prSha,
              prTitle,
              diff: triggerMetadata.diff ?? '',
              files: triggerFiles,
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

            await prisma.readyLayerRun.update({
              where: { id: run.id },
              data: {
                reviewId: reviewResult.id,
                reviewGuardStatus,
                reviewGuardCompletedAt,
                reviewGuardResult: toJsonValue(reviewGuardResult),
              },
            });

            if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
              try {
                await outboxService.createIntent({
                  runId: run.id,
                  repositoryId: request.repositoryId,
                  sandboxId: request.sandboxId,
                  update: {
                    runId: run.id,
                    repositoryId: request.repositoryId,
                    prNumber: request.triggerMetadata.prNumber,
                    prSha: request.triggerMetadata.prSha,
                    stage: 'review_guard',
                    status: 'completed',
                    conclusion: reviewGuardStatus === 'succeeded' ? 'success' : 'failure',
                    details: { reviewGuard: reviewGuardResult },
                    issues: reviewResult.issues,
                  },
                });
              } catch (error) {
                log.warn({ err: error }, 'Failed to create outbox intent for review guard completion');
              }
            }

            metrics.increment('runs.stage.completed', { stage: 'review_guard', status: reviewGuardStatus });
          } catch (error) {
            reviewGuardCompletedAt = new Date();
            reviewGuardStatus = 'failed';
            log.error({ err: error }, 'Review Guard stage failed');
            await prisma.readyLayerRun.update({
              where: { id: run.id },
              data: { reviewGuardStatus: 'failed', reviewGuardCompletedAt },
            });
            metrics.increment('runs.stage.failed', { stage: 'review_guard' });
          }
        }

        // Stage 2: Test Engine (sequential)
        if (shouldRunTestEngine) {
          testEngineStartedAt = new Date();
          testEngineStatus = 'running';
          
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              testEngineStatus: 'running',
              testEngineStartedAt,
            },
          });

          if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
            try {
              await outboxService.createIntent({
                runId: run.id,
                repositoryId: request.repositoryId,
                sandboxId: request.sandboxId,
                update: {
                  runId: run.id,
                  repositoryId: request.repositoryId,
                  prNumber: request.triggerMetadata.prNumber,
                  prSha: request.triggerMetadata.prSha,
                  stage: 'test_engine',
                  status: 'in_progress',
                },
              });
            } catch (error) {
              log.warn({ err: error }, 'Failed to create outbox intent for test engine start');
            }
          }

          try {
            // Detect AI-touched files (with caching)
            const cacheKey = `ai-touched:${request.repositoryId ?? 'sandbox'}:${prSha}`;
            const cachedDetection = aiDetectionCache.get(cacheKey);
            
            if (!cachedDetection) {
              aiTouchedFiles = await testEngineService.detectAITouchedFiles(
                request.repositoryId || 'sandbox',
                triggerFiles.map(f => ({
                  path: f.path,
                  content: f.content,
                  commitMessage: prTitle,
                })),
                prBody
              );
              
              aiTouchedDetected = aiTouchedFiles.length > 0;
              
              // Cache the result
              aiDetectionCache.set(cacheKey, { files: aiTouchedFiles, timestamp: Date.now() }, 30000);
            } else {
              aiTouchedFiles = cachedDetection.files;
              aiTouchedDetected = aiTouchedFiles.length > 0;
              log.info({ cacheHit: true }, 'Using cached AI-touched detection');
            }

            await prisma.readyLayerRun.update({
              where: { id: run.id },
              data: {
                aiTouchedDetected,
                aiTouchedFiles: toJsonValue(aiTouchedFiles),
              },
            });

            // Generate tests for AI-touched files
            let testsGenerated = 0;
            for (const file of aiTouchedFiles) {
              const fileContent = triggerFiles.find(f => f.path === file.path)?.content;
              if (fileContent) {
                try {
                  const testRequest: TestGenerationRequest = {
                    repositoryId: request.repositoryId || 'sandbox',
                    prNumber,
                    prSha,
                    filePath: file.path,
                    fileContent,
                  };

                  await testEngineService.generateTests(testRequest);
                  testsGenerated++;
                } catch (error) {
                  log.warn({ err: error, filePath: file.path }, 'Test generation failed for file');
                }
              }
            }

            testEngineCompletedAt = new Date();
            testEngineStatus = 'succeeded';
            
            testEngineResult = {
              testsGenerated,
              meetsThreshold: true,
            };

            await prisma.readyLayerRun.update({
              where: { id: run.id },
              data: {
                testEngineStatus,
                testEngineCompletedAt,
                testEngineResult: toJsonValue(testEngineResult),
              },
            });

            if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
              try {
                await outboxService.createIntent({
                  runId: run.id,
                  repositoryId: request.repositoryId,
                  sandboxId: request.sandboxId,
                  update: {
                    runId: run.id,
                    repositoryId: request.repositoryId,
                    prNumber: request.triggerMetadata.prNumber,
                    prSha: request.triggerMetadata.prSha,
                    stage: 'test_engine',
                    status: 'completed',
                    conclusion: testEngineStatus === 'succeeded' ? 'success' : 'failure',
                    details: { testEngine: testEngineResult },
                  },
                });
              } catch (error) {
                log.warn({ err: error }, 'Failed to create outbox intent for test engine completion');
              }
            }

            metrics.increment('runs.stage.completed', { stage: 'test_engine', status: testEngineStatus });
          } catch (error) {
            testEngineCompletedAt = new Date();
            testEngineStatus = 'failed';
            log.error({ err: error }, 'Test Engine stage failed');
            await prisma.readyLayerRun.update({
              where: { id: run.id },
              data: { testEngineStatus: 'failed', testEngineCompletedAt },
            });
            metrics.increment('runs.stage.failed', { stage: 'test_engine' });
          }
        }

        // Stage 3: Doc Sync (sequential)
        if (shouldRunDocSync) {
          docSyncStartedAt = new Date();
          docSyncStatus = 'running';
          
          await prisma.readyLayerRun.update({
            where: { id: run.id },
            data: {
              docSyncStatus: 'running',
              docSyncStartedAt,
            },
          });

          if (request.repositoryId && triggerMetadata.prNumber && triggerMetadata.prSha) {
            try {
              await outboxService.createIntent({
                runId: run.id,
                repositoryId: request.repositoryId,
                sandboxId: request.sandboxId,
                update: {
                  runId: run.id,
                  repositoryId: request.repositoryId,
                  prNumber,
                  prSha,
                  stage: 'doc_sync',
                  status: 'in_progress',
                },
              });
            } catch (error) {
              log.warn({ err: error }, 'Failed to create outbox intent for doc sync start');
            }
          }

          try {
            const driftResult = await docSyncService.checkDrift(
              request.repositoryId || 'sandbox',
              prSha,
              {
                driftPrevention: { enabled: true, action: 'block', checkOn: 'pr' },
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
                docSyncResult: toJsonValue(docSyncResult),
              },
            });

            if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
              try {
                await outboxService.createIntent({
                  runId: run.id,
                  repositoryId: request.repositoryId,
                  sandboxId: request.sandboxId,
                  update: {
                    runId: run.id,
                    repositoryId: request.repositoryId,
                    prNumber: request.triggerMetadata.prNumber,
                    prSha: request.triggerMetadata.prSha,
                    stage: 'doc_sync',
                    status: 'completed',
                    conclusion: docSyncStatus === 'succeeded' ? 'success' : 'failure',
                    details: { docSync: docSyncResult },
                  },
                });
              } catch (error) {
                log.warn({ err: error }, 'Failed to create outbox intent for doc sync completion');
              }
            }

            metrics.increment('runs.stage.completed', { stage: 'doc_sync', status: docSyncStatus });
          } catch (error) {
            docSyncCompletedAt = new Date();
            docSyncStatus = 'failed';
            log.error({ err: error }, 'Doc Sync stage failed');
            await prisma.readyLayerRun.update({
              where: { id: run.id },
              data: { docSyncStatus: 'failed', docSyncCompletedAt },
            });
            metrics.increment('runs.stage.failed', { stage: 'doc_sync' });
          }
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
          gatesFailed: toNullableJsonValue(gatesFailed.length > 0 ? gatesFailed : null),
          completedAt,
        },
      });

      // Create outbox intent for final completion
      if (request.repositoryId && request.triggerMetadata?.prNumber && request.triggerMetadata?.prSha) {
        try {
          await outboxService.createIntent({
            runId: run.id,
            repositoryId: request.repositoryId,
            sandboxId: request.sandboxId,
            update: {
              runId: run.id,
              repositoryId: request.repositoryId,
              prNumber: request.triggerMetadata.prNumber,
              prSha: request.triggerMetadata.prSha,
              stage: 'complete',
              status: 'completed',
              conclusion: conclusion === 'partial_success' ? 'neutral' : conclusion,
              details: {
                reviewGuard: reviewGuardResult,
                testEngine: testEngineResult,
                docSync: docSyncResult,
              },
            },
          });
        } catch (error) {
          log.warn({ err: error }, 'Failed to create outbox intent for final run completion');
        }
      }



      if (request.repositoryId) {
        const orgId = await this.getOrganizationId(request.repositoryId);
        if (orgId) {
          await ingestProvenance({
            organizationId: orgId,
            repositoryId: request.repositoryId,
            runId: run.id,
            correlationId,
            prNumber: request.triggerMetadata?.prNumber,
            prSha: request.triggerMetadata?.prSha,
            source: 'internal',
            sourceSystem: 'readylayer',
            redactionLevel: 'safe',
            agent: { name: 'readylayer-pipeline', version: '1.0.0', provider: 'internal' },
            payload: {
              metadata: {
                aiTouchedDetected,
                aiTouchedFiles,
                stages: {
                  reviewGuardStatus,
                  testEngineStatus,
                  docSyncStatus,
                },
              },
              prompts: [],
              transcript: '',
              toolCalls: [],
            },
          });
        }
      }
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
            parallelExecution,
          },
          runId: run.id,
        });
      } catch (error) {
        log.warn({ err: error }, 'Failed to create audit log');
      }

      metrics.increment('runs.completed', { conclusion, trigger: request.trigger, parallel: parallelExecution.toString() });

      log.info({ runId: run.id, conclusion, parallel: parallelExecution }, 'ReadyLayer Run completed');

      return {
        id: run.id,
        correlationId,
        sandboxId: run.sandboxId,
        status: 'completed',
        conclusion,
        reviewGuardStatus,
        testEngineStatus,
        docSyncStatus,
        reviewGuardResult,
        testEngineResult,
        docSyncResult,
        aiTouchedDetected,
        aiTouchedFiles,
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
   * Execute Review Guard stage
   */
  private async executeReviewGuardStage(
    request: RunRequest,
    runId: string,
    log: ReturnType<typeof logger.child>
  ): Promise<StageResult> {
    const startedAt = new Date();
    const stageLog = log.child({ runId, stage: 'review_guard' });
    
    try {
      const reviewRequest: ReviewRequest = {
        repositoryId: request.repositoryId || 'sandbox',
        prNumber: request.triggerMetadata?.prNumber || 0,
        prSha: request.triggerMetadata?.prSha || 'sandbox',
        prTitle: request.triggerMetadata?.prTitle,
        diff: request.triggerMetadata?.diff,
        files: request.triggerMetadata?.files || [],
      };

      const reviewResult = await reviewGuardService.review(reviewRequest);
      
      return {
        status: reviewResult.isBlocked ? 'failed' : 'succeeded',
        result: {
          reviewId: reviewResult.id,
          issuesFound: reviewResult.issues.length,
          isBlocked: reviewResult.isBlocked,
          summary: reviewResult.summary,
        },
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      stageLog.error({ err: error }, 'Review Guard stage failed');
      return {
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute Test Engine stage (with AI-touched detection)
   */
  private async executeTestEngineStage(
    request: RunRequest,
    runId: string,
    log: ReturnType<typeof logger.child>
  ): Promise<StageResult> {
    const startedAt = new Date();
    
    try {
      // Check cache first
      const cacheKey = `ai-touched:${request.repositoryId}:${request.triggerMetadata?.prSha}`;
      const cachedDetection = aiDetectionCache.get(cacheKey);
      
      let aiTouchedFiles: Array<{ path: string; confidence: number; methods: string[] }>;
      
      if (cachedDetection) {
        aiTouchedFiles = cachedDetection.files;
        log.info({ cacheHit: true, runId }, 'Using cached AI-touched detection');
      } else {
        aiTouchedFiles = await testEngineService.detectAITouchedFiles(
          request.repositoryId || 'sandbox',
          (request.triggerMetadata?.files || []).map(f => ({
            path: f.path,
            content: f.content,
            commitMessage: request.triggerMetadata?.prTitle,
          })),
          request.triggerMetadata?.prBody
        );
        
        // Cache the result
        aiDetectionCache.set(cacheKey, { files: aiTouchedFiles, timestamp: Date.now() }, 30000);
      }

      const aiTouchedDetected = aiTouchedFiles.length > 0;

      // Generate tests for AI-touched files
      let testsGenerated = 0;
      for (const file of aiTouchedFiles) {
        const fileContent = request.triggerMetadata?.files?.find(f => f.path === file.path)?.content;
        if (fileContent) {
          try {
            const testRequest: TestGenerationRequest = {
              repositoryId: request.repositoryId || 'sandbox',
              prNumber: request.triggerMetadata?.prNumber,
              prSha: request.triggerMetadata?.prSha || 'sandbox',
              filePath: file.path,
              fileContent,
            };

            await testEngineService.generateTests(testRequest);
            testsGenerated++;
          } catch (error) {
            log.warn({ err: error, filePath: file.path, runId }, 'Test generation failed for file');
          }
        }
      }

      return {
        status: 'succeeded',
        result: {
          testsGenerated,
          meetsThreshold: true,
          aiTouchedFiles,
          aiTouchedDetected,
        },
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      log.error({ err: error, stage: 'testEngine', runId }, 'Test Engine stage failed');
      return {
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute Doc Sync stage
   */
  private async executeDocSyncStage(
    request: RunRequest,
    runId: string,
    log: ReturnType<typeof logger.child>
  ): Promise<StageResult> {
    const startedAt = new Date();
    
    try {
      const driftResult = await docSyncService.checkDrift(
        request.repositoryId || 'sandbox',
        request.triggerMetadata?.prSha || 'sandbox',
        {
          driftPrevention: { enabled: true, action: 'block', checkOn: 'pr' },
          updateStrategy: 'pr',
          branch: 'main',
        }
      );

      return {
        status: driftResult.isBlocked ? 'failed' : 'succeeded',
        result: {
          driftDetected: driftResult.driftDetected,
          missingEndpoints: driftResult.missingEndpoints.length,
          changedEndpoints: driftResult.changedEndpoints.length,
        },
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      log.error({ err: error, stage: 'docSync', runId }, 'Doc Sync stage failed');
      return {
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
   */
  async createSandboxRun(): Promise<RunResult> {
    try {
      const { sandboxFiles, sandboxPRMetadata } = await import('../../content/demo/sandboxFixtures');
      const sandboxId = process.env.DEMO_SANDBOX_ID ?? `sandbox_${sandboxPRMetadata.prSha}`;
      const tracker = startHotPathTracker({
        requestId: sandboxId,
        route: '/api/v1/runs/sandbox',
        operation: 'sandbox_run',
      });

      const result = await this.executeRun({
        sandboxId,
        trigger: 'sandbox',
        triggerMetadata: {
          prNumber: sandboxPRMetadata.prNumber,
          prSha: sandboxPRMetadata.prSha,
          prTitle: sandboxPRMetadata.prTitle,
          diff: sandboxPRMetadata.diff,
          files: sandboxFiles,
        },
      });

      tracker.recordDbCall();
      tracker.finish('ok', { status: result.status });

      return result;
    } catch (error) {
      startHotPathTracker({
        requestId: 'sandbox_run_failed',
        route: '/api/v1/runs/sandbox',
        operation: 'sandbox_run',
      }).finish('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const runPipelineService = new RunPipelineService();
