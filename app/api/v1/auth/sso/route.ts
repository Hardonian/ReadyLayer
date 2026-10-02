/**
 * Enterprise Single Sign-On (SSO) Initiation Route
 *
 * POST /api/v1/auth/sso
 * Resolves enterprise domain and redirects/returns SAML/OIDC initiation URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveEnterpriseSso } from '@/lib/auth';
import { errorResponse, successResponse, parseJsonBody } from '@/lib/api-route-helpers';
import { z } from 'zod';

const ssoRequestSchema = z.object({
  domainOrEmail: z.string().min(1, 'Domain or corporate email is required'),
  redirectUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.success) {
    return bodyResult.response;
  }

  const parsed = ssoRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Invalid domain or email format', 400, {
      issues: parsed.error.issues,
    });
  }

  const result = await resolveEnterpriseSso(parsed.data.domainOrEmail);
  if (!result) {
    return errorResponse('SSO_DOMAIN_NOT_FOUND', 'No enterprise SSO provider configured for this domain', 404);
  }

  return successResponse({
    ssoUrl: result.ssoUrl,
    provider: result.provider,
    domain: result.domain,
  });
}
