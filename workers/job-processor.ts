/**
 * Job Processor Worker
 * 
 * Processes background jobs (reviews, test generation, doc sync)
 */

import { queueService } from '../queue';
import { logger } from '../observability/logging';
import { metrics } from '../observability/metrics';

/**
 * Process background job
 */
async function processJob(payload: { type: string; data: unknown }): Promise<unknown> {
  const { type, data } = payload;
  const requestId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const log = logger.child({ requestId, jobType: type });

  try {
    log.info('Processing job', { type });

    switch (type) {
      case 'review':
        // Review jobs are handled by webhook processor
        return { status: 'completed' };

      case 'test_generation':
        // Test generation jobs
        {
          const { testEngineService, TestGenerationRequest } = await import('../services/test-engine');
          return await testEngineService.generateTests(data as typeof TestGenerationRequest);
        }

      case 'doc_sync':
        // Doc sync jobs
        {
          const { docSyncService, DocGenerationRequest } = await import('../services/doc-sync');
          return await docSyncService.generateDocs(data as typeof DocGenerationRequest);
        }

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error) {
    log.error(error, 'Job processing failed');
    metrics.increment('jobs.failed', { type });
    throw error;
  }
}

/**
 * Start job processor worker
 */
export async function startJobProcessor(): Promise<void> {
  logger.info('Starting job processor worker');

  await queueService.processQueue('job', async (payload) => {
    await processJob(payload as { type: string; data: unknown });
  });
}

// Start worker if run directly
if (require.main === module) {
  startJobProcessor().catch((error) => {
    logger.error('Job processor failed', error);
    process.exit(1);
  });
}
