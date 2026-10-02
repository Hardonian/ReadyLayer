import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as simulatePost } from '../../app/api/v1/policies/simulate/route';
import { GET as notificationsGet, POST as notificationsPost } from '../../app/api/v1/notifications/route';

// Mock auth module
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 'user_test_123',
    email: 'test@example.com',
    name: 'Test User',
    organizationIds: ['org_test_123'],
  }),
}));

// Mock authz middleware
vi.mock('@/lib/authz', () => ({
  createAuthzMiddleware: () => vi.fn().mockResolvedValue(null),
}));

// Mock prisma module
vi.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'rev_1',
          prNumber: 101,
          prSha: 'sha_1',
          prTitle: 'Add payment gateway',
          status: 'completed',
          isBlocked: false,
          issuesFound: [
            { ruleId: 'owasp.sql_injection', severity: 'critical', message: 'Raw SQL' },
          ],
          createdAt: new Date(),
        },
        {
          id: 'rev_2',
          prNumber: 102,
          prSha: 'sha_2',
          prTitle: 'Fix typo',
          status: 'completed',
          isBlocked: false,
          issuesFound: [],
          createdAt: new Date(),
        },
      ]),
    },
  },
}));

describe('Policy Simulation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully simulate policy impact across historical PR reviews', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/policies/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'org_test_123',
        repositoryId: 'repo_test_123',
        prCount: 10,
        proposedRules: [
          {
            ruleId: 'owasp.sql_injection',
            severity: 'critical',
            action: 'block',
          },
        ],
      }),
    });

    const res = await simulatePost(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: {
        totalSimulatedPRs: number;
        simulatedBlockedCount: number;
        newBlocksCount: number;
        simulatedBlockRate: string;
      };
    };

    expect(body.data).toBeDefined();
    expect(body.data.totalSimulatedPRs).toBe(2);
    expect(body.data.simulatedBlockedCount).toBe(1);
    expect(body.data.newBlocksCount).toBe(1);
    expect(body.data.simulatedBlockRate).toBe('50.0%');
  });

  it('should fail with 400 when proposedRules are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/policies/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'org_test_123',
      }),
    });

    const res = await simulatePost(req);
    expect(res.status).toBe(400);
  });
});

describe('Notifications API', () => {
  it('should return in-app notifications and unread count', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/notifications', {
      method: 'GET',
    });

    const res = await notificationsGet(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: {
        notifications: Array<{ id: string; title: string }>;
        unreadCount: number;
      };
    };

    expect(body.data).toBeDefined();
    expect(body.data.notifications.length).toBeGreaterThan(0);
    expect(body.data.unreadCount).toBeGreaterThan(0);
  });

  it('should acknowledge notifications on POST', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });

    const res = await notificationsPost(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: { acknowledged: boolean };
    };

    expect(body.data).toBeDefined();
    expect(body.data.acknowledged).toBe(true);
  });
});
