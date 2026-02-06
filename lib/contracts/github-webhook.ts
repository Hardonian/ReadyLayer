import { z } from 'zod';

export const gitHubWebhookEventSchema = z
  .object({
    action: z.string(),
    repository: z
      .object({
        id: z.number().optional(),
        full_name: z.string(),
      })
      .optional(),
    pull_request: z
      .object({
        number: z.number(),
        title: z.string(),
        head: z.object({
          sha: z.string(),
          ref: z.string(),
        }),
        base: z.object({
          ref: z.string(),
        }),
        merged: z.boolean().optional(),
        merge_commit_sha: z.string().nullable().optional(),
      })
      .optional(),
    check_run: z.unknown().optional(),
    workflow_run: z.unknown().optional(),
    installation: z
      .object({
        id: z.number(),
      })
      .optional(),
  })
  .passthrough();

export type GitHubWebhookEventContract = z.infer<typeof gitHubWebhookEventSchema>;
