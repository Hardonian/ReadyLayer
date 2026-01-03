/**
 * Policy Pack Management API
 * 
 * POST   /api/v1/policies - Create policy pack
 * GET    /api/v1/policies - List policy packs
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { z } from 'zod';
import {
  createRouteHandler,
  parseJsonBody,
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePagination,
  RouteContext,
} from '../../../../lib/api-route-helpers';

const createPolicyPackSchema = z.object({
  organizationId: z.string(),
  repositoryId: z.string().optional().nullable(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic (e.g., 1.0.0)'),
  source: z.string().min(1, 'Policy source is required'),
  rules: z.array(z.object({
    ruleId: z.string(),
    severityMapping: z.record(z.enum(['block', 'warn', 'allow'])),
    enabled: z.boolean().default(true),
    params: z.record(z.any()).optional(),
  })).optional().default([]),
});

/**
 * POST /api/v1/policies
 * Create a new policy pack
 */
export const POST = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user, log } = context;

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const validationResult = createPolicyPackSchema.safeParse(bodyResult.data);
    if (!validationResult.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validationResult.error.errors }
      );
    }

    const validated = validationResult.data;

    // Verify user belongs to organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: validated.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to organization',
          },
        },
        { status: 403 }
      );
    }

    // If repositoryId provided, verify it belongs to organization
    if (validated.repositoryId) {
      const repo = await prisma.repository.findUnique({
        where: { id: validated.repositoryId },
        select: { organizationId: true },
      });

      if (!repo || repo.organizationId !== validated.organizationId) {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Repository not found or does not belong to organization',
            },
          },
          { status: 404 }
        );
      }
    }

    // Calculate checksum
    const checksum = createHash('sha256').update(validated.source, 'utf8').digest('hex');

    // Create policy pack
    const policyPack = await prisma.policyPack.create({
      data: {
        organizationId: validated.organizationId,
        repositoryId: validated.repositoryId || null,
        version: validated.version,
        source: validated.source,
        checksum,
        rules: {
          create: validated.rules.map((rule) => ({
            ruleId: rule.ruleId,
            severityMapping: rule.severityMapping as Prisma.InputJsonValue,
            enabled: rule.enabled,
            params: rule.params ? (rule.params as Prisma.InputJsonValue) : undefined,
          })),
        },
      },
      include: {
        rules: true,
      },
    });

    log.info({ policyPackId: policyPack.id, organizationId: validated.organizationId }, 'Policy pack created');

    return successResponse({
      id: policyPack.id,
      organizationId: policyPack.organizationId,
      repositoryId: policyPack.repositoryId,
      version: policyPack.version,
      checksum: policyPack.checksum,
      rules: policyPack.rules,
      createdAt: policyPack.createdAt,
      updatedAt: policyPack.updatedAt,
    }, 201);
  },
  { authz: { requiredScopes: ['write'], requireOrganization: true } }
);

/**
 * GET /api/v1/policies
 * List policy packs (tenant-isolated)
 */
export const GET = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user } = context;

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const repositoryId = searchParams.get('repositoryId');
    const { limit, offset } = parsePagination(request);

    // Get user's organization memberships for tenant isolation
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({
        policies: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      });
    }

    // If organizationId specified, verify user belongs to it
    if (organizationId && !userOrgIds.includes(organizationId)) {
      return errorResponse('FORBIDDEN', 'Access denied to organization', 403);
    }

    // Build where clause with tenant isolation
    const where: Record<string, unknown> = {
      organizationId: organizationId ? organizationId : { in: userOrgIds },
    };

    if (repositoryId) {
      where.repositoryId = repositoryId;
    } else {
      // Include both org-level (null) and repo-level policies
      where.repositoryId = repositoryId === null ? null : undefined;
    }

    const [policies, total] = await Promise.all([
      prisma.policyPack.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          rules: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.policyPack.count({ where }),
    ]);

    return NextResponse.json({
      policies: policies.map((policy) => ({
        id: policy.id,
        organizationId: policy.organizationId,
        repositoryId: policy.repositoryId,
        version: policy.version,
        checksum: policy.checksum,
        rules: policy.rules,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  },
  { authz: { requiredScopes: ['read'] } }
);
