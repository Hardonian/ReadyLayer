/**
 * POST /api/v1/policies/validate
 * Validate policy syntax and structure
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { logger } from '../../../../../observability/logging';
import { errorResponse, successResponse, parseJsonBody } from '../../../../../lib/api-route-helpers';
import { z } from 'zod';
import type { PolicyDocument, PolicyRule, PolicyValidationError, PolicyValidationResult } from '../../../../../lib/types/policy';

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
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const validation = validatePolicySchema.safeParse(bodyResult.data);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validation.error.errors }
      );
    }

    const { source, organizationId } = validation.data;

    // Validate policy syntax
    try {
      // Parse policy source (would use actual parser in production)
      // For now, validate JSON/YAML structure
      let parsed: unknown;
      try {
        parsed = JSON.parse(source);
      } catch {
        // Try YAML parsing (would use yaml library)
        throw new Error('Policy must be valid JSON or YAML');
      }

      // Type guard for PolicyDocument
      function isPolicyDocument(value: unknown): value is PolicyDocument {
        return (
          typeof value === 'object' &&
          value !== null &&
          'version' in value &&
          typeof (value as PolicyDocument).version === 'string' &&
          'rules' in value &&
          Array.isArray((value as PolicyDocument).rules)
        );
      }

      // Basic structure validation
      if (!isPolicyDocument(parsed)) {
        throw new Error('Policy must have version and rules array');
      }

      // Validate each rule
      const ruleErrors: PolicyValidationError[] = [];
      for (const rule of parsed.rules) {
        if (!rule || typeof rule !== 'object' || !('ruleId' in rule) || typeof rule.ruleId !== 'string') {
          ruleErrors.push({ ruleId: 'unknown', error: 'Rule missing ruleId' });
          continue;
        }
        const typedRule = rule as PolicyRule;
        if (!typedRule.severityMapping || typeof typedRule.severityMapping !== 'object') {
          ruleErrors.push({ ruleId: typedRule.ruleId, error: 'Rule missing severityMapping' });
        }
      }

      if (ruleErrors.length > 0) {
        const result: PolicyValidationResult = {
          valid: false,
          errors: ruleErrors,
          message: 'Policy validation failed',
        };
        return successResponse(result);
      }

      // Try to load policy (if organizationId provided)
      if (organizationId) {
        try {
          // This would validate against actual policy engine
          // For now, just return success
          const result: PolicyValidationResult = {
            valid: true,
            message: 'Policy is valid',
            warnings: [],
          };
          return successResponse(result);
        } catch (error) {
          const result: PolicyValidationResult = {
            valid: false,
            errors: [{ ruleId: 'policy', error: error instanceof Error ? error.message : 'Invalid policy' }],
            message: 'Policy validation failed',
          };
          return successResponse(result);
        }
      }

      const result: PolicyValidationResult = {
        valid: true,
        message: 'Policy syntax is valid',
        warnings: [],
      };
      return successResponse(result);
    } catch (error) {
      const result: PolicyValidationResult = {
        valid: false,
        errors: [{ ruleId: 'syntax', error: error instanceof Error ? error.message : 'Invalid syntax' }],
        message: 'Policy validation failed',
      };
      return successResponse(result);
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
