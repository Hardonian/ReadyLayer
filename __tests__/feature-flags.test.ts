import { describe, it, expect } from 'vitest';
import {
  CORE_FEATURES,
  EXPERIMENTAL_FEATURES,
  DEFAULT_FEATURE_FLAGS,
  FEATURE_DESCRIPTIONS,
  featureFlagsSchema,
  isFeatureEnabled,
  getEnabledFeatures,
  assertFeatureEnabled,
  FeatureGate,
  type FeatureFlags,
} from '@/config/feature-flags';

describe('Feature Flags Configuration', () => {
  describe('Core and Experimental Features', () => {
    it('defines expected core features', () => {
      expect(CORE_FEATURES).toContain('reviewGuard');
      expect(CORE_FEATURES).toContain('testEngine');
      expect(CORE_FEATURES).toContain('docSync');
      expect(CORE_FEATURES).toContain('webhookProcessing');
      expect(CORE_FEATURES).toContain('policyEngine');
    });

    it('defines expected experimental features', () => {
      expect(EXPERIMENTAL_FEATURES).toContain('aiRiskIndex');
      expect(EXPERIMENTAL_FEATURES).toContain('bundleExecution');
      expect(EXPERIMENTAL_FEATURES).toContain('ragContext');
      expect(EXPERIMENTAL_FEATURES).toContain('truthCoreIntegration');
      expect(EXPERIMENTAL_FEATURES).toContain('advancedReporting');
      expect(EXPERIMENTAL_FEATURES).toContain('multiProviderAnalysis');
    });

    it('has metadata descriptions for all experimental features', () => {
      for (const feature of EXPERIMENTAL_FEATURES) {
        const desc = FEATURE_DESCRIPTIONS[feature];
        expect(desc).toBeDefined();
        expect(desc.name).toBeTruthy();
        expect(desc.description).toBeTruthy();
        expect(['starter', 'growth', 'scale', 'enterprise']).toContain(desc.tier);
      }
    });

    it('defaults all experimental flags to false in schema', () => {
      const parsed = featureFlagsSchema.parse({});
      expect(parsed).toEqual(DEFAULT_FEATURE_FLAGS);
      expect(parsed.aiRiskIndex).toBe(false);
      expect(parsed.bundleExecution).toBe(false);
      expect(parsed.ragContext).toBe(false);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns false for disabled features', () => {
      const flags: FeatureFlags = {
        aiRiskIndex: false,
        bundleExecution: false,
        ragContext: false,
        truthCoreIntegration: false,
        advancedReporting: false,
        multiProviderAnalysis: false,
      };

      expect(isFeatureEnabled('aiRiskIndex', flags)).toBe(false);
      expect(isFeatureEnabled('bundleExecution', flags)).toBe(false);
    });

    it('returns true when feature is explicitly enabled', () => {
      const flags: FeatureFlags = {
        aiRiskIndex: true,
        bundleExecution: false,
        ragContext: true,
        truthCoreIntegration: false,
        advancedReporting: false,
        multiProviderAnalysis: false,
      };

      expect(isFeatureEnabled('aiRiskIndex', flags)).toBe(true);
      expect(isFeatureEnabled('ragContext', flags)).toBe(true);
      expect(isFeatureEnabled('bundleExecution', flags)).toBe(false);
    });
  });

  describe('getEnabledFeatures', () => {
    it('returns empty array when no experimental features are enabled', () => {
      const flags: FeatureFlags = {
        aiRiskIndex: false,
        bundleExecution: false,
        ragContext: false,
        truthCoreIntegration: false,
        advancedReporting: false,
        multiProviderAnalysis: false,
      };

      expect(getEnabledFeatures(flags)).toEqual([]);
    });

    it('returns list of enabled experimental features', () => {
      const flags: FeatureFlags = {
        aiRiskIndex: true,
        bundleExecution: true,
        ragContext: false,
        truthCoreIntegration: false,
        advancedReporting: true,
        multiProviderAnalysis: false,
      };

      const enabled = getEnabledFeatures(flags);
      expect(enabled).toContain('aiRiskIndex');
      expect(enabled).toContain('bundleExecution');
      expect(enabled).toContain('advancedReporting');
      expect(enabled).not.toContain('ragContext');
    });
  });

  describe('assertFeatureEnabled', () => {
    it('does not throw when feature is enabled', () => {
      const flags: FeatureFlags = {
        aiRiskIndex: true,
        bundleExecution: false,
        ragContext: false,
        truthCoreIntegration: false,
        advancedReporting: false,
        multiProviderAnalysis: false,
      };

      expect(() => assertFeatureEnabled('aiRiskIndex', flags)).not.toThrow();
    });

    it('throws descriptive error when feature is disabled', () => {
      const flags: FeatureFlags = {
        aiRiskIndex: false,
        bundleExecution: false,
        ragContext: false,
        truthCoreIntegration: false,
        advancedReporting: false,
        multiProviderAnalysis: false,
      };

      expect(() => assertFeatureEnabled('aiRiskIndex', flags)).toThrow(
        /Feature "AI Risk Index" is experimental and not enabled/
      );
    });
  });

  describe('FeatureGate Component', () => {
    it('returns fallback when feature is disabled by default', () => {
      const children = 'Enabled Content';
      const fallback = 'Fallback Content';

      const result = FeatureGate({
        feature: 'bundleExecution',
        children,
        fallback,
      });

      expect(result).toBe(fallback);
    });

    it('returns null fallback when no fallback provided and feature is disabled', () => {
      const result = FeatureGate({
        feature: 'truthCoreIntegration',
        children: 'Child Node',
      });

      expect(result).toBeNull();
    });
  });
});
