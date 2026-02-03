/**
 * Module Run Connector (Dry-Run only)
 * Simulates module execution without side effects.
 */

import type { JobContext } from '../../../../lib/jobforge/shared/src'
import { z } from 'zod'

const ModuleRunPayloadSchema = z.object({
  module_name: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
  dry_run: z.literal(true),
  project_id: z.string().optional(),
})

export type ModuleRunPayload = z.infer<typeof ModuleRunPayloadSchema>

export interface ModuleRunResult {
  module_name: string
  dry_run: true
  project_id?: string
  summary: {
    input_keys: string[]
    input_count: number
  }
  simulated_at: string
}

export async function moduleRunHandler(
  payload: unknown,
  _context: JobContext
): Promise<ModuleRunResult> {
  const validated = ModuleRunPayloadSchema.parse(payload)

  return {
    module_name: validated.module_name,
    dry_run: true,
    project_id: validated.project_id,
    summary: {
      input_keys: Object.keys(validated.input),
      input_count: Object.keys(validated.input).length,
    },
    simulated_at: new Date().toISOString(),
  }
}

