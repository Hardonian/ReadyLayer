/**
 * ReadyLayer Configuration Validation Route
 * 
 * POST /api/v1/config/validate
 * Accepts YAML or JSON config content and returns precise line/column validation errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateConfigYaml } from '@/lib/config/yaml-validator';
import { successResponse, errorResponse, parseJsonBody } from '@/lib/api-route-helpers';
import { z } from 'zod';

const validateRequestSchema = z.object({
  yaml: z.string().min(1, 'Configuration text is required'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.success) {
    return bodyResult.response;
  }

  const parsed = validateRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Missing configuration content', 400, {
      issues: parsed.error.issues,
    });
  }

  const result = validateConfigYaml(parsed.data.yaml);

  return successResponse({
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
    config: result.config,
  });
}
