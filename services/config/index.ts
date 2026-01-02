/**
 * Configuration Service
 * 
 * Parses and validates .readylayer.yml configuration files
 */

import yaml from 'js-yaml';
import { prisma } from '../../lib/prisma';

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
    const repoConfigData = repoConfig?.config as ReadyLayerConfig | undefined;

    // Merge: repo config overrides org config (as partial, defaults will be applied)
    const merged: any = {
      review: {
        ...orgConfig?.review,
        ...(repoConfigData?.review || {}),
      },
      test: {
        ...orgConfig?.test,
        ...(repoConfigData?.test || {}),
      },
      docs: {
        ...orgConfig?.docs,
        ...(repoConfigData?.docs || {}),
      },
    };

    // Apply defaults (enforcement-first) - this ensures all required properties are present
    return this.applyDefaults(merged);
  }

  /**
   * Apply enforcement-first defaults
   */
  private applyDefaults(config: Partial<ReadyLayerConfig>): ReadyLayerConfig {
    const reviewConfig: ReviewConfig = {
      enabled: config.review?.enabled !== false,
      failOnCritical: true, // REQUIRED: Cannot disable
      failOnHigh: config.review?.failOnHigh !== false, // DEFAULT: true
      failOnMedium: config.review?.failOnMedium || false,
      failOnLow: config.review?.failOnLow || false,
      enabledRules: config.review?.enabledRules,
      disabledRules: config.review?.disabledRules,
      excludedPaths: config.review?.excludedPaths,
      includedPaths: config.review?.includedPaths,
    };

    const testConfig: TestConfig = {
      enabled: config.test?.enabled !== false,
      framework: config.test?.framework,
      placement: config.test?.placement,
      testDir: config.test?.testDir,
      aiDetection: config.test?.aiDetection,
      coverage: {
        threshold: config.test?.coverage?.threshold || 80,
        metric: config.test?.coverage?.metric || 'lines',
        enforceOn: config.test?.coverage?.enforceOn || 'pr',
        failOnBelow: true, // REQUIRED: Cannot disable
      },
      excludedPaths: config.test?.excludedPaths,
    };

    const docsConfig: DocSyncConfig = {
      enabled: config.docs?.enabled !== false,
      framework: config.docs?.framework,
      openapi: config.docs?.openapi,
      markdown: config.docs?.markdown,
      updateStrategy: config.docs?.updateStrategy,
      branch: config.docs?.branch,
      driftPrevention: {
        enabled: true, // REQUIRED: Cannot disable
        action: config.docs?.driftPrevention?.action || 'block',
        checkOn: config.docs?.driftPrevention?.checkOn || 'pr',
      },
      excludedPaths: config.docs?.excludedPaths,
    };

    return {
      review: reviewConfig,
      test: testConfig,
      docs: docsConfig,
    };
  }

  /**
   * Generate default config YAML
   */
  generateDefaultConfigYaml(): string {
    return `# ReadyLayer Configuration
# Auto-generated with safe defaults
# See https://docs.readylayer.com/config for details

review:
  enabled: true
  fail_on_critical: true  # REQUIRED: Cannot disable
  fail_on_high: true      # DEFAULT: Can disable with admin approval
  fail_on_medium: false
  fail_on_low: false

test:
  enabled: true
  coverage:
    threshold: 80  # Minimum 80%, cannot go below
    metric: lines
    enforce_on: pr
    fail_on_below: true  # REQUIRED: Cannot disable

docs:
  enabled: true
  drift_prevention:
    enabled: true  # REQUIRED: Cannot disable
    action: block  # DEFAULT: Block, can change to 'auto_update' or 'alert'
    check_on: pr
`;
  }

  /**
   * Generate default config object
   */
  generateDefaultConfig(): ReadyLayerConfig {
    return this.applyDefaults({});
  }

  /**
   * Auto-generate and save config for repository
   */
  async autoGenerateConfig(repositoryId: string): Promise<void> {
    const defaultConfig = this.generateDefaultConfig();
    const defaultYaml = this.generateDefaultConfigYaml();

    await prisma.repositoryConfig.upsert({
      where: { repositoryId },
      update: {
        config: defaultConfig as any,
        rawConfig: defaultYaml,
        version: { increment: 1 },
      },
      create: {
        repositoryId,
        config: defaultConfig as any,
        rawConfig: defaultYaml,
      },
    });
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
      const errorMessage = `Invalid configuration:\n${validation.errors?.map(e => `  - ${e}`).join('\n')}\n\nFix: Update your .readylayer.yml file to resolve these errors. See https://docs.readylayer.com/config for valid configuration options.`;
      throw new Error(errorMessage);
    }

    // Apply defaults
    const finalConfig = this.applyDefaults(config);

    // Update or create config
    await prisma.repositoryConfig.upsert({
      where: { repositoryId },
      update: {
        config: finalConfig as any, // Prisma Json type
        rawConfig,
        version: { increment: 1 },
      },
      create: {
        repositoryId,
        config: finalConfig as any, // Prisma Json type
        rawConfig,
      },
    });
  }
}

export const configService = new ConfigService();
