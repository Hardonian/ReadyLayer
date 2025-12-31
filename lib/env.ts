/**
 * Environment Variable Validation
 * 
 * Runtime validation with safe defaults and clear error messages
 * Uses lazy evaluation to avoid build-time errors
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string;
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Redis (optional - falls back to DB queue)
  REDIS_URL?: string;
  
  // LLM Providers (at least one required)
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  DEFAULT_LLM_PROVIDER?: 'openai' | 'anthropic';
  
  // GitHub App (optional - required for GitHub integration)
  GITHUB_APP_ID?: string;
  GITHUB_APP_SECRET?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  
  // App Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  
  // API Configuration
  API_BASE_URL?: string;
  API_VERSION?: string;
}

class EnvValidator {
  private config: Partial<EnvConfig> = {};
  private errors: string[] = [];

  /**
   * Validate and load environment variables
   */
  validate(): EnvConfig {
    // Required variables
    this.config.DATABASE_URL = this.require('DATABASE_URL');
    this.config.NEXT_PUBLIC_SUPABASE_URL = this.require('NEXT_PUBLIC_SUPABASE_URL');
    this.config.NEXT_PUBLIC_SUPABASE_ANON_KEY = this.require('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    this.config.SUPABASE_SERVICE_ROLE_KEY = this.require('SUPABASE_SERVICE_ROLE_KEY');

    // Optional with defaults
    const nodeEnv = process.env.NODE_ENV;
    this.config.NODE_ENV = (nodeEnv === 'development' || nodeEnv === 'production' || nodeEnv === 'test') 
      ? nodeEnv 
      : 'development';
    const logLevel = process.env.LOG_LEVEL;
    this.config.LOG_LEVEL = (logLevel === 'debug' || logLevel === 'info' || logLevel === 'warn' || logLevel === 'error')
      ? logLevel
      : 'info';
    this.config.REDIS_URL = process.env.REDIS_URL;
    this.config.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    this.config.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    const defaultProvider = process.env.DEFAULT_LLM_PROVIDER;
    this.config.DEFAULT_LLM_PROVIDER = (defaultProvider === 'openai' || defaultProvider === 'anthropic')
      ? defaultProvider
      : 'openai';
    this.config.GITHUB_APP_ID = process.env.GITHUB_APP_ID;
    this.config.GITHUB_APP_SECRET = process.env.GITHUB_APP_SECRET;
    this.config.GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
    this.config.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
    this.config.API_VERSION = process.env.API_VERSION || 'v1';

    // Validate at least one LLM provider (skip during build)
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                        process.env.NEXT_PHASE === 'phase-development-build' ||
                        process.env.NEXT_PUBLIC_SKIP_ENV_VALIDATION === 'true';
    if (!isBuildTime && !this.config.OPENAI_API_KEY && !this.config.ANTHROPIC_API_KEY) {
      this.errors.push('At least one LLM provider API key is required (OPENAI_API_KEY or ANTHROPIC_API_KEY)');
    }

    // Validate NODE_ENV
    const nodeEnv = this.config.NODE_ENV;
    if (nodeEnv && !['development', 'production', 'test'].includes(nodeEnv)) {
      this.errors.push(`Invalid NODE_ENV: ${nodeEnv}. Must be development, production, or test`);
    }

    // Validate LOG_LEVEL
    if (this.config.LOG_LEVEL && !['debug', 'info', 'warn', 'error'].includes(this.config.LOG_LEVEL)) {
      this.errors.push(`Invalid LOG_LEVEL: ${this.config.LOG_LEVEL}. Must be debug, info, warn, or error`);
    }

    if (this.errors.length > 0) {
      throw new Error(`Environment validation failed:\n${this.errors.join('\n')}`);
    }

    return this.config as EnvConfig;
  }

  /**
   * Require an environment variable
   */
  private require(key: string): string {
    const value = process.env[key];
    if (!value) {
      this.errors.push(`Missing required environment variable: ${key}`);
      return ''; // Return empty string to continue validation
    }
    return value;
  }

  /**
   * Get safe defaults for development
   */
  getDefaults(): Partial<EnvConfig> {
    return {
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      DEFAULT_LLM_PROVIDER: 'openai',
      API_BASE_URL: 'http://localhost:3000',
      API_VERSION: 'v1',
    };
  }
}

// Lazy validation - only validate when accessed, not at module load time
let envConfig: EnvConfig | null = null;
let validationAttempted = false;

function getEnvConfig(): EnvConfig {
  if (envConfig) {
    return envConfig;
  }

  // During build, use defaults without validation
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                      process.env.NEXT_PHASE === 'phase-development-build' ||
                      typeof window === 'undefined' && !process.env.DATABASE_URL;

  if (isBuildTime && !validationAttempted) {
    validationAttempted = true;
    // Return safe defaults for build
    const defaults = new EnvValidator().getDefaults();
    envConfig = {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/readylayer',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      NODE_ENV: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test')
        ? process.env.NODE_ENV
        : 'development',
      LOG_LEVEL: defaults.LOG_LEVEL,
      DEFAULT_LLM_PROVIDER: defaults.DEFAULT_LLM_PROVIDER,
      API_BASE_URL: defaults.API_BASE_URL,
      API_VERSION: defaults.API_VERSION,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    } as EnvConfig;
    return envConfig;
  }

  // Runtime validation
  try {
    const validator = new EnvValidator();
    envConfig = validator.validate();
    validationAttempted = true;
    return envConfig;
  } catch (error) {
    // In development, log but don't crash
    if (process.env.NODE_ENV === 'development' || isBuildTime) {
      console.warn('Environment validation warning:', error instanceof Error ? error.message : error);
      // Use defaults for development/build
      const defaults = new EnvValidator().getDefaults();
      envConfig = {
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/readylayer',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        NODE_ENV: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test')
        ? process.env.NODE_ENV
        : 'development',
        LOG_LEVEL: defaults.LOG_LEVEL,
        DEFAULT_LLM_PROVIDER: defaults.DEFAULT_LLM_PROVIDER,
        API_BASE_URL: defaults.API_BASE_URL,
        API_VERSION: defaults.API_VERSION,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      } as EnvConfig;
      validationAttempted = true;
      return envConfig;
    } else {
      // In production, throw
      throw error;
    }
  }
}

// Export getter that lazily validates
export const env = new Proxy({} as EnvConfig, {
  get(_target, prop: keyof EnvConfig) {
    const config = getEnvConfig();
    return config[prop];
  },
});

/**
 * Check if a feature is enabled based on environment
 */
export function isFeatureEnabled(feature: string): boolean {
  const envVar = `FEATURE_${feature.toUpperCase()}`;
  return process.env[envVar] === 'true';
}

/**
 * Get database connection pool size based on environment
 */
export function getDatabasePoolSize(): number {
  if (process.env.DATABASE_POOL_SIZE) {
    return parseInt(process.env.DATABASE_POOL_SIZE, 10);
  }
  return process.env.NODE_ENV === 'production' ? 20 : 5;
}
