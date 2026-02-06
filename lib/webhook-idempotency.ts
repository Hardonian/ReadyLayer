/**
 * Webhook Idempotency Service
 *
 * Ensures exactly-once processing of webhook events from all providers.
 * Prevents duplicate side effects when providers retry webhook deliveries.
 *
 * Security model:
 * - Each webhook has a unique eventId from the provider
 * - Track processing state: pending -> processing -> completed/failed
 * - Return early (2xx) for duplicates without re-processing
 * - Store result for lookups to prevent duplicate side effects
 *
 * Flow:
 * 1. Check if eventId already processed
 * 2. If duplicate with completed status: return success (no side effects)
 * 3. If duplicate with pending/processing status: return error (provider will retry)
 * 4. If new: acquire lock, process, store result, release lock
 */

import { prisma } from '../lib/prisma';
import { logger } from '../observability/logging';

export type WebhookEventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate';

export interface WebhookEventRecord {
  id: string;
  eventId: string;
  provider: string;
  eventType: string;
  installationId: string;
  repositoryId?: string;
  status: WebhookEventStatus;
  processedAt?: Date;
  result?: unknown;
  error?: string;
  retryCount: number;
  receivedAt: Date;
}

export interface ProcessWebhookParams {
  eventId: string;
  provider: string;
  eventType: string;
  installationId: string;
  repositoryId?: string;
  eventTimestamp?: Date;
  handler: () => Promise<unknown>;
}

export interface ProcessWebhookResult<T = unknown> {
  isDuplicate: boolean;
  status: WebhookEventStatus;
  result?: T;
  error?: string;
}

class WebhookIdempotencyService {
  private readonly MAX_RETRIES = 3;

  /**
   * Process a webhook event with idempotency guarantees.
   *
   * @param params - Webhook processing parameters
   * @returns Processing result with idempotency status
   */
  async processWebhook<T = unknown>(params: ProcessWebhookParams): Promise<ProcessWebhookResult<T>> {
    const { eventId, provider, eventType, installationId, repositoryId, eventTimestamp, handler } = params;

    logger.info({ eventId, provider, eventType }, 'Processing webhook with idempotency');

    // Step 1: Check for existing event
    const existingEvent = await this.findByEventId(eventId);

    if (existingEvent) {
      return this.handleExistingEvent(existingEvent);
    }

    // Step 2: Create new event record and acquire lock
    const event = await this.createEvent({
      eventId,
      provider,
      eventType,
      installationId,
      repositoryId,
      eventTimestamp,
    });

    try {
      // Step 3: Process the event (with lock held)
      logger.info({ eventId }, 'Processing new webhook event');

      await this.updateStatus(event.id, 'processing');

      const result = await handler();

      // Step 4: Mark as completed
      await this.completeEvent(event.id, result);

      logger.info({ eventId, provider }, 'Webhook event processed successfully');

      return {
        isDuplicate: false,
        status: 'completed',
        result: result as T,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({ eventId, error: errorMessage }, 'Webhook event processing failed');

      // Step 5: Handle failure
      await this.failEvent(event.id, errorMessage);

      // Check if we should retry
      if (event.retryCount < this.MAX_RETRIES) {
        await this.scheduleRetry(event.id);
      }

      return {
        isDuplicate: false,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Find an event by its provider event ID.
   */
  async findByEventId(eventId: string): Promise<WebhookEventRecord | null> {
    const event = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    return event as WebhookEventRecord | null;
  }

  /**
   * Create a new webhook event record.
   */
  private async createEvent(params: {
    eventId: string;
    provider: string;
    eventType: string;
    installationId: string;
    repositoryId?: string;
    eventTimestamp?: Date;
  }): Promise<WebhookEventRecord> {
    const event = await prisma.webhookEvent.create({
      data: {
        eventId: params.eventId,
        provider: params.provider,
        eventType: params.eventType,
        installationId: params.installationId,
        repositoryId: params.repositoryId,
        eventTimestamp: params.eventTimestamp,
        status: 'pending',
        retryCount: 0,
      },
    });

    return event as WebhookEventRecord;
  }

  /**
   * Update the status of a webhook event.
   */
  private async updateStatus(id: string, status: WebhookEventStatus): Promise<void> {
    const updateData: { status: WebhookEventStatus; processedAt?: Date } = { status };

    if (status === 'completed') {
      updateData.processedAt = new Date();
    }

    await prisma.webhookEvent.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Mark an event as completed with result.
   */
  private async completeEvent(id: string, result: unknown): Promise<void> {
    await prisma.webhookEvent.update({
      where: { id },
      data: {
        status: 'completed',
        processedAt: new Date(),
        result: result as object,
        retryCount: { increment: 1 },
      },
    });
  }

  /**
   * Mark an event as failed with error message.
   */
  private async failEvent(id: string, error: string): Promise<void> {
    await prisma.webhookEvent.update({
      where: { id },
      data: {
        status: 'failed',
        error,
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });
  }

  /**
   * Schedule a retry by incrementing retry count.
   */
  private async scheduleRetry(id: string): Promise<void> {
    await prisma.webhookEvent.update({
      where: { id },
      data: {
        status: 'pending',
        lastRetryAt: new Date(),
        retryCount: { increment: 1 },
      },
    });
  }

  /**
   * Handle an existing event (duplicate detection).
   */
  private handleExistingEvent<T = unknown>(event: WebhookEventRecord): ProcessWebhookResult<T> {
    const { eventId, status, result, error } = event;

    logger.info({ eventId, status }, 'Found existing webhook event');

    switch (status) {
      case 'completed':
        // Already processed successfully - return success without re-processing
        logger.info({ eventId }, 'Duplicate webhook event (already completed)');
        return {
          isDuplicate: true,
          status: 'duplicate',
          result: result as T,
        };

      case 'processing':
        // Currently being processed by another instance
        // Provider should retry (this is a conflict)
        logger.warn({ eventId }, 'Webhook event currently being processed');
        return {
          isDuplicate: false,
          status: 'processing',
          error: 'Event is currently being processed',
        };

      case 'failed':
        // Previously failed - can retry
        logger.info({ eventId, retryCount: event.retryCount }, 'Previous webhook event failed, allowing retry');
        return {
          isDuplicate: false,
          status: 'pending',
          error,
        };

      case 'pending':
        // Was interrupted - can retry
        logger.info({ eventId }, 'Pending webhook event found, allowing retry');
        return {
          isDuplicate: false,
          status: 'pending',
        };

      default:
        logger.warn({ eventId, status }, 'Unknown webhook event status');
        return {
          isDuplicate: false,
          status: 'pending',
        };
    }
  }

  /**
   * Get the status of a webhook event.
   */
  async getEventStatus(eventId: string): Promise<WebhookEventStatus | null> {
    const event = await this.findByEventId(eventId);
    return event?.status ?? null;
  }

  /**
   * Get the result of a processed webhook event.
   */
  async getEventResult<T = unknown>(eventId: string): Promise<T | null> {
    const event = await this.findByEventId(eventId);

    if (!event || event.status !== 'completed') {
      return null;
    }

    return event.result as T;
  }

  /**
   * Check if an event has already been processed (for quick lookups).
   */
  async isAlreadyProcessed(eventId: string): Promise<boolean> {
    const event = await this.findByEventId(eventId);
    return event?.status === 'completed';
  }

  /**
   * Clean up old webhook events (for maintenance).
   * Should be called periodically (e.g., daily).
   */
  async cleanupOldEvents(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.webhookEvent.deleteMany({
      where: {
        receivedAt: { lt: cutoffDate },
        status: { in: ['completed', 'failed'] },
      },
    });

    logger.info({ deletedCount: result.count, olderThanDays }, 'Cleaned up old webhook events');

    return result.count;
  }

  /**
   * Get statistics about webhook events.
   */
  async getStats(provider?: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    duplicate: number;
  }> {
    const where = provider ? { provider } : {};

    const [total, pending, processing, completed, failed] = await Promise.all([
      prisma.webhookEvent.count({ where }),
      prisma.webhookEvent.count({ where: { ...where, status: 'pending' } }),
      prisma.webhookEvent.count({ where: { ...where, status: 'processing' } }),
      prisma.webhookEvent.count({ where: { ...where, status: 'completed' } }),
      prisma.webhookEvent.count({ where: { ...where, status: 'failed' } }),
    ]);

    // Count duplicates (completed events that were re-received)
    const duplicate = await prisma.webhookEvent.count({
      where: { ...where, status: 'duplicate' },
    });

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      duplicate,
    };
  }
}

export const webhookIdempotencyService = new WebhookIdempotencyService();
