/**
 * Run Details API Route
 * 
 * GET /api/v1/runs/:runId - Get run details
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import {
  createRouteHandler,
  errorResponse,
  successResponse,
  RouteContext,
} from '../../../../../lib/api-route-helpers';

/**
 * GET /api/v1/runs/:runId
 * Get run details (tenant-isolated)
 */
export const GET = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user } = context;
    const runId = request.url.split('/').pop()?.split('?')[0];

    if (!runId) {
      return errorResponse('VALIDATION_ERROR', 'runId is required', 400);
    }

    // Get run with relations
    const run = await prisma.readyLayerRun.findUnique({
      where: { id: runId },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            fullName: true,
            organizationId: true,
          },
        },
        review: {
          select: {
            id: true,
            status: true,
            isBlocked: true,
            blockedReason: true,
            summary: true,
            issuesFound: true,
          },
        },
      },
    });

    if (!run) {
      return errorResponse('NOT_FOUND', 'Run not found', 404);
    }

    // Tenant isolation check (skip for sandbox runs)
    if (!run.sandboxId && run.repositoryId) {
      const memberships = await prisma.organizationMember.findMany({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      const userOrgIds = memberships.map((m) => m.organizationId);

      if (run.repository && !userOrgIds.includes(run.repository.organizationId)) {
        return errorResponse('FORBIDDEN', 'Access denied to run', 403);
      }
    }

    return successResponse({
      id: run.id,
      correlationId: run.correlationId,
      repositoryId: run.repositoryId,
      sandboxId: run.sandboxId,
      trigger: run.trigger,
      triggerMetadata: run.triggerMetadata,
      status: run.status,
      conclusion: run.conclusion,
      reviewGuardStatus: run.reviewGuardStatus,
      testEngineStatus: run.testEngineStatus,
      docSyncStatus: run.docSyncStatus,
      reviewGuardResult: run.reviewGuardResult,
      testEngineResult: run.testEngineResult,
      docSyncResult: run.docSyncResult,
      aiTouchedDetected: run.aiTouchedDetected,
      aiTouchedFiles: run.aiTouchedFiles,
      gatesPassed: run.gatesPassed,
      gatesFailed: run.gatesFailed,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      reviewGuardStartedAt: run.reviewGuardStartedAt,
      reviewGuardCompletedAt: run.reviewGuardCompletedAt,
      testEngineStartedAt: run.testEngineStartedAt,
      testEngineCompletedAt: run.testEngineCompletedAt,
      docSyncStartedAt: run.docSyncStartedAt,
      docSyncCompletedAt: run.docSyncCompletedAt,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      repository: run.repository,
      review: run.review,
    });
  },
  { authz: { requiredScopes: ['read'] } }
);
