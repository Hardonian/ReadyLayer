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
 * Check billing limits and return error response if exceeded.
 * 
 * **For API Route Handlers:**
 * Use this function in API routes. Returns `NextResponse` if limit exceeded,
 * or `null` if all checks pass.
 * 
 * **Checks Performed:**
 * - Feature access (reviewGuard, testEngine, docSync)
 * - Repository limit (max repos per tier)
 * - LLM budget (monthly spend limit)
 * 
 * **Error Handling:**
 * - Returns 403 Forbidden if feature not available
 * - Returns 403 Forbidden if repository limit exceeded
 * - Returns 403 Forbidden if LLM budget exceeded
 * - Returns null if all checks pass
 * - Logs errors but doesn't block on billing check failures (fail-open)
 * 
 * @param organizationId - Organization ID to check limits for
 * @param options - Billing check options
 * @returns NextResponse with error if limit exceeded, null if all checks pass
 * 
 * @example
 * ```typescript
 * const billingCheck = await checkBillingLimits(organizationId, {
 *   requireFeature: 'reviewGuard',
 *   checkLLMBudget: true
 * });
 * 
 * if (billingCheck) {
 *   return billingCheck; // Return error response
 * }
 * ```
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
 * Check billing limits and throw error if exceeded (for service use).
 * 
 * **For Service Layer:**
 * Use this function in services (not API routes). Throws `UsageLimitExceededError`
 * if limit exceeded, which preserves HTTP status codes and error context.
 * 
 * **Checks Performed:**
 * - Feature access (reviewGuard, testEngine, docSync)
 * - Repository limit (max repos per tier)
 * - LLM budget (monthly spend limit)
 * 
 * **Error Handling:**
 * - Throws `UsageLimitExceededError` with HTTP status if limit exceeded
 * - Preserves error type and status code for proper error handling
 * - Logs errors but doesn't block on billing check failures (fail-open)
 * 
 * @param organizationId - Organization ID to check limits for
 * @param options - Billing check options
 * @throws {UsageLimitExceededError} If any limit exceeded (with HTTP status code)
 * 
 * @example
 * ```typescript
 * try {
 *   await checkBillingLimitsOrThrow(organizationId, {
 *     requireFeature: 'testEngine',
 *     checkLLMBudget: true
 *   });
 * } catch (error) {
 *   if (error instanceof UsageLimitExceededError) {
 *     // Handle limit exceeded (error.httpStatus contains status code)
 *   }
 * }
 * ```
 */
export async function checkBillingLimitsOrThrow(
  organizationId: string,
  options: BillingCheckOptions = {}
): Promise<void> {
  const { UsageLimitExceededError } = await import('./usage-enforcement');
  
  try {
    // Check feature access
    if (options.requireFeature) {
      const canUse = await billingService.canUseFeature(organizationId, options.requireFeature);
      if (!canUse) {
        throw new UsageLimitExceededError(
          'FEATURE_NOT_AVAILABLE' as any,
          0,
          0,
          `${options.requireFeature} is not available on your current plan. Please upgrade to access this feature.`,
          403
        );
      }
    }

    // Check repository limit
    if (options.checkRepoLimit) {
      const canAdd = await billingService.canAddRepository(organizationId);
      if (!canAdd) {
        const tier = await billingService.getOrganizationTier(organizationId);
        throw new UsageLimitExceededError(
          'REPOSITORY_LIMIT_EXCEEDED' as any,
          0,
          tier.features.maxRepos === -1 ? Infinity : tier.features.maxRepos,
          `Repository limit reached (${tier.features.maxRepos === -1 ? 'unlimited' : tier.features.maxRepos}). Please upgrade to add more repositories.`,
          403
        );
      }
    }

    // Check LLM budget
    if (options.checkLLMBudget) {
      const budget = await billingService.checkLLMBudget(organizationId);
      if (!budget.allowed) {
        throw new UsageLimitExceededError(
          'LLM_BUDGET_EXCEEDED' as any,
          budget.currentSpend,
          budget.budget,
          `LLM budget exceeded ($${budget.currentSpend.toFixed(2)} / $${budget.budget.toFixed(2)}). Please upgrade or wait for next billing period.`,
          402
        );
      }
    }
  } catch (error) {
    // Re-throw UsageLimitExceededError as-is
    if (error instanceof UsageLimitExceededError) {
      throw error;
    }
    // Log other errors but don't block (fail-open for billing check failures)
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Billing check failed');
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
