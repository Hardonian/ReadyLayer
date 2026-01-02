/**
 * POST /api/v1/policies/templates/[templateId]/apply
 * Apply a policy template to an organization or repository
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '../../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../../lib/authz';
import { prisma } from '../../../../../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../../../../../../../observability/logging';
import { errorResponse, successResponse, parseJsonBody } from '../../../../../../../lib/api-route-helpers';
import { z } from 'zod';
import { createHash } from 'crypto';
import type { PolicyDocument, PolicyRule } from '../../../../../../../lib/types/policy';

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
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const validation = applyTemplateSchema.safeParse(bodyResult.data);

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
    const parsedTemplate: unknown = JSON.parse(template.source);
    
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

    if (!isPolicyDocument(parsedTemplate)) {
      return errorResponse('INVALID_TEMPLATE', 'Template has invalid structure', 500);
    }

    const templateData: PolicyDocument = parsedTemplate;
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
    const rules: PolicyRule[] = templateData.rules || [];
    for (const ruleData of rules) {
      if (!ruleData.ruleId || typeof ruleData.ruleId !== 'string') {
        log.warn({ ruleData }, 'Skipping rule with invalid ruleId');
        continue;
      }
      
      const typedRule = ruleData as PolicyRule;
      await prisma.policyRule.create({
        data: {
          policyPackId: policyPack.id,
          ruleId: typedRule.ruleId,
          severityMapping: (typedRule.severityMapping || {}) as Prisma.InputJsonValue,
          enabled: typedRule.enabled !== false,
          params: (typedRule.params || {}) as Prisma.InputJsonValue,
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
