import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  job: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/usage-enforcement', () => ({
  usageEnforcementService: { checkJobEnqueue: vi.fn().mockResolvedValue(undefined) },
}));

import { QueueService } from '@/queue';

describe('durable queue contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('REDIS_URL', '');
    mockPrisma.job.findFirst.mockResolvedValue(null);
    mockPrisma.job.create.mockResolvedValue({ id: 'job_created' });
  });

  it('persists tenant and idempotency ownership with a queued job', async () => {
    const service = new QueueService();
    const id = await service.enqueue('test-execution', {
      type: 'test-execution',
      data: { repositoryId: 'repo_1', testRunId: 'run_1' },
      organizationId: 'org_1',
      userId: 'user_1',
      idempotencyKey: 'test-execution:run_1',
    });

    expect(id).toMatch(/^job_/);
    expect(mockPrisma.job.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        repositoryId: 'repo_1',
        organizationId: 'org_1',
        userId: 'user_1',
        idempotencyKey: 'test-execution:run_1',
      }),
    }));
  });

  it('returns the existing job for a repeated tenant-scoped idempotency key', async () => {
    mockPrisma.job.findFirst.mockResolvedValue({ id: 'job_existing' });
    const service = new QueueService();

    await expect(service.enqueue('test-execution', {
      type: 'test-execution',
      data: { testRunId: 'run_1' },
      organizationId: 'org_1',
      idempotencyKey: 'test-execution:run_1',
    })).resolves.toBe('job_existing');
    expect(mockPrisma.job.create).not.toHaveBeenCalled();
  });

  it('claims retrying Redis jobs exactly once before executing them', async () => {
    mockPrisma.job.findUnique.mockResolvedValue({
      id: 'job_retry',
      status: 'retrying',
      retryCount: 1,
      maxRetries: 3,
      payload: { work: true },
      type: 'webhook',
    });
    mockPrisma.job.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.job.update.mockResolvedValue({});
    const service = new QueueService();
    const processJob = (service as unknown as {
      processJob: (id: string, queue: string, handler: (payload: unknown) => Promise<unknown>) => Promise<void>;
    }).processJob.bind(service);

    await processJob('job_retry', 'webhook', async () => ({ ok: true }));

    expect(mockPrisma.job.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'job_retry', status: { in: ['pending', 'retrying'] } },
    }));
    expect(mockPrisma.job.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'job_retry' },
      data: expect.objectContaining({ status: 'completed' }),
    }));
  });
});
