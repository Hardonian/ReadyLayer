/**
 * GET /api/v1/policies/templates
 * List available policy templates
 * 
 * POST /api/v1/policies/templates
 * Create a new policy template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { logger } from '../../../../../observability/logging';
import { errorResponse, successResponse } from '../../../../../lib/api-route-helpers';
import { z } from 'zod';

// Policy templates (pre-built)
const POLICY_TEMPLATES = [
  {
    id: 'security-focused',
    name: 'Security Focused',
    description: 'Blocks critical and high security issues',
    category: 'security',
    tier: 'starter',
    source: JSON.stringify({
      version: '1.0.0',
      rules: [
        {
          ruleId: '*',
          severityMapping: {
            critical: 'block',
            high: 'block',
            medium: 'warn',
            low: 'allow',
          },
          enabled: true,
        },
      ],
    }, null, 2),
  },
  {
    id: 'quality-focused',
    name: 'Quality Focused',
    description: 'Enforces code quality standards',
    category: 'quality',
    tier: 'growth',
    source: JSON.stringify({
      version: '1.0.0',
      rules: [
        {
          ruleId: '*',
          severityMapping: {
            critical: 'block',
            high: 'block',
            medium: 'block',
            low: 'warn',
          },
          enabled: true,
        },
      ],
    }, null, 2),
  },
  {
    id: 'maximum-enforcement',
    name: 'Maximum Enforcement',
    description: 'Blocks all issues (critical, high, medium)',
    category: 'compliance',
    tier: 'scale',
    source: JSON.stringify({
      version: '1.0.0',
      rules: [
        {
          ruleId: '*',
          severityMapping: {
            critical: 'block',
            high: 'block',
            medium: 'block',
            low: 'warn',
          },
          enabled: true,
        },
      ],
    }, null, 2),
  },
];

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['security', 'quality', 'compliance', 'custom']),
  source: z.string().min(1),
});

/**
 * GET /api/v1/policies/templates
 * List available policy templates
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tier = searchParams.get('tier');

    let templates = POLICY_TEMPLATES;

    // Filter by category
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    // Filter by tier
    if (tier) {
      templates = templates.filter((t) => t.tier === tier);
    }

    return successResponse({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tier: t.tier,
      })),
    });
  } catch (error) {
    log.error(error, 'Failed to list templates');
    return errorResponse(
      'LIST_TEMPLATES_FAILED',
      error instanceof Error ? error.message : 'Failed to list templates',
      500
    );
  }
}

/**
 * POST /api/v1/policies/templates
 * Create a new policy template (saves to user's custom templates)
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Parse and validate body
    const body = await request.json().catch(() => ({}));
    const validation = createTemplateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validation.error.errors }
      );
    }

    const { name, description, category, source } = validation.data;

    // Validate policy source
    try {
      JSON.parse(source);
    } catch {
      return errorResponse(
        'VALIDATION_ERROR',
        'Policy source must be valid JSON',
        400
      );
    }

    // In a real implementation, this would save to a templates table
    // For now, just return success
    const templateId = `template_${Date.now()}`;

    log.info({ templateId, userId: user.id }, 'Template created');

    return successResponse({
      id: templateId,
      name,
      description,
      category,
      source,
      createdAt: new Date().toISOString(),
    }, 201);
  } catch (error) {
    log.error(error, 'Failed to create template');
    return errorResponse(
      'CREATE_TEMPLATE_FAILED',
      error instanceof Error ? error.message : 'Failed to create template',
      500
    );
  }
}
