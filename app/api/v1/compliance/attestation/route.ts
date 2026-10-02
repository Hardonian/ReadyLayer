/**
 * Compliance Attestation Generation Route
 * 
 * GET /api/v1/compliance/attestation?organizationId=...&framework=soc2&format=json|markdown
 * POST /api/v1/compliance/attestation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  generateComplianceAttestation,
  renderAttestationMarkdown,
} from '@/lib/compliance/soc2-generator';
import { errorResponse, successResponse, parseJsonBody } from '@/lib/api-route-helpers';
import { z } from 'zod';

const attestationQuerySchema = z.object({
  organizationId: z.string().min(1, 'organizationId is required'),
  framework: z.enum(['soc2', 'iso27001', 'all']).default('all'),
  format: z.enum(['json', 'markdown']).default('json'),
  periodDays: z.coerce.number().min(1).max(365).default(90),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const parsed = attestationQuerySchema.safeParse({
      organizationId: searchParams.get('organizationId') || user.organizationIds[0],
      framework: searchParams.get('framework') || 'all',
      format: searchParams.get('format') || 'json',
      periodDays: searchParams.get('periodDays') || 90,
    });

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        issues: parsed.error.issues,
      });
    }

    const { organizationId, framework, format, periodDays } = parsed.data;

    // Verify tenant authorization
    if (!user.organizationIds.includes(organizationId)) {
      return errorResponse('FORBIDDEN', 'User does not have access to this organization', 403);
    }

    const report = await generateComplianceAttestation(organizationId, {
      framework,
      periodDays,
    });

    if (format === 'markdown') {
      const markdown = renderAttestationMarkdown(report);
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="readylayer-compliance-${report.organization.slug}-${report.id}.md"`,
        },
      });
    }

    return successResponse(report);
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    return errorResponse(
      'COMPLIANCE_GENERATION_FAILED',
      error instanceof Error ? error.message : 'Failed to generate compliance attestation',
      500
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth(request);
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const parsed = attestationQuerySchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid attestation request', 400, {
        issues: parsed.error.issues,
      });
    }

    const { organizationId, framework, format, periodDays } = parsed.data;

    if (!user.organizationIds.includes(organizationId)) {
      return errorResponse('FORBIDDEN', 'User does not have access to this organization', 403);
    }

    const report = await generateComplianceAttestation(organizationId, {
      framework,
      periodDays,
    });

    if (format === 'markdown') {
      const markdown = renderAttestationMarkdown(report);
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="readylayer-compliance-${report.organization.slug}-${report.id}.md"`,
        },
      });
    }

    return successResponse(report);
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    return errorResponse(
      'COMPLIANCE_GENERATION_FAILED',
      error instanceof Error ? error.message : 'Failed to generate compliance attestation',
      500
    );
  }
}
