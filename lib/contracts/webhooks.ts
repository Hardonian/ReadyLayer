/**
 * Webhook Payload Schemas
 *
 * Comprehensive Zod schemas for all webhook event types.
 * Used for validation in webhook processors.
 *
 * ARCHITECTURE:
 * - Discriminated union for different webhook types
 * - Each provider (GitHub, GitLab, Bitbucket) has normalized payloads
 * - Runtime validation ensures type safety before processing
 */

import { z } from 'zod'

/**
 * Normalized file change representation
 */
export const FileChangeSchema = z.object({
  filename: z.string(),
  status: z.enum(['added', 'removed', 'modified', 'renamed']),
  additions: z.number().int().optional(),
  deletions: z.number().int().optional(),
  changes: z.number().int().optional(),
})

export type FileChange = z.infer<typeof FileChangeSchema>

/**
 * Normalized PR/MR object
 */
export const PullRequestSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  body: z.string().optional(),
  state: z.enum(['open', 'closed', 'merged']),
  head: z.object({
    sha: z.string(),
    ref: z.string(),
  }),
  base: z.object({
    sha: z.string(),
    ref: z.string(),
  }),
  user: z.object({
    login: z.string(),
    id: z.number().int().optional(),
  }),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  mergedAt: z.coerce.date().optional(),
  files: z.array(FileChangeSchema).optional(),
  additions: z.number().int().optional(),
  deletions: z.number().int().optional(),
  changedFiles: z.number().int().optional(),
})

export type PullRequest = z.infer<typeof PullRequestSchema>

/**
 * Normalized repository object
 */
export const RepositorySchema = z.object({
  id: z.string().or(z.number()).describe('Provider repo ID'),
  name: z.string(),
  fullName: z.string().describe('owner/repo'),
  provider: z.enum(['github', 'gitlab', 'bitbucket']),
  url: z.string().url(),
  htmlUrl: z.string().url().optional(),
  description: z.string().optional(),
  private: z.boolean(),
  owner: z.object({
    login: z.string(),
    id: z.number().int().optional(),
  }),
})

export type Repository = z.infer<typeof RepositorySchema>

/**
 * CI/workflow run information
 */
export const CIRunSchema = z.object({
  id: z.string().or(z.number()),
  status: z.enum(['pending', 'in_progress', 'completed']),
  conclusion: z.enum(['success', 'failure', 'neutral', 'cancelled', 'skipped', 'timed_out']).optional(),
  name: z.string(),
  headSha: z.string(),
  url: z.string().url().optional(),
})

export type CIRun = z.infer<typeof CIRunSchema>

/**
 * Installation/Integration metadata
 */
export const InstallationMetadataSchema = z.object({
  installationId: z.string(),
  provider: z.enum(['github', 'gitlab', 'bitbucket']),
  accountId: z.string().optional(),
  accountLogin: z.string().optional(),
})

export type InstallationMetadata = z.infer<typeof InstallationMetadataSchema>

/**
 * PR OPENED event
 */
export const WebhookPROpenedSchema = z.object({
  type: z.literal('pr.opened'),
  action: z.literal('opened').optional(),
  repository: RepositorySchema,
  pr: PullRequestSchema,
  sender: z.object({
    login: z.string(),
    id: z.number().int().optional(),
  }),
  installation: InstallationMetadataSchema,
  timestamp: z.coerce.date().optional(),
})

export type WebhookPROpened = z.infer<typeof WebhookPROpenedSchema>

/**
 * PR UPDATED event (synchronize in GitHub, approved/changes_requested in GitLab)
 */
export const WebhookPRUpdatedSchema = z.object({
  type: z.literal('pr.updated'),
  action: z.enum(['synchronize', 'approved', 'changes_requested', 'opened']).optional(),
  repository: RepositorySchema,
  pr: PullRequestSchema,
  sender: z.object({
    login: z.string(),
    id: z.number().int().optional(),
  }),
  installation: InstallationMetadataSchema,
  timestamp: z.coerce.date().optional(),
})

export type WebhookPRUpdated = z.infer<typeof WebhookPRUpdatedSchema>

/**
 * MERGE COMPLETED event (closed + merged in GitHub, merged in GitLab)
 */
export const WebhookMergeCompletedSchema = z.object({
  type: z.literal('merge.completed'),
  action: z.literal('closed').optional(),
  repository: RepositorySchema,
  pr: PullRequestSchema.extend({
    mergedAt: z.coerce.date(),
    mergedBy: z.object({
      login: z.string(),
      id: z.number().int().optional(),
    }).optional(),
  }),
  sender: z.object({
    login: z.string(),
    id: z.number().int().optional(),
  }),
  installation: InstallationMetadataSchema,
  timestamp: z.coerce.date().optional(),
})

export type WebhookMergeCompleted = z.infer<typeof WebhookMergeCompletedSchema>

/**
 * CI COMPLETED event
 */
export const WebhookCICompletedSchema = z.object({
  type: z.literal('ci.completed'),
  repository: RepositorySchema,
  pr: PullRequestSchema.optional().describe('May not be present for commit-only CI runs'),
  run: CIRunSchema,
  sender: z.object({
    login: z.string(),
    id: z.number().int().optional(),
  }),
  installation: InstallationMetadataSchema,
  timestamp: z.coerce.date().optional(),
})

export type WebhookCICompleted = z.infer<typeof WebhookCICompletedSchema>

/**
 * Discriminated union of all webhook event types
 */
export const WebhookEventSchema = z.discriminatedUnion('type', [
  WebhookPROpenedSchema,
  WebhookPRUpdatedSchema,
  WebhookMergeCompletedSchema,
  WebhookCICompletedSchema,
])

export type WebhookEvent = z.infer<typeof WebhookEventSchema>

/**
 * Type guards for narrowing webhook types
 */
export function isWebhookPROpened(event: WebhookEvent): event is WebhookPROpened {
  return event.type === 'pr.opened'
}

export function isWebhookPRUpdated(event: WebhookEvent): event is WebhookPRUpdated {
  return event.type === 'pr.updated'
}

export function isWebhookMergeCompleted(event: WebhookEvent): event is WebhookMergeCompleted {
  return event.type === 'merge.completed'
}

export function isWebhookCICompleted(event: WebhookEvent): event is WebhookCICompleted {
  return event.type === 'ci.completed'
}

/**
 * Webhook validation helper
 * Validates raw payload against webhook schema
 */
export function validateWebhookEvent(payload: unknown): { success: true; data: WebhookEvent } | { success: false; error: z.ZodError } {
  const result = WebhookEventSchema.safeParse(payload)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
