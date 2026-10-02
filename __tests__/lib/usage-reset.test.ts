import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateBillingPeriod,
  shouldResetUsage,
  resetMonthlyUsageForTimezones,
} from '@/lib/billing/usage-reset';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('Timezone-Aware Usage Reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateBillingPeriod', () => {
    it('calculates billing period correctly for UTC on 1st of month', () => {
      const ref = new Date('2026-03-15T12:00:00Z');
      const period = calculateBillingPeriod('UTC', 1, ref);

      expect(period.periodStart.toISOString()).toBe('2026-03-01T00:00:00.000Z');
      expect(period.periodEnd.toISOString()).toBe('2026-04-01T00:00:00.000Z');
      expect(period.daysRemaining).toBeGreaterThan(0);
    });

    it('handles custom anchor days', () => {
      const ref = new Date('2026-03-20T12:00:00Z');
      const period = calculateBillingPeriod('America/New_York', 15, ref);

      expect(period.periodStart.getUTCDate()).toBe(15);
      expect(period.periodStart.getUTCMonth()).toBe(2); // March (0-indexed)
    });

    it('gracefully falls back on invalid timezones', () => {
      const ref = new Date('2026-03-15T12:00:00Z');
      const period = calculateBillingPeriod('Invalid/Timezone', 1, ref);
      expect(period.periodStart).toBeDefined();
      expect(period.periodEnd).toBeDefined();
    });
  });

  describe('shouldResetUsage', () => {
    it('returns true if lastResetAt is null', () => {
      expect(shouldResetUsage(null, 'UTC', 1, new Date())).toBe(true);
    });

    it('returns true if lastResetAt is before the current period start', () => {
      const now = new Date('2026-03-05T12:00:00Z');
      const oldReset = new Date('2026-02-28T23:59:59Z');
      expect(shouldResetUsage(oldReset, 'UTC', 1, now)).toBe(true);
    });

    it('returns false if already reset within the current billing period', () => {
      const now = new Date('2026-03-05T12:00:00Z');
      const recentReset = new Date('2026-03-01T01:00:00Z');
      expect(shouldResetUsage(recentReset, 'UTC', 1, now)).toBe(false);
    });
  });

  describe('resetMonthlyUsageForTimezones', () => {
    it('resets usage and updates organizations requiring rollover', async () => {
      const refDate = new Date('2026-04-01T02:00:00Z');
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        {
          id: 'org-tokyo',
          name: 'Tokyo Branch',
          timezone: 'Asia/Tokyo',
          updatedAt: new Date('2026-03-01T00:00:00Z'),
        },
        {
          id: 'org-ny',
          name: 'NY Branch',
          timezone: 'America/New_York',
          updatedAt: new Date('2026-04-01T01:00:00Z'), // already updated
        },
      ] as any);

      vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

      const summary = await resetMonthlyUsageForTimezones(refDate);

      expect(summary.scannedCount).toBe(2);
      expect(summary.resetCount).toBe(1);
      expect(summary.organizationIds).toContain('org-tokyo');
      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org-tokyo' },
        })
      );
    });
  });
});
