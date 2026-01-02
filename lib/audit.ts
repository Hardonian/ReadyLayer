/**
 * Audit Logging Utilities
 * 
 * Centralized audit logging for all major actions
 */

import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';
import { logger } from '../observability/logging';

export interface AuditLogData {
  organizationId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create audit log entry
 * 
 * Never throws - logs errors but doesn't fail the operation
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: (data.details || {}) as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    // Never fail on audit log errors - log and continue
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Failed to create audit log');
  }
}

/**
 * Audit log actions
 */
export const AuditActions = {
  // Repository actions
  REPO_CREATED: 'repo_created',
  REPO_UPDATED: 'repo_updated',
  REPO_DELETED: 'repo_deleted',
  REPO_CONFIG_UPDATED: 'repo_config_updated',
  
  // Review actions
  REVIEW_CREATED: 'review_created',
  REVIEW_COMPLETED: 'review_completed',
  REVIEW_BLOCKED: 'review_blocked',
  REVIEW_OVERRIDDEN: 'review_overridden',
  
  // Test actions
  TEST_GENERATED: 'test_generated',
  TEST_RUN_COMPLETED: 'test_run_completed',
  COVERAGE_ENFORCED: 'coverage_enforced',
  
  // Doc actions
  DOC_GENERATED: 'doc_generated',
  DRIFT_DETECTED: 'drift_detected',
  DRIFT_BLOCKED: 'drift_blocked',
  
  // Policy actions
  POLICY_CREATED: 'policy_created',
  POLICY_UPDATED: 'policy_updated',
  WAIVER_CREATED: 'waiver_created',
  WAIVER_DELETED: 'waiver_deleted',
  
  // Billing actions
  BILLING_LIMIT_CHECKED: 'billing_limit_checked',
  BILLING_LIMIT_EXCEEDED: 'billing_limit_exceeded',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  
  // Installation actions
  INSTALLATION_CREATED: 'installation_created',
  INSTALLATION_UPDATED: 'installation_updated',
  INSTALLATION_DELETED: 'installation_deleted',
  
  // API key actions
  API_KEY_CREATED: 'api_key_created',
  API_KEY_DELETED: 'api_key_deleted',
  API_KEY_USED: 'api_key_used',
} as const;
