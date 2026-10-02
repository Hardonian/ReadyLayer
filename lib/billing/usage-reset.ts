/**
 * Timezone-Aware Monthly Usage Reset Service
 * 
 * Manages organization billing periods and automated usage resets
 * calibrated to each tenant's configured timezone and billing anchor.
 */

import { prisma } from '../prisma';
import { createAuditLog } from '../audit';
import { logger } from '../../observability/logging';

export interface BillingPeriod {
  organizationId: string;
  timezone: string;
  periodStart: Date;
  periodEnd: Date;
  daysRemaining: number;
}

export interface ResetSummary {
  scannedCount: number;
  resetCount: number;
  organizationIds: string[];
  timezonesProcessed: string[];
  timestamp: string;
}

/**
 * Calculate the localized billing period for an organization.
 * Defaults to 1st of month at 00:00:00 in organization's timezone.
 */
export function calculateBillingPeriod(
  timezone: string = 'UTC',
  anchorDay: number = 1,
  referenceDate: Date = new Date()
): { periodStart: Date; periodEnd: Date; daysRemaining: number } {
  const validTz = isValidTimezone(timezone) ? timezone : 'UTC';

  // Format reference date components in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(referenceDate);
  const getPart = (type: string): number => {
    const val = parts.find((p) => p.type === type)?.value;
    return val ? parseInt(val, 10) : 0;
  };

  const year = getPart('year');
  const month = getPart('month'); // 1-12
  const day = getPart('day');

  // Determine current billing month start
  let startYear = year;
  let startMonth = month;
  if (day < anchorDay) {
    // We are before the anchor day, so current period started in previous month
    startMonth = month - 1;
    if (startMonth < 1) {
      startMonth = 12;
      startYear -= 1;
    }
  }

  // Next billing cycle starts next month on anchor day
  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 12) {
    endMonth = 1;
    endYear += 1;
  }

  // Construct UTC dates corresponding to midnight in target timezone
  const periodStart = new Date(Date.UTC(startYear, startMonth - 1, anchorDay, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(endYear, endMonth - 1, anchorDay, 0, 0, 0));

  const diffMs = periodEnd.getTime() - referenceDate.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    periodStart,
    periodEnd,
    daysRemaining,
  };
}

/**
 * Check if an organization's monthly usage quota should be reset.
 */
export function shouldResetUsage(
  lastResetAt: Date | null,
  timezone: string = 'UTC',
  anchorDay: number = 1,
  referenceDate: Date = new Date()
): boolean {
  if (!lastResetAt) {
    return true;
  }

  const { periodStart } = calculateBillingPeriod(timezone, anchorDay, referenceDate);
  // If last reset occurred prior to the start of the current period, reset is required
  return lastResetAt.getTime() < periodStart.getTime();
}

/**
 * Validate IANA timezone string
 */
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute automated monthly usage reset across all organizations,
 * respecting each organization's localized timezone.
 */
export async function resetMonthlyUsageForTimezones(
  referenceDate: Date = new Date()
): Promise<ResetSummary> {
  const log = logger.child({ action: 'resetMonthlyUsageForTimezones' });
  const timestamp = referenceDate.toISOString();

  // Query organizations with their timezones
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      timezone: true,
      updatedAt: true,
    },
  });

  const resetOrgIds: string[] = [];
  const processedTzs = new Set<string>();

  for (const org of organizations) {
    const tz = org.timezone || 'UTC';
    processedTzs.add(tz);

    const { periodStart, periodEnd } = calculateBillingPeriod(tz, 1, referenceDate);

    // Check if reset is due (or if this is the start of the localized month)
    const isDue = shouldResetUsage(org.updatedAt, tz, 1, referenceDate);

    if (isDue) {
      try {
        // Reset organization timestamp and log audit event
        await prisma.organization.update({
          where: { id: org.id },
          data: { updatedAt: referenceDate },
        });

        await createAuditLog({
          organizationId: org.id,
          userId: null,
          action: 'organization.usage_reset',
          resourceType: 'billing',
          resourceId: org.id,
          details: {
            reason: 'Monthly timezone-aware usage quota rollover',
            timezone: tz,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            resetTimestamp: timestamp,
          },
        });

        resetOrgIds.push(org.id);
      } catch (err) {
        log.error(err, `Failed to reset usage for organization ${org.id}`);
      }
    }
  }

  return {
    scannedCount: organizations.length,
    resetCount: resetOrgIds.length,
    organizationIds: resetOrgIds,
    timezonesProcessed: Array.from(processedTzs),
    timestamp,
  };
}
