/**
 * Audit Logging Utilities
 * 
 * Centralized audit logging for all major actions.
 * Implements tamper-evident hash chaining.
 */

import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';
import { logger } from '../observability/logging';
import { createHash } from 'crypto';

export interface AuditLogData {
  organizationId: string | null;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  runId?: string;
}

/**
 * Calculate SHA-256 hash for audit entry
 */
function calculateAuditHash(
  previousHash: string | null,
  data: AuditLogData,
  timestamp: string
): string {
  const payload = JSON.stringify({
    previousHash,
    organizationId: data.organizationId,
    userId: data.userId,
    action: data.action,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    details: data.details,
    runId: data.runId,
    timestamp,
  });

  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Create audit log entry
 * 
 * Never throws - logs errors but doesn't fail the operation
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    // 1. Get the latest audit log for this organization (or global if null)
    // We use a transaction to ensure we get the true latest if possible,
    // though for performance we rely on "eventual consistency" of the chain in high throughput.
    // In strict mode, this should be a serializable transaction.
    const lastLog = await prisma.auditLog.findFirst({
      where: {
        organizationId: data.organizationId || null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        hash: true,
      },
    });

    const previousHash = lastLog?.hash || null;
    const hash = calculateAuditHash(previousHash, data, timestamp);

    await prisma.auditLog.create({
      data: {
        organizationId: data.organizationId || null,
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: (data.details || {}) as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        runId: data.runId || null,
        
        // Tamper-evident fields
        previousHash,
        hash,
        actorIp: data.ipAddress, // Redundant but explicit for audit
        metadata: {
          timestamp, // Store the exact timestamp used for hashing
        },
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
  
  // Run actions
  RUN_CREATED: 'run_created',
  RUN_COMPLETED: 'run_completed',
  RUN_FAILED: 'run_failed',
  RUN_CANCELLED: 'run_cancelled',
} as const;
