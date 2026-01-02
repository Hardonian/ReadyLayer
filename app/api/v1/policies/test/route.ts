/**
 * POST /api/v1/policies/test
 * Test policy against sample findings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { policyEngineService } from '../../../../../services/policy-engine';
import { logger } from '../../../../../observability/logging';
import { errorResponse, successResponse } from '../../../../../lib/api-route-helpers';
import { z } from 'zod';
import type { Issue } from '../../../../../services/static-analysis';

const testPolicySchema = z.object({
  policyPackId: z.string().optional(),
  organizationId: z.string(),
  repositoryId: z.string().optional(),
  findings: z.array(z.object({
    ruleId: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    file: z.string(),
    line: z.number(),
    message: z.string(),
    fix: z.string().optional(),
    confidence: z.number().optional(),
  })),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Parse and validate body
    const body = await request.json().catch(() => ({}));
    const validation = testPolicySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validation.error.errors }
      );
    }

    const { policyPackId, organizationId, repositoryId, findings } = validation.data;

    // Load effective policy
    const policy = await policyEngineService.loadEffectivePolicy(
      organizationId,
      repositoryId || null,
      'test-sha', // Dummy SHA for testing
      undefined // No branch for testing
    );

    // Evaluate findings
    const evaluationResult = policyEngineService.evaluate(findings as Issue[], policy);

    return successResponse({
      blocked: evaluationResult.blocked,
      blockingReason: evaluationResult.blockingReason,
      score: evaluationResult.score,
      nonWaivedFindings: evaluationResult.nonWaivedFindings,
      waivedFindings: evaluationResult.waivedFindings,
      rulesFired: evaluationResult.rulesFired,
      summary: {
        total: evaluationResult.nonWaivedFindings.length,
        critical: evaluationResult.nonWaivedFindings.filter((f) => f.severity === 'critical').length,
        high: evaluationResult.nonWaivedFindings.filter((f) => f.severity === 'high').length,
        medium: evaluationResult.nonWaivedFindings.filter((f) => f.severity === 'medium').length,
        low: evaluationResult.nonWaivedFindings.filter((f) => f.severity === 'low').length,
      },
    });
  } catch (error) {
    log.error(error, 'Policy test failed');
    return errorResponse(
      'TEST_FAILED',
      error instanceof Error ? error.message : 'Failed to test policy',
      500
    );
  }
}
