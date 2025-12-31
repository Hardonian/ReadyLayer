/**
 * Billing Middleware
 * 
 * Enforces billing tier limits and feature gates
 */

import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '../billing';
import { logger } from '../observability/logging';

export interface BillingCheckOptions {
  requireFeature?: 'reviewGuard' | 'testEngine' | 'docSync';
  checkRepoLimit?: boolean;
  checkLLMBudget?: boolean;
}

/**
 * Check billing limits and return error response if exceeded
 */
export async function checkBillingLimits(
  organizationId: string,
  options: BillingCheckOptions = {}
): Promise<NextResponse | null> {
  try {
    // Check feature access
    if (options.requireFeature) {
      const canUse = await billingService.canUseFeature(organizationId, options.requireFeature);
      if (!canUse) {
        return NextResponse.json(
          {
            error: {
              code: 'FEATURE_NOT_AVAILABLE',
              message: `${options.requireFeature} is not available on your current plan. Please upgrade to access this feature.`,
            },
          },
          { status: 403 }
        );
      }
    }

    // Check repository limit
    if (options.checkRepoLimit) {
      const canAdd = await billingService.canAddRepository(organizationId);
      if (!canAdd) {
        const tier = await billingService.getOrganizationTier(organizationId);
        return NextResponse.json(
          {
            error: {
              code: 'REPOSITORY_LIMIT_EXCEEDED',
              message: `Repository limit reached (${tier.features.maxRepos === -1 ? 'unlimited' : tier.features.maxRepos}). Please upgrade to add more repositories.`,
            },
          },
          { status: 403 }
        );
      }
    }

    // Check LLM budget
    if (options.checkLLMBudget) {
      const budget = await billingService.checkLLMBudget(organizationId);
      if (!budget.allowed) {
        return NextResponse.json(
          {
            error: {
              code: 'LLM_BUDGET_EXCEEDED',
              message: `LLM budget exceeded ($${budget.currentSpend.toFixed(2)} / $${budget.budget.toFixed(2)}). Please upgrade or wait for next billing period.`,
              budget: {
                current: budget.currentSpend,
                limit: budget.budget,
                remaining: budget.remaining,
              },
            },
          },
          { status: 403 }
        );
      }
    }

    return null; // All checks passed
  } catch (error) {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Billing check failed');
    // Don't block on billing check failures - log and allow
    return null;
  }
}

/**
 * Get organization ID from request
 */
export function getOrganizationId(request: NextRequest): string | null {
  return (
    request.nextUrl.searchParams.get('organizationId') ||
    request.headers.get('x-organization-id') ||
    null
  );
}
