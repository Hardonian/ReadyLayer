import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  checks: z.object({
    database: z.enum(['healthy', 'unhealthy']),
    databaseSchema: z.enum(['healthy', 'unhealthy', 'degraded']).optional(),
    redis: z.enum(['healthy', 'unhealthy']).optional(),
    environment: z.enum(['healthy', 'unhealthy', 'unknown']).optional(),
  }),
  timestamp: z.string(),
  details: z
    .object({
      missingEnvVars: z.array(z.string()).optional(),
      missingTables: z.array(z.string()).optional(),
      rlsNotEnabled: z.array(z.string()).optional(),
      missingFunctions: z.array(z.string()).optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export type HealthResponseContract = z.infer<typeof healthResponseSchema>;
