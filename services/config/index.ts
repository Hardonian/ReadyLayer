/**
 * Configuration Service
 * 
 * Parses and validates .readylayer.yml configuration files
 */

import yaml from 'js-yaml';
import { prisma } from '../../lib/prisma';
import { logger } from '../../observability/logging';

export interface ReviewConfig {
  enabled: boolean;
  failOnCritical: boolean; // REQUIRED: Always true
  failOnHigh: boolean; // DEFAULT: true
  failOnMedium: boolean;
  failOnLow: boolean;
  enabledRules?: string[];
  disabledRules?: string[];
  excludedPaths?: string[];
  includedPaths?: string[];
}

export interface TestConfig {
  enabled: boolean;
  framework?: string;
  placement?: 'co-located' | 'separate' | 'mirror';
  testDir?: string;
  aiDetection?: {
    methods?: string[];
    confidenceThreshold?: number;
  };
  coverage?: {
    threshold: number; // Minimum 80
    metric?: 'lines' | 'branches' | 'functions';
    enforceOn?: 'pr' | 'merge' | 'both';
    failOnBelow: boolean; // REQUIRED: Always true
  };
  excludedPaths?: string[];
}

export interface DocSyncConfig {
  enabled: boolean;
  framework?: string;
  openapi?: {
    version?: '3.0' | '3.1';
    outputPath?: string;
    enhanceWithLLM?: boolean;
  };
  markdown?: {
    enabled?: boolean;
    outputPath?: string;
  };
  updateStrategy?: 'commit' | 'pr';
  branch?: string;
  driftPrevention?: {
    enabled: boolean; // REQUIRED: Always true
    action?: 'block' | 'auto_update' | 'alert';
    checkOn?: 'pr' | 'merge' | 'both';
  };
  excludedPaths?: string[];
}

export interface ReadyLayerConfig {
  review?: ReviewConfig;
  test?: TestConfig;
  docs?: DocSyncConfig;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export class ConfigService {
  /**
   * Parse .readylayer.yml file
   */
  parseConfig(content: string): ReadyLayerConfig {
    try {
      const config = yaml.load(content) as ReadyLayerConfig;
      return config;
    } catch (error) {
      throw new Error(`Failed to parse config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate configuration (enforcement-first)
   */
  validateConfig(config: ReadyLayerConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Review Guard config
    if (config.review?.enabled !== false) {
      if (config.review?.failOnCritical === false) {
        errors.push('review.fail_on_critical cannot be disabled. Critical issues always block PRs.');
      }

      if (config.review?.failOnHigh === false) {
        warnings.push('review.fail_on_high is disabled. High issues will not block PRs.');
      }
    }

    // Validate Test Engine config
    if (config.test?.enabled !== false) {
      if (config.test?.coverage) {
        if (config.test.coverage.threshold < 80) {
          errors.push(`test.coverage.threshold cannot be below 80%. Current: ${config.test.coverage.threshold}`);
        }

        if (config.test.coverage.failOnBelow === false) {
          errors.push('test.coverage.fail_on_below cannot be disabled. Coverage enforcement is required.');
        }
      }
    }

    // Validate Doc Sync config
    if (config.docs?.enabled !== false) {
      if (config.docs?.driftPrevention?.enabled === false) {
        errors.push('docs.drift_prevention.enabled cannot be disabled. Documentation sync is required.');
      }

      if (config.docs?.driftPrevention?.action && config.docs.driftPrevention.action !== 'block') {
        warnings.push(`docs.drift_prevention.action is set to '${config.docs.driftPrevention.action}'. Default is 'block' for safety.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get repository config (with org defaults merged)
   */
  async getRepositoryConfig(repositoryId: string): Promise<ReadyLayerConfig> {
    // Get repo config
    const repoConfig = await prisma.repositoryConfig.findUnique({
      where: { repositoryId },
    });

    // Get org config
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { organization: { include: { configs: true } } },
    });

    const orgConfig = repo?.organization?.configs[0]?.config as ReadyLayerConfig | undefined;

    // Merge: repo config overrides org config
    const merged: ReadyLayerConfig = {
      ...orgConfig,
      review: {
        ...orgConfig?.review,
        ...repoConfig?.config.review,
      },
      test: {
        ...orgConfig?.test,
        ...repoConfig?.config.test,
      },
      docs: {
        ...orgConfig?.docs,
        ...repoConfig?.config.docs,
      },
    };

    // Apply defaults (enforcement-first)
    return this.applyDefaults(merged);
  }

  /**
   * Apply enforcement-first defaults
   */
  private applyDefaults(config: ReadyLayerConfig): ReadyLayerConfig {
    return {
      review: {
        enabled: config.review?.enabled !== false,
        failOnCritical: true, // REQUIRED: Cannot disable
        failOnHigh: config.review?.failOnHigh !== false, // DEFAULT: true
        failOnMedium: config.review?.failOnMedium || false,
        failOnLow: config.review?.failOnLow || false,
        ...config.review,
      },
      test: {
        enabled: config.test?.enabled !== false,
        coverage: {
          threshold: config.test?.coverage?.threshold || 80,
          metric: config.test?.coverage?.metric || 'lines',
          enforceOn: config.test?.coverage?.enforceOn || 'pr',
          failOnBelow: true, // REQUIRED: Cannot disable
          ...config.test?.coverage,
        },
        ...config.test,
      },
      docs: {
        enabled: config.docs?.enabled !== false,
        driftPrevention: {
          enabled: true, // REQUIRED: Cannot disable
          action: config.docs?.driftPrevention?.action || 'block',
          checkOn: config.docs?.driftPrevention?.checkOn || 'pr',
          ...config.docs?.driftPrevention,
        },
        ...config.docs,
      },
    };
  }

  /**
   * Update repository config
   */
  async updateRepositoryConfig(
    repositoryId: string,
    config: ReadyLayerConfig,
    rawConfig?: string
  ): Promise<void> {
    // Validate config
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors?.join(', ')}`);
    }

    // Apply defaults
    const finalConfig = this.applyDefaults(config);

    // Update or create config
    await prisma.repositoryConfig.upsert({
      where: { repositoryId },
      update: {
        config: finalConfig,
        rawConfig,
        version: { increment: 1 },
      },
      create: {
        repositoryId,
        config: finalConfig,
        rawConfig,
      },
    });
  }
}

export const configService = new ConfigService();
