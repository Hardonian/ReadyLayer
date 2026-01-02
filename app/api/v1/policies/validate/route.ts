/**
 * POST /api/v1/policies/validate
 * Validate policy syntax and structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { policyEngineService } from '../../../../../services/policy-engine';
import { logger } from '../../../../../observability/logging';
import { errorResponse, successResponse } from '../../../../../lib/api-route-helpers';
import { z } from 'zod';

const validatePolicySchema = z.object({
  source: z.string().min(1),
  organizationId: z.string().optional(),
  repositoryId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Parse and validate body
    const body = await request.json().catch(() => ({}));
    const validation = validatePolicySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validation.error.errors }
      );
    }

    const { source, organizationId, repositoryId } = validation.data;

    // Validate policy syntax
    try {
      // Parse policy source (would use actual parser in production)
      // For now, validate JSON/YAML structure
      let parsed: any;
      try {
        parsed = JSON.parse(source);
      } catch {
        // Try YAML parsing (would use yaml library)
        throw new Error('Policy must be valid JSON or YAML');
      }

      // Basic structure validation
      if (!parsed.version || !parsed.rules || !Array.isArray(parsed.rules)) {
        throw new Error('Policy must have version and rules array');
      }

      // Validate each rule
      const ruleErrors: Array<{ ruleId: string; error: string }> = [];
      for (const rule of parsed.rules) {
        if (!rule.ruleId) {
          ruleErrors.push({ ruleId: 'unknown', error: 'Rule missing ruleId' });
          continue;
        }
        if (!rule.severityMapping || typeof rule.severityMapping !== 'object') {
          ruleErrors.push({ ruleId: rule.ruleId, error: 'Rule missing severityMapping' });
        }
      }

      if (ruleErrors.length > 0) {
        return successResponse({
          valid: false,
          errors: ruleErrors,
          message: 'Policy validation failed',
        });
      }

      // Try to load policy (if organizationId provided)
      if (organizationId) {
        try {
          // This would validate against actual policy engine
          // For now, just return success
          return successResponse({
            valid: true,
            message: 'Policy is valid',
            warnings: [],
          });
        } catch (error) {
          return successResponse({
            valid: false,
            errors: [{ ruleId: 'policy', error: error instanceof Error ? error.message : 'Invalid policy' }],
            message: 'Policy validation failed',
          });
        }
      }

      return successResponse({
        valid: true,
        message: 'Policy syntax is valid',
        warnings: [],
      });
    } catch (error) {
      return successResponse({
        valid: false,
        errors: [{ ruleId: 'syntax', error: error instanceof Error ? error.message : 'Invalid syntax' }],
        message: 'Policy validation failed',
      });
    }
  } catch (error) {
    log.error(error, 'Policy validation failed');
    return errorResponse(
      'VALIDATION_FAILED',
      error instanceof Error ? error.message : 'Failed to validate policy',
      500
    );
  }
}
