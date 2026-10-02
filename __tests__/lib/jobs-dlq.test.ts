import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markJobDead, redriveDeadJob, listDeadLetterJobs } from '../../lib/jobs';
import { prisma } from '../../lib/prisma';
import { queueService } from '../../queue';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../queue', () => ({
  queueService: {
    enqueue: vi.fn().mockResolvedValue('job_new_789'),
  },
}));

vi.mock('../../lib/usage-enforcement', () => ({
  usageEnforcementService: {
    checkJobEnqueue: vi.fn().mockResolvedValue({ allowed: true }),
  },
}));

describe('Batch 10: Job Dead-Letter Queue (DLQ) & Redrive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('markJobDead', () => {
    it('marks an existing job as dead with error message and stack trace', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue({
        id: 'job_123',
        status: 'failed',
      } as any);

      vi.mocked(prisma.job.update).mockResolvedValue({
        id: 'job_123',
        status: 'dead',
      } as any);

      const res = await markJobDead('job_123', 'Timeout error', 'Error: at line 42');
      expect(res).toBe(true);
      expect(prisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job_123' },
          data: expect.objectContaining({
            status: 'dead',
            error: expect.stringContaining('Timeout error'),
          }),
        })
      );
    });

    it('returns false when job does not exist', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue(null);
      const res = await markJobDead('non_existent', 'Error');
      expect(res).toBe(false);
    });
  });

  describe('redriveDeadJob', () => {
    it('successfully redrives a dead job with a fresh retry budget', async () => {
      vi.mocked(prisma.job.findFirst).mockResolvedValue({
        id: 'job_dead_1',
        type: 'test_generation',
        status: 'dead',
        payload: { filePath: 'src/app.ts' },
        organizationId: 'org_test_1',
        maxRetries: 3,
      } as any);

      vi.mocked(prisma.job.update).mockResolvedValue({
        id: 'job_dead_1',
        status: 'canceled',
      } as any);

      const result = await redriveDeadJob('job_dead_1', 'org_test_1');
      expect(result.success).toBe(true);
      expect(result.newJobId).toBe('job_new_789');
      expect(queueService.enqueue).toHaveBeenCalled();
      expect(prisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job_dead_1' },
          data: expect.objectContaining({
            status: 'canceled',
          }),
        })
      );
    });

    it('rejects redriving a job that is already running or succeeded', async () => {
      vi.mocked(prisma.job.findFirst).mockResolvedValue({
        id: 'job_running_2',
        type: 'review',
        status: 'running',
        organizationId: 'org_test_1',
      } as any);

      const result = await redriveDeadJob('job_running_2', 'org_test_1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not in dead/failed state');
    });
  });

  describe('listDeadLetterJobs', () => {
    it('queries jobs with dead status filter', async () => {
      vi.mocked(prisma.job.findMany).mockResolvedValue([
        {
          id: 'job_d1',
          type: 'review',
          status: 'dead',
          payload: {},
          retryCount: 3,
          maxRetries: 3,
          createdAt: new Date(),
        } as any,
      ]);
      vi.mocked(prisma.job.count).mockResolvedValue(1);

      const result = await listDeadLetterJobs('org_test_1');
      expect(result.jobs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org_test_1',
            status: 'dead',
          }),
        })
      );
    });
  });
});
