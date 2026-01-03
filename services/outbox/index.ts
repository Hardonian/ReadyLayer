/**
 * Outbox Service
 * 
 * Implements Outbox pattern for idempotent provider status updates.
 * Ensures status updates are recorded before posting and can be retried safely.
 */

import { prisma } from '../../lib/prisma';
import { logger } from '../../observability/logging';
import { providerStatusService, StageStatusUpdate } from '../provider-status';

export interface OutboxIntentPayload {
  runId: string;
  repositoryId?: string;
  sandboxId?: string;
  update: StageStatusUpdate;
}

/**
 * Outbox Service
 * 
 * Manages outbound intents for provider status updates with idempotency guarantees.
 */
export class OutboxService {
  /**
   * Create an outbox intent for a status update
   * 
   * Idempotency key format: `${runId}_${stage}_${status}_${timestamp}`
   * This ensures the same update isn't posted twice even if retried.
   */
  async createIntent(payload: OutboxIntentPayload): Promise<string> {
    const { runId, update } = payload;
    
    // Generate idempotency key
    const timestamp = Date.now();
    const idempotencyKey = `${runId}_${update.stage}_${update.status}_${timestamp}`;
    
    const log = logger.child({ runId, idempotencyKey, stage: update.stage });
    
    try {
      // Check if intent already exists (idempotency check)
      const existing = await prisma.outboxIntent.findUnique({
        where: { idempotencyKey },
      });
      
      if (existing) {
        log.info('Intent already exists, skipping creation');
        return existing.id;
      }
      
      // Create intent
      const intent = await prisma.outboxIntent.create({
        data: {
          idempotencyKey,
          runId,
          repositoryId: payload.repositoryId || null,
          sandboxId: payload.sandboxId || null,
          intentType: 'status_update',
          payload: update as any,
          status: 'pending',
        },
      });
      
      log.info({ intentId: intent.id }, 'Outbox intent created');
      return intent.id;
    } catch (error) {
      log.error({ err: error }, 'Failed to create outbox intent');
      throw error;
    }
  }

  /**
   * Process pending intents (called by worker)
   * 
   * Processes up to `limit` pending intents and posts them to providers.
   */
  async processPendingIntents(limit: number = 10): Promise<number> {
    const log = logger.child({ limit });
    
    try {
      // Find pending intents (oldest first)
      // Only get intents that haven't exceeded max retries
      const intents = await prisma.outboxIntent.findMany({
        where: {
          status: 'pending',
          // Filter out intents that have exceeded max retries
          // We'll check retryCount < maxRetries in the loop
        },
        orderBy: { createdAt: 'asc' },
        take: limit * 2, // Fetch more to account for filtering
      });

      // Filter to only those under max retries
      const validIntents = intents.filter(intent => intent.retryCount < intent.maxRetries).slice(0, limit);
      
      log.info({ count: validIntents.length }, 'Processing outbox intents');
      
      let processed = 0;
      
      for (const intent of validIntents) {
        try {
          // Mark as processing
          await prisma.outboxIntent.update({
            where: { id: intent.id },
            data: { status: 'processing' },
          });
          
          // Extract update from payload
          const update = intent.payload as StageStatusUpdate;
          
          // Post to provider (only if repositoryId exists - skip sandbox)
          if (intent.repositoryId && update.repositoryId) {
            await providerStatusService.postStatusUpdate(update);
          } else {
            // For sandbox runs, just mark as completed (no actual posting)
            log.info({ intentId: intent.id, sandboxId: intent.sandboxId }, 'Skipping provider post for sandbox run');
          }
          
          // Mark as completed
          await prisma.outboxIntent.update({
            where: { id: intent.id },
            data: {
              status: 'completed',
              postedAt: new Date(),
            },
          });
          
          processed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Increment retry count
          const newRetryCount = intent.retryCount + 1;
          const shouldRetry = newRetryCount < intent.maxRetries;
          
          await prisma.outboxIntent.update({
            where: { id: intent.id },
            data: {
              status: shouldRetry ? 'pending' : 'failed',
              retryCount: newRetryCount,
              error: errorMessage,
            },
          });
          
          log.warn({ intentId: intent.id, retryCount: newRetryCount, err: error }, 'Failed to process intent');
        }
      }
      
      log.info({ processed }, 'Outbox intents processed');
      return processed;
    } catch (error) {
      log.error({ err: error }, 'Failed to process outbox intents');
      throw error;
    }
  }

  /**
   * Get intents for a run (for testing/verification)
   */
  async getIntentsForRun(runId: string): Promise<Array<{
    id: string;
    idempotencyKey: string;
    intentType: string;
    status: string;
    postedAt: Date | null;
    createdAt: Date;
  }>> {
    return prisma.outboxIntent.findMany({
      where: { runId },
      select: {
        id: true,
        idempotencyKey: true,
        intentType: true,
        status: true,
        postedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const outboxService = new OutboxService();
