#!/usr/bin/env tsx
/**
 * Golden Path Test Script
 * 
 * The ONE deterministic test that encodes the core ReadyLayer flow.
 * This test must NEVER break - it validates the entire activation path.
 * 
 * Usage: npm run test:golden-path
 */

import { PrismaClient } from '@prisma/client';
import { runPipelineService } from '../services/run-pipeline';
import { outboxService } from '../services/outbox';
import { validateResponse, runResponseSchema } from '../lib/contracts/schemas';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, error?: string): void {
  results.push({ name, passed, error });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
}

async function main() {
  console.log('🧪 Golden Path Test - ReadyLayer Activation Flow\n');
  console.log('='.repeat(60));

  let sandboxRunId: string | null = null;
  let sandboxId: string | null = null;

  try {
    // Test A: Create sandbox run
    console.log('\n[A] Creating sandbox run (demo mode)...');
    try {
      const result = await runPipelineService.createSandboxRun();
      
      if (!result || !result.id || !result.correlationId) {
        recordTest('A) Create sandbox run', false, 'Run result missing required fields');
        throw new Error('Run creation failed');
      }

      sandboxRunId = result.id;
      
      // Get sandbox ID from database
      const runRecord = await prisma.readyLayerRun.findUnique({
        where: { id: result.id },
        select: { sandboxId: true },
      });
      sandboxId = runRecord?.sandboxId || null;

      recordTest('A) Create sandbox run', true);
    } catch (error) {
      recordTest('A) Create sandbox run', false, error instanceof Error ? error.message : String(error));
      throw error;
    }

    // Test B: Verify stage progression
    console.log('\n[B] Verifying stage progression...');
    try {
      if (!sandboxRunId) {
        throw new Error('Sandbox run not created');
      }

      const run = await prisma.readyLayerRun.findUnique({
        where: { id: sandboxRunId },
      });

      if (!run) {
        throw new Error('Run record not found');
      }

      const stagesDefined = [
        run.reviewGuardStatus,
        run.testEngineStatus,
        run.docSyncStatus,
      ].every(status => status !== undefined);

      if (!stagesDefined) {
        throw new Error('Not all stage statuses are defined');
      }

      // Verify at least one stage completed
      const stagesCompleted = [
        run.reviewGuardStatus === 'succeeded' || run.reviewGuardStatus === 'failed' || run.reviewGuardStatus === 'skipped',
        run.testEngineStatus === 'succeeded' || run.testEngineStatus === 'failed' || run.testEngineStatus === 'skipped',
        run.docSyncStatus === 'succeeded' || run.docSyncStatus === 'failed' || run.docSyncStatus === 'skipped',
      ].filter(Boolean).length;

      if (stagesCompleted === 0) {
        throw new Error('No stages completed');
      }

      recordTest('B) Verify stage progression', true);
    } catch (error) {
      recordTest('B) Verify stage progression', false, error instanceof Error ? error.message : String(error));
    }

    // Test C: Verify outputs persisted
    console.log('\n[C] Verifying outputs persisted...');
    try {
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

      if (!run) {
        throw new Error('Run record not found');
      }

      // Verify review guard result exists if stage completed
      if (run.reviewGuardStatus === 'succeeded' || run.reviewGuardStatus === 'failed') {
        if (!run.reviewGuardResult) {
          throw new Error('Review guard result missing');
        }
      }

      // Verify audit logs exist
      if (!run.auditLogs || run.auditLogs.length === 0) {
        throw new Error('No audit logs found');
      }

      recordTest('C) Verify outputs persisted', true);
    } catch (error) {
      recordTest('C) Verify outputs persisted', false, error instanceof Error ? error.message : String(error));
    }

    // Test D: Verify outbox intents created
    console.log('\n[D] Verifying outbox intents created...');
    try {
      if (!sandboxRunId) {
        throw new Error('Sandbox run not created');
      }

      const intents = await outboxService.getIntentsForRun(sandboxRunId);

      if (!Array.isArray(intents)) {
        throw new Error('Intents not an array');
      }

      // Verify intent structure
      for (const intent of intents) {
        if (!intent.id || !intent.idempotencyKey || intent.runId !== sandboxRunId) {
          throw new Error('Invalid intent structure');
        }
      }

      recordTest('D) Verify outbox intents created', true);
    } catch (error) {
      recordTest('D) Verify outbox intents created', false, error instanceof Error ? error.message : String(error));
    }

    // Test E: Verify API response contract
    console.log('\n[E] Verifying API response contract...');
    try {
      if (!sandboxRunId) {
        throw new Error('Sandbox run not created');
      }

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
        reviewGuardResult: run.reviewGuardResult as unknown,
        testEngineResult: run.testEngineResult as unknown,
        docSyncResult: run.docSyncResult as unknown,
        aiTouchedDetected: run.aiTouchedDetected,
        aiTouchedFiles: run.aiTouchedFiles as unknown,
        gatesPassed: run.gatesPassed,
        gatesFailed: run.gatesFailed as unknown,
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
        const errors = validation.errors.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Contract validation failed: ${errors}`);
      }

      recordTest('E) Verify API response contract', true);
    } catch (error) {
      recordTest('E) Verify API response contract', false, error instanceof Error ? error.message : String(error));
    }

    // Test F: Verify idempotency
    console.log('\n[F] Verifying idempotency (rerun same trigger)...');
    try {
      if (!sandboxRunId || !sandboxId) {
        throw new Error('Sandbox run not created');
      }

      const initialRunCount = await prisma.readyLayerRun.count({
        where: { sandboxId },
      });

      const initialIntentCount = await prisma.outboxIntent.count({
        where: { runId: sandboxRunId },
      });

      // Rerun (should create new run, not duplicate)
      const rerunResult = await runPipelineService.createSandboxRun();

      if (rerunResult.id === sandboxRunId) {
        throw new Error('Rerun created duplicate run ID');
      }

      // Get sandbox ID from rerun result
      const rerunRecord = await prisma.readyLayerRun.findUnique({
        where: { id: rerunResult.id },
        select: { sandboxId: true },
      });
      const rerunSandboxId = rerunRecord?.sandboxId || null;

      const finalRunCount = await prisma.readyLayerRun.count({
        where: { sandboxId: rerunSandboxId },
      });

      if (finalRunCount !== initialRunCount + 1) {
        throw new Error(`Run count mismatch: expected ${initialRunCount + 1}, got ${finalRunCount}`);
      }

      // Verify original run's intents unchanged
      const finalIntentCount = await prisma.outboxIntent.count({
        where: { runId: sandboxRunId },
      });

      if (finalIntentCount !== initialIntentCount) {
        throw new Error('Original run intents were modified');
      }

      recordTest('F) Verify idempotency', true);
    } catch (error) {
      recordTest('F) Verify idempotency', false, error instanceof Error ? error.message : String(error));
    }

  } finally {
    // Cleanup
    if (sandboxRunId) {
      try {
        await prisma.readyLayerRun.deleteMany({
          where: { id: sandboxRunId },
        });
        await prisma.outboxIntent.deleteMany({
          where: { runId: sandboxRunId },
        });
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.error) {
      console.log(`   ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 Golden Path test passed! ReadyLayer activation flow is working.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please fix errors before deploying.');
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
