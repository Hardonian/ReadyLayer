/**
 * Privacy & GDPR Compliance API Route
 * 
 * POST /api/v1/privacy - Anonymize PII and test compliance rules
 * GET /api/v1/privacy - Get organization privacy & compliance configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { privacyComplianceService, type AnonymizationOptions } from '@/services/privacy-compliance';
import { requireAuth } from '@/lib/auth';
import { createAuthzMiddleware } from '@/lib/authz';
import { logger } from '@/observability/logging';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, route: 'privacy-compliance' });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json() as {
      action?: 'anonymize' | 'detect' | 'retention_check';
      data?: string | Record<string, unknown>;
      options?: AnonymizationOptions;
      createdAt?: string;
    };

    const action = body.action || 'anonymize';

    if (action === 'detect') {
      if (!body.data) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'data is required for detection' } },
          { status: 400 }
        );
      }
      const hasPII = privacyComplianceService.detectPII(body.data);
      return NextResponse.json({
        data: {
          hasPII,
          compliant: !hasPII,
        },
      });
    }

    if (action === 'retention_check') {
      if (!body.createdAt) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'createdAt timestamp is required' } },
          { status: 400 }
        );
      }
      const orgId = user.organizationIds[0] || 'default';
      const config = privacyComplianceService.getConfig(orgId);
      const shouldDelete = privacyComplianceService.shouldDeleteData(new Date(body.createdAt), config);
      return NextResponse.json({
        data: {
          retentionDays: config.dataRetentionDays,
          shouldDelete,
          expired: shouldDelete,
        },
      });
    }

    // Default: anonymize
    if (!body.data) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'data is required for anonymization' } },
        { status: 400 }
      );
    }

    const anonymized = privacyComplianceService.anonymizePII(body.data, body.options || {});

    log.info({ userId: user.id, action }, 'Privacy compliance operation completed');

    return NextResponse.json({
      data: {
        result: anonymized,
        anonymized: true,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Privacy compliance processing failed');
    return NextResponse.json(
      {
        error: {
          code: 'PRIVACY_PROCESSING_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth(request);
    const orgId = user.organizationIds[0] || 'default';
    const config = privacyComplianceService.getConfig(orgId);
    return NextResponse.json({ data: config });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'CONFIG_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
