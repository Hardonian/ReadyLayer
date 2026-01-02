/**
 * POST /api/v1/policies/templates/[templateId]/apply
 * Apply a policy template to an organization or repository
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '../../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../../lib/authz';
import { prisma } from '../../../../../../../lib/prisma';
import { logger } from '../../../../../../../observability/logging';
import { errorResponse, successResponse } from '../../../../../../../lib/api-route-helpers';
import { z } from 'zod';
import { createHash } from 'crypto';

const applyTemplateSchema = z.object({
  organizationId: z.string(),
  repositoryId: z.string().optional(),
  version: z.string().default('1.0.0'),
});

// Policy templates (same as in templates route)
const POLICY_TEMPLATES: Record<string, { source: string }> = {
  'security-focused': {
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
  'quality-focused': {
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
  'maximum-enforcement': {
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
};

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, templateId: params.templateId });

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
    const validation = applyTemplateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validation.error.errors }
      );
    }

    const { organizationId, repositoryId, version } = validation.data;

    // Get template
    const template = POLICY_TEMPLATES[params.templateId];
    if (!template) {
      return errorResponse('NOT_FOUND', 'Template not found', 404);
    }

    // Verify user has access to organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return errorResponse('FORBIDDEN', 'Access denied to organization', 403);
    }

    // Verify repository access if provided
    if (repositoryId) {
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repo || repo.organizationId !== organizationId) {
        return errorResponse('FORBIDDEN', 'Access denied to repository', 403);
      }
    }

    // Parse template source
    const templateData = JSON.parse(template.source);
    const policySource = JSON.stringify({
      ...templateData,
      version,
    }, null, 2);

    // Calculate checksum
    const checksum = createHash('sha256').update(policySource, 'utf8').digest('hex');

    // Create policy pack
    const policyPack = await prisma.policyPack.create({
      data: {
        organizationId,
        repositoryId: repositoryId || null,
        version,
        source: policySource,
        checksum,
      },
    });

    // Create rules
    const rules = templateData.rules || [];
    for (const ruleData of rules) {
      await prisma.policyRule.create({
        data: {
          policyPackId: policyPack.id,
          ruleId: ruleData.ruleId,
          severityMapping: ruleData.severityMapping,
          enabled: ruleData.enabled !== false,
          params: ruleData.params || {},
        },
      });
    }

    log.info({
      policyPackId: policyPack.id,
      organizationId,
      repositoryId,
      templateId: params.templateId,
    }, 'Template applied');

    return successResponse({
      id: policyPack.id,
      version: policyPack.version,
      checksum: policyPack.checksum,
      appliedFromTemplate: params.templateId,
    }, 201);
  } catch (error) {
    log.error(error, 'Failed to apply template');
    return errorResponse(
      'APPLY_TEMPLATE_FAILED',
      error instanceof Error ? error.message : 'Failed to apply template',
      500
    );
  }
}
