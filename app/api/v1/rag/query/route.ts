/**
 * POST /api/v1/rag/query
 * Query evidence index
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { queryEvidence, isQueryEnabled } from '../../../../../lib/rag';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { z } from 'zod';
import { parseJsonBody } from '../../../../../lib/api-route-helpers';

const querySchema = z.object({
  repositoryId: z.string().optional(),
  query: z.string().min(1).max(1000),
  topK: z.number().int().min(1).max(50).optional().default(10),
  filters: z.object({
    sourceTypes: z.array(z.enum(['pr_diff', 'repo_file', 'review_result', 'policy_doc', 'test_precedent', 'doc_convention'])).optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Check if RAG query is enabled
    if (!isQueryEnabled()) {
      return NextResponse.json(
        {
          results: [],
          status: 'disabled',
          message: 'RAG query is disabled',
        },
        { status: 200 } // 200, not 4xx - graceful degradation
      );
    }

    // Require authentication
    const user = await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Parse and validate request body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const validation = querySchema.safeParse(bodyResult.data);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { repositoryId, query, topK, filters } = validation.data;

    // Get organization ID from repository or user's default org
    let organizationId: string;
    if (repositoryId) {
      // Verify repository belongs to user's organization
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repo) {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Repository not found',
            },
          },
          { status: 404 }
        );
      }

      // Verify user has access to this organization
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: repo.organizationId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to repository',
            },
          },
          { status: 403 }
        );
      }

      organizationId = repo.organizationId;
    } else {
      // Use user's first organization
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      });

      if (!membership) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'No organization found. Please specify repositoryId or join an organization.',
            },
          },
          { status: 400 }
        );
      }

      organizationId = membership.organizationId;
    }

    // Query evidence
    const results = await queryEvidence(
      {
        organizationId,
        repositoryId,
        queryText: query,
        topK,
        filters,
      },
      requestId
    );

    log.info({
      organizationId,
      repositoryId,
      query,
      resultCount: results.length,
    }, 'RAG query completed');

    return NextResponse.json({
      results: results.map((r) => ({
        id: r.id,
        documentId: r.documentId,
        chunkIndex: r.chunkIndex,
        content: r.content,
        sourceType: r.sourceType,
        sourceRef: r.sourceRef,
        similarity: r.similarity,
        metadata: r.metadata,
      })),
      count: results.length,
    });
  } catch (error) {
    log.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'RAG query failed');

    // Never return 500 - graceful degradation
    return NextResponse.json(
      {
        results: [],
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to query evidence',
        },
      },
      { status: 200 } // Return empty results, not 500
    );
  }
}
