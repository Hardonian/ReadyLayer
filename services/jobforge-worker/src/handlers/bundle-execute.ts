/**
 * Bundle Execution Connector
 * Builds a deterministic execution plan for evidence bundles.
 */

import type { JobContext } from '../../../../lib/jobforge/shared/src'
import { z } from 'zod'

const BundleExecutePayloadSchema = z.object({
  bundle_id: z.string().min(1),
  bundle_type: z.string().optional(),
  inputs: z.record(z.string(), z.unknown()).default({}),
  execute: z.boolean().default(false),
  project_id: z.string().optional(),
})

export type BundleExecutePayload = z.infer<typeof BundleExecutePayloadSchema>

export interface BundleExecuteResult {
  bundle_id: string
  bundle_type?: string
  project_id?: string
  execute: boolean
  plan: {
    steps: string[]
    input_count: number
  }
  requested_at: string
}

function buildExecutionPlan(inputs: Record<string, unknown>): string[] {
  const keys = Object.keys(inputs)
  if (keys.length === 0) {
    return ['validate-bundle', 'no-inputs-provided']
  }
  return ['validate-bundle', ...keys.map((key) => `hydrate:${key}`), 'execute-bundle']
}

export async function bundleExecuteHandler(
  payload: unknown,
  _context: JobContext
): Promise<BundleExecuteResult> {
  const validated = BundleExecutePayloadSchema.parse(payload)

  return {
    bundle_id: validated.bundle_id,
    bundle_type: validated.bundle_type,
    project_id: validated.project_id,
    execute: validated.execute,
    plan: {
      steps: buildExecutionPlan(validated.inputs),
      input_count: Object.keys(validated.inputs).length,
    },
    requested_at: new Date().toISOString(),
  }
}

