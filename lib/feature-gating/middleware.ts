/**
 * Feature Gating Middleware
 *
 * P1: Enforce tier-based feature access in API handlers
 * Reference: REALITY_GAPS.md - Pricing tiers vs enforcement
 */

import { prisma } from '../prisma';
import {
  BillingTier,
  isFeatureAvailable,
  FeatureNotAvailableError,
  TierFeatures,
} from './tier-features';
import { logger } from '@/observability/logging';

/**
 * Get organization's billing tier
 */
export async function getOrganizationTier(
  organizationId: string
): Promise<BillingTier> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  return org.plan as BillingTier;
}

/**
 * Check if organization has access to a feature
 */
export async function checkFeatureAccess(
  organizationId: string,
  feature: keyof TierFeatures
): Promise<{ allowed: boolean; tier: BillingTier }> {
  const tier = await getOrganizationTier(organizationId);
  const allowed = isFeatureAvailable(tier, feature);

  if (!allowed) {
    logger.warn(
      {
        organizationId,
        tier,
        feature,
      },
      'Feature access denied - tier restriction'
    );
  }

  return { allowed, tier };
}

/**
 * Require feature access (throws if not available)
 */
export async function requireFeature(
  organizationId: string,
  feature: keyof TierFeatures,
  requiredTier: BillingTier = 'growth'
): Promise<void> {
  const { allowed, tier } = await checkFeatureAccess(organizationId, feature);

  if (!allowed) {
    throw new FeatureNotAvailableError(String(feature), tier, requiredTier);
  }
}

/**
 * Middleware factory for API routes
 * Usage: await requireFeatureMiddleware(req, 'customRules', 'growth')
 */
export async function requireFeatureMiddleware(
  request: { organizationId?: string },
  feature: keyof TierFeatures,
  requiredTier: BillingTier = 'growth'
): Promise<void> {
  if (!request.organizationId) {
    throw new Error('Organization ID not found in request');
  }

  await requireFeature(request.organizationId, feature, requiredTier);
}

/**
 * Check multiple features at once
 */
export async function checkFeaturesAccess(
  organizationId: string,
  features: Array<keyof TierFeatures>
): Promise<{
  tier: BillingTier;
  allowed: Array<keyof TierFeatures>;
  denied: Array<keyof TierFeatures>;
}> {
  const tier = await getOrganizationTier(organizationId);
  const allowed: Array<keyof TierFeatures> = [];
  const denied: Array<keyof TierFeatures> = [];

  for (const feature of features) {
    if (isFeatureAvailable(tier, feature)) {
      allowed.push(feature);
    } else {
      denied.push(feature);
    }
  }

  return { tier, allowed, denied };
}
