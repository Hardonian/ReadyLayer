/**
 * Policy Validation API
 * 
 * POST /api/v1/policies/validate - Validate policy YAML/JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { z } from 'zod';
import { createHash } from 'crypto';

const validatePolicySchema = z.object({
  source: z.string().min(1, 'Policy source is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic (e.g., 1.0.0)').optional(),
  rules: z.array(z.object({
    ruleId: z.string(),
    severityMapping: z.record(z.enum(['block', 'warn', 'allow'])),
    enabled: z.boolean().default(true),
    params: z.record(z.any()).optional(),
  })).optional(),
});

/**
 * POST /api/v1/policies/validate
 * Validate policy YAML/JSON syntax and structure
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json();
    
    // Validate structure
    let validated;
    try {
      validated = validatePolicySchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            valid: false,
            errors: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 200 }
        );
      }
      throw error;
    }

    // Validate policy source (try parsing as JSON or YAML)
    let parsedSource: Record<string, unknown>;
    try {
      parsedSource = JSON.parse(validated.source);
    } catch {
      // Try YAML parsing (would need yaml library)
      return NextResponse.json(
        {
          valid: false,
          errors: [
            {
              path: 'source',
              message: 'Policy source must be valid JSON (YAML support coming soon)',
            },
          ],
        },
        { status: 200 }
      );
    }

    // Validate structure
    const errors: Array<{ path: string; message: string }> = [];

    if (!parsedSource.version && !validated.version) {
      errors.push({
        path: 'version',
        message: 'Version is required',
      });
    }

    if (parsedSource.rules && !Array.isArray(parsedSource.rules)) {
      errors.push({
        path: 'rules',
        message: 'Rules must be an array',
      });
    }

    // Validate rules if provided
    if (validated.rules) {
      validated.rules.forEach((rule, index) => {
        if (!rule.ruleId || typeof rule.ruleId !== 'string') {
          errors.push({
            path: `rules[${index}].ruleId`,
            message: 'Rule ID is required',
          });
        }

        const validSeverities = ['critical', 'high', 'medium', 'low'];
        const severityKeys = Object.keys(rule.severityMapping || {});
        const invalidSeverities = severityKeys.filter(
          (s) => !validSeverities.includes(s)
        );
        if (invalidSeverities.length > 0) {
          errors.push({
            path: `rules[${index}].severityMapping`,
            message: `Invalid severity keys: ${invalidSeverities.join(', ')}. Valid: ${validSeverities.join(', ')}`,
          });
        }

        const validActions = ['block', 'warn', 'allow'];
        const invalidActions = Object.values(rule.severityMapping || {}).filter(
          (a) => !validActions.includes(a as string)
        );
        if (invalidActions.length > 0) {
          errors.push({
            path: `rules[${index}].severityMapping`,
            message: `Invalid action values. Valid: ${validActions.join(', ')}`,
          });
        }
      });
    }

    // Calculate checksum
    const checksum = createHash('sha256').update(validated.source, 'utf8').digest('hex');

    if (errors.length > 0) {
      return NextResponse.json(
        {
          valid: false,
          errors,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      checksum,
      version: validated.version || parsedSource.version,
      rulesCount: validated.rules?.length || (Array.isArray(parsedSource.rules) ? parsedSource.rules.length : 0),
    });
  } catch (error) {
    log.error(error, 'Failed to validate policy');
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATE_POLICY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
