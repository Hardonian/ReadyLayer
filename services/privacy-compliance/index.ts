/**
 * Privacy & Compliance Service
 * 
 * Handles PII anonymization, data retention, consent management
 * Ensures GDPR and other compliance requirements
 */

import { createHash } from 'crypto';

export interface AnonymizationOptions {
  preserveStructure?: boolean; // Keep data structure but anonymize values
  hashAlgorithm?: 'sha256' | 'sha512' | 'md5';
  salt?: string; // Optional salt for hashing
  preserveLength?: boolean; // Keep original length for some fields
  customRules?: Record<string, (value: string) => string>; // Custom anonymization per field
}

export interface ComplianceConfig {
  gdprEnabled: boolean;
  dataRetentionDays: number;
  requireConsent: boolean;
  anonymizePII: boolean;
  allowAggregation: boolean; // Allow aggregated/anonymized data for learning
  aggregationWindow: number; // Days to aggregate data
}

export class PrivacyComplianceService {
  private defaultConfig: ComplianceConfig = {
    gdprEnabled: true,
    dataRetentionDays: 365,
    requireConsent: true,
    anonymizePII: true,
    allowAggregation: true,
    aggregationWindow: 30,
  };

  /**
   * Anonymize PII in text/data
   */
  anonymizePII(
    data: string | Record<string, unknown>,
    options: AnonymizationOptions = {}
  ): string | Record<string, unknown> {
    if (typeof data === 'string') {
      return this.anonymizeText(data, options);
    }

    const anonymized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        anonymized[key] = this.anonymizeText(value, options);
      } else if (typeof value === 'object' && value !== null) {
        anonymized[key] = this.anonymizePII(value as Record<string, unknown>, options);
      } else {
        anonymized[key] = value;
      }
    }
    return anonymized;
  }

  /**
   * Anonymize text content
   */
  private anonymizeText(text: string, options: AnonymizationOptions): string {
    // Email addresses
    text = text.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      (match) => this.hashValue(match, options)
    );

    // IP addresses
    text = text.replace(
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      (match) => this.hashValue(match, options)
    );

    // Credit card numbers (basic pattern)
    text = text.replace(
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      (match) => this.hashValue(match, options)
    );

    // Phone numbers
    text = text.replace(
      /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      (match) => this.hashValue(match, options)
    );

    // URLs with potential PII
    text = text.replace(
      /https?:\/\/[^\s]+/g,
      (match) => {
        // Remove query params that might contain PII
        const url = new URL(match);
        url.search = '';
        return url.toString();
      }
    );

    // Names (basic pattern - would need NLP for better detection)
    // This is a simplified version
    const commonNames = /\b(John|Jane|Smith|Doe|User|Admin)\b/gi;
    text = text.replace(commonNames, (match) => this.hashValue(match, options));

    return text;
  }

  /**
   * Hash a value for anonymization
   */
  private hashValue(value: string, options: AnonymizationOptions): string {
    const algorithm = options.hashAlgorithm || 'sha256';
    const salt = options.salt || '';
    const hash = createHash(algorithm);
    hash.update(value + salt);
    const hashed = hash.digest('hex');

    if (options.preserveLength) {
      // Truncate or pad to match original length
      return hashed.substring(0, value.length);
    }

    return hashed.substring(0, 16); // Default to 16 chars
  }

  /**
   * Check if data can be used for aggregation (compliant)
   */
  canUseForAggregation(
    data: Record<string, unknown>,
    config: ComplianceConfig
  ): boolean {
    if (!config.allowAggregation) {
      return false;
    }

    // Check if data contains PII
    const hasPII = this.detectPII(data);
    if (hasPII && !config.anonymizePII) {
      return false;
    }

    return true;
  }

  /**
   * Detect if data contains PII
   */
  private detectPII(data: Record<string, unknown>): boolean {
    const dataStr = JSON.stringify(data);
    
    // Check for common PII patterns
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
    const phonePattern = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;

    return emailPattern.test(dataStr) || ipPattern.test(dataStr) || phonePattern.test(dataStr);
  }

  /**
   * Prepare data for aggregation (anonymize if needed)
   */
  prepareForAggregation(
    data: Record<string, unknown>,
    config: ComplianceConfig
  ): Record<string, unknown> {
    if (!this.canUseForAggregation(data, config)) {
      throw new Error('Data cannot be used for aggregation due to compliance restrictions');
    }

    if (config.anonymizePII && this.detectPII(data)) {
      return this.anonymizePII(data) as Record<string, unknown>;
    }

    return data;
  }

  /**
   * Get compliance configuration
   */
  getConfig(_organizationId: string): ComplianceConfig {
    // In production, this would fetch from database
    // For now, return default
    return this.defaultConfig;
  }

  /**
   * Check if data should be deleted (retention policy)
   */
  shouldDeleteData(createdAt: Date, config: ComplianceConfig): boolean {
    const retentionMs = config.dataRetentionDays * 24 * 60 * 60 * 1000;
    const age = Date.now() - createdAt.getTime();
    return age > retentionMs;
  }
}

export const privacyComplianceService = new PrivacyComplianceService();
