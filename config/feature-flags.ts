import { z } from 'zod';

/**
 * Feature Flags Configuration
 *
 * Gates experimental features behind explicit opt-in.
 * Core features are always enabled.
 *
 * Usage:
 * ```typescript
 * import { isFeatureEnabled, FeatureFlags } from '@/config/feature-flags';
 *
 * if (isFeatureEnabled('experimentalAiRiskIndex')) {
 *   // Show experimental feature
 * }
 * ```
 */

// Core features - always enabled, no flag needed
export const CORE_FEATURES = [
  'reviewGuard',
  'testEngine',
  'docSync',
  'webhookProcessing',
  'policyEngine',
] as const;

// Experimental features - require explicit opt-in
export const EXPERIMENTAL_FEATURES = [
  'aiRiskIndex',
  'bundleExecution',
  'ragContext',
  'truthCoreIntegration',
  'advancedReporting',
  'multiProviderAnalysis',
] as const;

export type CoreFeature = typeof CORE_FEATURES[number];
export type ExperimentalFeature = typeof EXPERIMENTAL_FEATURES[number];
export type FeatureFlag = CoreFeature | ExperimentalFeature;

// Feature flag schema for validation
export const featureFlagsSchema = z.object({
  // Experimental features - default to false
  aiRiskIndex: z.boolean().default(false),
  bundleExecution: z.boolean().default(false),
  ragContext: z.boolean().default(false),
  truthCoreIntegration: z.boolean().default(false),
  advancedReporting: z.boolean().default(false),
  multiProviderAnalysis: z.boolean().default(false),
});

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

// Default configuration
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  aiRiskIndex: false,
  bundleExecution: false,
  ragContext: false,
  truthCoreIntegration: false,
  advancedReporting: false,
  multiProviderAnalysis: false,
};

// Feature descriptions for UI/documentation
export const FEATURE_DESCRIPTIONS: Record<ExperimentalFeature, {
  name: string;
  description: string;
  tier: 'starter' | 'growth' | 'scale' | 'enterprise';
  unstable: boolean;
}> = {
  aiRiskIndex: {
    name: 'AI Risk Index',
    description: 'Experimental AI-generated code risk scoring',
    tier: 'growth',
    unstable: true,
  },
  bundleExecution: {
    name: 'Bundle Execution',
    description: 'Execute evidence bundles via JobForge',
    tier: 'scale',
    unstable: true,
  },
  ragContext: {
    name: 'RAG Context',
    description: 'Retrieval-augmented generation for reviews',
    tier: 'growth',
    unstable: false,
  },
  truthCoreIntegration: {
    name: 'TruthCore Integration',
    description: 'Immutable audit trail via TruthCore',
    tier: 'enterprise',
    unstable: true,
  },
  advancedReporting: {
    name: 'Advanced Reporting',
    description: 'Custom analytics and report generation',
    tier: 'scale',
    unstable: false,
  },
  multiProviderAnalysis: {
    name: 'Multi-Provider Analysis',
    description: 'Analyze code across multiple AI providers',
    tier: 'growth',
    unstable: true,
  },
};

/**
 * Check if an experimental feature is enabled
 */
export function isFeatureEnabled(
  feature: ExperimentalFeature,
  flags: FeatureFlags = getFeatureFlagsFromEnv()
): boolean {
  return flags[feature] ?? false;
}

/**
 * Get all enabled experimental features
 */
export function getEnabledFeatures(
  flags: FeatureFlags = getFeatureFlagsFromEnv()
): ExperimentalFeature[] {
  return EXPERIMENTAL_FEATURES.filter(f => flags[f]);
}

/**
 * Assert that an experimental feature is enabled
 * Throws if not enabled
 */
export function assertFeatureEnabled(
  feature: ExperimentalFeature,
  flags: FeatureFlags = getFeatureFlagsFromEnv()
): void {
  if (!isFeatureEnabled(feature, flags)) {
    const desc = FEATURE_DESCRIPTIONS[feature];
    throw new Error(
      `Feature "${desc.name}" is experimental and not enabled. ` +
      `Set NEXT_PUBLIC_ENABLE_${feature.toUpperCase()}=1 to enable.`
    );
  }
}

/**
 * Load feature flags from environment variables
 */
function getFeatureFlagsFromEnv(): FeatureFlags {
  const parseBool = (val: string | undefined): boolean => {
    if (!val) return false;
    return ['1', 'true', 'yes', 'on'].includes(val.toLowerCase());
  };

  return {
    aiRiskIndex: parseBool(process.env.NEXT_PUBLIC_ENABLE_AI_RISK_INDEX),
    bundleExecution: parseBool(process.env.NEXT_PUBLIC_ENABLE_BUNDLE_EXECUTION),
    ragContext: parseBool(process.env.NEXT_PUBLIC_ENABLE_RAG_CONTEXT),
    truthCoreIntegration: parseBool(process.env.NEXT_PUBLIC_ENABLE_TRUTHCORE),
    advancedReporting: parseBool(process.env.NEXT_PUBLIC_ENABLE_ADVANCED_REPORTING),
    multiProviderAnalysis: parseBool(process.env.NEXT_PUBLIC_ENABLE_MULTI_PROVIDER),
  };
}

/**
 * Feature gate component for React
 *
 * Usage:
 * ```tsx
 * <FeatureGate feature="aiRiskIndex">
 *   <AiRiskDashboard />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: ExperimentalFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactNode {
  return isFeatureEnabled(feature) ? children : fallback;
}
