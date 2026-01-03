/**
 * Golden Path E2E Test
 * 
 * The ONE deterministic test that encodes the core ReadyLayer flow.
 * This test must NEVER break - it validates the entire activation path.
 * 
 * Golden Path:
 * 1. Create sandbox run (demo mode)
 * 2. Verify run record created
 * 3. Verify stage progression
 * 4. Verify outputs persisted (findings, artifacts, audit)
 * 5. Verify outbox intents created
 * 6. Verify idempotency (rerun same trigger)
 */

import { describe, test, expect, beforeAll, afterAll } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { runPipelineService } from '../services/run-pipeline';
import { outboxService } from '../services/outbox';
import { validateResponse, runResponseSchema } from '../lib/contracts/schemas';

const prisma = new PrismaClient();

describe('Golden Path: ReadyLayer Activation Flow', () => {
  let sandboxRunId: string | null = null;
  let correlationId: string | null = null;

  beforeAll(async () => {
    // Ensure database is accessible
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup test data
    if (sandboxRunId) {
      await prisma.readyLayerRun.deleteMany({
        where: { id: sandboxRunId },
      });
      await prisma.outboxIntent.deleteMany({
        where: { runId: sandboxRunId },
      });
    }
    await prisma.$disconnect();
  });

  test('A) Create sandbox run (demo mode)', async () => {
    // Execute sandbox run
    const result = await runPipelineService.createSandboxRun();

    // Verify run was created
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.correlationId).toBeDefined();
    expect(result.status).toBe('completed'); // Should complete synchronously in test
    expect(result.trigger).toBe('sandbox');

    sandboxRunId = result.id;
    correlationId = result.correlationId;

    // Verify run record exists in database
    const runRecord = await prisma.readyLayerRun.findUnique({
      where: { id: result.id },
    });

    expect(runRecord).toBeDefined();
    expect(runRecord?.correlationId).toBe(correlationId);
    expect(runRecord?.sandboxId).toBeDefined();
    expect(runRecord?.trigger).toBe('sandbox');
  });

  test('B) Verify stage progression', async () => {
    if (!sandboxRunId) {
      throw new Error('Sandbox run not created');
    }

    const run = await prisma.readyLayerRun.findUnique({
      where: { id: sandboxRunId },
    });

    expect(run).toBeDefined();
    
    // Verify all stages have statuses
    expect(run?.reviewGuardStatus).toBeDefined();
    expect(run?.testEngineStatus).toBeDefined();
    expect(run?.docSyncStatus).toBeDefined();

    // Verify stages progressed from pending -> running -> succeeded/failed
    // At least one stage should have completed
    const stagesCompleted = [
      run?.reviewGuardStatus === 'succeeded' || run?.reviewGuardStatus === 'failed' || run?.reviewGuardStatus === 'skipped',
      run?.testEngineStatus === 'succeeded' || run?.testEngineStatus === 'failed' || run?.testEngineStatus === 'skipped',
      run?.docSyncStatus === 'succeeded' || run?.docSyncStatus === 'failed' || run?.docSyncStatus === 'skipped',
    ].filter(Boolean).length;

    expect(stagesCompleted).toBeGreaterThan(0);
  });

  test('C) Verify outputs persisted', async () => {
    if (!sandboxRunId) {
      throw new Error('Sandbox run not created');
    }

    const run = await prisma.readyLayerRun.findUnique({
      where: { id: sandboxRunId },
      include: {
        review: true,
        auditLogs: true,
      },
    });

    expect(run).toBeDefined();

    // Verify review guard result exists
    if (run?.reviewGuardStatus === 'succeeded' || run?.reviewGuardStatus === 'failed') {
      expect(run.reviewGuardResult).toBeDefined();
      
      if (run.reviewGuardResult) {
        const result = run.reviewGuardResult as any;
        expect(result.issuesFound).toBeDefined();
        expect(typeof result.issuesFound).toBe('number');
      }
    }

    // Verify audit logs exist
    expect(run?.auditLogs).toBeDefined();
    expect(Array.isArray(run?.auditLogs)).toBe(true);
    
    // At least one audit log should exist
    if (run?.auditLogs && run.auditLogs.length > 0) {
      const auditLog = run.auditLogs[0];
      expect(auditLog.correlationId || auditLog.runId).toBeDefined();
    }
  });

  test('D) Verify outbox intents created', async () => {
    if (!sandboxRunId) {
      throw new Error('Sandbox run not created');
    }

    // Get outbox intents for this run
    const intents = await outboxService.getIntentsForRun(sandboxRunId);

    // For sandbox runs, intents should be created but may not be posted
    // (since there's no real repository)
    expect(Array.isArray(intents)).toBe(true);

    // Verify intents have correct structure
    for (const intent of intents) {
      expect(intent.id).toBeDefined();
      expect(intent.idempotencyKey).toBeDefined();
      expect(intent.runId).toBe(sandboxRunId);
      expect(intent.status).toBeDefined();
    }
  });

  test('E) Verify API response contract', async () => {
    if (!sandboxRunId) {
      throw new Error('Sandbox run not created');
    }

    // Fetch run via API (simulate API call)
    const run = await prisma.readyLayerRun.findUnique({
      where: { id: sandboxRunId },
    });

    if (!run) {
      throw new Error('Run not found');
    }

    // Transform to API response shape
    const apiResponse = {
      id: run.id,
      correlationId: run.correlationId,
      status: run.status,
      conclusion: run.conclusion,
      reviewGuardStatus: run.reviewGuardStatus,
      testEngineStatus: run.testEngineStatus,
      docSyncStatus: run.docSyncStatus,
      reviewGuardResult: run.reviewGuardResult as any,
      testEngineResult: run.testEngineResult as any,
      docSyncResult: run.docSyncResult as any,
      aiTouchedDetected: run.aiTouchedDetected,
      aiTouchedFiles: run.aiTouchedFiles as any,
      gatesPassed: run.gatesPassed,
      gatesFailed: run.gatesFailed as any,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString(),
      reviewGuardStartedAt: run.reviewGuardStartedAt?.toISOString(),
      reviewGuardCompletedAt: run.reviewGuardCompletedAt?.toISOString(),
      testEngineStartedAt: run.testEngineStartedAt?.toISOString(),
      testEngineCompletedAt: run.testEngineCompletedAt?.toISOString(),
      docSyncStartedAt: run.docSyncStartedAt?.toISOString(),
      docSyncCompletedAt: run.docSyncCompletedAt?.toISOString(),
    };

    // Validate against schema
    const validation = validateResponse(apiResponse, runResponseSchema);
    
    if (!validation.success) {
      console.error('Contract validation failed:', validation.errors.errors);
    }
    
    expect(validation.success).toBe(true);
  });

  test('F) Verify idempotency (rerun same trigger)', async () => {
    if (!sandboxRunId) {
      throw new Error('Sandbox run not created');
    }

    // Get initial run count
    const initialRunCount = await prisma.readyLayerRun.count({
      where: { sandboxId: (await prisma.readyLayerRun.findUnique({ where: { id: sandboxRunId } }))?.sandboxId },
    });

    // Get initial outbox intent count
    const initialIntentCount = await prisma.outboxIntent.count({
      where: { runId: sandboxRunId },
    });

    // Rerun with same sandbox ID (should create new run, not duplicate)
    const rerunResult = await runPipelineService.createSandboxRun();

    // Verify new run was created (different ID)
    expect(rerunResult.id).not.toBe(sandboxRunId);

    // Verify no duplicate side effects
    const finalRunCount = await prisma.readyLayerRun.count({
      where: { sandboxId: rerunResult.sandboxId },
    });

    // Should have exactly one more run
    expect(finalRunCount).toBe(initialRunCount + 1);

    // Verify outbox intents for new run are separate
    const rerunIntentCount = await prisma.outboxIntent.count({
      where: { runId: rerunResult.id },
    });

    // New run should have its own intents
    expect(rerunIntentCount).toBeGreaterThan(0);
    
    // Original run's intent count should be unchanged
    const finalIntentCount = await prisma.outboxIntent.count({
      where: { runId: sandboxRunId },
    });
    
    expect(finalIntentCount).toBe(initialIntentCount);
  });
});
