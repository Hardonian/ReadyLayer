/**
 * Tier-Based Feature Gating
 *
 * P1: Implement feature flags tied to billing tier (REALITY_GAPS #10)
 * Ensures customers only access features available in their plan
 */

export type BillingTier = 'starter' | 'growth' | 'scale' | 'enterprise';

export interface TierFeatures {
  // Core features (all tiers)
  reviewGuard: boolean;
  staticAnalysis: boolean;
  policyEngine: boolean;

  // Coverage & testing
  coverageEnforcement: boolean;
  testGeneration: boolean;
  testExecution: boolean;

  // Documentation
  docSync: boolean;
  driftDetection: boolean;

  // Advanced features
  customRules: boolean;
  customThresholds: boolean;
  multiFrameworkSupport: boolean;
  ragContext: boolean;
  aiRiskIndex: boolean;

  // Enterprise features
  ssoIntegration: boolean;
  auditLogs: boolean;
  advancedReporting: boolean;
  prioritySupport: boolean;
  customSLA: boolean;

  // Usage limits
  maxReviewsPerMonth: number;
  maxRepositories: number;
  maxUsers: number;
  maxLLMTokensPerMonth: number;
}

/**
 * Feature availability by tier
 * Reference: Pricing page claims in REALITY_GAPS.md
 */
export const TIER_FEATURES: Record<BillingTier, TierFeatures> = {
  starter: {
    // Core features
    reviewGuard: true,
    staticAnalysis: true,
    policyEngine: true,

    // Coverage & testing
    coverageEnforcement: true, // $49: "Coverage enforcement (80% threshold, blocks if below)"
    testGeneration: false,
    testExecution: false,

    // Documentation
    docSync: false,
    driftDetection: false,

    // Advanced features
    customRules: false,
    customThresholds: false,
    multiFrameworkSupport: false, // Growth tier feature
    ragContext: false,
    aiRiskIndex: false,

    // Enterprise features
    ssoIntegration: false,
    auditLogs: false,
    advancedReporting: false,
    prioritySupport: false,
    customSLA: false,

    // Usage limits
    maxReviewsPerMonth: 1000,
    maxRepositories: 5,
    maxUsers: 5,
    maxLLMTokensPerMonth: 1_000_000, // 1M tokens
  },

  growth: {
    // Core features
    reviewGuard: true,
    staticAnalysis: true,
    policyEngine: true,

    // Coverage & testing
    coverageEnforcement: true,
    testGeneration: true, // $199: "Test generation"
    testExecution: true,

    // Documentation
    docSync: true,
    driftDetection: true,

    // Advanced features
    customRules: true, // $199: "Custom rules and thresholds"
    customThresholds: true,
    multiFrameworkSupport: true, // $199: "Multi-framework support"
    ragContext: true, // Premium feature
    aiRiskIndex: true,

    // Enterprise features
    ssoIntegration: false,
    auditLogs: true, // Basic audit logs
    advancedReporting: false,
    prioritySupport: false,
    customSLA: false,

    // Usage limits
    maxReviewsPerMonth: 5000,
    maxRepositories: 20,
    maxUsers: 15,
    maxLLMTokensPerMonth: 5_000_000, // 5M tokens
  },

  scale: {
    // Core features
    reviewGuard: true,
    staticAnalysis: true,
    policyEngine: true,

    // Coverage & testing
    coverageEnforcement: true,
    testGeneration: true,
    testExecution: true,

    // Documentation
    docSync: true,
    driftDetection: true,

    // Advanced features
    customRules: true,
    customThresholds: true,
    multiFrameworkSupport: true,
    ragContext: true,
    aiRiskIndex: true,

    // Enterprise features
    ssoIntegration: true,
    auditLogs: true,
    advancedReporting: true,
    prioritySupport: true,
    customSLA: false,

    // Usage limits
    maxReviewsPerMonth: 20000,
    maxRepositories: 100,
    maxUsers: 50,
    maxLLMTokensPerMonth: 20_000_000, // 20M tokens
  },

  enterprise: {
    // Everything enabled
    reviewGuard: true,
    staticAnalysis: true,
    policyEngine: true,
    coverageEnforcement: true,
    testGeneration: true,
    testExecution: true,
    docSync: true,
    driftDetection: true,
    customRules: true,
    customThresholds: true,
    multiFrameworkSupport: true,
    ragContext: true,
    aiRiskIndex: true,
    ssoIntegration: true,
    auditLogs: true,
    advancedReporting: true,
    prioritySupport: true,
    customSLA: true,

    // Unlimited usage
    maxReviewsPerMonth: Infinity,
    maxRepositories: Infinity,
    maxUsers: Infinity,
    maxLLMTokensPerMonth: Infinity,
  },
};

/**
 * Check if a feature is available for a given tier
 */
export function isFeatureAvailable(
  tier: BillingTier,
  feature: keyof TierFeatures
): boolean {
  return TIER_FEATURES[tier][feature] as boolean;
}

/**
 * Get all features for a tier
 */
export function getTierFeatures(tier: BillingTier): TierFeatures {
  return TIER_FEATURES[tier];
}

/**
 * Get usage limit for a tier
 */
export function getUsageLimit(
  tier: BillingTier,
  limitType: 'reviews' | 'repositories' | 'users' | 'llmTokens'
): number {
  const features = TIER_FEATURES[tier];
  switch (limitType) {
    case 'reviews':
      return features.maxReviewsPerMonth;
    case 'repositories':
      return features.maxRepositories;
    case 'users':
      return features.maxUsers;
    case 'llmTokens':
      return features.maxLLMTokensPerMonth;
  }
}

/**
 * Feature gate error
 */
export class FeatureNotAvailableError extends Error {
  constructor(
    public readonly feature: string,
    public readonly tier: BillingTier,
    public readonly requiredTier: BillingTier
  ) {
    super(
      `Feature "${feature}" is not available in ${tier} tier. ` +
        `Upgrade to ${requiredTier} or higher to access this feature.`
    );
    this.name = 'FeatureNotAvailableError';
  }
}

/**
 * Assert that a feature is available for the given tier
 * Throws FeatureNotAvailableError if not available
 */
export function assertFeatureAvailable(
  tier: BillingTier,
  feature: keyof TierFeatures,
  requiredTier: BillingTier = 'growth'
): void {
  if (!isFeatureAvailable(tier, feature)) {
    throw new FeatureNotAvailableError(String(feature), tier, requiredTier);
  }
}
