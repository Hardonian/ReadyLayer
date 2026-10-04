import { z } from 'zod'

export const healthResponseSchema = z.object({
  status: z.literal('healthy'),
  checks: z.object({
    process: z.literal('healthy'),
  }),
  timestamp: z.string().datetime(),
})

export const readinessResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  checks: z.object({
    environment: z.enum(['ready', 'not_ready']),
    database: z.enum(['ready', 'not_ready']),
    databaseSchema: z.enum(['ready', 'not_ready', 'degraded']).optional(),
    redis: z.enum(['ready', 'not_ready']).optional(),
    secrets: z.enum(['ready', 'not_ready']),
  }),
  timestamp: z.string().datetime(),
  message: z.string().optional(),
})

export type HealthResponseContract = z.infer<typeof healthResponseSchema>
export type ReadinessResponseContract = z.infer<typeof readinessResponseSchema>
