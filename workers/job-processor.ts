/**
 * Job Processor Worker
 *
 * Processes background jobs (reviews, test generation, doc sync)
 */

import { queueService } from '../queue';
import { logger } from '../observability/logging';
import { metrics } from '../observability/metrics';
import type { TestConfig } from '../services/test-engine';
import type { DocSyncConfig } from '../services/doc-sync';

// Type guards for job payloads
interface TestGenerationRequest {
  repositoryId: string;
  prNumber?: number;
  prSha?: string;
  filePath: string;
  fileContent: string;
  framework?: string;
  config?: TestConfig;
}

interface DocGenerationRequest {
  repositoryId: string;
  ref: string;
  format: 'openapi' | 'markdown';
  config?: DocSyncConfig;
}

function isTestGenerationRequest(data: unknown): data is TestGenerationRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'repositoryId' in data &&
    'filePath' in data &&
    'fileContent' in data
  );
}

function isDocGenerationRequest(data: unknown): data is DocGenerationRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'repositoryId' in data &&
    'ref' in data &&
    'format' in data
  );
}

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
          if (!isTestGenerationRequest(data)) {
            throw new Error('Invalid test generation request payload');
          }
          const { testEngineService } = await import('../services/test-engine');
          return await testEngineService.generateTests(data);
        }

      case 'doc_sync':
        // Doc sync jobs
        {
          if (!isDocGenerationRequest(data)) {
            throw new Error('Invalid doc generation request payload');
          }
          const { docSyncService } = await import('../services/doc-sync');
          return await docSyncService.generateDocs(data);
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

  await queueService.processQueue('job', async (payload: unknown) => {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('type' in payload) ||
      !('data' in payload)
    ) {
      throw new Error('Invalid job payload');
    }
    await processJob(payload as { type: string; data: unknown });
  });
}

// Start worker if run directly
if (require.main === module) {
  startJobProcessor().catch((error: unknown) => {
    logger.error('Job processor failed', { error: String(error) });
    process.exit(1);
  });
}
