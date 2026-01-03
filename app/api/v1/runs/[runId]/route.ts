/**
 * Run Details API Route
 * 
 * GET /api/v1/runs/:runId - Get run details
 */

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
            provider: true,
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
            prNumber: true,
            prSha: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            resourceType: true,
            details: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50, // Limit to last 50 audit log entries
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

    // Get findings from review if available
    let findings: Array<{
      ruleId: string;
      severity: string;
      file: string;
      line: number;
      message: string;
      fix?: string;
    }> = [];
    
    if (run.review?.issuesFound) {
      // Parse issues from review.issuesFound (JSON array)
      try {
        if (Array.isArray(run.review.issuesFound)) {
          findings = run.review.issuesFound as typeof findings;
        } else if (typeof run.review.issuesFound === 'string') {
          findings = JSON.parse(run.review.issuesFound) as typeof findings;
        }
      } catch {
        // If parsing fails, use empty array
        findings = [];
      }
    }

    // Get artifacts (tests, docs) if available
    const artifacts: Array<{
      type: 'test' | 'doc' | 'report';
      name: string;
      url?: string;
      size?: number;
    }> = [];

    // Add test artifacts if test engine generated tests
    const testResult = run.testEngineResult as { testsGenerated?: number } | null;
    if (testResult && typeof testResult === 'object' && 'testsGenerated' in testResult && Number(testResult.testsGenerated) > 0) {
      artifacts.push({
        type: 'test',
        name: 'Generated Tests',
        // In future, could link to actual test files
      });
    }

    // Add doc artifacts if doc sync generated docs
    const docResult = run.docSyncResult as { docId?: string } | null;
    if (docResult && typeof docResult === 'object' && 'docId' in docResult && docResult.docId) {
      artifacts.push({
        type: 'doc',
        name: 'Documentation',
        // In future, could link to actual doc files
      });
    }

    // Generate provider link if repository and PR info available
    let providerLink: string | undefined;
    if (run.repository && run.review?.prNumber) {
      const { provider, fullName } = run.repository;
      const prNumber = run.review.prNumber;
      
      if (provider === 'github') {
        providerLink = `https://github.com/${fullName}/pull/${prNumber}`;
      } else if (provider === 'gitlab') {
        // GitLab MR URL format: https://gitlab.com/{namespace}/{project}/-/merge_requests/{iid}
        providerLink = `https://gitlab.com/${fullName}/-/merge_requests/${prNumber}`;
      } else if (provider === 'bitbucket') {
        // Bitbucket PR URL format: https://bitbucket.org/{workspace}/{repo_slug}/pull-requests/{pr_id}
        providerLink = `https://bitbucket.org/${fullName}/pull-requests/${prNumber}`;
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
      findings,
      artifacts,
      auditLog: run.auditLogs,
      providerLink,
    });
  },
  { authz: { requiredScopes: ['read'] } }
);
