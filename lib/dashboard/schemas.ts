/**
 * Dashboard API Schemas
 * 
 * Type-safe contracts for snapshot + delta APIs
 */

import { z } from 'zod'

// Time bucket for aggregation
export const timeBucketSchema = z.enum(['minute', 'hour', 'day'])

// Severity levels
export const severitySchema = z.enum(['info', 'warn', 'high', 'critical'])

// Status values
export const statusSchema = z.enum(['pass', 'fail', 'blocked', 'needs_review', 'overridden', 'resolved'])

// Snapshot query params
export const snapshotQuerySchema = z.object({
  organizationId: z.string().min(1),
  repositoryId: z.string().optional(),
  timeRange: z.enum(['24h', '7d', '30d']).default('24h'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// Metrics snapshot
export const metricsSnapshotSchema = z.object({
  timeRange: z.enum(['24h', '7d', '30d']),
  timestamp: z.string().datetime(),
  kpis: z.object({
    totalRuns: z.number().int().min(0),
    blockedPRs: z.number().int().min(0),
    criticalFindings: z.number().int().min(0),
    aiRiskDetections: z.number().int().min(0),
    meanTimeToUnblock: z.number().min(0), // minutes
  }),
  trends: z.object({
    prThroughput: z.object({
      opened: z.number().int().min(0),
      merged: z.number().int().min(0),
      blocked: z.number().int().min(0),
    }),
    gateOutcomes: z.record(z.object({
      passed: z.number().int().min(0),
      failed: z.number().int().min(0),
    })),
    aiTouchedTrend: z.array(z.object({
      timestamp: z.string().datetime(),
      count: z.number().int().min(0),
    })),
    findingsTrend: z.array(z.object({
      timestamp: z.string().datetime(),
      severity: severitySchema,
      count: z.number().int().min(0),
    })),
  }),
  hotRepos: z.array(z.object({
    repositoryId: z.string(),
    repositoryName: z.string(),
    blockedRate: z.number().min(0).max(1),
    criticalRate: z.number().min(0).max(1),
  })),
})

// PR snapshot
export const prSnapshotSchema = z.object({
  prs: z.array(z.object({
    id: z.string(),
    repositoryId: z.string(),
    repositoryName: z.string(),
    prNumber: z.number().int(),
    prSha: z.string(),
    prTitle: z.string().nullable(),
    status: statusSchema,
    isBlocked: z.boolean(),
    blockedReason: z.string().nullable(),
    gatesPassed: z.boolean(),
    gatesFailed: z.array(z.string()),
    aiTouchedDetected: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
  pagination: z.object({
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    hasMore: z.boolean(),
  }),
})

// Run snapshot
export const runSnapshotSchema = z.object({
  runs: z.array(z.object({
    id: z.string(),
    correlationId: z.string(),
    repositoryId: z.string().nullable(),
    repositoryName: z.string().nullable(),
    trigger: z.enum(['webhook', 'manual', 'sandbox']),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
    conclusion: z.enum(['success', 'failure', 'partial_success', 'cancelled']).nullable(),
    reviewGuardStatus: z.enum(['pending', 'running', 'succeeded', 'failed', 'skipped']),
    testEngineStatus: z.enum(['pending', 'running', 'succeeded', 'failed', 'skipped']),
    docSyncStatus: z.enum(['pending', 'running', 'succeeded', 'failed', 'skipped']),
    gatesPassed: z.boolean(),
    aiTouchedDetected: z.boolean(),
    duration: z.number().min(0).nullable(), // seconds
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
  })),
  pagination: z.object({
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    hasMore: z.boolean(),
  }),
})

// Finding snapshot
export const findingSnapshotSchema = z.object({
  findings: z.array(z.object({
    id: z.string(),
    repositoryId: z.string(),
    repositoryName: z.string(),
    reviewId: z.string().nullable(),
    runId: z.string().nullable(),
    ruleId: z.string(),
    detectorId: z.string(),
    severity: severitySchema,
    status: statusSchema,
    file: z.string(),
    line: z.number().int().min(1),
    message: z.string(),
    confidence: z.number().min(0).max(1).nullable(),
    evidenceReferences: z.array(z.string()),
    createdAt: z.string().datetime(),
    resolvedAt: z.string().datetime().nullable(),
  })),
  pagination: z.object({
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    hasMore: z.boolean(),
  }),
})

// Policy snapshot
export const policySnapshotSchema = z.object({
  policies: z.array(z.object({
    id: z.string(),
    organizationId: z.string(),
    repositoryId: z.string().nullable(),
    version: z.string(),
    rules: z.array(z.object({
      id: z.string(),
      ruleId: z.string(),
      enabled: z.boolean(),
      severityMapping: z.record(z.string()),
    })),
    coverage: z.object({
      reposCovered: z.number().int().min(0),
      totalRepos: z.number().int().min(0),
    }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
  pagination: z.object({
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    hasMore: z.boolean(),
  }),
})

// Delta event types
export const deltaEventTypeSchema = z.enum([
  'metrics_delta',
  'prs_delta',
  'runs_delta',
  'findings_delta',
  'policies_delta',
  'health',
])

// Delta event
export const deltaEventSchema = z.object({
  type: deltaEventTypeSchema,
  timestamp: z.string().datetime(),
  organizationId: z.string(),
  repositoryId: z.string().optional(),
  data: z.record(z.unknown()),
})

// Stream connection params
export const streamQuerySchema = z.object({
  organizationId: z.string().min(1),
  repositoryId: z.string().optional(),
  channels: z.string().optional(), // comma-separated channel names
})

export type SnapshotQuery = z.infer<typeof snapshotQuerySchema>
export type MetricsSnapshot = z.infer<typeof metricsSnapshotSchema>
export type PRSnapshot = z.infer<typeof prSnapshotSchema>
export type RunSnapshot = z.infer<typeof runSnapshotSchema>
export type FindingSnapshot = z.infer<typeof findingSnapshotSchema>
export type PolicySnapshot = z.infer<typeof policySnapshotSchema>
export type DeltaEvent = z.infer<typeof deltaEventSchema>
export type StreamQuery = z.infer<typeof streamQuerySchema>
